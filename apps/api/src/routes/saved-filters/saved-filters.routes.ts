import type { FastifyInstance } from 'fastify';
import {
  createSavedFilterHandler,
  deleteSavedFilterHandler,
  listSavedFiltersHandler,
  updateSavedFilterHandler,
} from './saved-filters.handlers.js';
import { createSavedFilterSchema, updateSavedFilterSchema } from './saved-filters.schemas.js';

export async function savedFilterRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  // POST /api/v1/saved-filters
  fastify.post<{ Params: { orgId: string } }>(
    '/api/v1/organizations/:orgId/saved-filters',
    async (request, reply) => {
      request.body = createSavedFilterSchema.parse(request.body);
      return createSavedFilterHandler(
        request as Parameters<typeof createSavedFilterHandler>[0],
        reply,
      );
    },
  );

  // GET /api/v1/saved-filters
  fastify.get<{ Params: { orgId: string } }>(
    '/api/v1/organizations/:orgId/saved-filters',
    listSavedFiltersHandler,
  );

  // PATCH /api/v1/saved-filters/:id
  fastify.patch<{ Params: { id: string } }>('/api/v1/saved-filters/:id', async (request, reply) => {
    request.body = updateSavedFilterSchema.parse(request.body);
    return updateSavedFilterHandler(
      request as Parameters<typeof updateSavedFilterHandler>[0],
      reply,
    );
  });

  // DELETE /api/v1/saved-filters/:id
  fastify.delete<{ Params: { id: string } }>('/api/v1/saved-filters/:id', deleteSavedFilterHandler);
}
