import { initConsumer, registerConsumer, shutdownConsumer } from './queues/consumer.js';
import { checkDeadlineReminders } from './queues/handlers/deadline-reminder.handler.js';
import { emailHandler } from './queues/handlers/email.handler.js';
import { notificationHandler } from './queues/handlers/notification.handler.js';
import { realtimeBroadcastHandler } from './queues/handlers/realtime-broadcast.handler.js';
import { searchIndexHandler } from './queues/handlers/search-index.handler.js';
import { initPublisher } from './queues/publisher.js';

const DEADLINE_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
let deadlineInterval: ReturnType<typeof setInterval> | null = null;

async function startWorker(): Promise<void> {
  console.info('[Worker] Starting...');

  await initConsumer();
  console.info('[Worker] Connected to RabbitMQ');

  await initPublisher();
  console.info('[Worker] Publisher connected');

  registerConsumer('email.send', emailHandler);
  registerConsumer('notification.create', notificationHandler);
  registerConsumer('search.index', searchIndexHandler);
  registerConsumer('realtime.broadcast', realtimeBroadcastHandler);

  // Deadline reminder cron — runs hourly
  deadlineInterval = setInterval(async () => {
    try {
      await checkDeadlineReminders();
      console.info('[Worker] Deadline reminder check complete');
    } catch (err) {
      console.error('[Worker] Deadline reminder check failed:', err);
    }
  }, DEADLINE_CHECK_INTERVAL_MS);

  // Run once on startup
  checkDeadlineReminders().catch((err) => {
    console.error('[Worker] Initial deadline reminder check failed:', err);
  });

  console.info('[Worker] All consumers registered. Waiting for messages...');
}

async function gracefulShutdown(signal: string): Promise<void> {
  console.info(`[Worker] ${signal} received, shutting down...`);

  const shutdownTimeout = setTimeout(() => {
    console.error('[Worker] Shutdown timeout exceeded (30s), forcing exit');
    process.exit(1);
  }, 30_000);

  try {
    if (deadlineInterval) clearInterval(deadlineInterval);
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
