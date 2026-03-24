import Fastify from 'fastify';
import { registerGracefulShutdown } from './hooks/on-close.hook.js';
import { registerErrorHandler } from './hooks/on-error.hook.js';
import onRequestHook from './hooks/on-request.hook.js';
import corsPlugin from './plugins/cors.plugin.js';
import helmetPlugin from './plugins/helmet.plugin.js';
import rateLimitPlugin from './plugins/rate-limit.plugin.js';
import requestIdPlugin from './plugins/request-id.plugin.js';
import swaggerPlugin from './plugins/swagger.plugin.js';
import { healthRoutes } from './routes/health/health.routes.js';
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

  // Hooks
  await fastify.register(onRequestHook);

  // Error handling
  registerErrorHandler(fastify);

  // Routes
  await fastify.register(healthRoutes);

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
