import type { FastifyInstance } from 'fastify';
import { authorize } from '../../hooks/authorize.hook.js';
import {
  getMyTasksHandler,
  getProjectProgressHandler,
  getSummaryHandler,
  getUpcomingTasksHandler,
} from './dashboard.handlers.js';

const getOrgId = (req: import('fastify').FastifyRequest) => (req.params as { orgId: string }).orgId;

export async function dashboardRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  // --- My Tasks (paginated) ---
  fastify.get<{
    Params: { orgId: string };
    Querystring: {
      limit?: string;
      cursor?: string;
    };
  }>(
    '/api/v1/organizations/:orgId/dashboard/tasks/my-tasks',
    {
      preHandler: authorize({
        resource: 'project',
        action: 'read',
        getOrgId,
      }),
    },
    getMyTasksHandler,
  );

  // --- Upcoming Tasks (grouped by day) ---
  fastify.get<{
    Params: { orgId: string };
    Querystring: {
      weekOffset?: string;
    };
  }>(
    '/api/v1/organizations/:orgId/dashboard/tasks/upcoming',
    {
      preHandler: authorize({
        resource: 'project',
        action: 'read',
        getOrgId,
      }),
    },
    getUpcomingTasksHandler,
  );

  // --- Project Progress ---
  fastify.get<{
    Params: { orgId: string };
    Querystring: {
      limit?: string;
      cursor?: string;
    };
  }>(
    '/api/v1/organizations/:orgId/dashboard/projects/progress',
    {
      preHandler: authorize({
        resource: 'project',
        action: 'read',
        getOrgId,
      }),
    },
    getProjectProgressHandler,
  );

  // --- Dashboard Summary ---
  fastify.get<{
    Params: { orgId: string };
  }>(
    '/api/v1/organizations/:orgId/dashboard/summary',
    {
      preHandler: authorize({
        resource: 'project',
        action: 'read',
        getOrgId,
      }),
    },
    getSummaryHandler,
  );
}
