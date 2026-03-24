import cors from '@fastify/cors';
import fp from 'fastify-plugin';

export default fp(
  async (fastify) => {
    await fastify.register(cors, {
      origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'If-None-Match'],
      exposedHeaders: [
        'X-Request-Id',
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
        'ETag',
        'Retry-After',
      ],
    });
  },
  { name: 'cors' },
);
