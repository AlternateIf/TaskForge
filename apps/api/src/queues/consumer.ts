import amqplib from 'amqplib';
import {
  DEAD_LETTER_EXCHANGE,
  EXCHANGE,
  MAX_RETRIES,
  QUEUES,
  RABBITMQ_URL,
  RETRY_BACKOFF_MS,
  type TaskForgeMessage,
} from './config.js';

export type MessageHandler = (message: TaskForgeMessage) => Promise<void>;

let connection: amqplib.ChannelModel | null = null;
let channel: amqplib.Channel | null = null;
let isShuttingDown = false;
let activeMessages = 0;

export async function initConsumer(): Promise<void> {
  isShuttingDown = false;
  activeMessages = 0;
  const conn = await amqplib.connect(RABBITMQ_URL);
  const ch = await conn.createChannel();
  await ch.prefetch(1);

  // Assert exchanges
  await ch.assertExchange(EXCHANGE, 'topic', { durable: true });
  await ch.assertExchange(DEAD_LETTER_EXCHANGE, 'topic', { durable: true });

  // Assert queues and bindings
  for (const { queue, routingPattern, deadLetterQueue } of QUEUES) {
    await ch.assertQueue(queue, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': DEAD_LETTER_EXCHANGE,
        'x-dead-letter-routing-key': deadLetterQueue,
      },
    });
    await ch.bindQueue(queue, EXCHANGE, routingPattern);

    await ch.assertQueue(deadLetterQueue, { durable: true });
    await ch.bindQueue(deadLetterQueue, DEAD_LETTER_EXCHANGE, deadLetterQueue);
  }

  conn.on('error', (err) => {
    console.error('[Consumer] Connection error:', err.message);
  });

  conn.on('close', () => {
    console.warn('[Consumer] Connection closed');
    channel = null;
    connection = null;
  });

  connection = conn;
  channel = ch;
}

export function registerConsumer(queueName: string, handler: MessageHandler): void {
  if (!channel) {
    throw new Error('Consumer not initialized. Call initConsumer() first.');
  }

  channel.consume(queueName, async (msg) => {
    if (!msg || isShuttingDown) return;

    activeMessages++;

    try {
      const content: TaskForgeMessage = JSON.parse(msg.content.toString());
      await handler(content);
      channel?.ack(msg);
    } catch (err) {
      const retryCount = (msg.properties.headers?.['x-retry-count'] as number) ?? 0;

      if (retryCount < MAX_RETRIES) {
        // Re-publish with incremented retry count and backoff delay
        const backoff =
          RETRY_BACKOFF_MS[retryCount] ?? RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1];

        setTimeout(() => {
          if (!channel) return;
          channel.publish(EXCHANGE, msg.fields.routingKey, msg.content, {
            ...msg.properties,
            headers: {
              ...msg.properties.headers,
              'x-retry-count': retryCount + 1,
              'x-last-error': err instanceof Error ? err.message : String(err),
            },
          });
          channel.ack(msg);
        }, backoff);
      } else {
        // Max retries exceeded — dead-letter via reject
        console.error(
          `[Consumer] Message dead-lettered after ${MAX_RETRIES} retries:`,
          msg.fields.routingKey,
          err instanceof Error ? err.message : err,
        );
        channel?.reject(msg, false);
      }
    } finally {
      activeMessages--;
    }
  });

  console.info(`[Consumer] Registered handler for queue: ${queueName}`);
}

export async function shutdownConsumer(): Promise<void> {
  isShuttingDown = true;

  // Wait for in-progress messages to finish (up to 30s)
  const deadline = Date.now() + 30_000;
  while (activeMessages > 0 && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  if (activeMessages > 0) {
    console.warn(`[Consumer] Forcing shutdown with ${activeMessages} active message(s)`);
  }

  try {
    if (channel) {
      await channel.close();
      channel = null;
    }
    if (connection) {
      await connection.close();
      connection = null;
    }
  } catch {
    // Ignore close errors during shutdown
  }
}
