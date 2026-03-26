import type { FastifyInstance } from 'fastify';
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

  fastify.get('/api/v1/notifications', async (request, reply) => {
    request.query = listNotificationsQuerySchema.parse(request.query);
    return listNotificationsHandler(
      request as Parameters<typeof listNotificationsHandler>[0],
      reply,
    );
  });

  fastify.patch<{ Params: { id: string } }>('/api/v1/notifications/:id/read', markAsReadHandler);

  fastify.post('/api/v1/notifications/read-all', markAllAsReadHandler);

  fastify.get('/api/v1/notifications/unread-count', getUnreadCountHandler);

  fastify.get('/api/v1/notification-preferences', getPreferencesHandler);

  fastify.patch('/api/v1/notification-preferences', async (request, reply) => {
    request.body = updatePreferencesSchema.parse(request.body);
    return updatePreferencesHandler(
      request as Parameters<typeof updatePreferencesHandler>[0],
      reply,
    );
  });
}
