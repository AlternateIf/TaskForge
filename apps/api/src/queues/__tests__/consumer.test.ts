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

function createMockChannel() {
  return {
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
}

const mockConnection = {
  createChannel: vi.fn(),
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
    mockConnection.createChannel.mockImplementation(() => Promise.resolve(createMockChannel()));
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
    it('should connect and create one channel per queue', async () => {
      await initConsumer();

      expect(mockConnect).toHaveBeenCalled();
      // 4 queues = 4 channels
      expect(mockConnection.createChannel).toHaveBeenCalledTimes(4);
    });

    it('should set per-queue prefetch values', async () => {
      await initConsumer();

      // Default prefetch values: realtime=10, notification=5, email=3, search=1
      const prefetchCalls = mockPrefetch.mock.calls.map((call: [number]) => call[0]);
      expect(prefetchCalls).toContain(10); // realtime.broadcast
      expect(prefetchCalls).toContain(5); // notification.create
      expect(prefetchCalls).toContain(3); // email.send
      expect(prefetchCalls).toContain(1); // search.index
    });

    it('should assert topology on each channel', async () => {
      await initConsumer();

      // Each channel asserts both exchanges (4 channels × 2 exchanges)
      expect(mockAssertExchange).toHaveBeenCalledTimes(8);
      // 4 main queues + 4 dead-letter queues
      expect(mockAssertQueue).toHaveBeenCalledTimes(8);
      // 4 main bindings + 4 dead-letter bindings
      expect(mockBindQueue).toHaveBeenCalledTimes(8);
    });
  });

  describe('registerConsumer', () => {
    it('should register a consume callback on the queue', async () => {
      await initConsumer();
      const handler = vi.fn().mockResolvedValue(undefined);

      registerConsumer('email.send', handler);

      expect(mockConsume).toHaveBeenCalledWith('email.send', expect.any(Function));
    });

    it('should throw if no channel exists for the queue', async () => {
      // Shutdown to clear channels from prior tests
      await shutdownConsumer();

      expect(() => registerConsumer('email.send', vi.fn())).toThrow(
        'No channel for queue "email.send"',
      );
    });

    it('should ack message on successful handling', async () => {
      await initConsumer();
      const handler = vi.fn().mockResolvedValue(undefined);
      mockConsume.mockImplementation((_queue: string, cb: (msg: unknown) => void) => {
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

      mockConsume.mockImplementation((_queue: string, cb: (msg: unknown) => void) => {
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

      mockConsume.mockImplementation((_queue: string, cb: (msg: unknown) => void) => {
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

      mockConsume.mockImplementation((_queue: string, cb: (msg: unknown) => void) => {
        cb(null);
      });

      registerConsumer('email.send', handler);
      await vi.advanceTimersByTimeAsync(0);

      expect(handler).not.toHaveBeenCalled();
      expect(mockAck).not.toHaveBeenCalled();
    });
  });

  describe('shutdownConsumer', () => {
    it('should close all channels and connection', async () => {
      await initConsumer();
      await shutdownConsumer();

      // 4 channels should be closed
      expect(mockChannelClose).toHaveBeenCalledTimes(4);
      expect(mockClose).toHaveBeenCalled();
    });
  });
});
