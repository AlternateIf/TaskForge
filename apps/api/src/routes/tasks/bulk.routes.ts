import { bulkActionSchema, undoSchema } from '@taskforge/shared';
import type { BulkActionInput, UndoInput } from '@taskforge/shared';
import type { FastifyInstance } from 'fastify';
import { bulkActionHandler, undoHandler } from './bulk.handlers.js';

export async function bulkRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  // POST /api/v1/tasks/bulk
  fastify.post<{ Body: BulkActionInput }>(
    '/api/v1/tasks/bulk',
    {
      preHandler: async (request) => {
        request.body = bulkActionSchema.parse(request.body);
      },
    },
    bulkActionHandler,
  );

  // POST /api/v1/tasks/undo
  fastify.post<{ Body: UndoInput }>(
    '/api/v1/tasks/undo',
    {
      preHandler: async (request) => {
        request.body = undoSchema.parse(request.body);
      },
    },
    undoHandler,
  );
}
