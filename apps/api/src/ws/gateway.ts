import websocket from '@fastify/websocket';
import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';
import {
  type ClientConnection,
  addConnection,
  authorizeChannel,
  canConnect,
  getAllConnections,
  removeConnection,
  subscribe,
  unsubscribe,
} from './channels.js';
import { initRealtimeSubscriber, shutdownRealtimeSubscriber } from './redis-subscriber.js';

const HEARTBEAT_INTERVAL_MS = 30_000;
const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes with no subscriptions
const RECONNECT_CLOSE_CODE = 4000;

interface ClientMessage {
  action: 'subscribe' | 'unsubscribe';
  channel: string;
}

function isValidChannel(channel: string): boolean {
  return /^(project|user):[a-zA-Z0-9_-]+$/.test(channel);
}

export async function realtimeGateway(fastify: FastifyInstance): Promise<void> {
  await fastify.register(websocket);

  // Initialize Redis subscriber for multi-instance broadcast
  await initRealtimeSubscriber();

  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  fastify.addHook('onReady', () => {
    heartbeatTimer = setInterval(() => {
      for (const conn of getAllConnections()) {
        if (conn.ws.readyState === conn.ws.OPEN) {
          conn.ws.ping();
        }
      }
    }, HEARTBEAT_INTERVAL_MS);
  });

  fastify.addHook('onClose', async () => {
    if (heartbeatTimer) clearInterval(heartbeatTimer);

    // Close all connections with reconnect-friendly code
    for (const conn of getAllConnections()) {
      conn.ws.close(RECONNECT_CLOSE_CODE, 'Server shutting down');
    }

    await shutdownRealtimeSubscriber();
  });

  fastify.get(
    '/ws',
    { websocket: true, config: { rateLimit: { max: 5, timeWindow: '1 minute' } } },
    (socket: WebSocket, request) => {
      // Auth: extract token from query string
      const url = new URL(request.url, `http://${request.headers.host ?? 'localhost'}`);
      const token = url.searchParams.get('token');

      if (!token) {
        socket.close(4001, 'Missing token');
        return;
      }

      let userId: string;
      try {
        const payload = fastify.jwtVerify(token);
        userId = payload.sub;
      } catch {
        socket.close(4001, 'Invalid or expired token');
        return;
      }

      // Enforce max connections
      if (!canConnect(userId)) {
        socket.close(4002, 'Too many connections');
        return;
      }

      const conn: ClientConnection = {
        ws: socket,
        userId,
        channels: new Set(),
      };

      addConnection(conn);

      // Idle timeout — close if no subscriptions after 5 minutes
      let idleTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
        if (conn.channels.size === 0 && socket.readyState === socket.OPEN) {
          socket.close(4003, 'Idle timeout');
        }
      }, IDLE_TIMEOUT_MS);

      socket.on('message', async (raw: Buffer | string) => {
        try {
          const msg: ClientMessage = JSON.parse(typeof raw === 'string' ? raw : raw.toString());

          if (!msg.action || !msg.channel) return;
          if (!isValidChannel(msg.channel)) {
            socket.send(JSON.stringify({ error: 'Invalid channel format' }));
            return;
          }

          // Resolve user:me to actual userId
          const channel = msg.channel === 'user:me' ? `user:${userId}` : msg.channel;

          if (msg.action === 'subscribe') {
            // Verify user has access to this channel
            const authorized = await authorizeChannel(userId, channel);
            if (!authorized) {
              socket.send(JSON.stringify({ error: 'Not authorized for channel', channel }));
              return;
            }
            subscribe(conn, channel);
            socket.send(JSON.stringify({ ack: 'subscribed', channel }));

            // Clear idle timer once subscribed
            if (idleTimer) {
              clearTimeout(idleTimer);
              idleTimer = null;
            }
          } else if (msg.action === 'unsubscribe') {
            unsubscribe(conn, channel);
            socket.send(JSON.stringify({ ack: 'unsubscribed', channel }));
          }
        } catch {
          // Ignore malformed messages
        }
      });

      socket.on('close', () => {
        if (idleTimer) clearTimeout(idleTimer);
        removeConnection(conn);
      });

      socket.on('error', () => {
        if (idleTimer) clearTimeout(idleTimer);
        removeConnection(conn);
      });

      // Confirm connection
      socket.send(JSON.stringify({ type: 'connected', userId }));
    },
  );
}
