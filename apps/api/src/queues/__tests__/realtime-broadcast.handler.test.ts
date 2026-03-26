import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPublishToRedis = vi.fn().mockResolvedValue(undefined);

vi.mock('../../ws/redis-subscriber.js', () => ({
  publishToRedis: (...args: unknown[]) => mockPublishToRedis(...args),
}));

const { realtimeBroadcastHandler } = await import('../handlers/realtime-broadcast.handler.js');

describe('realtimeBroadcastHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should publish event to each target channel via Redis', async () => {
    await realtimeBroadcastHandler({
      type: 'realtime.broadcast',
      timestamp: '2025-01-01T00:00:00.000Z',
      correlationId: 'corr-1',
      data: {
        eventType: 'task.updated',
        channels: ['project:p1', 'user:u1'],
        payload: { taskId: 't1', changes: { status: 'done' } },
      },
    });

    expect(mockPublishToRedis).toHaveBeenCalledTimes(2);
    expect(mockPublishToRedis).toHaveBeenCalledWith('project:p1', {
      type: 'task.updated',
      channel: 'project:p1',
      timestamp: '2025-01-01T00:00:00.000Z',
      data: { taskId: 't1', changes: { status: 'done' } },
    });
    expect(mockPublishToRedis).toHaveBeenCalledWith('user:u1', {
      type: 'task.updated',
      channel: 'user:u1',
      timestamp: '2025-01-01T00:00:00.000Z',
      data: { taskId: 't1', changes: { status: 'done' } },
    });
  });

  it('should handle single channel', async () => {
    await realtimeBroadcastHandler({
      type: 'realtime.broadcast',
      timestamp: '2025-01-01T00:00:00.000Z',
      correlationId: 'corr-2',
      data: {
        eventType: 'notification.created',
        channels: ['user:u1'],
        payload: { notificationId: 'n1' },
      },
    });

    expect(mockPublishToRedis).toHaveBeenCalledTimes(1);
    expect(mockPublishToRedis).toHaveBeenCalledWith('user:u1', {
      type: 'notification.created',
      channel: 'user:u1',
      timestamp: '2025-01-01T00:00:00.000Z',
      data: { notificationId: 'n1' },
    });
  });

  it('should handle empty channels array', async () => {
    await realtimeBroadcastHandler({
      type: 'realtime.broadcast',
      timestamp: '2025-01-01T00:00:00.000Z',
      correlationId: 'corr-3',
      data: {
        eventType: 'task.deleted',
        channels: [],
        payload: {},
      },
    });

    expect(mockPublishToRedis).not.toHaveBeenCalled();
  });
});
