import {
  db,
  organizationMembers,
  permissions,
  projectMembers,
  projects,
  roles,
  tasks,
} from '@taskforge/db';
import { MANAGE_ACTIONS, ROLE_NAMES } from '@taskforge/shared';
import type { Action, Resource } from '@taskforge/shared';
import { and, eq } from 'drizzle-orm';

export interface PermissionContext {
  orgId: string;
  orgRoleName: string;
  orgRoleId: string;
  orgPermissions: { resource: string; action: string; scope: string }[];
  /** Cached project-level overrides: projectId -> permissions */
  projectCache: Map<
    string,
    { roleName: string; permissions: { resource: string; action: string; scope: string }[] } | null
  >;
}

/**
 * Load the user's org-level role and permissions for a given organization.
 * Result is meant to be cached on the request object for the duration of the request.
 */
export async function loadPermissionContext(
  userId: string,
  orgId: string,
): Promise<PermissionContext | null> {
  const membership = (
    await db
      .select({
        roleId: organizationMembers.roleId,
        roleName: roles.name,
      })
      .from(organizationMembers)
      .innerJoin(roles, eq(organizationMembers.roleId, roles.id))
      .where(
        and(eq(organizationMembers.organizationId, orgId), eq(organizationMembers.userId, userId)),
      )
      .limit(1)
  )[0];

  if (!membership) return null;

  const perms = await db
    .select({
      resource: permissions.resource,
      action: permissions.action,
      scope: permissions.scope,
    })
    .from(permissions)
    .where(eq(permissions.roleId, membership.roleId));

  return {
    orgId,
    orgRoleName: membership.roleName,
    orgRoleId: membership.roleId,
    orgPermissions: perms,
    projectCache: new Map(),
  };
}

/**
 * Load project-level role and permissions for a user in a specific project.
 * Returns null if the user has no project-level membership (falls back to org role).
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

/**
 * Check if a permission list grants a specific resource+action.
 * Handles 'manage' expansion: a 'manage' permission on a resource grants all CRUD actions.
 */
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

/**
 * Check if a user has the required permission for a resource+action.
 *
 * If projectId is provided, checks project-level role first, then falls back to org role.
 * Super Admin always passes.
 */
export async function checkPermission(
  ctx: PermissionContext,
  userId: string,
  resource: Resource,
  action: Action,
  projectId?: string,
): Promise<boolean> {
  // Super Admin fast path
  if (ctx.orgRoleName === ROLE_NAMES.SUPER_ADMIN) return true;

  // If project context, check project-level override first
  if (projectId) {
    if (!ctx.projectCache.has(projectId)) {
      const projectPerms = await loadProjectPermissions(userId, projectId);
      ctx.projectCache.set(projectId, projectPerms);
    }
    const projectCtx = ctx.projectCache.get(projectId);
    if (projectCtx) {
      // Project role overrides org role for this project
      if (projectCtx.roleName === ROLE_NAMES.SUPER_ADMIN) return true;
      return hasPermission(projectCtx.permissions, resource, action);
    }
    // No project membership — fall through to org permissions
  }

  return hasPermission(ctx.orgPermissions, resource, action);
}

/**
 * Resolve the orgId from a projectId.
 */
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

/**
 * Resolve projectId and orgId from a taskId.
 */
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
