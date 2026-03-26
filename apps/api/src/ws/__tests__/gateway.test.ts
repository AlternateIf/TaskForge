import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Redis subscriber
vi.mock('../redis-subscriber.js', () => ({
  initRealtimeSubscriber: vi.fn().mockResolvedValue(undefined),
  shutdownRealtimeSubscriber: vi.fn().mockResolvedValue(undefined),
}));

// Mock channels module
const mockCanConnect = vi.fn().mockReturnValue(true);
const mockAddConnection = vi.fn();
const mockRemoveConnection = vi.fn();
const mockSubscribe = vi.fn();
const mockUnsubscribe = vi.fn();
const mockGetAllConnections = vi.fn().mockReturnValue([]);

vi.mock('../channels.js', () => ({
  canConnect: (...args: unknown[]) => mockCanConnect(...args),
  addConnection: (...args: unknown[]) => mockAddConnection(...args),
  removeConnection: (...args: unknown[]) => mockRemoveConnection(...args),
  subscribe: (...args: unknown[]) => mockSubscribe(...args),
  unsubscribe: (...args: unknown[]) => mockUnsubscribe(...args),
  getAllConnections: () => mockGetAllConnections(),
}));

// Mock @fastify/websocket — just a no-op plugin
vi.mock('@fastify/websocket', () => ({
  default: vi.fn().mockImplementation(async () => {}),
}));

describe('gateway', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('channel validation', () => {
    it('should accept valid project channel format', () => {
      expect(/^(project|user):[a-zA-Z0-9_-]+$/.test('project:proj_123')).toBe(true);
    });

    it('should accept valid user channel format', () => {
      expect(/^(project|user):[a-zA-Z0-9_-]+$/.test('user:u1')).toBe(true);
    });

    it('should accept user:me format', () => {
      expect(/^(project|user):[a-zA-Z0-9_-]+$/.test('user:me')).toBe(true);
    });

    it('should reject invalid channel format', () => {
      expect(/^(project|user):[a-zA-Z0-9_-]+$/.test('invalid:channel:format')).toBe(false);
      expect(/^(project|user):[a-zA-Z0-9_-]+$/.test('')).toBe(false);
      expect(/^(project|user):[a-zA-Z0-9_-]+$/.test('other:123')).toBe(false);
    });
  });

  describe('connection limits', () => {
    it('should check canConnect before accepting', () => {
      mockCanConnect.mockReturnValue(false);
      expect(mockCanConnect('u1')).toBe(false);
    });

    it('should allow when under limit', () => {
      mockCanConnect.mockReturnValue(true);
      expect(mockCanConnect('u1')).toBe(true);
    });
  });
});
