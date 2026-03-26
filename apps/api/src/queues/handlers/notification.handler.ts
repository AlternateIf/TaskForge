import { createNotification, isChannelEnabled } from '../../services/notification.service.js';
import type { TaskForgeMessage } from '../config.js';
import { publish } from '../publisher.js';

interface NotificationData {
  eventType: string;
  recipientId: string;
  recipientEmail: string;
  recipientName: string;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
  emailSubject?: string;
  emailTemplateData?: Record<string, unknown>;
}

export async function notificationHandler(message: TaskForgeMessage): Promise<void> {
  const data = message.data as NotificationData;
  console.info(`[Notification] Processing ${data.eventType} for user ${data.recipientId}`);

  // Check in-app preference and create notification
  const inAppEnabled = await isChannelEnabled(data.recipientId, data.eventType, 'in_app');
  if (inAppEnabled) {
    await createNotification({
      userId: data.recipientId,
      type: data.eventType,
      title: data.title,
      body: data.body,
      entityType: data.entityType,
      entityId: data.entityId,
    });
  }

  // Check email preference and publish email event
  const emailEnabled = await isChannelEnabled(data.recipientId, data.eventType, 'email');
  if (emailEnabled && data.recipientEmail) {
    await publish('email.send', {
      to: data.recipientEmail,
      subject: data.emailSubject ?? data.title,
      templateName: data.eventType,
      templateData: {
        recipientName: data.recipientName,
        ...data.emailTemplateData,
      },
    });
  }
}
