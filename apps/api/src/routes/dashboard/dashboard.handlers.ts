import type { FastifyReply, FastifyRequest } from 'fastify';
import * as dashboardService from '../../services/dashboard.service.js';
import { AppError, ErrorCode } from '../../utils/errors.js';
import { success } from '../../utils/response.js';
import { paginated } from '../../utils/response.js';

function requireAuth(request: FastifyRequest): string {
  if (!request.authUser) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Not authenticated');
  }
  return request.authUser.userId;
}

// --- My Tasks ---

export async function getMyTasksHandler(
  request: FastifyRequest<{
    Params: { orgId: string };
    Querystring: {
      limit?: string;
      cursor?: string;
    };
  }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  const q = request.query;
  const result = await dashboardService.getMyTasks(request.params.orgId, userId, {
    limit: q.limit ? Number(q.limit) : 50,
    cursor: q.cursor,
  });
  return reply
    .status(200)
    .send(paginated(result.items, result.cursor, result.hasMore, result.totalCount));
}

// --- Upcoming Tasks ---

export async function getUpcomingTasksHandler(
  request: FastifyRequest<{
    Params: { orgId: string };
    Querystring: {
      weekOffset?: string;
    };
  }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  const q = request.query;
  const result = await dashboardService.getUpcomingTasks(request.params.orgId, userId, {
    weekOffset: q.weekOffset ? Number(q.weekOffset) : 0,
  });
  return reply.status(200).send(success(result));
}

// --- Project Progress ---

export async function getProjectProgressHandler(
  request: FastifyRequest<{
    Params: { orgId: string };
    Querystring: {
      limit?: string;
      cursor?: string;
    };
  }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  const q = request.query;
  const result = await dashboardService.getProjectProgress(request.params.orgId, userId, {
    limit: q.limit ? Number(q.limit) : 10,
    cursor: q.cursor,
  });
  return reply
    .status(200)
    .send(paginated(result.items, result.cursor, result.hasMore, result.totalCount));
}

// --- Summary ---

export async function getSummaryHandler(
  request: FastifyRequest<{
    Params: { orgId: string };
  }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  const result = await dashboardService.getDashboardSummary(request.params.orgId, userId);
  return reply.status(200).send(success(result));
}
