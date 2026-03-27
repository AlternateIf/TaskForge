import crypto from 'node:crypto';
import { db, organizationMembers, organizations, permissions, roles, users } from '@taskforge/db';
import { BUILT_IN_PERMISSIONS } from '@taskforge/shared';
import type { MemberOutput, OrganizationOutput, UpdateOrganizationInput } from '@taskforge/shared';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { AppError, ErrorCode } from '../utils/errors.js';
import * as activityService from './activity.service.js';
import { isEmailDomainAllowed } from './org-auth-settings.service.js';

const TRIAL_DAYS = 14;

const BUILT_IN_ROLES = [
  { name: 'Super Admin', description: 'Full access to all organization resources' },
  { name: 'Admin', description: 'Manage projects, members, and settings' },
  { name: 'Project Manager', description: 'Manage assigned projects and team tasks' },
  { name: 'Team Member', description: 'Work on assigned tasks and projects' },
  { name: 'Guest', description: 'Read-only access to shared projects' },
] as const;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function generateUniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  if (!base) {
    return `org-${crypto.randomBytes(4).toString('hex')}`;
  }

  // Check if base slug is available
  const existing = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, base))
    .limit(1);

  if (existing.length === 0) return base;

  // Add numeric suffix
  for (let i = 2; i <= 100; i++) {
    const candidate = `${base}-${i}`;
    const found = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, candidate))
      .limit(1);
    if (found.length === 0) return candidate;
  }

  // Fallback: append random hex
  return `${base}-${crypto.randomBytes(4).toString('hex')}`;
}

export function toOrganizationOutput(org: typeof organizations.$inferSelect): OrganizationOutput {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    logoUrl: org.logoUrl ?? null,
    settings: (org.settings as Record<string, unknown>) ?? null,
    trialExpiresAt: org.trialExpiresAt?.toISOString() ?? null,
    createdAt: org.createdAt.toISOString(),
    updatedAt: org.updatedAt.toISOString(),
  };
}

export async function createOrganization(
  name: string,
  creatorUserId: string,
): Promise<{ organization: OrganizationOutput; roles: { id: string; name: string }[] }> {
  const orgId = crypto.randomUUID();
  const slug = await generateUniqueSlug(name);
  const now = new Date();
  const trialExpiresAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  // Create org
  await db.insert(organizations).values({
    id: orgId,
    name,
    slug,
    settings: {
      defaultProjectWorkflow: ['To Do', 'In Progress', 'Review', 'Done'],
      timezone: 'UTC',
      dateFormat: 'YYYY-MM-DD',
    },
    trialExpiresAt,
    createdAt: now,
    updatedAt: now,
  });

  // Create built-in roles
  const createdRoles: { id: string; name: string }[] = [];
  for (const role of BUILT_IN_ROLES) {
    const roleId = crypto.randomUUID();
    await db.insert(roles).values({
      id: roleId,
      organizationId: orgId,
      name: role.name,
      description: role.description,
      isSystem: true,
      createdAt: now,
      updatedAt: now,
    });
    createdRoles.push({ id: roleId, name: role.name });

    // Seed permissions for this role
    const rolePermissions = BUILT_IN_PERMISSIONS[role.name] ?? [];
    for (const perm of rolePermissions) {
      await db.insert(permissions).values({
        id: crypto.randomUUID(),
        roleId,
        resource: perm.resource,
        action: perm.action,
        scope: perm.scope,
      });
    }
  }

  // Add creator as Super Admin
  const superAdminRole = createdRoles.find((r) => r.name === 'Super Admin');
  if (!superAdminRole) {
    throw new AppError(500, ErrorCode.INTERNAL_ERROR, 'Failed to create Super Admin role');
  }

  await db.insert(organizationMembers).values({
    id: crypto.randomUUID(),
    organizationId: orgId,
    userId: creatorUserId,
    roleId: superAdminRole.id,
    joinedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  const org = (
    await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1)
  )[0];

  await activityService.log({
    organizationId: orgId,
    actorId: creatorUserId,
    entityType: 'organization',
    entityId: orgId,
    action: 'created',
  });

  return { organization: toOrganizationOutput(org), roles: createdRoles };
}

export async function listUserOrganizations(userId: string): Promise<OrganizationOutput[]> {
  const memberships = await db
    .select({ organizationId: organizationMembers.organizationId })
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId));

  if (memberships.length === 0) return [];

  const orgIds = memberships.map((m) => m.organizationId);
  const orgs = await db
    .select()
    .from(organizations)
    .where(and(isNull(organizations.deletedAt), inArray(organizations.id, orgIds)));

  return orgs.map(toOrganizationOutput);
}

export async function getOrganization(orgId: string, userId: string): Promise<OrganizationOutput> {
  // Check membership
  await requireMembership(orgId, userId);

  const org = (
    await db
      .select()
      .from(organizations)
      .where(and(eq(organizations.id, orgId), isNull(organizations.deletedAt)))
      .limit(1)
  )[0];

  if (!org) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Organization not found');
  }

  return toOrganizationOutput(org);
}

export async function updateOrganization(
  orgId: string,
  userId: string,
  input: UpdateOrganizationInput,
): Promise<OrganizationOutput> {
  await requireRole(orgId, userId, ['Super Admin', 'Admin']);

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name !== undefined) updateData.name = input.name;
  if (input.logoUrl !== undefined) updateData.logoUrl = input.logoUrl;
  if (input.settings !== undefined) updateData.settings = input.settings;

  // Capture before values for activity log
  const orgBefore = (
    await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1)
  )[0];

  await db.update(organizations).set(updateData).where(eq(organizations.id, orgId));

  const changes: Record<string, { before: unknown; after: unknown }> = {};
  if (input.name !== undefined && orgBefore.name !== input.name) {
    changes.name = { before: orgBefore.name, after: input.name };
  }
  if (input.logoUrl !== undefined && orgBefore.logoUrl !== input.logoUrl) {
    changes.logoUrl = { before: orgBefore.logoUrl, after: input.logoUrl };
  }
  if (Object.keys(changes).length > 0) {
    await activityService.log({
      organizationId: orgId,
      actorId: userId,
      entityType: 'organization',
      entityId: orgId,
      action: 'updated',
      changes,
    });
  }

  return getOrganization(orgId, userId);
}

export async function deleteOrganization(orgId: string, userId: string): Promise<void> {
  await requireRole(orgId, userId, ['Super Admin']);

  const org = (
    await db
      .select()
      .from(organizations)
      .where(and(eq(organizations.id, orgId), isNull(organizations.deletedAt)))
      .limit(1)
  )[0];

  if (!org) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Organization not found');
  }

  await db
    .update(organizations)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(organizations.id, orgId));

  await activityService.log({
    organizationId: orgId,
    actorId: userId,
    entityType: 'organization',
    entityId: orgId,
    action: 'deleted',
  });
}

export async function listMembers(orgId: string, userId: string): Promise<MemberOutput[]> {
  await requireMembership(orgId, userId);

  const members = await db
    .select({
      id: organizationMembers.id,
      userId: organizationMembers.userId,
      roleId: organizationMembers.roleId,
      joinedAt: organizationMembers.joinedAt,
      email: users.email,
      displayName: users.displayName,
      roleName: roles.name,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .innerJoin(roles, eq(organizationMembers.roleId, roles.id))
    .where(eq(organizationMembers.organizationId, orgId));

  return members.map((m) => ({
    id: m.id,
    userId: m.userId,
    email: m.email,
    displayName: m.displayName,
    roleName: m.roleName,
    roleId: m.roleId,
    joinedAt: m.joinedAt.toISOString(),
  }));
}

export async function addMember(
  orgId: string,
  actorUserId: string,
  email: string,
  roleId: string,
): Promise<MemberOutput> {
  await requireRole(orgId, actorUserId, ['Super Admin', 'Admin']);

  // Verify the role belongs to this org
  const role = (
    await db
      .select()
      .from(roles)
      .where(and(eq(roles.id, roleId), eq(roles.organizationId, orgId)))
      .limit(1)
  )[0];

  if (!role) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Role not found in this organization');
  }

  // Check email domain restriction
  const domainAllowed = await isEmailDomainAllowed(orgId, email);
  if (!domainAllowed) {
    throw new AppError(
      403,
      ErrorCode.FORBIDDEN,
      'Email domain is not allowed for this organization',
    );
  }

  // Find user by email
  const user = (
    await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1)
  )[0];

  if (!user) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'User not found with this email');
  }

  // Check if already a member
  const existing = await db
    .select({ id: organizationMembers.id })
    .from(organizationMembers)
    .where(
      and(eq(organizationMembers.organizationId, orgId), eq(organizationMembers.userId, user.id)),
    )
    .limit(1);

  if (existing.length > 0) {
    throw new AppError(409, ErrorCode.CONFLICT, 'User is already a member of this organization');
  }

  const memberId = crypto.randomUUID();
  const now = new Date();

  await db.insert(organizationMembers).values({
    id: memberId,
    organizationId: orgId,
    userId: user.id,
    roleId,
    joinedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  await activityService.log({
    organizationId: orgId,
    actorId: actorUserId,
    entityType: 'organization',
    entityId: orgId,
    action: 'member_added',
    changes: {
      member: { before: null, after: user.displayName },
      role: { before: null, after: role.name },
    },
  });

  return {
    id: memberId,
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    roleName: role.name,
    roleId: role.id,
    joinedAt: now.toISOString(),
  };
}

export async function updateMemberRole(
  orgId: string,
  actorUserId: string,
  memberId: string,
  roleId: string,
): Promise<MemberOutput> {
  await requireRole(orgId, actorUserId, ['Super Admin', 'Admin']);

  const member = (
    await db
      .select()
      .from(organizationMembers)
      .where(
        and(eq(organizationMembers.id, memberId), eq(organizationMembers.organizationId, orgId)),
      )
      .limit(1)
  )[0];

  if (!member) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Member not found');
  }

  // Verify the role belongs to this org
  const role = (
    await db
      .select()
      .from(roles)
      .where(and(eq(roles.id, roleId), eq(roles.organizationId, orgId)))
      .limit(1)
  )[0];

  if (!role) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Role not found in this organization');
  }

  // Get old role name for activity log
  const oldRole = (
    await db.select({ name: roles.name }).from(roles).where(eq(roles.id, member.roleId)).limit(1)
  )[0];

  await db
    .update(organizationMembers)
    .set({ roleId, updatedAt: new Date() })
    .where(eq(organizationMembers.id, memberId));

  const user = (await db.select().from(users).where(eq(users.id, member.userId)).limit(1))[0];

  if (oldRole?.name !== role.name) {
    await activityService.log({
      organizationId: orgId,
      actorId: actorUserId,
      entityType: 'organization',
      entityId: orgId,
      action: 'member_role_changed',
      changes: {
        member: { before: user.displayName, after: user.displayName },
        role: { before: oldRole?.name ?? null, after: role.name },
      },
    });
  }

  return {
    id: memberId,
    userId: member.userId,
    email: user.email,
    displayName: user.displayName,
    roleName: role.name,
    roleId: role.id,
    joinedAt: member.joinedAt.toISOString(),
  };
}

export async function removeMember(
  orgId: string,
  actorUserId: string,
  memberId: string,
): Promise<void> {
  await requireRole(orgId, actorUserId, ['Super Admin', 'Admin']);

  const member = (
    await db
      .select()
      .from(organizationMembers)
      .where(
        and(eq(organizationMembers.id, memberId), eq(organizationMembers.organizationId, orgId)),
      )
      .limit(1)
  )[0];

  if (!member) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Member not found');
  }

  // Prevent removing yourself if you're the last Super Admin
  if (member.userId === actorUserId) {
    const actorRole = await getMemberRole(orgId, actorUserId);
    if (actorRole === 'Super Admin') {
      const superAdmins = await countMembersWithRole(orgId, 'Super Admin');
      if (superAdmins <= 1) {
        throw new AppError(
          400,
          ErrorCode.BAD_REQUEST,
          'Cannot remove the last Super Admin from the organization',
        );
      }
    }
  }

  // Get member display name for activity log
  const memberUser = (
    await db
      .select({ displayName: users.displayName })
      .from(users)
      .where(eq(users.id, member.userId))
      .limit(1)
  )[0];

  await db.delete(organizationMembers).where(eq(organizationMembers.id, memberId));

  await activityService.log({
    organizationId: orgId,
    actorId: actorUserId,
    entityType: 'organization',
    entityId: orgId,
    action: 'member_removed',
    changes: {
      member: { before: memberUser?.displayName ?? null, after: null },
    },
  });
}

// --- Helpers ---

async function requireMembership(orgId: string, userId: string): Promise<void> {
  const member = await db
    .select({ id: organizationMembers.id })
    .from(organizationMembers)
    .where(
      and(eq(organizationMembers.organizationId, orgId), eq(organizationMembers.userId, userId)),
    )
    .limit(1);

  if (member.length === 0) {
    throw new AppError(403, ErrorCode.FORBIDDEN, 'You are not a member of this organization');
  }
}

async function getMemberRole(orgId: string, userId: string): Promise<string> {
  const result = await db
    .select({ roleName: roles.name })
    .from(organizationMembers)
    .innerJoin(roles, eq(organizationMembers.roleId, roles.id))
    .where(
      and(eq(organizationMembers.organizationId, orgId), eq(organizationMembers.userId, userId)),
    )
    .limit(1);

  if (result.length === 0) {
    throw new AppError(403, ErrorCode.FORBIDDEN, 'You are not a member of this organization');
  }

  return result[0].roleName;
}

async function requireRole(orgId: string, userId: string, allowedRoles: string[]): Promise<void> {
  const roleName = await getMemberRole(orgId, userId);
  if (!allowedRoles.includes(roleName)) {
    throw new AppError(403, ErrorCode.FORBIDDEN, 'Insufficient permissions');
  }
}

async function countMembersWithRole(orgId: string, roleName: string): Promise<number> {
  const result = await db
    .select({ id: organizationMembers.id })
    .from(organizationMembers)
    .innerJoin(roles, eq(organizationMembers.roleId, roles.id))
    .where(and(eq(organizationMembers.organizationId, orgId), eq(roles.name, roleName)));

  return result.length;
}
