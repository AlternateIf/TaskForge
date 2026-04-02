import crypto from 'node:crypto';
import { db, organizationMembers, organizations, roles, users } from '@taskforge/db';
import type { MemberOutput, OrganizationOutput, UpdateOrganizationInput } from '@taskforge/shared';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { AppError, ErrorCode } from '../utils/errors.js';
import * as activityService from './activity.service.js';
import { isEmailDomainAllowed } from './org-auth-settings.service.js';

const TRIAL_DAYS = 14;

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

  const existing = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, base))
    .limit(1);

  if (existing.length === 0) return base;

  for (let i = 2; i <= 100; i++) {
    const candidate = `${base}-${i}`;
    const found = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, candidate))
      .limit(1);
    if (found.length === 0) return candidate;
  }

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

  await db.insert(organizationMembers).values({
    id: crypto.randomUUID(),
    organizationId: orgId,
    userId: creatorUserId,
    roleId: null,
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

  return { organization: toOrganizationOutput(org), roles: [] };
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
  await requireMembership(orgId, userId);

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name !== undefined) updateData.name = input.name;
  if (input.logoUrl !== undefined) updateData.logoUrl = input.logoUrl;
  if (input.settings !== undefined) updateData.settings = input.settings;

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
    .leftJoin(roles, eq(organizationMembers.roleId, roles.id))
    .where(eq(organizationMembers.organizationId, orgId));

  return members.map((m) => ({
    id: m.id,
    userId: m.userId,
    email: m.email,
    displayName: m.displayName,
    roleName: m.roleName ?? null,
    roleId: m.roleId ?? null,
    joinedAt: m.joinedAt.toISOString(),
  }));
}

export async function addMember(
  orgId: string,
  actorUserId: string,
  email: string,
  roleId?: string,
): Promise<MemberOutput> {
  await requireMembership(orgId, actorUserId);

  const domainAllowed = await isEmailDomainAllowed(orgId, email);
  if (!domainAllowed) {
    throw new AppError(
      403,
      ErrorCode.FORBIDDEN,
      'Email domain is not allowed for this organization',
    );
  }

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

  let roleName: string | null = null;
  if (roleId) {
    const role = (
      await db
        .select({ id: roles.id, name: roles.name })
        .from(roles)
        .where(and(eq(roles.id, roleId), eq(roles.organizationId, orgId)))
        .limit(1)
    )[0];
    if (!role) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Role not found in this organization');
    }
    roleName = role.name;
  }

  const memberId = crypto.randomUUID();
  const now = new Date();

  await db.insert(organizationMembers).values({
    id: memberId,
    organizationId: orgId,
    userId: user.id,
    roleId: roleId ?? null,
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
      role: { before: null, after: roleName },
    },
  });

  return {
    id: memberId,
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    roleName,
    roleId: roleId ?? null,
    joinedAt: now.toISOString(),
  };
}

export async function updateMemberRole(
  orgId: string,
  actorUserId: string,
  memberId: string,
  roleId: string | null,
): Promise<MemberOutput> {
  await requireMembership(orgId, actorUserId);

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

  let newRoleName: string | null = null;
  if (roleId) {
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
    newRoleName = role.name;
  }

  const oldRole = member.roleId
    ? (
        await db
          .select({ name: roles.name })
          .from(roles)
          .where(eq(roles.id, member.roleId))
          .limit(1)
      )[0]
    : null;

  await db
    .update(organizationMembers)
    .set({ roleId, updatedAt: new Date() })
    .where(eq(organizationMembers.id, memberId));

  const user = (await db.select().from(users).where(eq(users.id, member.userId)).limit(1))[0];

  if ((oldRole?.name ?? null) !== newRoleName) {
    await activityService.log({
      organizationId: orgId,
      actorId: actorUserId,
      entityType: 'organization',
      entityId: orgId,
      action: 'member_role_changed',
      changes: {
        member: { before: user.displayName, after: user.displayName },
        role: { before: oldRole?.name ?? null, after: newRoleName },
      },
    });
  }

  return {
    id: memberId,
    userId: member.userId,
    email: user.email,
    displayName: user.displayName,
    roleName: newRoleName,
    roleId,
    joinedAt: member.joinedAt.toISOString(),
  };
}

export async function removeMember(
  orgId: string,
  actorUserId: string,
  memberId: string,
): Promise<void> {
  await requireMembership(orgId, actorUserId);

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
