import Fastify from 'fastify';
import cacheHook from './hooks/cache.hook.js';
import { registerGracefulShutdown } from './hooks/on-close.hook.js';
import { registerErrorHandler } from './hooks/on-error.hook.js';
import onRequestHook from './hooks/on-request.hook.js';
import authPlugin from './plugins/auth.plugin.js';
import cookiePlugin from './plugins/cookie.plugin.js';
import corsPlugin from './plugins/cors.plugin.js';
import helmetPlugin from './plugins/helmet.plugin.js';
import multipartPlugin from './plugins/multipart.plugin.js';
import rateLimitPlugin from './plugins/rate-limit.plugin.js';
import requestIdPlugin from './plugins/request-id.plugin.js';
import swaggerPlugin from './plugins/swagger.plugin.js';
import { initPublisher, shutdownPublisher } from './queues/publisher.js';
import { activityRoutes } from './routes/activity/activity.routes.js';
import { attachmentRoutes } from './routes/attachments/attachments.routes.js';
import { authRoutes } from './routes/auth/auth.routes.js';
import { mfaRoutes } from './routes/auth/mfa.routes.js';
import { oauthRoutes } from './routes/auth/oauth.routes.js';
import { checklistRoutes } from './routes/checklists/checklists.routes.js';
import { commentRoutes } from './routes/comments/comments.routes.js';
import { healthRoutes } from './routes/health/health.routes.js';
import { invitationRoutes } from './routes/invitations/invitations.routes.js';
import { notificationRoutes } from './routes/notifications/notifications.routes.js';
import { organizationRoutes } from './routes/organizations/organizations.routes.js';
import { projectRoutes } from './routes/projects/projects.routes.js';
import { rbacRoutes } from './routes/rbac/rbac.routes.js';
import { savedFilterRoutes } from './routes/saved-filters/saved-filters.routes.js';
import { searchRoutes } from './routes/search/search.routes.js';
import { bulkRoutes } from './routes/tasks/bulk.routes.js';
import { dependencyRoutes } from './routes/tasks/dependencies.routes.js';
import { subtaskRoutes } from './routes/tasks/subtasks.routes.js';
import { taskRoutes } from './routes/tasks/tasks.routes.js';
import { userPublicRoutes, userRoutes } from './routes/users/users.routes.js';
import { bootstrapSuperAdmin } from './services/auth.service.js';
import { initIndexes } from './services/search.service.js';
import { loggerConfig } from './utils/logger.js';
import { realtimeGateway } from './ws/gateway.js';
import { sseRoutes } from './ws/sse.js';

export async function buildServer() {
  const fastify = Fastify({
    logger: loggerConfig,
    genReqId: () => crypto.randomUUID(),
    requestIdHeader: 'x-request-id',
  });

  // Plugins (order matters)
  await fastify.register(requestIdPlugin);
  await fastify.register(corsPlugin);
  await fastify.register(helmetPlugin);
  await fastify.register(rateLimitPlugin);
  await fastify.register(swaggerPlugin);
  await fastify.register(cookiePlugin);
  await fastify.register(multipartPlugin);
  await fastify.register(authPlugin);

  // Hooks
  await fastify.register(onRequestHook);
  await fastify.register(cacheHook);

  // Error handling
  registerErrorHandler(fastify);

  // Routes
  await fastify.register(healthRoutes);
  await fastify.register(authRoutes);
  await fastify.register(oauthRoutes);
  await fastify.register(invitationRoutes);
  await fastify.register(rbacRoutes);
  await fastify.register(mfaRoutes);
  await fastify.register(organizationRoutes);
  await fastify.register(projectRoutes);
  await fastify.register(taskRoutes);
  await fastify.register(subtaskRoutes);
  await fastify.register(dependencyRoutes);
  await fastify.register(bulkRoutes);
  await fastify.register(checklistRoutes);
  await fastify.register(commentRoutes);
  await fastify.register(attachmentRoutes);
  await fastify.register(activityRoutes);
  await fastify.register(searchRoutes);
  await fastify.register(savedFilterRoutes);
  await fastify.register(notificationRoutes);
  await fastify.register(userRoutes);
  await fastify.register(userPublicRoutes);
  await fastify.register(realtimeGateway);
  await fastify.register(sseRoutes);

  return fastify;
}

export async function startServer() {
  const server = await buildServer();
  const port = Number.parseInt(process.env.PORT ?? '3000', 10);
  const host = process.env.HOST ?? '0.0.0.0';

  registerGracefulShutdown(server);

  await bootstrapSuperAdmin();
  server.log.info('Bootstrap super admin check completed');

  // Initialize Meilisearch indexes
  try {
    await initIndexes();
    server.log.info('Meilisearch indexes initialized');
  } catch (err) {
    server.log.warn({ err }, 'Meilisearch index initialization failed — search may not work');
  }

  // Initialize RabbitMQ publisher
  try {
    await initPublisher();
    server.log.info('RabbitMQ publisher connected');
  } catch (err) {
    server.log.warn(
      { err },
      'RabbitMQ publisher failed to connect — messages will not be published',
    );
  }

  // Shutdown publisher on server close
  server.addHook('onClose', async () => {
    await shutdownPublisher();
  });

  await server.listen({ port, host });
  server.log.info(`Server listening on ${host}:${port}`);

  return server;
}
