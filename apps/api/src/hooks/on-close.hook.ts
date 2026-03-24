import { pool } from '@taskforge/db';
import type { FastifyInstance } from 'fastify';

let isShuttingDown = false;

export function isServerShuttingDown(): boolean {
  return isShuttingDown;
}

export function registerGracefulShutdown(fastify: FastifyInstance) {
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    fastify.log.info({ signal }, 'Graceful shutdown initiated');

    // Close the server (stop accepting new connections, drain in-flight)
    const shutdownTimeout = setTimeout(() => {
      fastify.log.error('Shutdown timeout exceeded (30s), forcing exit');
      process.exit(1);
    }, 30_000);

    try {
      await fastify.close();
      await pool.end();
      fastify.log.info('Graceful shutdown complete');
    } catch (err) {
      fastify.log.error({ err }, 'Error during shutdown');
    } finally {
      clearTimeout(shutdownTimeout);
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
