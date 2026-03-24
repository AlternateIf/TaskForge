import crypto from 'node:crypto';
import fp from 'fastify-plugin';

export default fp(
  async (fastify) => {
    fastify.addHook('onRequest', async (request, reply) => {
      const requestId = (request.headers['x-request-id'] as string) ?? crypto.randomUUID();
      request.id = requestId;
      reply.header('X-Request-Id', requestId);
    });
  },
  { name: 'request-id' },
);
