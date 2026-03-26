import type { TaskForgeMessage } from '../config.js';

export async function notificationHandler(message: TaskForgeMessage): Promise<void> {
  console.info(`[Notification] Processing ${message.type}`, {
    correlationId: message.correlationId,
  });

  // TODO: Implement in-app notification creation in MVP-020
  // For now, log the message data
  console.info('[Notification] Message data:', JSON.stringify(message.data));
}
