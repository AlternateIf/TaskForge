import crypto from 'node:crypto';
import { db, roleAssignments, roles, sessions, users, verificationTokens } from '@taskforge/db';
import { ROLE_NAMES } from '@taskforge/shared';
import type { RegisterInput } from '@taskforge/shared';
import bcrypt from 'bcrypt';
import { and, eq, gt, isNull, ne } from 'drizzle-orm';
import { AppError, ErrorCode } from '../utils/errors.js';
import { sendEmail } from './email.service.js';

type DbExecutor = Pick<typeof db, 'select' | 'insert' | 'update' | 'delete'>;

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = 15 * 60; // 15 minutes in seconds
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const EMAIL_VERIFY_EXPIRY_HOURS = 24;
const PASSWORD_RESET_EXPIRY_HOURS = 1;
const AUTH_ALLOW_PUBLIC_REGISTER = process.env.AUTH_ALLOW_PUBLIC_REGISTER === 'true';
const IS_PROD = process.env.NODE_ENV === 'production';
const SEEDED_DEV_MARKER_EMAIL = 'owner@acme.taskforge.local';

export interface AuthConfig {
  allowPublicRegister: boolean;
  enabledOAuthProviders: string[];
  requiresInitialSetup: boolean;
}

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
  if (!AUTH_ALLOW_PUBLIC_REGISTER) {
    throw new AppError(403, ErrorCode.FORBIDDEN, 'Public registration is disabled');
  }

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

  const { user, tokens } = await db.transaction(async (tx) => {
    await tx.insert(users).values({
      id,
      email: input.email,
      passwordHash,
      displayName: input.displayName,
      createdAt: now,
      updatedAt: now,
    });

    const user = (await tx.select().from(users).where(eq(users.id, id)).limit(1))[0];

    // Create email verification token
    const verifyToken = generateToken();
    await tx.insert(verificationTokens).values({
      id: crypto.randomUUID(),
      userId: id,
      type: 'email_verify',
      tokenHash: hashToken(verifyToken),
      expiresAt: new Date(Date.now() + EMAIL_VERIFY_EXPIRY_HOURS * 60 * 60 * 1000),
      createdAt: now,
    });

    // Auto-login after registration
    const tokens = await createSession(user, jwtSign, ip, userAgent, tx);

    return { user, tokens };
  });

  // TODO: Send verification email (MVP-018 adds RabbitMQ email queue)
  console.log(`[EMAIL] Verification email would be sent to ${input.email}`);

  return { user, tokens };
}

export type LoginResult =
  | { mfaRequired: false; user: typeof users.$inferSelect; tokens: TokenPair }
  | { mfaRequired: true; mfaToken: string }
  | { mfaRequired: true; mfaToken: string; mfaSetupRequired: true };

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

  // Check MFA enforcement across all user orgs when no specific org was targeted
  // (when an org is specified, enforcement is checked at session-refresh time)
  const { evaluateMfaEnforcement } = await import('./mfa.service.js');
  const enforcement = await evaluateMfaEnforcement(user.id);

  if (enforcement.status === 'enforced' && !user.mfaEnabled) {
    // Grace period expired and user doesn't have MFA — require setup
    const { createMfaToken } = await import('./mfa.service.js');
    const mfaToken = await createMfaToken(user.id);
    return { mfaRequired: true, mfaToken, mfaSetupRequired: true };
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
  tx?: DbExecutor,
): Promise<TokenPair> {
  const executor = tx ?? db;
  const refreshTokenRaw = generateToken();
  const sessionId = crypto.randomUUID();

  const accessToken = jwtSign(
    { sub: user.id, email: user.email, sid: sessionId },
    { expiresIn: ACCESS_TOKEN_EXPIRY },
  );

  await executor.insert(sessions).values({
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
): Promise<{ accessToken: string; refreshTokenRaw: string }> {
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

  // Re-check MFA enforcement: if an org enforces MFA and the user's grace period
  // has expired without them setting up MFA, block the refresh
  if (!user.mfaEnabled) {
    const { evaluateMfaEnforcement } = await import('./mfa.service.js');
    const enforcement = await evaluateMfaEnforcement(user.id);
    if (enforcement.status === 'enforced') {
      throw new AppError(
        403,
        ErrorCode.MFA_ENFORCED_BY_ORG,
        'MFA is required by your organization. Please set up MFA before continuing.',
      );
    }
  }

  const accessToken = jwtSign(
    { sub: user.id, email: user.email, sid: session.id },
    { expiresIn: ACCESS_TOKEN_EXPIRY },
  );

  // Rotate refresh token: generate new token and update session
  const newRefreshTokenRaw = generateToken();
  await db
    .update(sessions)
    .set({
      tokenHash: hashToken(newRefreshTokenRaw),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    })
    .where(eq(sessions.id, session.id));

  return { accessToken, refreshTokenRaw: newRefreshTokenRaw };
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

  await db
    .update(users)
    .set({ passwordHash: newHash, mustChangePassword: false, updatedAt: now })
    .where(eq(users.id, userId));

  // Invalidate all sessions except current (revokes refresh tokens too)
  await db
    .delete(sessions)
    .where(and(eq(sessions.userId, userId), ne(sessions.id, currentSessionId)));

  // Send security notification (fire-and-forget — don't block the response)
  sendEmail({
    to: user.email,
    subject: 'Your TaskForge password was changed',
    html: `<p>Hi ${user.displayName ?? user.email},</p>
<p>Your password was just changed. All other active sessions have been signed out.</p>
<p>If you didn't make this change, please contact your administrator immediately.</p>`,
  }).catch(() => {
    // Email failure is non-fatal
  });

  return { message: 'Password changed. All other sessions have been signed out.' };
}

export function isPublicRegisterAllowed(): boolean {
  return AUTH_ALLOW_PUBLIC_REGISTER;
}

export async function getAuthConfig(): Promise<AuthConfig> {
  const { getAvailableProviders } = await import('./oauth.service.js');
  const existingUser = (
    await db.select({ id: users.id }).from(users).where(isNull(users.deletedAt)).limit(1)
  )[0];

  const requiresInitialSetup = !AUTH_ALLOW_PUBLIC_REGISTER && !existingUser;

  return {
    allowPublicRegister: AUTH_ALLOW_PUBLIC_REGISTER,
    enabledOAuthProviders: getAvailableProviders().map((provider) => provider.id),
    requiresInitialSetup,
  };
}

export async function bootstrapSuperAdmin(): Promise<void> {
  const bootstrapEmail = process.env.AUTH_BOOTSTRAP_SUPER_ADMIN_EMAIL;
  const bootstrapPassword = process.env.AUTH_BOOTSTRAP_SUPER_ADMIN_PASSWORD;

  if (IS_PROD && (!bootstrapEmail || !bootstrapPassword)) {
    throw new Error(
      'AUTH_BOOTSTRAP_SUPER_ADMIN_EMAIL and AUTH_BOOTSTRAP_SUPER_ADMIN_PASSWORD are required in production',
    );
  }

  const email = bootstrapEmail ?? 'superadmin@taskforge.local';
  const password = bootstrapPassword ?? 'Taskforge123!';

  // Preserve deterministic db seed fixtures in development when bootstrap credentials are implicit defaults.
  if (!IS_PROD && !bootstrapEmail && !bootstrapPassword) {
    const seededDevFixtureExists = (
      await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, SEEDED_DEV_MARKER_EMAIL))
        .limit(1)
    )[0];

    if (seededDevFixtureExists) {
      return;
    }
  }

  const now = new Date();

  let superRole = (
    await db
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.name, ROLE_NAMES.SUPER_ADMIN), isNull(roles.organizationId)))
      .limit(1)
  )[0];

  if (!superRole) {
    const roleId = crypto.randomUUID();
    await db.insert(roles).values({
      id: roleId,
      organizationId: null,
      name: ROLE_NAMES.SUPER_ADMIN,
      description: 'Platform super admin with full permissions',
      isSystem: true,
      createdAt: now,
      updatedAt: now,
    });
    superRole = { id: roleId };
  }

  let superUser = (
    await db
      .select({ id: users.id, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
  )[0];

  if (!superUser) {
    const userId = crypto.randomUUID();
    await db.insert(users).values({
      id: userId,
      email,
      passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
      displayName: 'Super Admin',
      emailVerifiedAt: now,
      mustChangePassword: true,
      createdAt: now,
      updatedAt: now,
    });
    superUser = { id: userId, passwordHash: 'set' };
  }

  const existingAssignment = (
    await db
      .select({ id: roleAssignments.id })
      .from(roleAssignments)
      .where(
        and(
          eq(roleAssignments.userId, superUser.id),
          eq(roleAssignments.roleId, superRole.id),
          isNull(roleAssignments.organizationId),
        ),
      )
      .limit(1)
  )[0];

  if (!existingAssignment) {
    await db.insert(roleAssignments).values({
      id: crypto.randomUUID(),
      userId: superUser.id,
      roleId: superRole.id,
      organizationId: null,
      assignedByUserId: superUser.id,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Keep bootstrap user in a forced-change state unless explicitly cleared by password change flow.
  await db
    .update(users)
    .set({ mustChangePassword: true, updatedAt: now })
    .where(eq(users.id, superUser.id));
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
  console.log(`[EMAIL] Password reset email would be sent to ${email}`);
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

const EMAIL_CHANGE_EXPIRY_HOURS = 24;
const APP_URL = process.env.APP_URL ?? 'http://localhost:5173';

export async function requestEmailChange(
  userId: string,
  newEmail: string,
  currentPassword: string,
): Promise<void> {
  const user = (
    await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1)
  )[0];

  if (!user) throw new AppError(404, ErrorCode.NOT_FOUND, 'User not found');

  if (!user.passwordHash || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Current password is incorrect');
  }

  const taken = (
    await db.select({ id: users.id }).from(users).where(eq(users.email, newEmail)).limit(1)
  )[0];
  if (taken) throw new AppError(409, ErrorCode.CONFLICT, 'This email is already in use');

  const token = generateToken();
  const now = new Date();

  await db
    .update(users)
    .set({ pendingEmail: newEmail, updatedAt: now })
    .where(eq(users.id, userId));

  await db.insert(verificationTokens).values({
    id: crypto.randomUUID(),
    userId,
    type: 'email_change',
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + EMAIL_CHANGE_EXPIRY_HOURS * 60 * 60 * 1000),
    createdAt: now,
  });

  const confirmUrl = `${APP_URL}/auth/confirm-email-change?token=${token}`;
  await sendEmail({
    to: newEmail,
    subject: 'Confirm your new email address — TaskForge',
    html: `
      <p>Hi ${user.displayName},</p>
      <p>We received a request to change your TaskForge email address to this one.</p>
      <p><a href="${confirmUrl}">Click here to confirm your new email address</a></p>
      <p>This link expires in 24 hours. If you didn't request this, you can safely ignore this email.</p>
    `,
  });
}

export async function confirmEmailChange(token: string): Promise<void> {
  const tokenHash = hashToken(token);

  const record = (
    await db
      .select()
      .from(verificationTokens)
      .where(
        and(
          eq(verificationTokens.tokenHash, tokenHash),
          eq(verificationTokens.type, 'email_change'),
          isNull(verificationTokens.usedAt),
          gt(verificationTokens.expiresAt, new Date()),
        ),
      )
      .limit(1)
  )[0];

  if (!record)
    throw new AppError(400, ErrorCode.BAD_REQUEST, 'Invalid or expired confirmation link');

  const user = (await db.select().from(users).where(eq(users.id, record.userId)).limit(1))[0];

  if (!user?.pendingEmail)
    throw new AppError(400, ErrorCode.BAD_REQUEST, 'No pending email change found');

  const oldEmail = user.email;
  const newEmail = user.pendingEmail;
  const now = new Date();

  await db
    .update(users)
    .set({ email: newEmail, pendingEmail: null, updatedAt: now })
    .where(eq(users.id, record.userId));

  await db
    .update(verificationTokens)
    .set({ usedAt: now })
    .where(eq(verificationTokens.id, record.id));

  // Invalidate all sessions — user must sign in again with new email
  await db.delete(sessions).where(eq(sessions.userId, record.userId));

  // Notify old address (fire-and-forget)
  sendEmail({
    to: oldEmail,
    subject: 'Your TaskForge email address has been changed',
    html: `
      <p>Hi ${user.displayName},</p>
      <p>Your TaskForge email address has been changed to <strong>${newEmail}</strong>.</p>
      <p>If you did not make this change, contact support immediately.</p>
    `,
  }).catch(() => {});
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
