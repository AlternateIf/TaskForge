import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockConnect = vi.fn();
const mockPublish = vi.fn();
const mockAssertExchange = vi.fn();
const mockAssertQueue = vi.fn();
const mockBindQueue = vi.fn();
const mockClose = vi.fn();
const mockChannelClose = vi.fn();
const mockOn = vi.fn();

const mockChannel = {
  assertExchange: mockAssertExchange,
  assertQueue: mockAssertQueue,
  bindQueue: mockBindQueue,
  publish: mockPublish,
  close: mockChannelClose,
};

const mockConnection = {
  createConfirmChannel: vi.fn().mockResolvedValue(mockChannel),
  on: mockOn,
  close: mockClose,
};

vi.mock('amqplib', () => ({
  default: {
    connect: mockConnect,
  },
}));

const { initPublisher, publish, shutdownPublisher } = await import('../publisher.js');

describe('publisher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnect.mockResolvedValue(mockConnection);
    mockAssertExchange.mockResolvedValue(undefined);
    mockAssertQueue.mockResolvedValue(undefined);
    mockBindQueue.mockResolvedValue(undefined);
    mockChannelClose.mockResolvedValue(undefined);
    mockClose.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await shutdownPublisher();
  });

  describe('initPublisher', () => {
    it('should connect to RabbitMQ and assert topology', async () => {
      await initPublisher();

      expect(mockConnect).toHaveBeenCalledWith(expect.stringContaining('amqp://'));
      expect(mockConnection.createConfirmChannel).toHaveBeenCalled();

      // 2 exchanges: main + dead-letter
      expect(mockAssertExchange).toHaveBeenCalledWith('taskforge.events', 'topic', {
        durable: true,
      });
      expect(mockAssertExchange).toHaveBeenCalledWith('taskforge.dead-letter', 'topic', {
        durable: true,
      });

      // 4 queues + 4 dead-letter queues = 8
      expect(mockAssertQueue).toHaveBeenCalledTimes(8);

      // 4 bindings for main queues + 4 for dead-letter = 8
      expect(mockBindQueue).toHaveBeenCalledTimes(8);
    });

    it('should assert dead-letter arguments on main queues', async () => {
      await initPublisher();

      expect(mockAssertQueue).toHaveBeenCalledWith('email.send', {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': 'taskforge.dead-letter',
          'x-dead-letter-routing-key': 'email.send.dead-letter',
        },
      });
    });

    it('should register connection error and close handlers', async () => {
      await initPublisher();

      expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('close', expect.any(Function));
    });
  });

  describe('publish', () => {
    it('should throw if publisher is not initialized', async () => {
      await expect(publish('test.key', { foo: 'bar' })).rejects.toThrow(
        'Publisher not initialized',
      );
    });

    it('should publish a message with correct format', async () => {
      mockPublish.mockImplementation((_ex, _rk, _buf, _opts, cb) => cb(null));

      await initPublisher();
      await publish('notification.task_assigned', { taskId: '123' }, 'corr-1');

      expect(mockPublish).toHaveBeenCalledWith(
        'taskforge.events',
        'notification.task_assigned',
        expect.any(Buffer),
        expect.objectContaining({
          persistent: true,
          contentType: 'application/json',
          headers: { 'x-retry-count': 0 },
        }),
        expect.any(Function),
      );

      // Verify message content
      const buffer = mockPublish.mock.calls[0][2] as Buffer;
      const parsed = JSON.parse(buffer.toString());
      expect(parsed.type).toBe('notification.task_assigned');
      expect(parsed.data).toEqual({ taskId: '123' });
      expect(parsed.correlationId).toBe('corr-1');
      expect(parsed.timestamp).toBeTruthy();
    });

    it('should generate a correlationId if not provided', async () => {
      mockPublish.mockImplementation((_ex, _rk, _buf, _opts, cb) => cb(null));

      await initPublisher();
      await publish('email.welcome', { userId: 'u1' });

      const buffer = mockPublish.mock.calls[0][2] as Buffer;
      const parsed = JSON.parse(buffer.toString());
      expect(parsed.correlationId).toBeTruthy();
      expect(parsed.correlationId).not.toBe('');
    });

    it('should reject on publish error (confirmation failure)', async () => {
      mockPublish.mockImplementation((_ex, _rk, _buf, _opts, cb) => cb(new Error('nack')));

      await initPublisher();
      await expect(publish('email.fail', {})).rejects.toThrow('nack');
    });
  });

  describe('shutdownPublisher', () => {
    it('should close channel and connection', async () => {
      await initPublisher();
      await shutdownPublisher();

      expect(mockChannelClose).toHaveBeenCalled();
      expect(mockClose).toHaveBeenCalled();
    });

    it('should not throw if not initialized', async () => {
      await expect(shutdownPublisher()).resolves.toBeUndefined();
    });
  });
});
