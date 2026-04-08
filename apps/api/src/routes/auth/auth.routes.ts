import type { FastifyInstance } from 'fastify';
import {
  authConfigHandler,
  confirmEmailChangeHandler,
  forgotPasswordHandler,
  loginHandler,
  logoutHandler,
  refreshHandler,
  registerHandler,
  resetPasswordHandler,
  verifyEmailHandler,
} from './auth.handlers.js';
import {
  forgotPasswordSchema,
  loginInputSchema,
  registerInputSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from './auth.schemas.js';

export async function authRoutes(fastify: FastifyInstance) {
  // Tighter rate limit for auth endpoints
  const authRateLimit = { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } };

  fastify.get('/api/v1/auth/config', {}, authConfigHandler);

  fastify.post(
    '/api/v1/auth/register',
    {
      ...authRateLimit,
      preHandler: async (request) => {
        request.body = registerInputSchema.parse(request.body);
      },
    },
    registerHandler,
  );

  fastify.post(
    '/api/v1/auth/login',
    {
      ...authRateLimit,
      preHandler: async (request) => {
        request.body = loginInputSchema.parse(request.body);
      },
    },
    loginHandler,
  );

  fastify.post(
    '/api/v1/auth/refresh',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    refreshHandler,
  );

  fastify.post('/api/v1/auth/logout', {}, logoutHandler);

  fastify.post(
    '/api/v1/auth/forgot-password',
    {
      ...authRateLimit,
      preHandler: async (request) => {
        request.body = forgotPasswordSchema.parse(request.body);
      },
    },
    forgotPasswordHandler,
  );

  fastify.post(
    '/api/v1/auth/reset-password',
    {
      ...authRateLimit,
      preHandler: async (request) => {
        request.body = resetPasswordSchema.parse(request.body);
      },
    },
    resetPasswordHandler,
  );

  fastify.post(
    '/api/v1/auth/verify-email',
    {
      preHandler: async (request) => {
        request.body = verifyEmailSchema.parse(request.body);
      },
    },
    verifyEmailHandler,
  );

  fastify.post(
    '/api/v1/auth/confirm-email-change',
    {
      preHandler: async (request) => {
        request.body = verifyEmailSchema.parse(request.body); // same shape: { token }
      },
    },
    confirmEmailChangeHandler,
  );
}
