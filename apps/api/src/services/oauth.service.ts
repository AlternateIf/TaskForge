import crypto from 'node:crypto';
import { db, oauthAccounts, users } from '@taskforge/db';
import { and, eq, isNull } from 'drizzle-orm';
import { AppError, ErrorCode } from '../utils/errors.js';
import { getRedis } from '../utils/redis.js';
import { createSession } from './auth.service.js';
import type { JwtPayload, TokenPair } from './auth.service.js';
import * as invitationService from './invitation.service.js';

export interface MfaEnforcementRedirect {
  mfaSetupRequired: true;
  mfaToken: string;
}

const OAUTH_STATE_TTL = 600; // 10 minutes
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

// ─── Provider metadata (returned to the frontend) ────────────────────────────

export interface ProviderMeta {
  id: string;
  name: string;
  logoUrl?: string;
}

// ─── Internal provider config ─────────────────────────────────────────────────

interface OAuthProviderConfig {
  clientId: string;
  clientSecret: string;
  authorizeUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
}

interface OAuthUserInfo {
  providerUserId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

// ─── Custom providers (from env) ──────────────────────────────────────────────

interface CustomProviderEnv extends OAuthProviderConfig {
  id: string;
  name: string;
  logoUrl?: string;
}

function getCustomProviders(): CustomProviderEnv[] {
  const providers: CustomProviderEnv[] = [];

  for (let i = 1; i <= 9; i++) {
    const id = process.env[`OAUTH_CUSTOM_${i}_ID`];
    const name = process.env[`OAUTH_CUSTOM_${i}_NAME`];
    const clientId = process.env[`OAUTH_CUSTOM_${i}_CLIENT_ID`];
    const clientSecret = process.env[`OAUTH_CUSTOM_${i}_CLIENT_SECRET`];
    const authorizeUrl = process.env[`OAUTH_CUSTOM_${i}_AUTHORIZE_URL`];
    const tokenUrl = process.env[`OAUTH_CUSTOM_${i}_TOKEN_URL`];
    const userInfoUrl = process.env[`OAUTH_CUSTOM_${i}_USERINFO_URL`];
    const scopesRaw = process.env[`OAUTH_CUSTOM_${i}_SCOPES`] ?? 'openid email profile';
    const logoUrl = process.env[`OAUTH_CUSTOM_${i}_LOGO_URL`];

    if (!id || !name || !clientId || !clientSecret || !authorizeUrl || !tokenUrl || !userInfoUrl) {
      continue;
    }

    providers.push({
      id,
      name,
      clientId,
      clientSecret,
      authorizeUrl,
      tokenUrl,
      userInfoUrl,
      scopes: scopesRaw.split(/\s+/).filter(Boolean),
      ...(logoUrl ? { logoUrl } : {}),
    });
  }

  return providers;
}

// ─── Available providers (public metadata) ────────────────────────────────────

export function getAvailableProviders(): ProviderMeta[] {
  const providers: ProviderMeta[] = [];

  if (process.env.OAUTH_GOOGLE_CLIENT_ID) {
    providers.push({ id: 'google', name: 'Google' });
  }

  if (process.env.OAUTH_GITHUB_CLIENT_ID) {
    providers.push({ id: 'github', name: 'GitHub' });
  }

  for (const custom of getCustomProviders()) {
    providers.push({
      id: custom.id,
      name: custom.name,
      ...(custom.logoUrl ? { logoUrl: custom.logoUrl } : {}),
    });
  }

  return providers;
}

// ─── Provider config lookup ───────────────────────────────────────────────────

function getProviderConfig(provider: string): OAuthProviderConfig {
  if (provider === 'google') {
    const clientId = process.env.OAUTH_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.OAUTH_GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new AppError(500, ErrorCode.INTERNAL_ERROR, 'Google OAuth not configured');
    }
    return {
      clientId,
      clientSecret,
      authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
      scopes: ['openid', 'email', 'profile'],
    };
  }

  if (provider === 'github') {
    const clientId = process.env.OAUTH_GITHUB_CLIENT_ID;
    const clientSecret = process.env.OAUTH_GITHUB_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new AppError(500, ErrorCode.INTERNAL_ERROR, 'GitHub OAuth not configured');
    }
    return {
      clientId,
      clientSecret,
      authorizeUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      userInfoUrl: 'https://api.github.com/user',
      scopes: ['read:user', 'user:email'],
    };
  }

  const custom = getCustomProviders().find((p) => p.id === provider);
  if (custom) {
    return {
      clientId: custom.clientId,
      clientSecret: custom.clientSecret,
      authorizeUrl: custom.authorizeUrl,
      tokenUrl: custom.tokenUrl,
      userInfoUrl: custom.userInfoUrl,
      scopes: custom.scopes,
    };
  }

  throw new AppError(400, ErrorCode.BAD_REQUEST, `Unsupported OAuth provider: ${provider}`);
}

// ─── PKCE helpers ─────────────────────────────────────────────────────────────

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

export function buildAuthorizationUrl(
  provider: string,
  state: string,
  codeChallenge: string,
  callbackUrl: string,
): string {
  const config = getProviderConfig(provider);

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: callbackUrl,
    response_type: 'code',
    scope: config.scopes.join(' '),
    state,
  });

  // PKCE: Google supports it; GitHub and most OIDC providers ignore unknown params
  params.set('code_challenge', codeChallenge);
  params.set('code_challenge_method', 'S256');

  return `${config.authorizeUrl}?${params.toString()}`;
}

export async function initiateOAuth(
  provider: string,
  callbackUrl: string,
  options?: { inviteTokenHash?: string; inviteProvider?: string },
): Promise<{ authorizationUrl: string; state: string }> {
  // Validate provider config exists (throws if not configured)
  getProviderConfig(provider);

  const state = crypto.randomBytes(16).toString('hex');
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  const redis = getRedis();
  await redis.set(
    `oauth:state:${state}`,
    JSON.stringify({
      provider,
      codeVerifier,
      callbackUrl,
      inviteTokenHash: options?.inviteTokenHash ?? null,
      inviteProvider: options?.inviteProvider ?? null,
    }),
    'EX',
    OAUTH_STATE_TTL,
  );

  const authorizationUrl = buildAuthorizationUrl(provider, state, codeChallenge, callbackUrl);

  return { authorizationUrl, state };
}

// ─── Token exchange ───────────────────────────────────────────────────────────

async function exchangeCodeForToken(
  provider: string,
  code: string,
  codeVerifier: string,
  callbackUrl: string,
): Promise<string> {
  const config = getProviderConfig(provider);

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: callbackUrl,
    grant_type: 'authorization_code',
    code_verifier: codeVerifier,
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  // GitHub requires Accept: application/json; most OIDC providers don't mind
  if (provider === 'github' || getCustomProviders().some((p) => p.id === provider)) {
    headers.Accept = 'application/json';
  }

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers,
    body: body.toString(),
  });

  if (!response.ok) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Failed to exchange OAuth code for token');
  }

  const data = (await response.json()) as Record<string, unknown>;
  const accessToken = (data.access_token as string) ?? undefined;
  if (!accessToken) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'No access token in OAuth response');
  }

  return accessToken;
}

// ─── User info fetch ──────────────────────────────────────────────────────────

async function fetchUserInfo(provider: string, accessToken: string): Promise<OAuthUserInfo> {
  const config = getProviderConfig(provider);

  const response = await fetch(config.userInfoUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new AppError(
      401,
      ErrorCode.UNAUTHORIZED,
      'Failed to fetch user info from OAuth provider',
    );
  }

  const data = (await response.json()) as Record<string, unknown>;

  if (provider === 'google') {
    return {
      providerUserId: String(data.id),
      email: String(data.email),
      displayName: String(data.name ?? data.email),
      avatarUrl: (data.picture as string) ?? null,
    };
  }

  if (provider === 'github') {
    let email = data.email as string | null;
    if (!email) {
      email = await fetchGitHubPrimaryEmail(accessToken);
    }
    if (!email) {
      throw new AppError(
        400,
        ErrorCode.BAD_REQUEST,
        'No verified email found on your GitHub account',
      );
    }

    return {
      providerUserId: String(data.id),
      email,
      displayName: String(data.name ?? data.login ?? email),
      avatarUrl: (data.avatar_url as string) ?? null,
    };
  }

  // Generic OIDC (custom providers) — expects sub, email, name, picture claims
  const isCustom = getCustomProviders().some((p) => p.id === provider);
  if (isCustom) {
    const sub = data.sub ?? data.id;
    if (!sub) {
      throw new AppError(
        401,
        ErrorCode.UNAUTHORIZED,
        'Provider did not return a subject identifier',
      );
    }
    const email = data.email as string | undefined;
    if (!email) {
      throw new AppError(400, ErrorCode.BAD_REQUEST, 'Provider did not return an email address');
    }
    return {
      providerUserId: String(sub),
      email,
      displayName: String(data.name ?? data.preferred_username ?? email),
      avatarUrl: (data.picture as string) ?? null,
    };
  }

  throw new AppError(500, ErrorCode.INTERNAL_ERROR, `Unsupported provider: ${provider}`);
}

async function fetchGitHubPrimaryEmail(accessToken: string): Promise<string | null> {
  const response = await fetch('https://api.github.com/user/emails', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) return null;

  const emails = (await response.json()) as Array<{
    email: string;
    primary: boolean;
    verified: boolean;
  }>;
  const primary = emails.find((e) => e.primary && e.verified);
  return primary?.email ?? null;
}

// ─── User provisioning ────────────────────────────────────────────────────────

async function findOrCreateUser(
  provider: string,
  userInfo: OAuthUserInfo,
): Promise<typeof users.$inferSelect> {
  const existingOAuth = await db
    .select()
    .from(oauthAccounts)
    .where(
      and(
        eq(oauthAccounts.provider, provider),
        eq(oauthAccounts.providerUserId, userInfo.providerUserId),
      ),
    )
    .limit(1);

  if (existingOAuth.length > 0) {
    await db
      .update(oauthAccounts)
      .set({ accessToken: null, updatedAt: new Date() })
      .where(eq(oauthAccounts.id, existingOAuth[0].id));

    const user = (
      await db.select().from(users).where(eq(users.id, existingOAuth[0].userId)).limit(1)
    )[0];
    if (!user || user.deletedAt) {
      throw new AppError(401, ErrorCode.UNAUTHORIZED, 'User account not found');
    }
    return user;
  }

  const existingUser = (
    await db
      .select()
      .from(users)
      .where(and(eq(users.email, userInfo.email), isNull(users.deletedAt)))
      .limit(1)
  )[0];

  const now = new Date();

  if (existingUser) {
    await db.insert(oauthAccounts).values({
      id: crypto.randomUUID(),
      userId: existingUser.id,
      provider,
      providerUserId: userInfo.providerUserId,
      accessToken: null,
      createdAt: now,
      updatedAt: now,
    });

    if (!existingUser.emailVerifiedAt) {
      await db
        .update(users)
        .set({ emailVerifiedAt: now, updatedAt: now })
        .where(eq(users.id, existingUser.id));
      existingUser.emailVerifiedAt = now;
    }

    await db.update(users).set({ lastLoginAt: now }).where(eq(users.id, existingUser.id));

    return existingUser;
  }

  const userId = crypto.randomUUID();
  await db.insert(users).values({
    id: userId,
    email: userInfo.email,
    passwordHash: null,
    displayName: userInfo.displayName,
    avatarUrl: userInfo.avatarUrl,
    emailVerifiedAt: now,
    lastLoginAt: now,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(oauthAccounts).values({
    id: crypto.randomUUID(),
    userId,
    provider,
    providerUserId: userInfo.providerUserId,
    accessToken: null,
    createdAt: now,
    updatedAt: now,
  });

  return (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
}

// ─── OAuth callback handler ───────────────────────────────────────────────────

export async function handleOAuthCallback(
  code: string,
  state: string,
  jwtSign: (payload: JwtPayload, options: { expiresIn: number }) => string,
  ip?: string,
  userAgent?: string,
): Promise<
  | { user: typeof users.$inferSelect; tokens: TokenPair; isNewUser: boolean }
  | ({ isNewUser: boolean } & MfaEnforcementRedirect)
> {
  const redis = getRedis();
  const stateData = await redis.get(`oauth:state:${state}`);

  if (!stateData) {
    throw new AppError(400, ErrorCode.BAD_REQUEST, 'Invalid or expired OAuth state');
  }

  await redis.del(`oauth:state:${state}`);

  const parsedState = JSON.parse(stateData) as {
    provider: string;
    codeVerifier: string;
    callbackUrl: string;
    inviteTokenHash?: string | null;
    inviteProvider?: string | null;
  };
  const { provider, codeVerifier, callbackUrl } = parsedState;

  const providerAccessToken = await exchangeCodeForToken(provider, code, codeVerifier, callbackUrl);
  const userInfo = await fetchUserInfo(provider, providerAccessToken);

  if (parsedState.inviteTokenHash) {
    if (parsedState.inviteProvider && parsedState.inviteProvider !== provider) {
      throw new AppError(400, ErrorCode.BAD_REQUEST, 'OAuth provider mismatch for invitation');
    }

    const { user, tokens } = await invitationService.acceptInvitationWithOAuth(
      parsedState.inviteTokenHash,
      {
        provider,
        providerUserId: userInfo.providerUserId,
        email: userInfo.email,
        displayName: userInfo.displayName,
        avatarUrl: userInfo.avatarUrl,
      },
      jwtSign,
      ip,
      userAgent,
    );

    // Check MFA enforcement for the invited user
    if (!user.mfaEnabled) {
      const { evaluateMfaEnforcement, createMfaToken } = await import('./mfa.service.js');
      const enforcement = await evaluateMfaEnforcement(user.id);

      if (enforcement.status === 'enforced') {
        // Grace period expired — user must set up MFA before accessing the app
        const mfaToken = await createMfaToken(user.id);
        return { mfaSetupRequired: true, mfaToken, isNewUser: false };
      }
    }

    return { user, tokens, isNewUser: false };
  }

  const existingBefore = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, userInfo.email), isNull(users.deletedAt)))
    .limit(1);

  const existingOAuthBefore = await db
    .select({ id: oauthAccounts.id })
    .from(oauthAccounts)
    .where(
      and(
        eq(oauthAccounts.provider, provider),
        eq(oauthAccounts.providerUserId, userInfo.providerUserId),
      ),
    )
    .limit(1);

  const isNewUser = existingBefore.length === 0 && existingOAuthBefore.length === 0;

  const { isPublicRegisterAllowed } = await import('./auth.service.js');
  if (isNewUser && !isPublicRegisterAllowed()) {
    throw new AppError(
      403,
      ErrorCode.FORBIDDEN,
      'OAuth registration is disabled. Please use an invitation link.',
    );
  }

  const user = await findOrCreateUser(provider, userInfo);

  // Check MFA enforcement for the user
  if (!user.mfaEnabled) {
    const { evaluateMfaEnforcement, createMfaToken } = await import('./mfa.service.js');
    const enforcement = await evaluateMfaEnforcement(user.id);

    if (enforcement.status === 'enforced') {
      // Grace period expired — user must set up MFA before accessing the app
      const mfaToken = await createMfaToken(user.id);
      return { mfaSetupRequired: true, mfaToken, isNewUser };
    }
  }

  const tokens = await createSession(user, jwtSign, ip, userAgent);

  return { user, tokens, isNewUser };
}

export function getFrontendUrl(): string {
  return FRONTEND_URL;
}
