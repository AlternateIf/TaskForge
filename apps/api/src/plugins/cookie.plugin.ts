import cookie from '@fastify/cookie';
import fp from 'fastify-plugin';

const IS_PROD = process.env.NODE_ENV === 'production';
if (IS_PROD && !process.env.COOKIE_SECRET) {
  throw new Error('COOKIE_SECRET environment variable is required in production');
}

export default fp(
  async (fastify) => {
    await fastify.register(cookie, {
      secret: process.env.COOKIE_SECRET ?? 'dev-cookie-secret-change-in-production',
    });
  },
  { name: 'cookie' },
);
