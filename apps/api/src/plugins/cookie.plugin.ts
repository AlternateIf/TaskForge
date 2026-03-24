import cookie from '@fastify/cookie';
import fp from 'fastify-plugin';

export default fp(
  async (fastify) => {
    await fastify.register(cookie, {
      secret: process.env.COOKIE_SECRET ?? 'dev-cookie-secret-change-in-production',
    });
  },
  { name: 'cookie' },
);
