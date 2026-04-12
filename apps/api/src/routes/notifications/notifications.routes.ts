import type { FastifyInstance } from 'fastify';
import { authorize } from '../../hooks/authorize.hook.js';
import {
  getPreferencesHandler,
  getUnreadCountHandler,
  listNotificationsHandler,
  markAllAsReadHandler,
  markAsReadHandler,
  updatePreferencesHandler,
} from './notifications.handlers.js';
import { listNotificationsQuerySchema, updatePreferencesSchema } from './notifications.schemas.js';

export async function notificationRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  // GET /api/v1/notifications
  fastify.get(
    '/api/v1/notifications',
    {
      preHandler: [
        authorize({
          resource: 'notification',
          action: 'read',
          getOrgId: (req) => (req.query as { orgId?: string }).orgId,
        }),
      ],
    },
    async (request, reply) => {
      request.query = listNotificationsQuerySchema.parse(request.query);
      return listNotificationsHandler(
        request as Parameters<typeof listNotificationsHandler>[0],
        reply,
      );
    },
  );

  // PATCH /api/v1/notifications/:id/read
  fastify.patch<{ Params: { id: string } }>(
    '/api/v1/notifications/:id/read',
    {
      preHandler: [
        authorize({
          resource: 'notification',
          action: 'read',
          getOrgId: (req) => (req.query as { orgId?: string }).orgId,
        }),
      ],
    },
    markAsReadHandler,
  );

  // POST /api/v1/notifications/read-all
  fastify.post(
    '/api/v1/notifications/read-all',
    {
      preHandler: [
        authorize({
          resource: 'notification',
          action: 'read',
          getOrgId: (req) => (req.query as { orgId?: string }).orgId,
        }),
      ],
    },
    markAllAsReadHandler,
  );

  // GET /api/v1/notifications/unread-count
  fastify.get(
    '/api/v1/notifications/unread-count',
    {
      preHandler: [
        authorize({
          resource: 'notification',
          action: 'read',
          getOrgId: (req) => (req.query as { orgId?: string }).orgId,
        }),
      ],
    },
    getUnreadCountHandler,
  );

  // GET /api/v1/notification-preferences
  fastify.get(
    '/api/v1/notification-preferences',
    {
      preHandler: [
        authorize({
          resource: 'notification',
          action: 'read',
          getOrgId: (req) => (req.query as { orgId?: string }).orgId,
        }),
      ],
    },
    getPreferencesHandler,
  );

  // PATCH /api/v1/notification-preferences
  fastify.patch(
    '/api/v1/notification-preferences',
    {
      preHandler: [
        authorize({
          resource: 'notification',
          action: 'read',
          getOrgId: (req) => (req.query as { orgId?: string }).orgId,
        }),
      ],
    },
    async (request, reply) => {
      request.body = updatePreferencesSchema.parse(request.body);
      return updatePreferencesHandler(
        request as Parameters<typeof updatePreferencesHandler>[0],
        reply,
      );
    },
  );
}
