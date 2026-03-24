import type { FastifyInstance } from 'fastify';
import { healthHandler, readinessHandler } from './health.handlers.js';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', { config: { rateLimit: false } }, async (_request, reply) => {
    const result = await healthHandler();
    return reply.status(200).send(result);
  });

  fastify.get('/ready', { config: { rateLimit: false } }, async (_request, reply) => {
    const result = await readinessHandler();
    return reply.status(result.statusCode).send(result.body);
  });
}
