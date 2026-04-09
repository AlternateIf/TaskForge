import fs from 'node:fs';
import path from 'node:path';
import {
  db,
  organizationMembers,
  organizations,
  permissionAssignments,
  permissions,
  roleAssignments,
  roles,
  sessions,
  users,
} from '@taskforge/db';
import { GOVERNANCE_PERMISSION_KEYS, ROLE_NAMES } from '@taskforge/shared';
import type { UpdateProfileInput, UserOutput } from '@taskforge/shared';
import { and, count, eq, gt, isNull, ne, or } from 'drizzle-orm';
import { fileTypeFromBuffer } from 'file-type';
import { AppError, ErrorCode } from '../utils/errors.js';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './uploads';
const AVATAR_DIR = path.join(UPLOAD_DIR, 'avatars');
const AVATAR_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const AVATAR_ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const AVATAR_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

export function toUserOutput(
  user: typeof users.$inferSelect,
  org?: { id: string; name: string },
  organizationsList?: { id: string; name: string }[],
  permissionKeys?: string[],
): UserOutput {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl ?? null,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    mustChangePassword: user.mustChangePassword ?? false,
    createdAt: user.createdAt.toISOString(),
    ...(org && { organizationId: org.id, organizationName: org.name }),
    ...(organizationsList ? { organizations: organizationsList } : {}),
    ...(permissionKeys ? { permissions: permissionKeys } : {}),
  };
}

export async function getUserOrg(
  userId: string,
): Promise<{ id: string; name: string } | undefined> {
  const row = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
    .where(eq(organizationMembers.userId, userId))
    .limit(1);
  return row[0];
}

export async function getUserOrganizations(
  userId: string,
): Promise<{ id: string; name: string }[]> {
  return db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
    .where(eq(organizationMembers.userId, userId));
}

export async function getUserById(userId: string): Promise<UserOutput> {
  const user = (
    await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1)
  )[0];

  if (!user) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'User not found');
  }

  const userOrganizations = await getUserOrganizations(userId);
  const permissionKeys = await getUserPermissionKeys(userId, userOrganizations[0]?.id);
  return toUserOutput(user, userOrganizations[0], userOrganizations, permissionKeys);
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<UserOutput> {
  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (input.displayName !== undefined) {
    updateData.displayName = input.displayName;
  }
  if (input.avatarUrl !== undefined) {
    updateData.avatarUrl = input.avatarUrl;
  }

  await db.update(users).set(updateData).where(eq(users.id, userId));

  return getUserById(userId);
}

export async function deleteAccount(userId: string): Promise<{ message: string }> {
  const user = (
    await db
      .select({ id: users.id, deletedAt: users.deletedAt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
  )[0];

  if (!user) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'User not found');
  }

  if (user.deletedAt) {
    throw new AppError(400, ErrorCode.BAD_REQUEST, 'Account is already scheduled for deletion');
  }

  const now = new Date();

  // Soft-delete the user
  await db.update(users).set({ deletedAt: now, updatedAt: now }).where(eq(users.id, userId));

  // Invalidate all sessions
  await db.delete(sessions).where(eq(sessions.userId, userId));

  return {
    message:
      'Account scheduled for deletion. Your data will be anonymized after 30 days. Contact support to restore.',
  };
}

async function getUserPermissionKeys(userId: string, orgId?: string): Promise<string[]> {
  const roleRows = await db
    .select({
      roleId: roleAssignments.roleId,
      roleName: roles.name,
      assignmentOrgId: roleAssignments.organizationId,
    })
    .from(roleAssignments)
    .innerJoin(roles, eq(roleAssignments.roleId, roles.id))
    .where(
      and(
        eq(roleAssignments.userId, userId),
        orgId
          ? or(eq(roleAssignments.organizationId, orgId), isNull(roleAssignments.organizationId))
          : isNull(roleAssignments.organizationId),
      ),
    );

  const hasSuperAdmin = roleRows.some((row) => row.roleName === ROLE_NAMES.SUPER_ADMIN);
  if (hasSuperAdmin) {
    return [...GOVERNANCE_PERMISSION_KEYS];
  }

  const permissionTuples =
    roleRows.length === 0
      ? []
      : await db
          .select({
            roleId: permissions.roleId,
            resource: permissions.resource,
            action: permissions.action,
            scope: permissions.scope,
          })
          .from(permissions)
          .where(or(...roleRows.map((row) => eq(permissions.roleId, row.roleId))));

  const tupleKeys = permissionTuples.map((tuple) => {
    const scopeToken = tuple.scope === 'organization' ? 'org' : tuple.scope;
    return `${tuple.resource}.${tuple.action}.${scopeToken}`;
  });

  const directRows = await db
    .select({ permissionKey: permissionAssignments.permissionKey })
    .from(permissionAssignments)
    .where(
      and(
        eq(permissionAssignments.userId, userId),
        orgId
          ? or(
              eq(permissionAssignments.organizationId, orgId),
              isNull(permissionAssignments.organizationId),
            )
          : isNull(permissionAssignments.organizationId),
      ),
    );

  return [...new Set([...tupleKeys, ...directRows.map((row) => row.permissionKey)])];
}

// ─── Session listing ───────────────────────────────────────────────────────────

export interface SessionRow {
  id: string;
  isCurrent: boolean;
  ipAddress: string | null;
  browser: string;
  os: string;
  deviceType: 'desktop' | 'mobile';
  createdAt: string;
  expiresAt: string;
}

function parseUserAgent(ua: string | null): Pick<SessionRow, 'browser' | 'os' | 'deviceType'> {
  if (!ua) return { browser: 'Unknown', os: 'Unknown', deviceType: 'desktop' };

  const isMobile = /Mobile|Android|iPhone|iPod/i.test(ua);

  let browser = 'Unknown';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera\//i.test(ua)) browser = 'Opera';
  else if (/Chrome\//i.test(ua)) browser = 'Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua)) browser = 'Safari';

  let os = 'Unknown';
  if (/Windows NT/i.test(ua)) os = 'Windows';
  else if (/Mac OS X/i.test(ua) && !/iPhone|iPad/i.test(ua)) os = 'macOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone/i.test(ua)) os = 'iOS';
  else if (/iPad/i.test(ua)) os = 'iPadOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  return { browser, os, deviceType: isMobile ? 'mobile' : 'desktop' };
}

export async function listSessions(
  userId: string,
  currentSessionId: string,
): Promise<SessionRow[]> {
  const now = new Date();
  const rows = await db
    .select({
      id: sessions.id,
      ipAddress: sessions.ipAddress,
      userAgent: sessions.userAgent,
      createdAt: sessions.createdAt,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), gt(sessions.expiresAt, now)));

  return rows
    .sort((a, b) => {
      if (a.id === currentSessionId) return -1;
      if (b.id === currentSessionId) return 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    })
    .map((row) => ({
      id: row.id,
      isCurrent: row.id === currentSessionId,
      ipAddress: row.ipAddress ?? null,
      createdAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      ...parseUserAgent(row.userAgent),
    }));
}

export async function revokeSession(userId: string, sessionId: string): Promise<void> {
  const now = new Date();
  const existing = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(
      and(eq(sessions.id, sessionId), eq(sessions.userId, userId), gt(sessions.expiresAt, now)),
    )
    .limit(1);
  if (existing.length === 0) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Session not found');
  }
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

// ─── Security overview ─────────────────────────────────────────────────────────

export interface SecurityOverview {
  mfaEnabled: boolean;
  mfaEnforcedByOrg: boolean;
  mfaGracePeriodEndsAt: string | null;
  mfaSetupPending: boolean;
  lastLoginAt: string | null;
  activeSessions: number;
}

export async function getSecurityOverview(userId: string): Promise<SecurityOverview> {
  const user = (
    await db
      .select({
        mfaEnabled: users.mfaEnabled,
        mfaSecret: users.mfaSecret,
        lastLoginAt: users.lastLoginAt,
      })
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1)
  )[0];

  if (!user) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'User not found');
  }

  const now = new Date();
  const [sessionCount] = await db
    .select({ count: count() })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), gt(sessions.expiresAt, now)));

  // Fetch org MFA enforcement info
  const { getMfaEnforcementInfo } = await import('./mfa.service.js');
  const enforcementInfo = await getMfaEnforcementInfo(userId);

  return {
    mfaEnabled: user.mfaEnabled,
    mfaEnforcedByOrg: enforcementInfo.enforcedByOrg,
    mfaGracePeriodEndsAt: enforcementInfo.gracePeriodEndsAt,
    mfaSetupPending: !user.mfaEnabled && !!user.mfaSecret,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    activeSessions: sessionCount?.count ?? 0,
  };
}

export async function revokeOtherSessions(
  userId: string,
  currentSessionId: string,
): Promise<{ revoked: number }> {
  const now = new Date();
  const result = await db.delete(sessions).where(
    and(
      eq(sessions.userId, userId),
      gt(sessions.expiresAt, now),
      ne(sessions.id, currentSessionId), // keep the current session
    ),
  );
  return { revoked: (result as unknown as { rowsAffected: number }).rowsAffected ?? 0 };
}

// ─── Avatar ────────────────────────────────────────────────────────────────────

async function clearAvatarFiles(userId: string): Promise<void> {
  const dir = path.join(AVATAR_DIR, userId);
  try {
    const files = await fs.promises.readdir(dir);
    await Promise.all(files.map((f) => fs.promises.unlink(path.join(dir, f))));
  } catch {
    // Directory doesn't exist yet — nothing to clear
  }
}

export async function uploadAvatar(
  userId: string,
  fileBuffer: Buffer,
  declaredMime: string,
): Promise<UserOutput> {
  if (fileBuffer.length > AVATAR_MAX_BYTES) {
    throw new AppError(413, ErrorCode.FILE_TOO_LARGE, 'Avatar must be 5 MB or smaller');
  }

  if (!AVATAR_ALLOWED_MIMES.has(declaredMime)) {
    throw new AppError(
      415,
      ErrorCode.UNSUPPORTED_MEDIA_TYPE,
      'Only JPEG, PNG, GIF, and WebP images are allowed',
    );
  }

  // Verify actual file content via magic bytes
  const detected = await fileTypeFromBuffer(fileBuffer);
  if (!detected || !AVATAR_ALLOWED_MIMES.has(detected.mime)) {
    throw new AppError(
      415,
      ErrorCode.UNSUPPORTED_MEDIA_TYPE,
      'File content does not match an allowed image type',
    );
  }

  const ext = AVATAR_MIME_TO_EXT[detected.mime];
  const dir = path.join(AVATAR_DIR, userId);

  await clearAvatarFiles(userId);
  await fs.promises.mkdir(dir, { recursive: true });
  await fs.promises.writeFile(path.join(dir, `avatar${ext}`), fileBuffer);

  // Store a versioned relative URL so the browser always fetches the new image
  const avatarUrl = `/api/v1/users/avatars/${userId}?v=${Date.now()}`;
  await db.update(users).set({ avatarUrl, updatedAt: new Date() }).where(eq(users.id, userId));

  return getUserById(userId);
}

export async function removeAvatar(userId: string): Promise<UserOutput> {
  await clearAvatarFiles(userId);
  await db
    .update(users)
    .set({ avatarUrl: null, updatedAt: new Date() })
    .where(eq(users.id, userId));
  return getUserById(userId);
}

export async function getAvatarFilePath(
  userId: string,
): Promise<{ filePath: string; mimeType: string } | null> {
  const dir = path.join(AVATAR_DIR, userId);
  let files: string[];
  try {
    files = await fs.promises.readdir(dir);
  } catch {
    return null;
  }

  const filename = files.find((f) => f.startsWith('avatar'));
  if (!filename) return null;

  const extMimes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  };
  const ext = path.extname(filename).toLowerCase();
  return {
    filePath: path.join(dir, filename),
    mimeType: extMimes[ext] ?? 'image/jpeg',
  };
}
