import rateLimit from '@fastify/rate-limit';
import fp from 'fastify-plugin';
import { getRedis } from '../utils/redis.js';

export default fp(
  async (fastify) => {
    await fastify.register(rateLimit, {
      global: true,
      max: (request, _key) => {
        // Write methods get a stricter limit; reads are more generous
        if (request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'OPTIONS') {
          return 30;
        }
        return 120;
      },
      timeWindow: '1 minute',
      redis: getRedis(),
      keyGenerator: (request) => {
        return request.ip;
      },
      errorResponseBuilder: (_request, context) => {
        return {
          error: {
            code: 'RATE_LIMITED',
            message: `Too many requests. Rate limit exceeded, retry in ${Math.ceil(context.ttl / 1000)} seconds.`,
          },
        };
      },
      addHeadersOnExceeding: { 'x-ratelimit-limit': true, 'x-ratelimit-remaining': true },
      addHeaders: {
        'x-ratelimit-limit': true,
        'x-ratelimit-remaining': true,
        'x-ratelimit-reset': true,
        'retry-after': true,
      },
    });
  },
  { name: 'rate-limit' },
);
