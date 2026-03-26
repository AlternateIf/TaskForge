import Redis from 'ioredis';
import { broadcast, type RealtimeEvent } from './channels.js';

const REDIS_CHANNEL_PREFIX = 'realtime:';

let publisher: Redis | null = null;
let subscriber: Redis | null = null;

export async function initRealtimeSubscriber(): Promise<void> {
  const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

  publisher = new Redis(redisUrl, { maxRetriesPerRequest: 3, lazyConnect: true });
  await publisher.connect();

  subscriber = new Redis(redisUrl, { maxRetriesPerRequest: 3, lazyConnect: true });
  await subscriber.connect();

  // Subscribe to realtime pattern
  await subscriber.psubscribe(`${REDIS_CHANNEL_PREFIX}*`);

  subscriber.on('pmessage', (_pattern: string, redisChannel: string, message: string) => {
    try {
      const event: RealtimeEvent = JSON.parse(message);
      broadcast(event);
    } catch {
      // Ignore malformed messages
    }
  });
}

export async function publishToRedis(channel: string, event: RealtimeEvent): Promise<void> {
  if (!publisher) {
    throw new Error('Redis publisher not initialized. Call initRealtimeSubscriber() first.');
  }
  await publisher.publish(`${REDIS_CHANNEL_PREFIX}${channel}`, JSON.stringify(event));
}

export async function shutdownRealtimeSubscriber(): Promise<void> {
  try {
    if (subscriber) {
      await subscriber.punsubscribe();
      subscriber.disconnect();
      subscriber = null;
    }
    if (publisher) {
      publisher.disconnect();
      publisher = null;
    }
  } catch {
    // Ignore close errors during shutdown
  }
}
