import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { type RealtimeEvent, addSseClient, authorizeChannel, removeSseClient } from './channels.js';

const SSE_RETRY_MS = 3000;

export async function sseRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    '/api/v1/events/stream',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.authUser?.userId ?? '';
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      // Parse channels from query string
      const url = new URL(request.url, `http://${request.headers.host ?? 'localhost'}`);
      const channelsParam = url.searchParams.get('channels') ?? '';
      const channels = channelsParam
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)
        .map((c) => (c === 'user:me' ? `user:${userId}` : c))
        .filter((c) => /^(project|user):[a-zA-Z0-9_-]+$/.test(c));

      if (channels.length === 0) {
        return reply.status(400).send({ error: 'No valid channels specified' });
      }

      // Verify user has access to all requested channels
      const authResults = await Promise.all(channels.map((ch) => authorizeChannel(userId, ch)));
      const authorizedChannels = channels.filter((_, i) => authResults[i]);
      if (authorizedChannels.length === 0) {
        return reply
          .status(403)
          .send({ error: 'Not authorized for any of the requested channels' });
      }

      // Set SSE headers
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      });

      // Send retry interval
      reply.raw.write(`retry: ${SSE_RETRY_MS}\n\n`);

      const clientId = crypto.randomUUID();

      const write = (event: RealtimeEvent): void => {
        reply.raw.write(`event: ${event.type}\n`);
        reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
      };

      addSseClient({
        id: clientId,
        userId,
        channels: new Set(authorizedChannels),
        write,
        close: () => {
          reply.raw.end();
        },
      });

      // Send initial connected event
      reply.raw.write('event: connected\n');
      reply.raw.write(
        `data: ${JSON.stringify({ type: 'connected', userId, channels: authorizedChannels })}\n\n`,
      );

      // Clean up on disconnect
      request.raw.on('close', () => {
        removeSseClient(clientId);
      });

      // Keep the connection open — don't return a response body via Fastify
      await reply.hijack();
    },
  );
}
