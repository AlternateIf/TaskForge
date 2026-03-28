import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { registerErrorHandler } from '../on-error.hook.js';

describe('on-error.hook', () => {
  let fastify: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    fastify = Fastify();
    registerErrorHandler(fastify);
  });

  afterEach(async () => {
    await fastify.close();
  });

  it('maps nested RATE_LIMITED payloads to 429', async () => {
    fastify.get('/rate-limited-payload', async () => {
      throw {
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Rate limit exceeded, retry in 60 seconds.',
        },
      };
    });

    const response = await fastify.inject({ method: 'GET', url: '/rate-limited-payload' });
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(429);
    expect(body.error.code).toBe('RATE_LIMITED');
    expect(body.error.message).toBe('Too many requests. Rate limit exceeded, retry in 60 seconds.');
  });

  it('maps statusCode 429 errors to RATE_LIMITED envelope', async () => {
    fastify.get('/rate-limited-status', async () => {
      throw { statusCode: 429, message: 'Retry in 12 seconds.' };
    });

    const response = await fastify.inject({ method: 'GET', url: '/rate-limited-status' });
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(429);
    expect(body.error.code).toBe('RATE_LIMITED');
    expect(body.error.message).toBe('Retry in 12 seconds.');
  });

  it('keeps unknown payloads as INTERNAL_ERROR', async () => {
    fastify.get('/unknown-shape', async () => {
      throw { error: { code: 'SOME_OTHER_ERROR', message: 'nope' } };
    });

    const response = await fastify.inject({ method: 'GET', url: '/unknown-shape' });
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});
