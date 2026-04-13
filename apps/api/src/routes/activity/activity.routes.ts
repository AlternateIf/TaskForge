import type { FastifyInstance } from 'fastify';
import { authorize } from '../../hooks/authorize.hook.js';
import { getTaskActivityHandler } from './activity.handlers.js';
import type { ActivityQuery } from './activity.schemas.js';

export async function activityRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  // GET /api/v1/tasks/:taskId/activity
  fastify.get<{ Params: { taskId: string }; Querystring: ActivityQuery }>(
    '/api/v1/tasks/:taskId/activity',
    {
      preHandler: authorize({
        resource: 'task',
        action: 'read',
        getTaskId: (req) => (req.params as { taskId: string }).taskId,
      }),
    },
    getTaskActivityHandler,
  );
}
