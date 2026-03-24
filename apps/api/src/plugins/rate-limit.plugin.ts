import rateLimit from '@fastify/rate-limit';
import fp from 'fastify-plugin';

export default fp(
  async (fastify) => {
    await fastify.register(rateLimit, {
      max: 20,
      timeWindow: '1 minute',
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
