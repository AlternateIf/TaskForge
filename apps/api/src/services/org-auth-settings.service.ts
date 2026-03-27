import crypto from 'node:crypto';
import { db, organizationAuthSettings, organizations } from '@taskforge/db';
import type { UpdateAuthSettingsInput } from '@taskforge/shared';
import { eq } from 'drizzle-orm';
import { AppError, ErrorCode } from '../utils/errors.js';
import * as activityService from './activity.service.js';

export interface AuthSettingsOutput {
  organizationId: string;
  passwordAuthEnabled: boolean;
  googleOauthEnabled: boolean;
  githubOauthEnabled: boolean;
  mfaEnforced: boolean;
  mfaEnforcedAt: string | null;
  mfaGracePeriodDays: number;
  allowedEmailDomains: string[] | null;
  updatedAt: string;
}

const DEFAULTS: Omit<AuthSettingsOutput, 'organizationId' | 'updatedAt'> = {
  passwordAuthEnabled: true,
  googleOauthEnabled: false,
  githubOauthEnabled: false,
  mfaEnforced: false,
  mfaEnforcedAt: null,
  mfaGracePeriodDays: 7,
  allowedEmailDomains: null,
};

function toOutput(row: typeof organizationAuthSettings.$inferSelect): AuthSettingsOutput {
  return {
    organizationId: row.organizationId,
    passwordAuthEnabled: row.passwordAuthEnabled,
    googleOauthEnabled: row.googleOauthEnabled,
    githubOauthEnabled: row.githubOauthEnabled,
    mfaEnforced: row.mfaEnforced,
    mfaEnforcedAt: row.mfaEnforcedAt?.toISOString() ?? null,
    mfaGracePeriodDays: row.mfaGracePeriodDays,
    allowedEmailDomains: row.allowedEmailDomains ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function ensureOrgExists(orgId: string): Promise<void> {
  const rows = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);
  if (rows.length === 0) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Organization not found');
  }
}

export async function getAuthSettings(orgId: string): Promise<AuthSettingsOutput> {
  await ensureOrgExists(orgId);

  const rows = await db
    .select()
    .from(organizationAuthSettings)
    .where(eq(organizationAuthSettings.organizationId, orgId))
    .limit(1);

  if (rows.length === 0) {
    // Return defaults — settings row is created lazily on first update
    return {
      ...DEFAULTS,
      organizationId: orgId,
      updatedAt: new Date().toISOString(),
    };
  }

  return toOutput(rows[0]);
}

export async function updateAuthSettings(
  orgId: string,
  actorId: string,
  input: UpdateAuthSettingsInput,
): Promise<AuthSettingsOutput> {
  await ensureOrgExists(orgId);

  const existing = await db
    .select()
    .from(organizationAuthSettings)
    .where(eq(organizationAuthSettings.organizationId, orgId))
    .limit(1);

  // Merge input with current values (or defaults) to compute the final state
  const current = existing[0];
  const merged = {
    passwordAuthEnabled: input.passwordAuthEnabled ?? current?.passwordAuthEnabled ?? true,
    googleOauthEnabled: input.googleOauthEnabled ?? current?.googleOauthEnabled ?? false,
    githubOauthEnabled: input.githubOauthEnabled ?? current?.githubOauthEnabled ?? false,
    mfaEnforced: input.mfaEnforced ?? current?.mfaEnforced ?? false,
    mfaGracePeriodDays: input.mfaGracePeriodDays ?? current?.mfaGracePeriodDays ?? 7,
    allowedEmailDomains:
      input.allowedEmailDomains !== undefined
        ? input.allowedEmailDomains
        : (current?.allowedEmailDomains ?? null),
  };

  // Lockout prevention: at least one auth method must be enabled
  const authMethodCount = [
    merged.passwordAuthEnabled,
    merged.googleOauthEnabled,
    merged.githubOauthEnabled,
  ].filter(Boolean).length;

  if (authMethodCount === 0) {
    throw new AppError(
      422,
      ErrorCode.UNPROCESSABLE_ENTITY,
      'At least one authentication method must remain enabled',
    );
  }

  // Normalize email domains to lowercase
  if (merged.allowedEmailDomains) {
    merged.allowedEmailDomains = merged.allowedEmailDomains.map((d) => d.toLowerCase());
  }

  // Track MFA enforcement timestamp
  let mfaEnforcedAt = current?.mfaEnforcedAt ?? null;
  if (merged.mfaEnforced && !current?.mfaEnforced) {
    // MFA just turned on — record the timestamp
    mfaEnforcedAt = new Date();
  } else if (!merged.mfaEnforced) {
    // MFA turned off — clear the timestamp
    mfaEnforcedAt = null;
  }

  const now = new Date();

  if (current) {
    // Update existing row
    await db
      .update(organizationAuthSettings)
      .set({
        ...merged,
        mfaEnforcedAt,
        updatedAt: now,
      })
      .where(eq(organizationAuthSettings.id, current.id));
  } else {
    // Insert new row
    await db.insert(organizationAuthSettings).values({
      id: crypto.randomUUID(),
      organizationId: orgId,
      ...merged,
      mfaEnforcedAt,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Build changes for activity log
  const changes: Record<string, { before: unknown; after: unknown }> = {};
  const prev = {
    passwordAuthEnabled: current?.passwordAuthEnabled ?? true,
    googleOauthEnabled: current?.googleOauthEnabled ?? false,
    githubOauthEnabled: current?.githubOauthEnabled ?? false,
    mfaEnforced: current?.mfaEnforced ?? false,
    mfaGracePeriodDays: current?.mfaGracePeriodDays ?? 7,
    allowedEmailDomains: current?.allowedEmailDomains ?? null,
  };

  for (const key of Object.keys(merged) as Array<keyof typeof merged>) {
    const before = prev[key];
    const after = merged[key];
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      changes[key] = { before, after };
    }
  }

  if (Object.keys(changes).length > 0) {
    await activityService.log({
      organizationId: orgId,
      actorId,
      entityType: 'organization',
      entityId: orgId,
      action: 'auth_settings_updated',
      changes,
    });
  }

  // Re-read and return
  const updated = await db
    .select()
    .from(organizationAuthSettings)
    .where(eq(organizationAuthSettings.organizationId, orgId))
    .limit(1);

  return toOutput(updated[0]);
}

/**
 * Check if a specific auth method is enabled for an organization.
 * Returns defaults if no settings row exists.
 */
export async function isAuthMethodEnabled(
  orgId: string,
  method: 'password' | 'google' | 'github',
): Promise<boolean> {
  const settings = await getAuthSettings(orgId);
  switch (method) {
    case 'password':
      return settings.passwordAuthEnabled;
    case 'google':
      return settings.googleOauthEnabled;
    case 'github':
      return settings.githubOauthEnabled;
  }
}

/**
 * Check if an email domain is allowed for the organization.
 * Returns true if no domain restriction is set.
 */
export async function isEmailDomainAllowed(orgId: string, email: string): Promise<boolean> {
  const settings = await getAuthSettings(orgId);
  if (!settings.allowedEmailDomains || settings.allowedEmailDomains.length === 0) {
    return true;
  }
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  return settings.allowedEmailDomains.includes(domain);
}

/**
 * Check if a user is within the MFA grace period.
 * Returns true if MFA is not enforced or the grace period hasn't expired.
 */
export async function isWithinMfaGracePeriod(orgId: string): Promise<boolean> {
  const settings = await getAuthSettings(orgId);
  if (!settings.mfaEnforced || !settings.mfaEnforcedAt) return true;

  const enforcedAt = new Date(settings.mfaEnforcedAt);
  const graceEnd = new Date(
    enforcedAt.getTime() + settings.mfaGracePeriodDays * 24 * 60 * 60 * 1000,
  );
  return new Date() < graceEnd;
}
