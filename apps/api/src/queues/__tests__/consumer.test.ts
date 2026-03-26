import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockConnect = vi.fn();
const mockConsume = vi.fn();
const mockAck = vi.fn();
const mockReject = vi.fn();
const mockPublish = vi.fn();
const mockPrefetch = vi.fn();
const mockAssertExchange = vi.fn();
const mockAssertQueue = vi.fn();
const mockBindQueue = vi.fn();
const mockChannelClose = vi.fn();
const mockClose = vi.fn();
const mockOn = vi.fn();

const mockChannel = {
  prefetch: mockPrefetch,
  assertExchange: mockAssertExchange,
  assertQueue: mockAssertQueue,
  bindQueue: mockBindQueue,
  consume: mockConsume,
  ack: mockAck,
  reject: mockReject,
  publish: mockPublish,
  close: mockChannelClose,
};

const mockConnection = {
  createChannel: vi.fn().mockResolvedValue(mockChannel),
  on: mockOn,
  close: mockClose,
};

vi.mock('amqplib', () => ({
  default: {
    connect: mockConnect,
  },
}));

const { initConsumer, registerConsumer, shutdownConsumer } = await import('../consumer.js');

function makeMsg(routingKey: string, data: unknown, retryCount = 0) {
  const message = {
    type: routingKey,
    timestamp: new Date().toISOString(),
    data,
    correlationId: 'test-corr-id',
  };
  return {
    content: Buffer.from(JSON.stringify(message)),
    fields: { routingKey },
    properties: {
      headers: { 'x-retry-count': retryCount },
    },
  };
}

describe('consumer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockConnect.mockResolvedValue(mockConnection);
    mockAssertExchange.mockResolvedValue(undefined);
    mockAssertQueue.mockResolvedValue(undefined);
    mockBindQueue.mockResolvedValue(undefined);
    mockPrefetch.mockResolvedValue(undefined);
    mockChannelClose.mockResolvedValue(undefined);
    mockClose.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    vi.useRealTimers();
  });

  describe('initConsumer', () => {
    it('should connect and assert topology', async () => {
      await initConsumer();

      expect(mockConnect).toHaveBeenCalled();
      expect(mockConnection.createChannel).toHaveBeenCalled();
      expect(mockPrefetch).toHaveBeenCalledWith(1);
      expect(mockAssertExchange).toHaveBeenCalledTimes(2);
      expect(mockAssertQueue).toHaveBeenCalledTimes(6);
      expect(mockBindQueue).toHaveBeenCalledTimes(6);
    });
  });

  describe('registerConsumer', () => {
    it('should register a consume callback on the queue', async () => {
      await initConsumer();
      const handler = vi.fn().mockResolvedValue(undefined);

      registerConsumer('email.send', handler);

      expect(mockConsume).toHaveBeenCalledWith('email.send', expect.any(Function));
    });

    it('should throw if consumer is not initialized', async () => {
      // Shutdown to clear the channel from prior tests
      await shutdownConsumer();

      expect(() => registerConsumer('email.send', vi.fn())).toThrow('Consumer not initialized');
    });

    it('should ack message on successful handling', async () => {
      await initConsumer();
      const handler = vi.fn().mockResolvedValue(undefined);
      mockConsume.mockImplementation((_queue, cb) => {
        // Simulate receiving a message
        cb(makeMsg('email.welcome', { userId: 'u1' }));
      });

      registerConsumer('email.send', handler);

      // Allow async handler to complete
      await vi.advanceTimersByTimeAsync(0);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'email.welcome',
          data: { userId: 'u1' },
          correlationId: 'test-corr-id',
        }),
      );
      expect(mockAck).toHaveBeenCalled();
    });

    it('should retry failed messages with incremented retry count', async () => {
      await initConsumer();
      const handler = vi.fn().mockRejectedValue(new Error('handler failed'));

      mockConsume.mockImplementation((_queue, cb) => {
        cb(makeMsg('email.fail', {}, 0));
      });

      registerConsumer('email.send', handler);
      await vi.advanceTimersByTimeAsync(0);

      // After backoff delay, the message should be re-published
      await vi.advanceTimersByTimeAsync(1_000);

      expect(mockPublish).toHaveBeenCalledWith(
        'taskforge.events',
        'email.fail',
        expect.any(Buffer),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-retry-count': 1,
            'x-last-error': 'handler failed',
          }),
        }),
      );
      expect(mockAck).toHaveBeenCalled();
    });

    it('should dead-letter after max retries', async () => {
      await initConsumer();
      const handler = vi.fn().mockRejectedValue(new Error('permanent failure'));

      mockConsume.mockImplementation((_queue, cb) => {
        cb(makeMsg('email.fail', {}, 3)); // Already at max retries
      });

      registerConsumer('email.send', handler);
      await vi.advanceTimersByTimeAsync(0);

      expect(mockReject).toHaveBeenCalledWith(
        expect.objectContaining({
          fields: { routingKey: 'email.fail' },
        }),
        false,
      );
      expect(mockPublish).not.toHaveBeenCalled();
    });

    it('should ignore null messages', async () => {
      await initConsumer();
      const handler = vi.fn();

      mockConsume.mockImplementation((_queue, cb) => {
        cb(null);
      });

      registerConsumer('email.send', handler);
      await vi.advanceTimersByTimeAsync(0);

      expect(handler).not.toHaveBeenCalled();
      expect(mockAck).not.toHaveBeenCalled();
    });
  });

  describe('shutdownConsumer', () => {
    it('should close channel and connection', async () => {
      await initConsumer();
      await shutdownConsumer();

      expect(mockChannelClose).toHaveBeenCalled();
      expect(mockClose).toHaveBeenCalled();
    });
  });
});
