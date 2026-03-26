import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPublish = vi.fn().mockResolvedValue(1);
const mockPsubscribe = vi.fn().mockResolvedValue(undefined);
const mockPunsubscribe = vi.fn().mockResolvedValue(undefined);
const mockConnect = vi.fn().mockResolvedValue(undefined);
const mockDisconnect = vi.fn();
const mockOn = vi.fn();

class MockRedis {
  connect = mockConnect;
  publish = mockPublish;
  psubscribe = mockPsubscribe;
  punsubscribe = mockPunsubscribe;
  disconnect = mockDisconnect;
  on = mockOn;
}

vi.mock('ioredis', () => ({
  default: MockRedis,
}));

const mockBroadcast = vi.fn();
vi.mock('../channels.js', () => ({
  broadcast: (...args: unknown[]) => mockBroadcast(...args),
}));

const { initRealtimeSubscriber, publishToRedis, shutdownRealtimeSubscriber } = await import(
  '../redis-subscriber.js'
);

describe('redis-subscriber', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize publisher and subscriber Redis connections', async () => {
    await initRealtimeSubscriber();

    expect(mockConnect).toHaveBeenCalledTimes(2);
    expect(mockPsubscribe).toHaveBeenCalledWith('realtime:*');
    expect(mockOn).toHaveBeenCalledWith('pmessage', expect.any(Function));
  });

  it('should publish events to Redis channel with prefix', async () => {
    await initRealtimeSubscriber();

    await publishToRedis('project:p1', {
      type: 'task.updated',
      channel: 'project:p1',
      timestamp: '2025-01-01T00:00:00.000Z',
      data: { taskId: 't1' },
    });

    expect(mockPublish).toHaveBeenCalledWith(
      'realtime:project:p1',
      expect.stringContaining('"type":"task.updated"'),
    );
  });

  it('should broadcast received messages to local clients', async () => {
    await initRealtimeSubscriber();

    // Get the pmessage handler
    const pmessageCall = mockOn.mock.calls.find(
      (call: unknown[]) => call[0] === 'pmessage',
    );
    expect(pmessageCall).toBeDefined();
    const handler = pmessageCall![1] as (pattern: string, channel: string, message: string) => void;

    const event = {
      type: 'task.updated',
      channel: 'project:p1',
      timestamp: '2025-01-01T00:00:00.000Z',
      data: { taskId: 't1' },
    };

    handler('realtime:*', 'realtime:project:p1', JSON.stringify(event));

    expect(mockBroadcast).toHaveBeenCalledWith(event);
  });

  it('should ignore malformed messages', async () => {
    await initRealtimeSubscriber();

    const pmessageCall = mockOn.mock.calls.find(
      (call: unknown[]) => call[0] === 'pmessage',
    );
    const handler = pmessageCall![1] as (pattern: string, channel: string, message: string) => void;

    // Should not throw
    handler('realtime:*', 'realtime:project:p1', 'not-valid-json');

    expect(mockBroadcast).not.toHaveBeenCalled();
  });

  it('should clean up on shutdown', async () => {
    await initRealtimeSubscriber();
    await shutdownRealtimeSubscriber();

    expect(mockPunsubscribe).toHaveBeenCalled();
    expect(mockDisconnect).toHaveBeenCalledTimes(2);
  });
});
