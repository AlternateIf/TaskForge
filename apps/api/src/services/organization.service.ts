import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  db,
  organizationMembers,
  organizations,
  permissionAssignments,
  permissions,
  projectMembers,
  projects,
  roleAssignments,
  roles,
  users,
} from '@taskforge/db';
import type { MemberOutput, OrganizationOutput, UpdateOrganizationInput } from '@taskforge/shared';
import { and, count, eq, inArray, isNull } from 'drizzle-orm';
import { fileTypeFromBuffer } from 'file-type';
import { AppError, ErrorCode } from '../utils/errors.js';
import * as activityService from './activity.service.js';
import { isEmailDomainAllowed } from './org-auth-settings.service.js';
import { getOrgCreatePermission, hasOrgPermission } from './permission.service.js';

const TRIAL_DAYS = 14;
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './uploads';
const ORGANIZATION_LOGO_DIR = path.join(UPLOAD_DIR, 'organization-logos');
const LOGO_MAX_BYTES = 5 * 1024 * 1024;
const LOGO_ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const LOGO_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

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
  // Defense-in-depth: verify the user has the org-scoped permission to create orgs
  const canCreate = await getOrgCreatePermission(creatorUserId);
  if (!canCreate) {
    throw new AppError(403, ErrorCode.FORBIDDEN, 'Insufficient permissions to create organization');
  }

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

export interface OrganizationListItem extends OrganizationOutput {
  memberCount: number;
  userRole: string | null;
}

export async function listUserOrganizations(userId: string): Promise<OrganizationListItem[]> {
  const memberships = await db
    .select({ organizationId: organizationMembers.organizationId })
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId));

  if (memberships.length === 0) return [];

  const orgIds = memberships.map((m) => m.organizationId);

  // Filter to orgs where user has organization.read.org permission
  const readableOrgIds: string[] = [];
  for (const orgId of orgIds) {
    const canRead = await hasOrgPermission(userId, orgId, 'organization', 'read');
    if (canRead) {
      readableOrgIds.push(orgId);
    }
  }

  if (readableOrgIds.length === 0) return [];

  const [orgs, memberCounts, userRoles] = await Promise.all([
    db
      .select()
      .from(organizations)
      .where(and(isNull(organizations.deletedAt), inArray(organizations.id, readableOrgIds))),
    db
      .select({ organizationId: organizationMembers.organizationId, count: count() })
      .from(organizationMembers)
      .where(inArray(organizationMembers.organizationId, readableOrgIds))
      .groupBy(organizationMembers.organizationId),
    db
      .select({ organizationId: roleAssignments.organizationId, roleName: roles.name })
      .from(roleAssignments)
      .innerJoin(roles, eq(roleAssignments.roleId, roles.id))
      .where(
        and(
          eq(roleAssignments.userId, userId),
          inArray(roleAssignments.organizationId, readableOrgIds),
        ),
      ),
  ]);

  const countMap = new Map(memberCounts.map((r) => [r.organizationId, r.count]));
  const roleMap = new Map(userRoles.map((r) => [r.organizationId, r.roleName]));

  return orgs.map((org) => ({
    ...toOrganizationOutput(org),
    memberCount: countMap.get(org.id) ?? 0,
    userRole: roleMap.get(org.id) ?? null,
  }));
}

export async function getOrganization(orgId: string, userId: string): Promise<OrganizationOutput> {
  await requireMembership(orgId, userId);

  // Defense-in-depth: verify the user has read permission for this org
  const canRead = await hasOrgPermission(userId, orgId, 'organization', 'read');
  if (!canRead) {
    throw new AppError(
      403,
      ErrorCode.FORBIDDEN,
      'Insufficient permissions to view this organization',
    );
  }

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

  // Defense-in-depth: verify the user has update permission for this org
  const canUpdate = await hasOrgPermission(userId, orgId, 'organization', 'update');
  if (!canUpdate) {
    throw new AppError(
      403,
      ErrorCode.FORBIDDEN,
      'Insufficient permissions to update this organization',
    );
  }

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

  // Defense-in-depth: verify the user has delete permission for this org
  const canDelete = await hasOrgPermission(userId, orgId, 'organization', 'delete');
  if (!canDelete) {
    throw new AppError(
      403,
      ErrorCode.FORBIDDEN,
      'Insufficient permissions to delete this organization',
    );
  }

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

async function clearOrganizationLogoFiles(orgId: string): Promise<void> {
  const dir = path.join(ORGANIZATION_LOGO_DIR, orgId);
  try {
    const files = await fs.promises.readdir(dir);
    await Promise.all(files.map((file) => fs.promises.unlink(path.join(dir, file))));
  } catch {
    // Directory does not exist yet — nothing to clear.
  }
}

export async function uploadOrganizationLogo(
  orgId: string,
  userId: string,
  fileBuffer: Buffer,
  declaredMime: string,
): Promise<OrganizationOutput> {
  await requireMembership(orgId, userId);

  // Defense-in-depth: verify the user has update permission for this org
  const canUpdate = await hasOrgPermission(userId, orgId, 'organization', 'update');
  if (!canUpdate) {
    throw new AppError(
      403,
      ErrorCode.FORBIDDEN,
      'Insufficient permissions to update this organization',
    );
  }

  if (fileBuffer.length > LOGO_MAX_BYTES) {
    throw new AppError(413, ErrorCode.FILE_TOO_LARGE, 'Logo must be 5 MB or smaller');
  }

  if (!LOGO_ALLOWED_MIMES.has(declaredMime)) {
    throw new AppError(
      415,
      ErrorCode.UNSUPPORTED_MEDIA_TYPE,
      'Only JPEG, PNG, GIF, and WebP images are allowed',
    );
  }

  const detected = await fileTypeFromBuffer(fileBuffer);
  if (!detected || !LOGO_ALLOWED_MIMES.has(detected.mime)) {
    throw new AppError(
      415,
      ErrorCode.UNSUPPORTED_MEDIA_TYPE,
      'File content does not match an allowed image type',
    );
  }

  const ext = LOGO_MIME_TO_EXT[detected.mime];
  const dir = path.join(ORGANIZATION_LOGO_DIR, orgId);

  const orgBefore = (
    await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1)
  )[0];

  await clearOrganizationLogoFiles(orgId);
  await fs.promises.mkdir(dir, { recursive: true });
  await fs.promises.writeFile(path.join(dir, `logo${ext}`), fileBuffer);

  const logoUrl = `/api/v1/organizations/logos/${orgId}?v=${Date.now()}`;
  await db
    .update(organizations)
    .set({ logoUrl, updatedAt: new Date() })
    .where(eq(organizations.id, orgId));

  if (orgBefore && orgBefore.logoUrl !== logoUrl) {
    await activityService.log({
      organizationId: orgId,
      actorId: userId,
      entityType: 'organization',
      entityId: orgId,
      action: 'updated',
      changes: {
        logoUrl: { before: orgBefore.logoUrl ?? null, after: logoUrl },
      },
    });
  }

  return getOrganization(orgId, userId);
}

export async function getOrganizationLogoFilePath(
  orgId: string,
): Promise<{ filePath: string; mimeType: string } | null> {
  const dir = path.join(ORGANIZATION_LOGO_DIR, orgId);

  let files: string[];
  try {
    files = await fs.promises.readdir(dir);
  } catch {
    return null;
  }

  const filename = files.find((file) => file.startsWith('logo'));
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

export async function listMembers(orgId: string, userId: string): Promise<MemberOutput[]> {
  await requireMembership(orgId, userId);

  const canRead = await hasOrgPermission(userId, orgId, 'membership', 'read');
  if (!canRead) {
    throw new AppError(
      403,
      ErrorCode.FORBIDDEN,
      'Insufficient permissions to view members in this organization',
    );
  }

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

  const canUpdate = await hasOrgPermission(actorUserId, orgId, 'membership', 'update');
  if (!canUpdate) {
    throw new AppError(
      403,
      ErrorCode.FORBIDDEN,
      'Insufficient permissions to update member roles in this organization',
    );
  }

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

  // Last-admin protection: if demoting a member who currently has organization.update,
  // check that at least one other member still holds organization.update
  const targetCurrentlyHasManage = await hasOrgPermission(
    member.userId,
    orgId,
    'organization',
    'update',
  );

  const isDemotion =
    targetCurrentlyHasManage &&
    // Demotion scenarios: removing role entirely (roleId=null),
    // or changing to a role that doesn't grant organization.update
    (roleId === null || !(await doesRoleGrantPermission(roleId, 'organization', 'update', orgId)));

  if (isDemotion) {
    // Check other members
    const allMembers = await db
      .select({ userId: organizationMembers.userId })
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, orgId));

    const otherMemberIds = allMembers.map((m) => m.userId).filter((uid) => uid !== member.userId);

    let otherAdminCount = 0;
    for (const uid of otherMemberIds) {
      const hasPerm = await hasOrgPermission(uid, orgId, 'organization', 'update');
      if (hasPerm) {
        otherAdminCount++;
      }
    }

    if (otherAdminCount === 0) {
      throw new AppError(
        403,
        ErrorCode.FORBIDDEN,
        'Cannot demote the last admin-capable member in the organization',
      );
    }
  }

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

  // Defense-in-depth: verify the actor has membership.delete.org permission
  const canDelete = await hasOrgPermission(actorUserId, orgId, 'membership', 'delete');
  if (!canDelete) {
    throw new AppError(
      403,
      ErrorCode.FORBIDDEN,
      'Insufficient permissions to remove members from this organization',
    );
  }

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

  const targetUserId = member.userId;

  // Last-admin protection: check if removing this user would leave the org
  // with zero members who have organization.update permission
  const allMembers = await db
    .select({ userId: organizationMembers.userId })
    .from(organizationMembers)
    .where(eq(organizationMembers.organizationId, orgId));

  const otherMemberIds = allMembers.map((m) => m.userId).filter((uid) => uid !== targetUserId);

  let otherAdminCount = 0;
  for (const uid of otherMemberIds) {
    const hasPerm = await hasOrgPermission(uid, orgId, 'organization', 'update');
    if (hasPerm) {
      otherAdminCount++;
    }
  }

  const targetHasManage = await hasOrgPermission(targetUserId, orgId, 'organization', 'update');
  if (targetHasManage && otherAdminCount === 0) {
    throw new AppError(
      403,
      ErrorCode.FORBIDDEN,
      'Cannot remove the last admin-capable member from the organization',
    );
  }

  // Also check: if the actor is removing themselves, they must not be the last admin
  if (actorUserId === targetUserId && targetHasManage && otherAdminCount === 0) {
    throw new AppError(
      403,
      ErrorCode.FORBIDDEN,
      'Cannot remove yourself as the last admin-capable member',
    );
  }

  const memberUser = (
    await db
      .select({ displayName: users.displayName })
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1)
  )[0];

  // Cascade cleanup: delete role assignments, permission assignments,
  // project memberships in org projects, and org membership in a single transaction

  // First, get all project IDs in this org for the project member cleanup
  const orgProjects = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.organizationId, orgId));

  const orgProjectIds = orgProjects.map((p) => p.id);

  await db.transaction(async (tx) => {
    await tx
      .delete(roleAssignments)
      .where(
        and(eq(roleAssignments.userId, targetUserId), eq(roleAssignments.organizationId, orgId)),
      );
    await tx
      .delete(permissionAssignments)
      .where(
        and(
          eq(permissionAssignments.userId, targetUserId),
          eq(permissionAssignments.organizationId, orgId),
        ),
      );
    // Remove project-level memberships for all projects in this organization
    if (orgProjectIds.length > 0) {
      await tx
        .delete(projectMembers)
        .where(
          and(
            eq(projectMembers.userId, targetUserId),
            inArray(projectMembers.projectId, orgProjectIds),
          ),
        );
    }
    await tx.delete(organizationMembers).where(eq(organizationMembers.id, memberId));
  });

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

/**
 * Check whether a specific role grants a given permission (resource + action)
 * within an organization. Returns true if any permission row for the role
 * covers the resource and action (manage covers all subordinate actions).
 */
async function doesRoleGrantPermission(
  roleId: string,
  resource: string,
  action: string,
  orgId: string,
): Promise<boolean> {
  const rolePerms = await db
    .select({ resource: permissions.resource, action: permissions.action })
    .from(permissions)
    .where(eq(permissions.roleId, roleId));

  // Verify the role belongs to this org (security check)
  const role = (
    await db
      .select({ organizationId: roles.organizationId })
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1)
  )[0];

  if (!role || (role.organizationId !== null && role.organizationId !== orgId)) {
    return false;
  }

  return rolePerms.some(
    (p) =>
      p.resource === resource &&
      (p.action === action ||
        (p.action === 'manage' && ['create', 'read', 'update', 'delete'].includes(action))),
  );
}
