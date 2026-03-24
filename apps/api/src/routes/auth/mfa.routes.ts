import type { FastifyInstance } from 'fastify';
import {
  mfaDisableHandler,
  mfaSetupHandler,
  mfaVerifyLoginHandler,
  mfaVerifySetupHandler,
} from './mfa.handlers.js';
import { mfaCodeSchema, mfaVerifyLoginSchema } from './mfa.schemas.js';

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

  // Disable MFA — requires authentication + TOTP code
  fastify.delete(
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
    mfaDisableHandler,
  );
}
