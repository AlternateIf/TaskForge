import {
  renderDeadlineReminder,
  renderInvitation,
  renderInvitationRevoked,
  renderMention,
  renderTaskAssigned,
  renderTaskStatusChanged,
  renderWelcome,
} from '@taskforge/email-templates';
import { sendEmail } from '../../services/email.service.js';
import type { TaskForgeMessage } from '../config.js';

interface EmailData {
  to: string;
  subject: string;
  templateName: string;
  templateData: Record<string, unknown>;
}

async function renderTemplate(
  templateName: string,
  data: Record<string, unknown>,
): Promise<string> {
  switch (templateName) {
    case 'task_assigned':
      return renderTaskAssigned(data as never);
    case 'task_status_changed':
      return renderTaskStatusChanged(data as never);
    case 'comment_mentioned':
      return renderMention(data as never);
    case 'task_deadline_approaching':
      return renderDeadlineReminder(data as never);
    case 'invitation':
      return renderInvitation(data as never);
    case 'invitation_revoked':
      return renderInvitationRevoked(data as never);
    case 'welcome':
      return renderWelcome(data as never);
    default:
      throw new Error(`Unknown email template: ${templateName}`);
  }
}

export async function emailHandler(message: TaskForgeMessage): Promise<void> {
  const data = message.data as EmailData;
  console.info(`[Email] Sending ${data.templateName} to ${data.to}`);

  const html = await renderTemplate(data.templateName, data.templateData);

  await sendEmail({
    to: data.to,
    subject: data.subject,
    html,
  });
}
