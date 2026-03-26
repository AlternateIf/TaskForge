import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGet, mockIncr, mockExpire, mockDel, mockTtl } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockIncr: vi.fn(),
  mockExpire: vi.fn(),
  mockDel: vi.fn(),
  mockTtl: vi.fn(),
}));

vi.mock('../../utils/redis.js', () => ({
  getRedis: () => ({
    get: mockGet,
    incr: mockIncr,
    expire: mockExpire,
    del: mockDel,
    ttl: mockTtl,
  }),
}));

import { checkLockout, recordFailedAttempt, resetLockout } from '../account-lockout.service.js';

describe('account-lockout.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkLockout', () => {
    it('returns 0 when no lockout key exists', async () => {
      mockGet.mockResolvedValue(null);
      expect(await checkLockout('user@example.com')).toBe(0);
      expect(mockGet).toHaveBeenCalledWith('lockout:user@example.com');
    });

    it('returns 0 when failure count is below threshold', async () => {
      mockGet.mockResolvedValue('3');
      expect(await checkLockout('user@example.com')).toBe(0);
    });

    it('returns TTL when failures reach tier 1 (5 failures)', async () => {
      mockGet.mockResolvedValue('5');
      mockTtl.mockResolvedValue(45);
      expect(await checkLockout('user@example.com')).toBe(45);
    });

    it('returns TTL when failures reach tier 2 (10 failures)', async () => {
      mockGet.mockResolvedValue('10');
      mockTtl.mockResolvedValue(280);
      expect(await checkLockout('user@example.com')).toBe(280);
    });

    it('returns TTL when failures reach tier 3 (20 failures)', async () => {
      mockGet.mockResolvedValue('20');
      mockTtl.mockResolvedValue(1500);
      expect(await checkLockout('user@example.com')).toBe(1500);
    });

    it('returns 0 when TTL is expired (key exists but no TTL)', async () => {
      mockGet.mockResolvedValue('5');
      mockTtl.mockResolvedValue(-1);
      expect(await checkLockout('user@example.com')).toBe(0);
    });

    it('returns 0 for non-numeric stored value', async () => {
      mockGet.mockResolvedValue('invalid');
      expect(await checkLockout('user@example.com')).toBe(0);
    });

    it('normalizes email to lowercase', async () => {
      mockGet.mockResolvedValue(null);
      await checkLockout('User@Example.COM');
      expect(mockGet).toHaveBeenCalledWith('lockout:user@example.com');
    });
  });

  describe('recordFailedAttempt', () => {
    it('increments the counter and sets generic TTL below lockout threshold', async () => {
      mockIncr.mockResolvedValue(1);
      await recordFailedAttempt('user@example.com');
      expect(mockIncr).toHaveBeenCalledWith('lockout:user@example.com');
      expect(mockExpire).toHaveBeenCalledWith('lockout:user@example.com', 3600);
    });

    it('sets 60-second TTL at 5 failures (tier 1)', async () => {
      mockIncr.mockResolvedValue(5);
      await recordFailedAttempt('user@example.com');
      expect(mockExpire).toHaveBeenCalledWith('lockout:user@example.com', 60);
    });

    it('sets 5-minute TTL at 10 failures (tier 2)', async () => {
      mockIncr.mockResolvedValue(10);
      await recordFailedAttempt('user@example.com');
      expect(mockExpire).toHaveBeenCalledWith('lockout:user@example.com', 300);
    });

    it('sets 30-minute TTL at 20 failures (tier 3)', async () => {
      mockIncr.mockResolvedValue(20);
      await recordFailedAttempt('user@example.com');
      expect(mockExpire).toHaveBeenCalledWith('lockout:user@example.com', 1800);
    });

    it('matches highest tier when count exceeds all thresholds', async () => {
      mockIncr.mockResolvedValue(25);
      await recordFailedAttempt('user@example.com');
      // 25 >= 20 → tier 3 (30 minutes)
      expect(mockExpire).toHaveBeenCalledWith('lockout:user@example.com', 1800);
    });
  });

  describe('resetLockout', () => {
    it('deletes the lockout key', async () => {
      mockDel.mockResolvedValue(1);
      await resetLockout('user@example.com');
      expect(mockDel).toHaveBeenCalledWith('lockout:user@example.com');
    });

    it('normalizes email to lowercase', async () => {
      mockDel.mockResolvedValue(1);
      await resetLockout('User@Example.COM');
      expect(mockDel).toHaveBeenCalledWith('lockout:user@example.com');
    });
  });
});
