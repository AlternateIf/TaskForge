import type { FastifyInstance } from 'fastify';
import {
  mfaDisableHandler,
  mfaDisablePostHandler,
  mfaResetPendingHandler,
  mfaSetupHandler,
  mfaVerifyLoginHandler,
  mfaVerifySetupHandler,
} from './mfa.handlers.js';
import { mfaCodeSchema, mfaResetPendingSchema, mfaVerifyLoginSchema } from './mfa.schemas.js';

const MFA_DISABLE_SUNSET = 'Sat, 01 Nov 2025 00:00:00 GMT';
const MFA_DISABLE_LINK = '</api/v1/auth/mfa/disable>; rel="successor-version"';

export async function mfaRoutes(fastify: FastifyInstance) {
  const authRateLimit = { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } };

  // Setup MFA — requires authentication
  fastify.post(
    '/api/v1/auth/mfa/setup',
    { ...authRateLimit, preHandler: fastify.authenticate },
    mfaSetupHandler,
  );

  // Verify setup — requires authentication
  fastify.post(
    '/api/v1/auth/mfa/verify-setup',
    {
      ...authRateLimit,
      preHandler: [
        fastify.authenticate,
        async (request) => {
          request.body = mfaCodeSchema.parse(request.body);
        },
      ],
    },
    mfaVerifySetupHandler,
  );

  // Verify during login — no authentication required (uses mfaToken)
  fastify.post(
    '/api/v1/auth/mfa/verify',
    {
      ...authRateLimit,
      preHandler: async (request) => {
        request.body = mfaVerifyLoginSchema.parse(request.body);
      },
    },
    mfaVerifyLoginHandler,
  );

  // Reset pending MFA setup — requires authentication + password
  fastify.post(
    '/api/v1/auth/mfa/reset-pending',
    {
      ...authRateLimit,
      preHandler: [
        fastify.authenticate,
        async (request) => {
          request.body = mfaResetPendingSchema.parse(request.body);
        },
      ],
    },
    mfaResetPendingHandler,
  );

  // Disable MFA via POST — requires authentication + TOTP code
  fastify.post(
    '/api/v1/auth/mfa/disable',
    {
      ...authRateLimit,
      preHandler: [
        fastify.authenticate,
        async (request) => {
          request.body = mfaCodeSchema.parse(request.body);
        },
      ],
    },
    mfaDisablePostHandler,
  );

  // Disable MFA via DELETE — deprecated, use POST /auth/mfa/disable instead
  fastify.delete<{
    Body: { code: string };
  }>(
    '/api/v1/auth/mfa',
    {
      ...authRateLimit,
      preHandler: [
        fastify.authenticate,
        async (request) => {
          request.body = mfaCodeSchema.parse(request.body);
        },
      ],
    },
    async (request, reply) => {
      reply.header('Deprecation', 'true');
      reply.header('Sunset', MFA_DISABLE_SUNSET);
      reply.header('Link', MFA_DISABLE_LINK);
      return mfaDisableHandler(request, reply);
    },
  );
}
