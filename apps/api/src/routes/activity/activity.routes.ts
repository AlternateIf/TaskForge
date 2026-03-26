import type { FastifyInstance } from 'fastify';
import { authorize } from '../../hooks/authorize.hook.js';
import {
  getOrgActivityHandler,
  getProjectActivityHandler,
  getTaskActivityHandler,
} from './activity.handlers.js';
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

  // GET /api/v1/projects/:projectId/activity
  fastify.get<{ Params: { projectId: string }; Querystring: ActivityQuery }>(
    '/api/v1/projects/:projectId/activity',
    {
      preHandler: authorize({
        resource: 'project',
        action: 'read',
        getProjectId: (req) => (req.params as { projectId: string }).projectId,
      }),
    },
    getProjectActivityHandler,
  );

  // GET /api/v1/organizations/:orgId/activity (admin only)
  fastify.get<{ Params: { orgId: string }; Querystring: ActivityQuery }>(
    '/api/v1/organizations/:orgId/activity',
    {
      preHandler: authorize({
        resource: 'organization',
        action: 'manage',
        getOrgId: (req) => (req.params as { orgId: string }).orgId,
      }),
    },
    getOrgActivityHandler,
  );
}
