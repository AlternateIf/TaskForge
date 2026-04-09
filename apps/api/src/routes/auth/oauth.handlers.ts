import type { FastifyReply, FastifyRequest } from 'fastify';
import type { JwtPayload } from '../../services/auth.service.js';
import * as oauthService from '../../services/oauth.service.js';
import { success } from '../../utils/response.js';

const REFRESH_COOKIE = 'taskforge_refresh';
const IS_PROD = process.env.NODE_ENV === 'production';

function setRefreshCookie(reply: FastifyReply, token: string) {
  reply.setCookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/api/v1/auth',
    maxAge: 7 * 24 * 60 * 60,
  });
}

export async function oauthInitiateHandler(
  request: FastifyRequest<{ Params: { provider: string } }>,
  reply: FastifyReply,
) {
  const { provider } = request.params;
  // Use configured API_BASE_URL to avoid host header injection
  const apiBaseUrl = process.env.API_BASE_URL;
  const callbackUrl = apiBaseUrl
    ? `${apiBaseUrl}/api/v1/auth/oauth/${provider}/callback`
    : `${IS_PROD ? 'https' : request.protocol}://${request.hostname}/api/v1/auth/oauth/${provider}/callback`;

  const { authorizationUrl } = await oauthService.initiateOAuth(provider, callbackUrl);

  return reply.redirect(authorizationUrl);
}

export async function oauthCallbackHandler(
  request: FastifyRequest<{
    Params: { provider: string };
    Querystring: { code?: string; state?: string; error?: string };
  }>,
  reply: FastifyReply,
) {
  const { error, code, state } = request.query;
  const frontendUrl = oauthService.getFrontendUrl();

  // Provider denied or user cancelled
  if (error) {
    return reply.redirect(`${frontendUrl}/auth/login?error=oauth_denied`);
  }

  if (!code || !state) {
    return reply.redirect(`${frontendUrl}/auth/login?error=oauth_invalid`);
  }

  const jwtSign = (payload: JwtPayload, opts: { expiresIn: number }) =>
    request.server.jwtSign({ ...payload }, opts.expiresIn);

  let result: Awaited<ReturnType<typeof oauthService.handleOAuthCallback>>;
  try {
    result = await oauthService.handleOAuthCallback(
      code,
      state,
      jwtSign,
      request.ip,
      request.headers['user-agent'],
    );
  } catch {
    return reply.redirect(`${frontendUrl}/auth/login?error=oauth_failed`);
  }

  if ('mfaSetupRequired' in result && result.mfaSetupRequired) {
    // MFA enforcement — user must set up MFA before continuing
    const params = new URLSearchParams({
      mfaSetupRequired: '1',
      mfaToken: result.mfaToken,
      new: result.isNewUser ? '1' : '0',
    });
    return reply.redirect(`${frontendUrl}/auth/oauth-callback#${params.toString()}`);
  }

  // Normal login flow — result has tokens
  if (!('tokens' in result)) {
    // Should never reach here, but satisfy TypeScript
    return reply.redirect(`${frontendUrl}/auth/login?error=oauth_failed`);
  }

  const tokens = result.tokens;
  const isNewUser = result.isNewUser;

  setRefreshCookie(reply, tokens.refreshTokenRaw);

  // Redirect to frontend with access token in URL fragment (not query param for security)
  const params = new URLSearchParams({
    token: tokens.accessToken,
    new: isNewUser ? '1' : '0',
  });

  return reply.redirect(`${frontendUrl}/auth/oauth-callback#${params.toString()}`);
}

export async function oauthProvidersHandler(_request: FastifyRequest, reply: FastifyReply) {
  const providers = oauthService.getAvailableProviders();
  return reply.status(200).send(success({ providers }));
}
