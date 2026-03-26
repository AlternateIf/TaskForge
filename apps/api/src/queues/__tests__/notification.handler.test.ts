import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreateNotification = vi.fn();
const mockIsChannelEnabled = vi.fn();

vi.mock('../../services/notification.service.js', () => ({
  createNotification: (...args: unknown[]) => mockCreateNotification(...args),
  isChannelEnabled: (...args: unknown[]) => mockIsChannelEnabled(...args),
}));

const mockPublish = vi.fn();

vi.mock('../publisher.js', () => ({
  publish: (...args: unknown[]) => mockPublish(...args),
}));

const { notificationHandler } = await import('../handlers/notification.handler.js');

describe('notificationHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseMessage = {
    type: 'notification.task_assigned',
    timestamp: '2025-01-01T00:00:00.000Z',
    correlationId: 'corr-1',
    data: {
      eventType: 'task_assigned',
      recipientId: 'u1',
      recipientEmail: 'user@example.com',
      recipientName: 'Jane',
      title: 'You were assigned to Fix bug',
      body: 'Task in Project Alpha',
      entityType: 'task',
      entityId: 't1',
      emailSubject: 'Task Assigned: Fix bug',
      emailTemplateData: { taskTitle: 'Fix bug', projectName: 'Alpha' },
    },
  };

  it('should create in-app notification when enabled', async () => {
    mockIsChannelEnabled.mockResolvedValue(true);
    mockCreateNotification.mockResolvedValue(undefined);
    mockPublish.mockResolvedValue(undefined);

    await notificationHandler(baseMessage);

    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        type: 'task_assigned',
        title: 'You were assigned to Fix bug',
      }),
    );
  });

  it('should skip in-app notification when disabled', async () => {
    mockIsChannelEnabled.mockImplementation((_uid: unknown, _evt: unknown, channel: unknown) =>
      Promise.resolve(channel !== 'in_app'),
    );
    mockPublish.mockResolvedValue(undefined);

    await notificationHandler(baseMessage);

    expect(mockCreateNotification).not.toHaveBeenCalled();
  });

  it('should publish email event when email enabled', async () => {
    mockIsChannelEnabled.mockResolvedValue(true);
    mockCreateNotification.mockResolvedValue(undefined);
    mockPublish.mockResolvedValue(undefined);

    await notificationHandler(baseMessage);

    expect(mockPublish).toHaveBeenCalledWith(
      'email.send',
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'Task Assigned: Fix bug',
        templateName: 'task_assigned',
      }),
    );
  });

  it('should skip email when disabled', async () => {
    mockIsChannelEnabled.mockImplementation((_uid: unknown, _evt: unknown, channel: unknown) =>
      Promise.resolve(channel !== 'email'),
    );
    mockCreateNotification.mockResolvedValue(undefined);

    await notificationHandler(baseMessage);

    expect(mockPublish).not.toHaveBeenCalled();
  });

  it('should skip email when no recipient email', async () => {
    mockIsChannelEnabled.mockResolvedValue(true);
    mockCreateNotification.mockResolvedValue(undefined);

    await notificationHandler({
      ...baseMessage,
      data: { ...baseMessage.data, recipientEmail: '' },
    });

    expect(mockPublish).not.toHaveBeenCalled();
  });
});
