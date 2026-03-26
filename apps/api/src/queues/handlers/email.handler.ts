import type { TaskForgeMessage } from '../config.js';

export async function emailHandler(message: TaskForgeMessage): Promise<void> {
  console.info(`[Email] Processing ${message.type}`, { correlationId: message.correlationId });

  // TODO: Implement email sending via Mailpit/SMTP in MVP-019
  // For now, log the message data
  console.info('[Email] Message data:', JSON.stringify(message.data));
}
