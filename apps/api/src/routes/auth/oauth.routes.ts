import type { FastifyInstance } from 'fastify';
import {
  oauthCallbackHandler,
  oauthInitiateHandler,
  oauthProvidersHandler,
} from './oauth.handlers.js';

export async function oauthRoutes(fastify: FastifyInstance) {
  // Rate limit OAuth endpoints
  const oauthRateLimit = { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } };

  // List available OAuth providers
  fastify.get('/api/v1/auth/oauth/providers', {}, oauthProvidersHandler);

  // Initiate OAuth flow — redirects to provider
  fastify.get('/api/v1/auth/oauth/:provider', oauthRateLimit, oauthInitiateHandler);

  // Handle OAuth callback from provider
  fastify.get('/api/v1/auth/oauth/:provider/callback', oauthRateLimit, oauthCallbackHandler);
}
