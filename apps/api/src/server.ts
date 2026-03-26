import Fastify from 'fastify';
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
import { activityRoutes } from './routes/activity/activity.routes.js';
import { attachmentRoutes } from './routes/attachments/attachments.routes.js';
import { authRoutes } from './routes/auth/auth.routes.js';
import { mfaRoutes } from './routes/auth/mfa.routes.js';
import { oauthRoutes } from './routes/auth/oauth.routes.js';
import { checklistRoutes } from './routes/checklists/checklists.routes.js';
import { commentRoutes } from './routes/comments/comments.routes.js';
import { healthRoutes } from './routes/health/health.routes.js';
import { organizationRoutes } from './routes/organizations/organizations.routes.js';
import { projectRoutes } from './routes/projects/projects.routes.js';
import { bulkRoutes } from './routes/tasks/bulk.routes.js';
import { dependencyRoutes } from './routes/tasks/dependencies.routes.js';
import { subtaskRoutes } from './routes/tasks/subtasks.routes.js';
import { taskRoutes } from './routes/tasks/tasks.routes.js';
import { userRoutes } from './routes/users/users.routes.js';
import { loggerConfig } from './utils/logger.js';

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

  // Error handling
  registerErrorHandler(fastify);

  // Routes
  await fastify.register(healthRoutes);
  await fastify.register(authRoutes);
  await fastify.register(oauthRoutes);
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
  await fastify.register(userRoutes);

  return fastify;
}

export async function startServer() {
  const server = await buildServer();
  const port = Number.parseInt(process.env.PORT ?? '3000', 10);
  const host = process.env.HOST ?? '0.0.0.0';

  registerGracefulShutdown(server);

  await server.listen({ port, host });
  server.log.info(`Server listening on ${host}:${port}`);

  return server;
}
