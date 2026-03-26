import type { FastifyReply, FastifyRequest } from 'fastify';
import * as activityService from '../../services/activity.service.js';
import { AppError, ErrorCode } from '../../utils/errors.js';
import { paginated } from '../../utils/response.js';
import type { ActivityQuery } from './activity.schemas.js';

function requireAuth(request: FastifyRequest): string {
  if (!request.authUser) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Not authenticated');
  }
  return request.authUser.userId;
}

export async function getTaskActivityHandler(
  request: FastifyRequest<{ Params: { taskId: string }; Querystring: ActivityQuery }>,
  reply: FastifyReply,
) {
  requireAuth(request);
  const { items, cursor, hasMore } = await activityService.listActivity({
    entityType: 'task',
    entityId: request.params.taskId,
    cursor: request.query.cursor,
    limit: request.query.limit,
  });
  return reply.status(200).send(paginated(items, cursor, hasMore));
}

export async function getProjectActivityHandler(
  request: FastifyRequest<{ Params: { projectId: string }; Querystring: ActivityQuery }>,
  reply: FastifyReply,
) {
  requireAuth(request);
  const { items, cursor, hasMore } = await activityService.listActivity({
    entityType: 'project',
    entityId: request.params.projectId,
    cursor: request.query.cursor,
    limit: request.query.limit,
  });
  return reply.status(200).send(paginated(items, cursor, hasMore));
}

export async function getOrgActivityHandler(
  request: FastifyRequest<{ Params: { orgId: string }; Querystring: ActivityQuery }>,
  reply: FastifyReply,
) {
  requireAuth(request);
  const { items, cursor, hasMore } = await activityService.listOrgActivity({
    organizationId: request.params.orgId,
    cursor: request.query.cursor,
    limit: request.query.limit,
  });
  return reply.status(200).send(paginated(items, cursor, hasMore));
}
