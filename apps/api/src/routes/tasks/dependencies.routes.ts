import { createDependencySchema } from '@taskforge/shared';
import type { CreateDependencyInput } from '@taskforge/shared';
import type { FastifyInstance } from 'fastify';
import { authorize } from '../../hooks/authorize.hook.js';
import { getTaskIdForDependency } from '../../services/dependency.service.js';
import {
  createDependencyHandler,
  deleteDependencyHandler,
  listDependenciesHandler,
} from './dependencies.handlers.js';

const getTaskIdFromParams = (req: import('fastify').FastifyRequest) =>
  (req.params as { taskId: string }).taskId;

export async function dependencyRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  // POST /api/v1/tasks/:taskId/dependencies
  fastify.post<{ Params: { taskId: string }; Body: CreateDependencyInput }>(
    '/api/v1/tasks/:taskId/dependencies',
    {
      preHandler: [
        authorize({
          resource: 'task',
          action: 'update',
          getTaskId: getTaskIdFromParams,
        }),
        async (request) => {
          request.body = createDependencySchema.parse(request.body);
        },
      ],
    },
    createDependencyHandler,
  );

  // GET /api/v1/tasks/:taskId/dependencies
  fastify.get<{ Params: { taskId: string } }>(
    '/api/v1/tasks/:taskId/dependencies',
    {
      preHandler: authorize({
        resource: 'task',
        action: 'read',
        getTaskId: getTaskIdFromParams,
      }),
    },
    listDependenciesHandler,
  );

  // DELETE /api/v1/task-dependencies/:id
  fastify.delete<{ Params: { id: string } }>(
    '/api/v1/task-dependencies/:id',
    {
      preHandler: authorize({
        resource: 'task',
        action: 'update',
        getTaskId: async (req) => {
          const depId = (req.params as { id: string }).id;
          return getTaskIdForDependency(depId);
        },
      }),
    },
    deleteDependencyHandler,
  );
}
