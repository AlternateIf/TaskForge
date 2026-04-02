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
import { and, eq, isNull, or } from 'drizzle-orm';
import { AppError, ErrorCode } from '../utils/errors.js';

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
