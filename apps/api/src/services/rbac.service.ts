import crypto from 'node:crypto';
import {
  db,
  organizationMembers,
  permissionAssignments,
  permissions,
  roleAssignments,
  roles,
} from '@taskforge/db';
import { and, eq, isNull, or } from 'drizzle-orm';
import { AppError, ErrorCode } from '../utils/errors.js';
import * as activityService from './activity.service.js';
import { hasOrgPermission, loadPermissionContext } from './permission.service.js';

/**
 * Check if a user holds a given permission at global scope.
 * Global roles (organizationId = null) are included in the user's effective
 * permissions for any org they belong to, so we resolve the first org
 * membership and check via loadPermissionContext.
 */
async function hasPermissionInAnyOrg(
  userId: string,
  resource: string,
  action: string,
): Promise<boolean> {
  // Find the user's first org membership to resolve a permission context
  const membership = (
    await db
      .select({ organizationId: organizationMembers.organizationId })
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, userId))
      .limit(1)
  )[0];

  if (!membership) {
    // User has no org memberships; they cannot hold any permissions
    return false;
  }

  const ctx = await loadPermissionContext(userId, membership.organizationId);
  if (!ctx) return false;

  return ctx.effectivePermissions.some(
    (entry) =>
      entry.resource === resource &&
      (entry.action === action ||
        (entry.action === 'manage' && ['create', 'read', 'update', 'delete'].includes(action))),
  );
}

async function resolveAuditOrganizationId(
  actorUserId: string,
  scopeOrganizationId: string | null,
): Promise<string> {
  if (scopeOrganizationId) return scopeOrganizationId;

  const membership = (
    await db
      .select({ organizationId: organizationMembers.organizationId })
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, actorUserId))
      .limit(1)
  )[0];

  if (!membership) {
    throw new AppError(
      500,
      ErrorCode.INTERNAL_ERROR,
      'Failed to resolve audit organization for global RBAC action',
    );
  }

  return membership.organizationId;
}

async function logRbacAudit(args: {
  actorUserId: string;
  scopeOrganizationId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  changes?: Record<string, { before: unknown; after: unknown }>;
}): Promise<void> {
  const organizationId = await resolveAuditOrganizationId(
    args.actorUserId,
    args.scopeOrganizationId,
  );
  await activityService.log({
    organizationId,
    actorId: args.actorUserId,
    entityType: args.entityType,
    entityId: args.entityId,
    action: args.action,
    changes: args.changes,
  });
}

export async function listRoles(organizationId?: string, userId?: string) {
  // Defense-in-depth: if userId and organizationId are provided, verify read permission
  if (userId && organizationId) {
    const canRead = await hasOrgPermission(userId, organizationId, 'role', 'read');
    if (!canRead) {
      throw new AppError(
        403,
        ErrorCode.FORBIDDEN,
        'Insufficient permissions to list roles in this organization',
      );
    }
  }

  const roleRows = await db
    .select()
    .from(roles)
    .where(
      organizationId === undefined
        ? isNull(roles.organizationId)
        : eq(roles.organizationId, organizationId),
    );

  if (roleRows.length === 0) {
    return [];
  }

  const rolePermissionRows = await db
    .select({
      roleId: permissions.roleId,
      resource: permissions.resource,
      action: permissions.action,
      scope: permissions.scope,
    })
    .from(permissions)
    .where(
      roleRows.length === 1
        ? eq(permissions.roleId, roleRows[0].id)
        : or(...roleRows.map((role) => eq(permissions.roleId, role.id))),
    );

  const permissionsByRoleId = new Map<string, string[]>();

  for (const rolePermission of rolePermissionRows) {
    const scopeToken = rolePermission.scope === 'organization' ? 'org' : rolePermission.scope;
    const permissionKey = `${rolePermission.resource}.${rolePermission.action}.${scopeToken}`;
    const current = permissionsByRoleId.get(rolePermission.roleId) ?? [];
    current.push(permissionKey);
    permissionsByRoleId.set(rolePermission.roleId, current);
  }

  return roleRows.map((role) => ({
    ...role,
    permissions: (permissionsByRoleId.get(role.id) ?? []).sort((a, b) => a.localeCompare(b)),
  }));
}

export async function createRole(
  actorUserId: string,
  input: {
    name: string;
    description?: string | null;
    organizationId?: string | null;
    permissions?: Array<{ resource: string; action: string; scope: string }>;
  },
) {
  // Defense-in-depth: verify the actor has role.create.org permission for org-scoped roles
  if (input.organizationId) {
    const canCreate = await hasOrgPermission(actorUserId, input.organizationId, 'role', 'create');
    if (!canCreate) {
      throw new AppError(
        403,
        ErrorCode.FORBIDDEN,
        'Insufficient permissions to create roles in this organization',
      );
    }
  }

  // Escalation prevention: actor must hold every permission being assigned to the new role
  if (input.permissions && input.permissions.length > 0) {
    const orgIdForCheck = input.organizationId ?? null;

    for (const perm of input.permissions) {
      if (orgIdForCheck) {
        const actorHasPermission = await hasOrgPermission(
          actorUserId,
          orgIdForCheck,
          perm.resource,
          perm.action,
        );
        if (!actorHasPermission) {
          throw new AppError(
            403,
            ErrorCode.FORBIDDEN,
            `Cannot assign permission ${perm.resource}.${perm.action} that you do not hold in this organization`,
          );
        }
      } else {
        // Global scope: check via any org context (global roles are included there)
        const hasGlobal = await hasPermissionInAnyOrg(actorUserId, perm.resource, perm.action);
        if (!hasGlobal) {
          throw new AppError(
            403,
            ErrorCode.FORBIDDEN,
            `Cannot assign permission ${perm.resource}.${perm.action} that you do not hold globally`,
          );
        }
      }
    }
  }

  const now = new Date();
  const roleId = crypto.randomUUID();
  await db.insert(roles).values({
    id: roleId,
    organizationId: input.organizationId ?? null,
    name: input.name.trim(),
    description: input.description ?? null,
    isSystem: false,
    createdAt: now,
    updatedAt: now,
  });

  // Insert permissions for this role if provided
  if (input.permissions && input.permissions.length > 0) {
    await db.insert(permissions).values(
      input.permissions.map((perm) => ({
        id: crypto.randomUUID(),
        roleId,
        resource: perm.resource,
        action: perm.action,
        scope: perm.scope,
      })),
    );
  }

  const createdRole = (await db.select().from(roles).where(eq(roles.id, roleId)).limit(1))[0];
  await logRbacAudit({
    actorUserId,
    scopeOrganizationId: input.organizationId ?? null,
    entityType: 'role',
    entityId: createdRole.id,
    action: 'role_created',
    changes: {
      name: { before: null, after: createdRole.name },
      description: { before: null, after: createdRole.description ?? null },
      scope: { before: null, after: createdRole.organizationId ? 'organization' : 'global' },
    },
  });
  return createdRole;
}

export async function updateRole(
  actorUserId: string,
  roleId: string,
  patch: { name?: string; description?: string | null },
) {
  const role = (await db.select().from(roles).where(eq(roles.id, roleId)).limit(1))[0];
  if (!role) throw new AppError(404, ErrorCode.NOT_FOUND, 'Role not found');

  // Defense-in-depth: verify the actor has role.update.org permission for org-scoped roles
  if (role.organizationId) {
    const canUpdate = await hasOrgPermission(actorUserId, role.organizationId, 'role', 'update');
    if (!canUpdate) {
      throw new AppError(
        403,
        ErrorCode.FORBIDDEN,
        'Insufficient permissions to update roles in this organization',
      );
    }
  }

  await db
    .update(roles)
    .set({
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      updatedAt: new Date(),
    })
    .where(eq(roles.id, roleId));

  const updatedRole = (await db.select().from(roles).where(eq(roles.id, roleId)).limit(1))[0];
  await logRbacAudit({
    actorUserId,
    scopeOrganizationId: updatedRole.organizationId ?? null,
    entityType: 'role',
    entityId: updatedRole.id,
    action: 'role_updated',
    changes: {
      name: { before: role.name, after: updatedRole.name },
      description: { before: role.description ?? null, after: updatedRole.description ?? null },
    },
  });
  return updatedRole;
}

export async function deleteRole(actorUserId: string, roleId: string): Promise<void> {
  const role = (await db.select().from(roles).where(eq(roles.id, roleId)).limit(1))[0];
  if (!role) throw new AppError(404, ErrorCode.NOT_FOUND, 'Role not found');

  // Defense-in-depth: verify the actor has role.delete.org permission for org-scoped roles
  if (role.organizationId) {
    const canDelete = await hasOrgPermission(actorUserId, role.organizationId, 'role', 'delete');
    if (!canDelete) {
      throw new AppError(
        403,
        ErrorCode.FORBIDDEN,
        'Insufficient permissions to delete roles in this organization',
      );
    }
  }

  await db.delete(roleAssignments).where(eq(roleAssignments.roleId, roleId));
  await db.delete(roles).where(eq(roles.id, roleId));
  await logRbacAudit({
    actorUserId,
    scopeOrganizationId: role.organizationId ?? null,
    entityType: 'role',
    entityId: role.id,
    action: 'role_deleted',
    changes: {
      name: { before: role.name, after: null },
      description: { before: role.description ?? null, after: null },
    },
  });
}

export async function listRoleAssignments(organizationId?: string) {
  return db
    .select({
      id: roleAssignments.id,
      userId: roleAssignments.userId,
      roleId: roleAssignments.roleId,
      organizationId: roleAssignments.organizationId,
      assignedByUserId: roleAssignments.assignedByUserId,
      createdAt: roleAssignments.createdAt,
      updatedAt: roleAssignments.updatedAt,
    })
    .from(roleAssignments)
    .where(
      organizationId === undefined
        ? isNull(roleAssignments.organizationId)
        : eq(roleAssignments.organizationId, organizationId),
    );
}

export async function createRoleAssignment(
  actorUserId: string,
  input: { userId: string; roleId: string; organizationId?: string | null },
) {
  const role = (await db.select().from(roles).where(eq(roles.id, input.roleId)).limit(1))[0];
  if (!role) throw new AppError(404, ErrorCode.NOT_FOUND, 'Role not found');

  const assignmentOrgId = input.organizationId ?? null;
  if ((role.organizationId ?? null) !== assignmentOrgId) {
    throw new AppError(
      422,
      ErrorCode.UNPROCESSABLE_ENTITY,
      'Role scope does not match assignment scope',
    );
  }

  // Org-scoped role assignment: actor must have organization.update in target org
  if (assignmentOrgId) {
    const actorCanManage = await hasOrgPermission(
      actorUserId,
      assignmentOrgId,
      'organization',
      'update',
    );
    if (!actorCanManage) {
      throw new AppError(
        403,
        ErrorCode.FORBIDDEN,
        'You must have organization.update permission to assign roles in this organization',
      );
    }
  }

  // Escalation prevention: actor must hold every permission the target role grants
  const rolePerms = await db
    .select({
      resource: permissions.resource,
      action: permissions.action,
      scope: permissions.scope,
    })
    .from(permissions)
    .where(eq(permissions.roleId, role.id));

  for (const perm of rolePerms) {
    if (assignmentOrgId) {
      const actorHasPermission = await hasOrgPermission(
        actorUserId,
        assignmentOrgId,
        perm.resource,
        perm.action,
      );
      if (!actorHasPermission) {
        throw new AppError(
          403,
          ErrorCode.FORBIDDEN,
          `Cannot assign role that grants ${perm.resource}.${perm.action} which you do not hold in this organization`,
        );
      }
    } else {
      // Global scope: check via any org context (global roles are included there)
      const hasGlobal = await hasPermissionInAnyOrg(actorUserId, perm.resource, perm.action);
      if (!hasGlobal) {
        throw new AppError(
          403,
          ErrorCode.FORBIDDEN,
          `Cannot assign role that grants ${perm.resource}.${perm.action} which you do not hold globally`,
        );
      }
    }
  }

  const existing = (
    await db
      .select({ id: roleAssignments.id })
      .from(roleAssignments)
      .where(
        and(
          eq(roleAssignments.userId, input.userId),
          eq(roleAssignments.roleId, input.roleId),
          assignmentOrgId === null
            ? isNull(roleAssignments.organizationId)
            : eq(roleAssignments.organizationId, assignmentOrgId),
        ),
      )
      .limit(1)
  )[0];

  if (existing) return existing;

  const now = new Date();
  const assignmentId = crypto.randomUUID();
  await db.insert(roleAssignments).values({
    id: assignmentId,
    userId: input.userId,
    roleId: input.roleId,
    organizationId: assignmentOrgId,
    assignedByUserId: actorUserId,
    createdAt: now,
    updatedAt: now,
  });

  const assignment = (
    await db.select().from(roleAssignments).where(eq(roleAssignments.id, assignmentId)).limit(1)
  )[0];
  await logRbacAudit({
    actorUserId,
    scopeOrganizationId: assignment.organizationId ?? null,
    entityType: 'role_assignment',
    entityId: assignment.id,
    action: 'role_assignment_created',
    changes: {
      userId: { before: null, after: assignment.userId },
      roleId: { before: null, after: assignment.roleId },
    },
  });
  return assignment;
}

export async function updateRoleAssignment(
  actorUserId: string,
  assignmentId: string,
  patch: { roleId: string },
) {
  const existing = (
    await db.select().from(roleAssignments).where(eq(roleAssignments.id, assignmentId)).limit(1)
  )[0];
  if (!existing) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Role assignment not found');
  }

  const oldRole = (await db.select().from(roles).where(eq(roles.id, existing.roleId)).limit(1))[0];
  if (!oldRole) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Current role not found');
  }

  const newRole = (await db.select().from(roles).where(eq(roles.id, patch.roleId)).limit(1))[0];
  if (!newRole) throw new AppError(404, ErrorCode.NOT_FOUND, 'Role not found');
  if ((newRole.organizationId ?? null) !== (existing.organizationId ?? null)) {
    throw new AppError(
      422,
      ErrorCode.UNPROCESSABLE_ENTITY,
      'Role scope does not match assignment scope',
    );
  }

  // Escalation prevention: actor must hold every permission the new role grants
  const newRolePerms = await db
    .select({
      resource: permissions.resource,
      action: permissions.action,
      scope: permissions.scope,
    })
    .from(permissions)
    .where(eq(permissions.roleId, newRole.id));

  const assignmentOrgId = existing.organizationId ?? null;

  for (const perm of newRolePerms) {
    if (assignmentOrgId) {
      const actorHasPermission = await hasOrgPermission(
        actorUserId,
        assignmentOrgId,
        perm.resource,
        perm.action,
      );
      if (!actorHasPermission) {
        throw new AppError(
          403,
          ErrorCode.FORBIDDEN,
          `Cannot assign role that grants ${perm.resource}.${perm.action} which you do not hold in this organization`,
        );
      }
    } else {
      // Global scope: check via any org context (global roles are included there)
      const hasGlobal = await hasPermissionInAnyOrg(actorUserId, perm.resource, perm.action);
      if (!hasGlobal) {
        throw new AppError(
          403,
          ErrorCode.FORBIDDEN,
          `Cannot assign role that grants ${perm.resource}.${perm.action} which you do not hold globally`,
        );
      }
    }
  }

  await db
    .update(roleAssignments)
    .set({
      roleId: patch.roleId,
      assignedByUserId: actorUserId,
      updatedAt: new Date(),
    })
    .where(eq(roleAssignments.id, assignmentId));

  const updatedAssignment = (
    await db.select().from(roleAssignments).where(eq(roleAssignments.id, assignmentId)).limit(1)
  )[0];
  await logRbacAudit({
    actorUserId,
    scopeOrganizationId: updatedAssignment.organizationId ?? null,
    entityType: 'role_assignment',
    entityId: updatedAssignment.id,
    action: 'role_assignment_updated',
    changes: {
      roleId: { before: existing.roleId, after: updatedAssignment.roleId },
      assignedByUserId: { before: existing.assignedByUserId ?? null, after: actorUserId },
    },
  });
  return updatedAssignment;
}

export async function deleteRoleAssignment(
  actorUserId: string,
  assignmentId: string,
): Promise<void> {
  const existing = (
    await db.select().from(roleAssignments).where(eq(roleAssignments.id, assignmentId)).limit(1)
  )[0];
  if (!existing) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Role assignment not found');
  }

  // Last-admin protection for org-scoped role assignment deletion:
  // If this role grants organization.update in the org, verify the target user
  // will still have organization.update after this role assignment is removed.
  if (existing.organizationId) {
    const rolePerms = await db
      .select({ resource: permissions.resource, action: permissions.action })
      .from(permissions)
      .where(eq(permissions.roleId, existing.roleId));

    const grantsManage = rolePerms.some(
      (p) => p.resource === 'organization' && (p.action === 'update' || p.action === 'manage'),
    );

    if (grantsManage) {
      // Check if the user currently has organization.update
      const targetCurrentlyHasManage = await hasOrgPermission(
        existing.userId,
        existing.organizationId,
        'organization',
        'update',
      );

      if (targetCurrentlyHasManage) {
        // After removing this assignment, check if OTHER members would still have update
        const allMembers = await db
          .select({ userId: organizationMembers.userId })
          .from(organizationMembers)
          .where(eq(organizationMembers.organizationId, existing.organizationId));

        const otherMemberIds = allMembers
          .map((m) => m.userId)
          .filter((uid) => uid !== existing.userId);

        let otherAdminCount = 0;
        for (const uid of otherMemberIds) {
          const hasPerm = await hasOrgPermission(
            uid,
            existing.organizationId,
            'organization',
            'update',
          );
          if (hasPerm) {
            otherAdminCount++;
          }
        }

        // If the user being demoted is the last admin, check if they would
        // still have manage through other assignments after this deletion
        if (otherAdminCount === 0) {
          throw new AppError(
            403,
            ErrorCode.FORBIDDEN,
            'Cannot remove this role assignment: it would leave the organization with no admin-capable members',
          );
        }
      }
    }
  }

  await db.delete(roleAssignments).where(eq(roleAssignments.id, assignmentId));
  await logRbacAudit({
    actorUserId,
    scopeOrganizationId: existing.organizationId ?? null,
    entityType: 'role_assignment',
    entityId: existing.id,
    action: 'role_assignment_deleted',
    changes: {
      userId: { before: existing.userId, after: null },
      roleId: { before: existing.roleId, after: null },
    },
  });
}

async function actorHasPermissionKey(
  actorUserId: string,
  permissionKey: string,
  organizationId: string | null,
): Promise<boolean> {
  const [resource, action, scopeToken] = permissionKey.split('.');
  if (!resource || !action || !scopeToken) return false;

  if (organizationId !== null) {
    const ctx = await loadPermissionContext(actorUserId, organizationId);
    if (
      ctx?.effectivePermissions.some(
        (entry) => entry.resource === resource && entry.action === action,
      )
    ) {
      return true;
    }
  }

  const direct = (
    await db
      .select({ id: permissionAssignments.id })
      .from(permissionAssignments)
      .where(
        and(
          eq(permissionAssignments.userId, actorUserId),
          eq(permissionAssignments.permissionKey, permissionKey),
          organizationId === null
            ? isNull(permissionAssignments.organizationId)
            : eq(permissionAssignments.organizationId, organizationId),
        ),
      )
      .limit(1)
  )[0];

  return Boolean(direct);
}

export async function listPermissionAssignments(organizationId?: string, userId?: string) {
  // Defense-in-depth: verify the caller has permission.read.org for org-scoped queries
  if (organizationId && userId) {
    const canRead = await hasOrgPermission(userId, organizationId, 'permission', 'read');
    if (!canRead) {
      throw new AppError(
        403,
        ErrorCode.FORBIDDEN,
        'Insufficient permissions to list permission assignments in this organization',
      );
    }
  }

  return db
    .select()
    .from(permissionAssignments)
    .where(
      organizationId === undefined
        ? isNull(permissionAssignments.organizationId)
        : eq(permissionAssignments.organizationId, organizationId),
    );
}

export async function createPermissionAssignment(
  actorUserId: string,
  input: { userId: string; permissionKey: string; organizationId?: string | null },
) {
  const assignmentOrgId = input.organizationId ?? null;
  const actorCanGrant = await actorHasPermissionKey(
    actorUserId,
    input.permissionKey,
    assignmentOrgId,
  );
  if (!actorCanGrant) {
    throw new AppError(
      403,
      ErrorCode.FORBIDDEN,
      'Cannot grant a permission the actor does not hold in this scope',
    );
  }

  const existing = (
    await db
      .select({ id: permissionAssignments.id })
      .from(permissionAssignments)
      .where(
        and(
          eq(permissionAssignments.userId, input.userId),
          eq(permissionAssignments.permissionKey, input.permissionKey),
          assignmentOrgId === null
            ? isNull(permissionAssignments.organizationId)
            : eq(permissionAssignments.organizationId, assignmentOrgId),
        ),
      )
      .limit(1)
  )[0];
  if (existing) return existing;

  const assignmentId = crypto.randomUUID();
  await db.insert(permissionAssignments).values({
    id: assignmentId,
    userId: input.userId,
    organizationId: assignmentOrgId,
    permissionKey: input.permissionKey,
    assignedByUserId: actorUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const assignment = (
    await db
      .select()
      .from(permissionAssignments)
      .where(eq(permissionAssignments.id, assignmentId))
      .limit(1)
  )[0];
  await logRbacAudit({
    actorUserId,
    scopeOrganizationId: assignment.organizationId ?? null,
    entityType: 'permission_assignment',
    entityId: assignment.id,
    action: 'permission_assignment_created',
    changes: {
      userId: { before: null, after: assignment.userId },
      permissionKey: { before: null, after: assignment.permissionKey },
    },
  });
  return assignment;
}

export async function deletePermissionAssignment(
  actorUserId: string,
  assignmentId: string,
  orgId?: string,
): Promise<void> {
  const existing = (
    await db
      .select()
      .from(permissionAssignments)
      .where(eq(permissionAssignments.id, assignmentId))
      .limit(1)
  )[0];
  if (!existing) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Permission assignment not found');
  }

  // Defense-in-depth: verify assignment belongs to the expected org scope
  if (orgId && (existing.organizationId ?? null) !== orgId) {
    throw new AppError(
      400,
      ErrorCode.BAD_REQUEST,
      'Permission assignment does not belong to the specified organization',
    );
  }

  // Check permission.update.org if org-scoped
  const scopeOrgId = orgId ?? existing.organizationId ?? null;
  if (scopeOrgId) {
    const canUpdate = await hasOrgPermission(actorUserId, scopeOrgId, 'permission', 'update');
    if (!canUpdate) {
      throw new AppError(
        403,
        ErrorCode.FORBIDDEN,
        'Insufficient permissions to delete permission assignments in this organization',
      );
    }
  }

  await db.delete(permissionAssignments).where(eq(permissionAssignments.id, assignmentId));
  await logRbacAudit({
    actorUserId,
    scopeOrganizationId: existing.organizationId ?? null,
    entityType: 'permission_assignment',
    entityId: existing.id,
    action: 'permission_assignment_deleted',
    changes: {
      userId: { before: existing.userId, after: null },
      permissionKey: { before: existing.permissionKey, after: null },
    },
  });
}
