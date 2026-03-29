import crypto from 'node:crypto';
import { db, oauthAccounts, users } from '@taskforge/db';
import { and, eq, isNull } from 'drizzle-orm';
import { AppError, ErrorCode } from '../utils/errors.js';
import { getRedis } from '../utils/redis.js';
import { createSession } from './auth.service.js';
import type { JwtPayload, TokenPair } from './auth.service.js';

const OAUTH_STATE_TTL = 600; // 10 minutes
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

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

  throw new AppError(400, ErrorCode.BAD_REQUEST, `Unsupported OAuth provider: ${provider}`);
}

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

  // PKCE is supported by Google; GitHub ignores unknown params
  params.set('code_challenge', codeChallenge);
  params.set('code_challenge_method', 'S256');

  return `${config.authorizeUrl}?${params.toString()}`;
}

export async function initiateOAuth(
  provider: string,
  callbackUrl: string,
): Promise<{ authorizationUrl: string; state: string }> {
  // Validate provider config exists
  getProviderConfig(provider);

  const state = crypto.randomBytes(16).toString('hex');
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  // Store state + code verifier in Redis
  const redis = getRedis();
  await redis.set(
    `oauth:state:${state}`,
    JSON.stringify({ provider, codeVerifier, callbackUrl }),
    'EX',
    OAUTH_STATE_TTL,
  );

  const authorizationUrl = buildAuthorizationUrl(provider, state, codeChallenge, callbackUrl);

  return { authorizationUrl, state };
}

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

  // GitHub requires Accept: application/json
  if (provider === 'github') {
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
    // GitHub may not include email in profile — fetch from /user/emails
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

async function findOrCreateUser(
  provider: string,
  userInfo: OAuthUserInfo,
): Promise<typeof users.$inferSelect> {
  // Check if OAuth account already linked
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
    // Update timestamp (provider access token is NOT stored — only used transiently for user info fetch)
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

  // Check if user with same email exists
  const existingUser = (
    await db
      .select()
      .from(users)
      .where(and(eq(users.email, userInfo.email), isNull(users.deletedAt)))
      .limit(1)
  )[0];

  const now = new Date();

  if (existingUser) {
    // Link OAuth account to existing user (provider access token NOT stored)
    await db.insert(oauthAccounts).values({
      id: crypto.randomUUID(),
      userId: existingUser.id,
      provider,
      providerUserId: userInfo.providerUserId,
      accessToken: null,
      createdAt: now,
      updatedAt: now,
    });

    // Auto-verify email if not already verified
    if (!existingUser.emailVerifiedAt) {
      await db
        .update(users)
        .set({ emailVerifiedAt: now, updatedAt: now })
        .where(eq(users.id, existingUser.id));
      existingUser.emailVerifiedAt = now;
    }

    // Update last login
    await db.update(users).set({ lastLoginAt: now }).where(eq(users.id, existingUser.id));

    return existingUser;
  }

  // Create new user + OAuth account
  const userId = crypto.randomUUID();
  await db.insert(users).values({
    id: userId,
    email: userInfo.email,
    passwordHash: null,
    displayName: userInfo.displayName,
    avatarUrl: userInfo.avatarUrl,
    emailVerifiedAt: now, // Provider verified the email
    lastLoginAt: now,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(oauthAccounts).values({
    id: crypto.randomUUID(),
    userId,
    provider,
    providerUserId: userInfo.providerUserId,
    accessToken: null, // Provider access token NOT stored — only used transiently
    createdAt: now,
    updatedAt: now,
  });

  return (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
}

export async function handleOAuthCallback(
  code: string,
  state: string,
  jwtSign: (payload: JwtPayload, options: { expiresIn: number }) => string,
  ip?: string,
  userAgent?: string,
): Promise<{ user: typeof users.$inferSelect; tokens: TokenPair; isNewUser: boolean }> {
  const redis = getRedis();
  const stateData = await redis.get(`oauth:state:${state}`);

  if (!stateData) {
    throw new AppError(400, ErrorCode.BAD_REQUEST, 'Invalid or expired OAuth state');
  }

  // Delete state immediately to prevent replay
  await redis.del(`oauth:state:${state}`);

  const { provider, codeVerifier, callbackUrl } = JSON.parse(stateData) as {
    provider: string;
    codeVerifier: string;
    callbackUrl: string;
  };

  // Exchange code for provider access token
  const providerAccessToken = await exchangeCodeForToken(provider, code, codeVerifier, callbackUrl);

  // Fetch user info from provider
  const userInfo = await fetchUserInfo(provider, providerAccessToken);

  // Check if this is a new user before findOrCreate
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

  // Find or create user, link OAuth account
  const user = await findOrCreateUser(provider, userInfo);

  // Create session (same as regular login)
  const tokens = await createSession(user, jwtSign, ip, userAgent);

  return { user, tokens, isNewUser };
}

export function getFrontendUrl(): string {
  return FRONTEND_URL;
}
