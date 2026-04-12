import type { FastifyReply, FastifyRequest } from 'fastify';
import * as notificationService from '../../services/notification.service.js';
import { AppError, ErrorCode } from '../../utils/errors.js';
import { paginated, success } from '../../utils/response.js';
import type { ListNotificationsQuery, UpdatePreferencesInput } from './notifications.schemas.js';

function requireAuth(request: FastifyRequest): string {
  if (!request.authUser) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Not authenticated');
  }
  return request.authUser.userId;
}

export async function listNotificationsHandler(
  request: FastifyRequest<{ Querystring: ListNotificationsQuery }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  const { cursor, limit, orgId } = request.query;
  const result = await notificationService.listNotifications(userId, cursor, limit, orgId);
  return reply.status(200).send(paginated(result.items, result.cursor, result.hasMore));
}

export async function markAsReadHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  const orgId = (request.query as { orgId?: string }).orgId;
  await notificationService.markAsRead(request.params.id, userId, orgId);
  return reply.status(204).send();
}

export async function markAllAsReadHandler(request: FastifyRequest, reply: FastifyReply) {
  const userId = requireAuth(request);
  const orgId = (request.query as { orgId?: string }).orgId;
  await notificationService.markAllAsRead(userId, orgId);
  return reply.status(204).send();
}

export async function getUnreadCountHandler(request: FastifyRequest, reply: FastifyReply) {
  const userId = requireAuth(request);
  const orgId = (request.query as { orgId?: string }).orgId;
  const count = await notificationService.getUnreadCount(userId, orgId);
  return reply.status(200).send(success({ count }));
}

export async function getPreferencesHandler(request: FastifyRequest, reply: FastifyReply) {
  const userId = requireAuth(request);
  const orgId = (request.query as { orgId?: string }).orgId;
  const prefs = await notificationService.getPreferences(userId, orgId);
  return reply.status(200).send(success(prefs));
}

export async function updatePreferencesHandler(
  request: FastifyRequest<{ Body: UpdatePreferencesInput }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  const prefs = await notificationService.updatePreferences(userId, request.body);
  return reply.status(200).send(success(prefs));
}
