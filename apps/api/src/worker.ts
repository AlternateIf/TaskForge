import { initConsumer, registerConsumer, shutdownConsumer } from './queues/consumer.js';
import { emailHandler } from './queues/handlers/email.handler.js';
import { notificationHandler } from './queues/handlers/notification.handler.js';
import { searchIndexHandler } from './queues/handlers/search-index.handler.js';

async function startWorker(): Promise<void> {
  console.info('[Worker] Starting...');

  await initConsumer();
  console.info('[Worker] Connected to RabbitMQ');

  registerConsumer('email.send', emailHandler);
  registerConsumer('notification.create', notificationHandler);
  registerConsumer('search.index', searchIndexHandler);

  console.info('[Worker] All consumers registered. Waiting for messages...');
}

async function gracefulShutdown(signal: string): Promise<void> {
  console.info(`[Worker] ${signal} received, shutting down...`);

  const shutdownTimeout = setTimeout(() => {
    console.error('[Worker] Shutdown timeout exceeded (30s), forcing exit');
    process.exit(1);
  }, 30_000);

  try {
    await shutdownConsumer();
    console.info('[Worker] Graceful shutdown complete');
  } catch (err) {
    console.error('[Worker] Error during shutdown:', err);
  } finally {
    clearTimeout(shutdownTimeout);
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startWorker().catch((err) => {
  console.error('[Worker] Failed to start:', err);
  process.exit(1);
});
