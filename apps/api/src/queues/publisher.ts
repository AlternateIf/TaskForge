import amqplib from 'amqplib';
import {
  DEAD_LETTER_EXCHANGE,
  EXCHANGE,
  QUEUES,
  RABBITMQ_URL,
  type TaskForgeMessage,
} from './config.js';

let connection: amqplib.ChannelModel | null = null;
let channel: amqplib.ConfirmChannel | null = null;

export async function initPublisher(): Promise<void> {
  const conn = await amqplib.connect(RABBITMQ_URL);
  const ch = await conn.createConfirmChannel();

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

    // Dead-letter queue
    await ch.assertQueue(deadLetterQueue, { durable: true });
    await ch.bindQueue(deadLetterQueue, DEAD_LETTER_EXCHANGE, deadLetterQueue);
  }

  conn.on('error', (err) => {
    console.error('[Publisher] Connection error:', err.message);
  });

  conn.on('close', () => {
    console.warn('[Publisher] Connection closed');
    channel = null;
    connection = null;
  });

  connection = conn;
  channel = ch;
}

export async function publish<T = unknown>(
  routingKey: string,
  data: T,
  correlationId?: string,
): Promise<void> {
  const ch = channel;
  if (!ch) {
    throw new Error('Publisher not initialized. Call initPublisher() first.');
  }

  const message: TaskForgeMessage<T> = {
    type: routingKey,
    timestamp: new Date().toISOString(),
    data,
    correlationId: correlationId ?? crypto.randomUUID(),
  };

  const buffer = Buffer.from(JSON.stringify(message));

  await new Promise<void>((resolve, reject) => {
    ch.publish(
      EXCHANGE,
      routingKey,
      buffer,
      {
        persistent: true,
        contentType: 'application/json',
        messageId: crypto.randomUUID(),
        timestamp: Math.floor(Date.now() / 1000),
        headers: { 'x-retry-count': 0 },
      },
      (err) => {
        if (err) reject(err);
        else resolve();
      },
    );
  });
}

export async function shutdownPublisher(): Promise<void> {
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
