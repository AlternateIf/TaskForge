import { bulkActionSchema } from '@taskforge/shared';
import type { BulkActionInput } from '@taskforge/shared';
import type { FastifyInstance } from 'fastify';
import { validateBulkTaskAccess } from '../../services/bulk.service.js';
import { AppError, ErrorCode } from '../../utils/errors.js';
import { bulkActionHandler } from './bulk.handlers.js';

export async function bulkRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  // POST /api/v1/tasks/bulk
  fastify.post<{ Body: BulkActionInput }>(
    '/api/v1/tasks/bulk',
    {
      preHandler: async (request) => {
        request.body = bulkActionSchema.parse(request.body);
        // Verify the caller has access to all tasks' projects
        if (!request.authUser) {
          throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Not authenticated');
        }
        const body = request.body as BulkActionInput;
        await validateBulkTaskAccess(body.ids, request.authUser.userId);
      },
    },
    bulkActionHandler,
  );
}
