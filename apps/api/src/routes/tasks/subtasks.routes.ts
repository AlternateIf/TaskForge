import { createSubtaskSchema } from '@taskforge/shared';
import type { CreateSubtaskInput } from '@taskforge/shared';
import type { FastifyInstance } from 'fastify';
import { authorize } from '../../hooks/authorize.hook.js';
import { requireFeature } from '../../hooks/require-feature.hook.js';
import { createSubtaskHandler, listSubtasksHandler } from './subtasks.handlers.js';

const getTaskIdFromParams = (req: import('fastify').FastifyRequest) =>
  (req.params as { taskId: string }).taskId;

export async function subtaskRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  // POST /api/v1/tasks/:taskId/subtasks
  fastify.post<{ Params: { taskId: string }; Body: CreateSubtaskInput }>(
    '/api/v1/tasks/:taskId/subtasks',
    {
      preHandler: [
        authorize({
          resource: 'task',
          action: 'create',
          getTaskId: getTaskIdFromParams,
        }),
        requireFeature('subtasks'),
        async (request) => {
          request.body = createSubtaskSchema.parse(request.body);
        },
      ],
    },
    createSubtaskHandler,
  );

  // GET /api/v1/tasks/:taskId/subtasks
  fastify.get<{ Params: { taskId: string } }>(
    '/api/v1/tasks/:taskId/subtasks',
    {
      preHandler: [
        authorize({
          resource: 'task',
          action: 'read',
          getTaskId: getTaskIdFromParams,
        }),
        requireFeature('subtasks'),
      ],
    },
    listSubtasksHandler,
  );
}
