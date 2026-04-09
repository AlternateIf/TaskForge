import crypto from 'node:crypto';
import { db, organizationAuthSettings, organizationMembers, users } from '@taskforge/db';
import bcrypt from 'bcrypt';
import { and, eq, isNotNull } from 'drizzle-orm';
import * as OTPAuth from 'otpauth';
import { AppError, ErrorCode } from '../utils/errors.js';
import { getRedis } from '../utils/redis.js';

const MFA_TOKEN_TTL = 300; // 5 minutes
const TOTP_WINDOW = 1; // ±30 second drift
const APP_NAME = 'TaskForge';

// Encryption key for storing TOTP secrets at rest
const IS_PROD = process.env.NODE_ENV === 'production';
if (IS_PROD && !process.env.MFA_ENCRYPTION_KEY) {
  throw new Error('MFA_ENCRYPTION_KEY environment variable is required in production');
}
const ENCRYPTION_KEY = process.env.MFA_ENCRYPTION_KEY ?? 'dev-mfa-key-change-in-production-32ch';

function getEncryptionKey(): Buffer {
  // Ensure key is exactly 32 bytes for AES-256
  return crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
}

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Store as: iv:authTag:ciphertext (all base64)
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptSecret(ciphertext: string): string {
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted secret format');
  }
  const [ivB64, authTagB64, encryptedB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const encrypted = Buffer.from(encryptedB64, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final('utf-8');
}

export function generateTotpSecret(): { secret: string; uri: string } {
  const totp = new OTPAuth.TOTP({
    issuer: APP_NAME,
    label: APP_NAME,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  });

  return {
    secret: totp.secret.base32,
    uri: totp.toString(),
  };
}

export function verifyTotpCode(secret: string, code: string): boolean {
  const totp = new OTPAuth.TOTP({
    issuer: APP_NAME,
    label: APP_NAME,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

  const delta = totp.validate({ token: code, window: TOTP_WINDOW });
  return delta !== null;
}

export async function setupMfa(userId: string): Promise<{ secret: string; uri: string }> {
  const user = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
  if (!user) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'User not found');
  }

  if (user.mfaEnabled) {
    throw new AppError(400, ErrorCode.BAD_REQUEST, 'MFA is already enabled');
  }

  // Prevent overwriting a pending (unverified) secret — user must verify or disable first
  if (user.mfaSecret) {
    throw new AppError(
      400,
      ErrorCode.BAD_REQUEST,
      'MFA setup is already pending. Verify the current setup or request a reset.',
    );
  }

  const { secret } = generateTotpSecret();

  // Build a URI that includes the user's email
  const totp = new OTPAuth.TOTP({
    issuer: APP_NAME,
    label: user.email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

  // Store encrypted secret temporarily (not enabled yet)
  const encryptedSecret = encryptSecret(secret);
  await db
    .update(users)
    .set({ mfaSecret: encryptedSecret, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return { secret, uri: totp.toString() };
}

export async function verifySetup(userId: string, code: string): Promise<void> {
  const user = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
  if (!user) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'User not found');
  }

  if (user.mfaEnabled) {
    throw new AppError(400, ErrorCode.BAD_REQUEST, 'MFA is already enabled');
  }

  if (!user.mfaSecret) {
    throw new AppError(400, ErrorCode.BAD_REQUEST, 'MFA setup not initiated');
  }

  const secret = decryptSecret(user.mfaSecret);
  const valid = verifyTotpCode(secret, code);

  if (!valid) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Invalid TOTP code');
  }

  // Enable MFA
  await db
    .update(users)
    .set({ mfaEnabled: true, updatedAt: new Date() })
    .where(eq(users.id, userId));

  // Audit: MFA enabled (userId is already in the DB update for traceability)
}

export async function createMfaToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const redis = getRedis();
  await redis.set(`mfa:token:${tokenHash}`, JSON.stringify({ userId }), 'EX', MFA_TOKEN_TTL);

  return token;
}

export async function verifyMfaLogin(mfaToken: string, code: string): Promise<{ userId: string }> {
  const tokenHash = crypto.createHash('sha256').update(mfaToken).digest('hex');
  const redis = getRedis();

  const data = await redis.get(`mfa:token:${tokenHash}`);
  if (!data) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Invalid or expired MFA token');
  }

  // Delete token immediately (single-use)
  await redis.del(`mfa:token:${tokenHash}`);

  const { userId } = JSON.parse(data) as { userId: string };

  const user = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
  if (!user || !user.mfaSecret) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'User not found or MFA not configured');
  }

  const secret = decryptSecret(user.mfaSecret);
  const valid = verifyTotpCode(secret, code);

  if (!valid) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Invalid TOTP code');
  }

  // Update last login
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId));

  return { userId };
}

export async function disableMfa(userId: string, code: string): Promise<void> {
  const user = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
  if (!user) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'User not found');
  }

  if (!user.mfaEnabled || !user.mfaSecret) {
    throw new AppError(400, ErrorCode.BAD_REQUEST, 'MFA is not enabled');
  }

  const secret = decryptSecret(user.mfaSecret);
  const valid = verifyTotpCode(secret, code);

  if (!valid) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Invalid TOTP code');
  }

  // Check if any organization the user belongs to enforces MFA
  // Block disable whenever any org enforces MFA, regardless of grace period status
  const enforcement = await evaluateMfaEnforcement(userId);
  if (enforcement.status === 'enforced' || enforcement.status === 'grace') {
    throw new AppError(
      403,
      ErrorCode.MFA_ENFORCED_BY_ORG,
      'Cannot disable MFA because it is enforced by at least one of your organizations',
    );
  }

  await db
    .update(users)
    .set({ mfaEnabled: false, mfaSecret: null, updatedAt: new Date() })
    .where(eq(users.id, userId));

  // Audit: MFA disabled (userId is already in the DB update for traceability)
}

export async function resetPendingMfa(userId: string, password: string): Promise<void> {
  const user = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
  if (!user) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'User not found');
  }

  if (!user.passwordHash) {
    throw new AppError(
      400,
      ErrorCode.BAD_REQUEST,
      'Self-service MFA reset is not available for OAuth-only users',
    );
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    throw new AppError(400, ErrorCode.BAD_REQUEST, 'Invalid password');
  }

  if (user.mfaEnabled) {
    throw new AppError(
      400,
      ErrorCode.BAD_REQUEST,
      'MFA is already enabled — use the disable flow instead',
    );
  }

  if (!user.mfaSecret) {
    throw new AppError(400, ErrorCode.BAD_REQUEST, 'No pending MFA setup to reset');
  }

  await db
    .update(users)
    .set({ mfaSecret: null, updatedAt: new Date() })
    .where(eq(users.id, userId));

  // Audit: Pending MFA reset
}

// ─── MFA Enforcement Evaluator ────────────────────────────────────────────────

export type MfaEnforcementStatus =
  | { status: 'none' }
  | { status: 'grace'; graceEndsAt: Date }
  | { status: 'enforced'; graceEndsAt: Date | null };

/**
 * Evaluates MFA enforcement across all organizations a user belongs to.
 * Returns the most restrictive result: if any org enforces MFA with an expired
 * grace period, we return 'enforced'. If all enforcing orgs are still in grace,
 * we return 'grace' with the earliest grace end date.
 */
export async function evaluateMfaEnforcement(userId: string): Promise<MfaEnforcementStatus> {
  // Find all orgs this user belongs to that enforce MFA
  const enforcingOrgs = await db
    .select({
      organizationId: organizationAuthSettings.organizationId,
      mfaEnforcedAt: organizationAuthSettings.mfaEnforcedAt,
      mfaGracePeriodDays: organizationAuthSettings.mfaGracePeriodDays,
    })
    .from(organizationAuthSettings)
    .innerJoin(
      organizationMembers,
      eq(organizationMembers.organizationId, organizationAuthSettings.organizationId),
    )
    .where(
      and(
        eq(organizationMembers.userId, userId),
        eq(organizationAuthSettings.mfaEnforced, true),
        isNotNull(organizationAuthSettings.mfaEnforcedAt),
      ),
    );

  if (enforcingOrgs.length === 0) {
    return { status: 'none' };
  }

  const now = new Date();
  let earliestGraceEnd: Date | null = null;
  let anyGraceExpired = false;

  for (const org of enforcingOrgs) {
    if (!org.mfaEnforcedAt) continue;

    const graceEnd = new Date(
      org.mfaEnforcedAt.getTime() + org.mfaGracePeriodDays * 24 * 60 * 60 * 1000,
    );

    if (!earliestGraceEnd || graceEnd < earliestGraceEnd) {
      earliestGraceEnd = graceEnd;
    }

    if (now >= graceEnd) {
      anyGraceExpired = true;
    }
  }

  if (anyGraceExpired) {
    return { status: 'enforced', graceEndsAt: earliestGraceEnd };
  }

  // All enforcing orgs are still within their grace periods
  // earliestGraceEnd is guaranteed to be set since enforcingOrgs.length > 0
  return { status: 'grace', graceEndsAt: earliestGraceEnd ?? new Date() };
}

/**
 * Checks whether disabling MFA is blocked by org enforcement.
 * Returns true if any org enforces MFA (regardless of grace period).
 */
export async function isMfaEnforcedByAnyOrg(userId: string): Promise<boolean> {
  const enforcement = await evaluateMfaEnforcement(userId);
  return enforcement.status === 'enforced' || enforcement.status === 'grace';
}

/**
 * Returns org enforcement details for a user (for the security overview).
 */
export async function getMfaEnforcementInfo(userId: string): Promise<{
  enforcedByOrg: boolean;
  gracePeriodEndsAt: string | null;
}> {
  const enforcement = await evaluateMfaEnforcement(userId);

  if (enforcement.status === 'none') {
    return { enforcedByOrg: false, gracePeriodEndsAt: null };
  }

  return {
    enforcedByOrg: true,
    gracePeriodEndsAt: enforcement.graceEndsAt?.toISOString() ?? null,
  };
}
