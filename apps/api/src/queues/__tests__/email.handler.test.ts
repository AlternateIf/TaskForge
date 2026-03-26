import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSendEmail = vi.fn();

vi.mock('../../services/email.service.js', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

const mockRenderTaskAssigned = vi.fn();
const mockRenderTaskStatusChanged = vi.fn();
const mockRenderMention = vi.fn();
const mockRenderDeadlineReminder = vi.fn();
const mockRenderWelcome = vi.fn();

vi.mock('@taskforge/email-templates', () => ({
  renderTaskAssigned: (...args: unknown[]) => mockRenderTaskAssigned(...args),
  renderTaskStatusChanged: (...args: unknown[]) => mockRenderTaskStatusChanged(...args),
  renderMention: (...args: unknown[]) => mockRenderMention(...args),
  renderDeadlineReminder: (...args: unknown[]) => mockRenderDeadlineReminder(...args),
  renderWelcome: (...args: unknown[]) => mockRenderWelcome(...args),
}));

const { emailHandler } = await import('../handlers/email.handler.js');

describe('emailHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendEmail.mockResolvedValue(undefined);
  });

  it('should render task_assigned template and send email', async () => {
    mockRenderTaskAssigned.mockResolvedValue('rendered-assigned');

    await emailHandler({
      type: 'email.send',
      timestamp: '2025-01-01T00:00:00.000Z',
      correlationId: 'corr-1',
      data: {
        to: 'user@example.com',
        subject: 'Task Assigned',
        templateName: 'task_assigned',
        templateData: { assigneeName: 'Jane', taskTitle: 'Fix bug' },
      },
    });

    expect(mockRenderTaskAssigned).toHaveBeenCalledWith(
      expect.objectContaining({ assigneeName: 'Jane', taskTitle: 'Fix bug' }),
    );
    expect(mockSendEmail).toHaveBeenCalledWith({
      to: 'user@example.com',
      subject: 'Task Assigned',
      html: 'rendered-assigned',
    });
  });

  it('should render task_status_changed template', async () => {
    mockRenderTaskStatusChanged.mockResolvedValue('rendered-changed');

    await emailHandler({
      type: 'email.send',
      timestamp: '2025-01-01T00:00:00.000Z',
      correlationId: 'corr-1',
      data: {
        to: 'user@example.com',
        subject: 'Status Changed',
        templateName: 'task_status_changed',
        templateData: { recipientName: 'Jane', oldStatus: 'Open', newStatus: 'Done' },
      },
    });

    expect(mockRenderTaskStatusChanged).toHaveBeenCalled();
    expect(mockSendEmail).toHaveBeenCalled();
  });

  it('should render comment_mentioned template', async () => {
    mockRenderMention.mockResolvedValue('rendered-mention');

    await emailHandler({
      type: 'email.send',
      timestamp: '2025-01-01T00:00:00.000Z',
      correlationId: 'corr-1',
      data: {
        to: 'user@example.com',
        subject: 'You were mentioned',
        templateName: 'comment_mentioned',
        templateData: { recipientName: 'Jane', mentionedByName: 'Tom' },
      },
    });

    expect(mockRenderMention).toHaveBeenCalled();
    expect(mockSendEmail).toHaveBeenCalled();
  });

  it('should render welcome template', async () => {
    mockRenderWelcome.mockResolvedValue('rendered-welcome');

    await emailHandler({
      type: 'email.send',
      timestamp: '2025-01-01T00:00:00.000Z',
      correlationId: 'corr-1',
      data: {
        to: 'user@example.com',
        subject: 'Welcome!',
        templateName: 'welcome',
        templateData: { name: 'Jane', loginUrl: 'https://app.taskforge.dev' },
      },
    });

    expect(mockRenderWelcome).toHaveBeenCalled();
    expect(mockSendEmail).toHaveBeenCalled();
  });

  it('should render deadline_reminder template', async () => {
    mockRenderDeadlineReminder.mockResolvedValue('rendered-deadline');

    await emailHandler({
      type: 'email.send',
      timestamp: '2025-01-01T00:00:00.000Z',
      correlationId: 'corr-1',
      data: {
        to: 'user@example.com',
        subject: 'Deadline',
        templateName: 'task_deadline_approaching',
        templateData: { recipientName: 'Jane', taskTitle: 'Review PR', dueDate: '2025-06-01' },
      },
    });

    expect(mockRenderDeadlineReminder).toHaveBeenCalled();
    expect(mockSendEmail).toHaveBeenCalled();
  });

  it('should throw for unknown template', async () => {
    await expect(
      emailHandler({
        type: 'email.send',
        timestamp: '2025-01-01T00:00:00.000Z',
        correlationId: 'corr-1',
        data: {
          to: 'user@example.com',
          subject: 'Test',
          templateName: 'nonexistent',
          templateData: {},
        },
      }),
    ).rejects.toThrow('Unknown email template: nonexistent');
  });
});
