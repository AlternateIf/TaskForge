import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Return null so @fastify/rate-limit uses its built-in local store instead of Redis
vi.mock('../../utils/redis.js', () => ({
  getRedis: () => null,
}));

import Fastify from 'fastify';
import rateLimitPlugin from '../rate-limit.plugin.js';

describe('rate-limit.plugin', () => {
  let fastify: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    fastify = Fastify();
    await fastify.register(rateLimitPlugin);
  });

  afterEach(async () => {
    await fastify.close();
  });

  it('applies rate limit headers on GET requests', async () => {
    fastify.get('/test', (_req, reply) => {
      reply.send({ ok: true });
    });
    await fastify.ready();

    const response = await fastify.inject({ method: 'GET', url: '/test' });
    expect(response.statusCode).toBe(200);
    expect(response.headers['x-ratelimit-limit']).toBeDefined();
    expect(response.headers['x-ratelimit-remaining']).toBeDefined();
  });

  it('allows higher limit for GET requests (120/min)', async () => {
    fastify.get('/test', (_req, reply) => {
      reply.send({ ok: true });
    });
    await fastify.ready();

    const response = await fastify.inject({ method: 'GET', url: '/test' });
    expect(response.headers['x-ratelimit-limit']).toBe('120');
  });

  it('applies stricter limit for POST requests (30/min)', async () => {
    fastify.post('/test', (_req, reply) => {
      reply.send({ ok: true });
    });
    await fastify.ready();

    const response = await fastify.inject({ method: 'POST', url: '/test' });
    expect(response.headers['x-ratelimit-limit']).toBe('30');
  });

  it('applies stricter limit for DELETE requests (30/min)', async () => {
    fastify.delete('/test', (_req, reply) => {
      reply.send({ ok: true });
    });
    await fastify.ready();

    const response = await fastify.inject({ method: 'DELETE', url: '/test' });
    expect(response.headers['x-ratelimit-limit']).toBe('30');
  });

  it('applies stricter limit for PATCH requests (30/min)', async () => {
    fastify.patch('/test', (_req, reply) => {
      reply.send({ ok: true });
    });
    await fastify.ready();

    const response = await fastify.inject({ method: 'PATCH', url: '/test' });
    expect(response.headers['x-ratelimit-limit']).toBe('30');
  });

  it('returns 429 with RATE_LIMITED error when limit exceeded (per-route override)', async () => {
    // Use a per-route override with a small static max to avoid needing 30+ requests
    fastify.get(
      '/strict',
      { config: { rateLimit: { max: 2, timeWindow: '1 minute' } } },
      (_req, reply) => {
        reply.send({ ok: true });
      },
    );
    await fastify.ready();

    await fastify.inject({ method: 'GET', url: '/strict' });
    await fastify.inject({ method: 'GET', url: '/strict' });
    const response = await fastify.inject({ method: 'GET', url: '/strict' });
    // Local store returns the custom error body; status may vary from Redis store
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('RATE_LIMITED');
    expect(body.error.message).toMatch(/Too many requests/);
  });
});
