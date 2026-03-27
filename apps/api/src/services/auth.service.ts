import crypto from 'node:crypto';
import { db, sessions, users, verificationTokens } from '@taskforge/db';
import type { RegisterInput } from '@taskforge/shared';
import bcrypt from 'bcrypt';
import { and, eq, gt, isNull, ne } from 'drizzle-orm';
import { AppError, ErrorCode } from '../utils/errors.js';

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = 15 * 60; // 15 minutes in seconds
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const EMAIL_VERIFY_EXPIRY_HOURS = 24;
const PASSWORD_RESET_EXPIRY_HOURS = 1;

export interface TokenPair {
  accessToken: string;
  refreshTokenRaw: string;
  sessionId: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  sid?: string;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function registerUser(
  input: RegisterInput,
  jwtSign: (payload: JwtPayload, options: { expiresIn: number }) => string,
  ip?: string,
  userAgent?: string,
): Promise<{ user: typeof users.$inferSelect; tokens: TokenPair }> {
  // Check for existing user
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (existing.length > 0) {
    throw new AppError(409, ErrorCode.CONFLICT, 'An account with this email already exists');
  }

  const id = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const now = new Date();

  await db.insert(users).values({
    id,
    email: input.email,
    passwordHash,
    displayName: input.displayName,
    createdAt: now,
    updatedAt: now,
  });

  const user = (await db.select().from(users).where(eq(users.id, id)).limit(1))[0];

  // Create email verification token
  const verifyToken = generateToken();
  await db.insert(verificationTokens).values({
    id: crypto.randomUUID(),
    userId: id,
    type: 'email_verify',
    tokenHash: hashToken(verifyToken),
    expiresAt: new Date(Date.now() + EMAIL_VERIFY_EXPIRY_HOURS * 60 * 60 * 1000),
    createdAt: now,
  });

  // TODO: Send verification email (MVP-018 adds RabbitMQ email queue)
  console.log(`[EMAIL] Verification token for ${input.email}: ${verifyToken}`);

  // Auto-login after registration
  const tokens = await createSession(user, jwtSign, ip, userAgent);

  return { user, tokens };
}

export type LoginResult =
  | { mfaRequired: false; user: typeof users.$inferSelect; tokens: TokenPair }
  | { mfaRequired: true; mfaToken: string };

export async function loginUser(
  email: string,
  password: string,
  jwtSign: (payload: JwtPayload, options: { expiresIn: number }) => string,
  ip?: string,
  userAgent?: string,
  organizationId?: string,
): Promise<LoginResult> {
  // Check org-level auth settings when an organization context is provided
  if (organizationId) {
    const { isAuthMethodEnabled } = await import('./org-auth-settings.service.js');
    const passwordEnabled = await isAuthMethodEnabled(organizationId, 'password');
    if (!passwordEnabled) {
      throw new AppError(
        403,
        ErrorCode.FORBIDDEN,
        'Password authentication is disabled for this organization. Please use an enabled login method (e.g. Google or GitHub OAuth).',
      );
    }
  }

  // Check account lockout before any expensive work
  const { checkLockout, recordFailedAttempt, resetLockout } = await import(
    './account-lockout.service.js'
  );
  const lockoutRemaining = await checkLockout(email);
  if (lockoutRemaining > 0) {
    throw new AppError(
      429,
      ErrorCode.RATE_LIMITED,
      `Account temporarily locked. Try again in ${lockoutRemaining} seconds.`,
    );
  }

  const user = (
    await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1)
  )[0];

  if (!user || !user.passwordHash) {
    await recordFailedAttempt(email);
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Invalid email or password');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    await recordFailedAttempt(email);
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Invalid email or password');
  }

  // Successful login — reset lockout counter
  await resetLockout(email);

  // If MFA is enabled, return MFA challenge instead of tokens
  if (user.mfaEnabled) {
    const { createMfaToken } = await import('./mfa.service.js');
    const mfaToken = await createMfaToken(user.id);
    return { mfaRequired: true, mfaToken };
  }

  // Update last login
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

  const tokens = await createSession(user, jwtSign, ip, userAgent);
  return { mfaRequired: false, user, tokens };
}

export async function createSession(
  user: typeof users.$inferSelect,
  jwtSign: (payload: JwtPayload, options: { expiresIn: number }) => string,
  ip?: string,
  userAgent?: string,
): Promise<TokenPair> {
  const refreshTokenRaw = generateToken();
  const sessionId = crypto.randomUUID();

  const accessToken = jwtSign(
    { sub: user.id, email: user.email, sid: sessionId },
    { expiresIn: ACCESS_TOKEN_EXPIRY },
  );

  await db.insert(sessions).values({
    id: sessionId,
    userId: user.id,
    tokenHash: hashToken(refreshTokenRaw),
    ipAddress: ip ?? null,
    userAgent: userAgent ?? null,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
  });

  return { accessToken, refreshTokenRaw, sessionId };
}

export async function refreshSession(
  refreshTokenRaw: string,
  jwtSign: (payload: JwtPayload, options: { expiresIn: number }) => string,
): Promise<{ accessToken: string }> {
  const tokenHash = hashToken(refreshTokenRaw);

  const session = (
    await db.select().from(sessions).where(eq(sessions.tokenHash, tokenHash)).limit(1)
  )[0];

  if (!session || session.expiresAt < new Date()) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Invalid or expired refresh token');
  }

  const user = (await db.select().from(users).where(eq(users.id, session.userId)).limit(1))[0];
  if (!user || user.deletedAt) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'User not found');
  }

  const accessToken = jwtSign(
    { sub: user.id, email: user.email, sid: session.id },
    { expiresIn: ACCESS_TOKEN_EXPIRY },
  );
  return { accessToken };
}

export async function logoutSession(refreshTokenRaw: string): Promise<void> {
  const tokenHash = hashToken(refreshTokenRaw);
  await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
}

export async function changePassword(
  userId: string,
  currentSessionId: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ message: string }> {
  const user = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
  if (!user || !user.passwordHash) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'User not found');
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Current password is incorrect');
  }

  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  const now = new Date();

  await db.update(users).set({ passwordHash: newHash, updatedAt: now }).where(eq(users.id, userId));

  // Invalidate all sessions except current (revokes refresh tokens too)
  await db
    .delete(sessions)
    .where(and(eq(sessions.userId, userId), ne(sessions.id, currentSessionId)));

  return { message: 'Password changed. All other sessions have been signed out.' };
}

export async function forgotPassword(email: string): Promise<void> {
  const user = (
    await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1)
  )[0];

  // Always return success to prevent email enumeration
  if (!user) return;

  const token = generateToken();
  await db.insert(verificationTokens).values({
    id: crypto.randomUUID(),
    userId: user.id,
    type: 'password_reset',
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + PASSWORD_RESET_EXPIRY_HOURS * 60 * 60 * 1000),
    createdAt: new Date(),
  });

  // TODO: Send password reset email (MVP-018)
  console.log(`[EMAIL] Password reset token for ${email}: ${token}`);
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const tokenHash = hashToken(token);

  const record = (
    await db
      .select()
      .from(verificationTokens)
      .where(
        and(
          eq(verificationTokens.tokenHash, tokenHash),
          eq(verificationTokens.type, 'password_reset'),
          isNull(verificationTokens.usedAt),
          gt(verificationTokens.expiresAt, new Date()),
        ),
      )
      .limit(1)
  )[0];

  if (!record) {
    throw new AppError(400, ErrorCode.BAD_REQUEST, 'Invalid or expired reset token');
  }

  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  const now = new Date();

  await db
    .update(users)
    .set({ passwordHash: newHash, updatedAt: now })
    .where(eq(users.id, record.userId));
  await db
    .update(verificationTokens)
    .set({ usedAt: now })
    .where(eq(verificationTokens.id, record.id));

  // Invalidate all sessions
  await db.delete(sessions).where(eq(sessions.userId, record.userId));
}

export async function verifyEmail(token: string): Promise<void> {
  const tokenHash = hashToken(token);

  const record = (
    await db
      .select()
      .from(verificationTokens)
      .where(
        and(
          eq(verificationTokens.tokenHash, tokenHash),
          eq(verificationTokens.type, 'email_verify'),
          isNull(verificationTokens.usedAt),
          gt(verificationTokens.expiresAt, new Date()),
        ),
      )
      .limit(1)
  )[0];

  if (!record) {
    throw new AppError(400, ErrorCode.BAD_REQUEST, 'Invalid or expired verification token');
  }

  const now = new Date();
  await db
    .update(users)
    .set({ emailVerifiedAt: now, updatedAt: now })
    .where(eq(users.id, record.userId));
  await db
    .update(verificationTokens)
    .set({ usedAt: now })
    .where(eq(verificationTokens.id, record.id));
}
