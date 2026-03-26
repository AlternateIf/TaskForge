import { publishToRedis } from '../../ws/redis-subscriber.js';
import type { TaskForgeMessage } from '../config.js';

interface RealtimeBroadcastData {
  eventType: string;
  channels: string[];
  payload: unknown;
}

export async function realtimeBroadcastHandler(message: TaskForgeMessage): Promise<void> {
  const { eventType, channels, payload } = message.data as RealtimeBroadcastData;

  const event = {
    type: eventType,
    timestamp: message.timestamp,
    data: payload,
  };

  // Publish to each target channel via Redis pub/sub
  for (const channel of channels) {
    await publishToRedis(channel, { ...event, channel });
  }
}
