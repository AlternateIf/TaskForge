import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('queue config', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses default prefetch values when no env vars set', async () => {
    const { QUEUES } = await import('../config.js');

    const prefetchMap = Object.fromEntries(QUEUES.map((q) => [q.queue, q.prefetch]));
    expect(prefetchMap['realtime.broadcast']).toBe(10);
    expect(prefetchMap['notification.create']).toBe(5);
    expect(prefetchMap['email.send']).toBe(3);
    expect(prefetchMap['search.index']).toBe(1);
  });

  it('overrides prefetch via QUEUE_PREFETCH_REALTIME env var', async () => {
    vi.stubEnv('QUEUE_PREFETCH_REALTIME', '20');
    const { QUEUES } = await import('../config.js');

    const realtime = QUEUES.find((q) => q.queue === 'realtime.broadcast');
    expect(realtime?.prefetch).toBe(20);
  });

  it('overrides prefetch via QUEUE_PREFETCH_NOTIFICATION env var', async () => {
    vi.stubEnv('QUEUE_PREFETCH_NOTIFICATION', '8');
    const { QUEUES } = await import('../config.js');

    const notification = QUEUES.find((q) => q.queue === 'notification.create');
    expect(notification?.prefetch).toBe(8);
  });

  it('overrides prefetch via QUEUE_PREFETCH_EMAIL env var', async () => {
    vi.stubEnv('QUEUE_PREFETCH_EMAIL', '6');
    const { QUEUES } = await import('../config.js');

    const email = QUEUES.find((q) => q.queue === 'email.send');
    expect(email?.prefetch).toBe(6);
  });

  it('overrides prefetch via QUEUE_PREFETCH_SEARCH env var', async () => {
    vi.stubEnv('QUEUE_PREFETCH_SEARCH', '2');
    const { QUEUES } = await import('../config.js');

    const search = QUEUES.find((q) => q.queue === 'search.index');
    expect(search?.prefetch).toBe(2);
  });

  it('falls back to default for invalid env var (non-numeric)', async () => {
    vi.stubEnv('QUEUE_PREFETCH_REALTIME', 'abc');
    const { QUEUES } = await import('../config.js');

    const realtime = QUEUES.find((q) => q.queue === 'realtime.broadcast');
    expect(realtime?.prefetch).toBe(10);
  });

  it('falls back to default for env var with value 0 or negative', async () => {
    vi.stubEnv('QUEUE_PREFETCH_EMAIL', '0');
    const { QUEUES } = await import('../config.js');

    const email = QUEUES.find((q) => q.queue === 'email.send');
    expect(email?.prefetch).toBe(3);
  });

  it('orders queues with highest priority first', async () => {
    const { QUEUES } = await import('../config.js');

    // Queues should be ordered by priority (highest prefetch first)
    const prefetches = QUEUES.map((q) => q.prefetch);
    for (let i = 1; i < prefetches.length; i++) {
      expect(prefetches[i]).toBeLessThanOrEqual(prefetches[i - 1]);
    }
  });
});
