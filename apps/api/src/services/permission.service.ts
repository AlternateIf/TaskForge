import {
  db,
  permissionAssignments,
  permissions,
  projectMembers,
  projects,
  roleAssignments,
  roles,
  tasks,
} from '@taskforge/db';
import { MANAGE_ACTIONS, ROLE_NAMES } from '@taskforge/shared';
import type { Action, Resource } from '@taskforge/shared';
import { and, eq, isNull, or } from 'drizzle-orm';

export interface PermissionContext {
  orgId: string;
  hasSuperAdmin: boolean;
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
      roleName: roles.name,
    })
    .from(roleAssignments)
    .innerJoin(roles, eq(roleAssignments.roleId, roles.id))
    .where(
      and(
        eq(roleAssignments.userId, userId),
        or(eq(roleAssignments.organizationId, orgId), isNull(roleAssignments.organizationId)),
      ),
    );

  const hasSuperAdmin = assignedRoleRows.some((row) => row.roleName === ROLE_NAMES.SUPER_ADMIN);

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

  if (!hasSuperAdmin && effectivePermissions.length === 0) {
    return null;
  }

  return {
    orgId,
    hasSuperAdmin,
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
  if (ctx.hasSuperAdmin) return true;

  if (projectId) {
    if (!ctx.projectCache.has(projectId)) {
      const projectPerms = await loadProjectPermissions(userId, projectId);
      ctx.projectCache.set(projectId, projectPerms);
    }
    const projectCtx = ctx.projectCache.get(projectId);
    if (projectCtx) {
      if (projectCtx.roleName === ROLE_NAMES.SUPER_ADMIN) return true;
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

export async function hasGlobalPermission(
  userId: string,
  resource: Resource,
  action: Action,
): Promise<boolean> {
  const globalRoles = await db
    .select({
      roleId: roleAssignments.roleId,
      roleName: roles.name,
    })
    .from(roleAssignments)
    .innerJoin(roles, eq(roleAssignments.roleId, roles.id))
    .where(and(eq(roleAssignments.userId, userId), isNull(roleAssignments.organizationId)));

  if (globalRoles.some((row) => row.roleName === ROLE_NAMES.SUPER_ADMIN)) {
    return true;
  }

  if (globalRoles.length > 0) {
    const rolePerms = await db
      .select({
        resource: permissions.resource,
        action: permissions.action,
      })
      .from(permissions)
      .where(or(...globalRoles.map((row) => eq(permissions.roleId, row.roleId))));
    if (hasPermission(rolePerms, resource, action)) return true;
  }

  const directPerms = await db
    .select({ permissionKey: permissionAssignments.permissionKey })
    .from(permissionAssignments)
    .where(
      and(eq(permissionAssignments.userId, userId), isNull(permissionAssignments.organizationId)),
    );
  const tuples = directPerms
    .map((row) => permissionKeyToTuple(row.permissionKey))
    .filter((row): row is { resource: string; action: string; scope: string } => row !== null);

  return hasPermission(tuples, resource, action);
}
