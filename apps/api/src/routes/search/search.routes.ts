import type { FastifyInstance } from 'fastify';
import { searchHandler } from './search.handlers.js';

export async function searchRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get(
    '/api/v1/search',
    { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    searchHandler,
  );
}
