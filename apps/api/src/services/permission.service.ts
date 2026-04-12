import {
  db,
  organizationMembers,
  permissionAssignments,
  permissions,
  projectMembers,
  projects,
  roleAssignments,
  roles,
  tasks,
} from '@taskforge/db';
import { MANAGE_ACTIONS } from '@taskforge/shared';
import type { Action, Resource } from '@taskforge/shared';
import { and, eq, isNull, or } from 'drizzle-orm';

export interface PermissionContext {
  orgId: string;
  effectivePermissions: { resource: string; action: string; scope: string }[];
  /** Cached project-level overrides: projectId -> permissions */
  projectCache: Map<
    string,
    { roleName: string; permissions: { resource: string; action: string; scope: string }[] } | null
  >;
}

function permissionKeyToTuple(
  key: string,
): { resource: string; action: string; scope: string } | null {
  const parts = key.split('.');
  if (parts.length < 3) return null;

  const scopeToken = parts[parts.length - 1];
  const actionToken = parts[parts.length - 2];
  const resourceToken = parts.slice(0, -2).join('.');

  if (!scopeToken || !actionToken || !resourceToken) return null;

  const scope = scopeToken === 'org' ? 'organization' : scopeToken;

  return { resource: resourceToken, action: actionToken, scope };
}

/**
 * Load the user's org-level effective permissions for a given organization.
 * Runtime source of truth is role assignments + direct permission assignments.
 */
export async function loadPermissionContext(
  userId: string,
  orgId: string,
): Promise<PermissionContext | null> {
  const assignedRoleRows = await db
    .select({
      roleId: roleAssignments.roleId,
    })
    .from(roleAssignments)
    .innerJoin(roles, eq(roleAssignments.roleId, roles.id))
    .where(
      and(
        eq(roleAssignments.userId, userId),
        or(eq(roleAssignments.organizationId, orgId), isNull(roleAssignments.organizationId)),
      ),
    );

  const rolePermissionRows =
    assignedRoleRows.length === 0
      ? []
      : await db
          .select({
            resource: permissions.resource,
            action: permissions.action,
            scope: permissions.scope,
          })
          .from(permissions)
          .where(or(...assignedRoleRows.map((row) => eq(permissions.roleId, row.roleId))));

  const directPermissionRows = await db
    .select({ permissionKey: permissionAssignments.permissionKey })
    .from(permissionAssignments)
    .where(
      and(
        eq(permissionAssignments.userId, userId),
        or(
          eq(permissionAssignments.organizationId, orgId),
          isNull(permissionAssignments.organizationId),
        ),
      ),
    );

  const directPermissionTuples = directPermissionRows
    .map((row) => permissionKeyToTuple(row.permissionKey))
    .filter((row): row is { resource: string; action: string; scope: string } => row !== null);

  const tupleSet = new Set<string>();
  const effectivePermissions: { resource: string; action: string; scope: string }[] = [];

  for (const tuple of [...rolePermissionRows, ...directPermissionTuples]) {
    const key = `${tuple.resource}:${tuple.action}:${tuple.scope}`;
    if (tupleSet.has(key)) continue;
    tupleSet.add(key);
    effectivePermissions.push(tuple);
  }

  if (effectivePermissions.length === 0) {
    return null;
  }

  return {
    orgId,
    effectivePermissions,
    projectCache: new Map(),
  };
}

/**
 * Load project-level role and permissions for a user in a specific project.
 * Returns null if the user has no project-level membership (falls back to org permissions).
 */
async function loadProjectPermissions(
  userId: string,
  projectId: string,
): Promise<{
  roleName: string;
  permissions: { resource: string; action: string; scope: string }[];
} | null> {
  const member = (
    await db
      .select({ roleId: projectMembers.roleId })
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
      .limit(1)
  )[0];

  if (!member?.roleId) return null;

  const role = (
    await db.select({ name: roles.name }).from(roles).where(eq(roles.id, member.roleId)).limit(1)
  )[0];

  if (!role) return null;

  const perms = await db
    .select({
      resource: permissions.resource,
      action: permissions.action,
      scope: permissions.scope,
    })
    .from(permissions)
    .where(eq(permissions.roleId, member.roleId));

  return { roleName: role.name, permissions: perms };
}

function hasPermission(
  perms: { resource: string; action: string }[],
  resource: Resource,
  action: Action,
): boolean {
  for (const p of perms) {
    if (p.resource !== resource) continue;
    if (p.action === action) return true;
    if (p.action === 'manage' && (MANAGE_ACTIONS as readonly string[]).includes(action)) {
      return true;
    }
  }
  return false;
}

export async function checkPermission(
  ctx: PermissionContext,
  userId: string,
  resource: Resource,
  action: Action,
  projectId?: string,
): Promise<boolean> {
  if (projectId) {
    if (!ctx.projectCache.has(projectId)) {
      const projectPerms = await loadProjectPermissions(userId, projectId);
      ctx.projectCache.set(projectId, projectPerms);
    }
    const projectCtx = ctx.projectCache.get(projectId);
    if (projectCtx) {
      if (hasPermission(projectCtx.permissions, resource, action)) {
        return true;
      }
    }
  }

  return hasPermission(ctx.effectivePermissions, resource, action);
}

export async function getOrgIdFromProject(projectId: string): Promise<string | null> {
  const project = (
    await db
      .select({ organizationId: projects.organizationId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1)
  )[0];
  return project?.organizationId ?? null;
}

export async function getProjectIdFromTask(
  taskId: string,
): Promise<{ projectId: string; orgId: string } | null> {
  const result = (
    await db
      .select({
        projectId: tasks.projectId,
        orgId: projects.organizationId,
      })
      .from(tasks)
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .where(eq(tasks.id, taskId))
      .limit(1)
  )[0];
  return result ?? null;
}

/**
 * Check if a user has permission to create an organization.
 * Uses the org-scoped `organization.create.org` permission.
 * If the user has any existing org membership, they must hold
 * `organization.create.org` in at least one of their orgs.
 * Users with no org memberships (first org) are allowed to create one.
 */
export async function getOrgCreatePermission(userId: string): Promise<boolean> {
  // Get all org memberships for the user
  const memberships = await db
    .select({ organizationId: organizationMembers.organizationId })
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId));

  // If the user has no org memberships, allow them to create their first org
  if (memberships.length === 0) {
    return true;
  }

  // Check if the user has organization.create.org in any of their orgs
  const orgIds = memberships.map((m) => m.organizationId);

  for (const orgId of orgIds) {
    const hasCreate = await hasOrgPermission(userId, orgId, 'organization', 'create');
    if (hasCreate) {
      return true;
    }
  }

  return false;
}

export interface EffectivePermissionSource {
  type: 'role' | 'direct';
  roleId?: string;
  roleName?: string;
  assignmentId?: string;
}

export interface EffectivePermissionEntry {
  key: string;
  granted: true;
  sources: EffectivePermissionSource[];
}

export interface EffectivePermissionsResult {
  userId: string;
  organizationId: string;
  permissions: EffectivePermissionEntry[];
  roles: Array<{ roleId: string; roleName: string; scope: 'organization' }>;
}

/**
 * Get another user's effective permissions in an organization.
 * Used by org admins to view any member's effective permissions page.
 */
export async function getEffectivePermissions(
  targetUserId: string,
  orgId: string,
): Promise<EffectivePermissionsResult> {
  // 1. Get role assignments for the user in this org (org-scoped + global)
  const assignedRoleRows = await db
    .select({
      assignmentId: roleAssignments.id,
      roleId: roleAssignments.roleId,
      roleName: roles.name,
      assignmentOrgId: roleAssignments.organizationId,
    })
    .from(roleAssignments)
    .innerJoin(roles, eq(roleAssignments.roleId, roles.id))
    .where(
      and(
        eq(roleAssignments.userId, targetUserId),
        or(eq(roleAssignments.organizationId, orgId), isNull(roleAssignments.organizationId)),
      ),
    );

  const rolesList: Array<{ roleId: string; roleName: string; scope: 'organization' }> =
    assignedRoleRows
      .filter((row) => row.assignmentOrgId === orgId)
      .map((row) => ({
        roleId: row.roleId,
        roleName: row.roleName,
        scope: 'organization' as const,
      }));

  // 2. Get all permissions tied to the assigned roles
  const rolePermRows =
    assignedRoleRows.length === 0
      ? []
      : await db
          .select({
            roleId: permissions.roleId,
            resource: permissions.resource,
            action: permissions.action,
            scope: permissions.scope,
          })
          .from(permissions)
          .where(or(...assignedRoleRows.map((row) => eq(permissions.roleId, row.roleId))));

  // 3. Get direct permission assignments for the user in this org (org-scoped + global)
  const directPermRows = await db
    .select({
      id: permissionAssignments.id,
      permissionKey: permissionAssignments.permissionKey,
    })
    .from(permissionAssignments)
    .where(
      and(
        eq(permissionAssignments.userId, targetUserId),
        or(
          eq(permissionAssignments.organizationId, orgId),
          isNull(permissionAssignments.organizationId),
        ),
      ),
    );

  const directPermTuples = directPermRows
    .map((row) => ({
      ...permissionKeyToTuple(row.permissionKey),
      assignmentId: row.id,
      permissionKey: row.permissionKey,
    }))
    .filter(
      (
        row,
      ): row is {
        resource: string;
        action: string;
        scope: string;
        assignmentId: string;
        permissionKey: string;
      } => row.resource !== undefined && row.action !== undefined && row.scope !== undefined,
    );

  // 4. Merge into effective permissions with source tracing
  const permMap = new Map<string, EffectivePermissionEntry>();

  // Role-based permissions
  for (const rp of rolePermRows) {
    const key = `${rp.resource}.${rp.action}.${rp.scope}`;
    const roleRow = assignedRoleRows.find((r) => r.roleId === rp.roleId);
    const source: EffectivePermissionSource = {
      type: 'role',
      roleId: rp.roleId,
      roleName: roleRow?.roleName,
      assignmentId: roleRow?.assignmentId,
    };

    const existing = permMap.get(key);
    if (existing) {
      existing.sources.push(source);
    } else {
      permMap.set(key, { key, granted: true, sources: [source] });
    }
  }

  // Direct permission assignments
  for (const dp of directPermTuples) {
    const key = `${dp.resource}.${dp.action}.${dp.scope}`;
    const source: EffectivePermissionSource = {
      type: 'direct',
      assignmentId: dp.assignmentId,
    };

    const existingDirect = permMap.get(key);
    if (existingDirect) {
      existingDirect.sources.push(source);
    } else {
      permMap.set(key, { key, granted: true, sources: [source] });
    }
  }

  return {
    userId: targetUserId,
    organizationId: orgId,
    permissions: Array.from(permMap.values()),
    roles: rolesList,
  };
}

/**
 * Check if a given user has a specific permission (resource.manage style)
 * in an organization context. Used for last-admin protection checks.
 */
export async function hasOrgPermission(
  userId: string,
  orgId: string,
  resource: string,
  action: string,
): Promise<boolean> {
  const ctx = await loadPermissionContext(userId, orgId);
  if (!ctx) return false;
  return ctx.effectivePermissions.some(
    (entry) =>
      entry.resource === resource &&
      (entry.action === action ||
        (entry.action === 'manage' && ['create', 'read', 'update', 'delete'].includes(action))),
  );
}
