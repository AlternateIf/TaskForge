/**
 * Canonical permission source for TaskForge.
 *
 * This file is the single source of truth for all permission key strings,
 * their typed unions, fast-lookup sets, and conversion utilities.
 *
 * Key format: `{resource}.{action}.{scope}`
 *   - scope token: "org" = organization, "project" = project, "global" = global
 *
 * Migration note:
 *   - Re-exports from `permissions.ts` (tuple-based definitions + BUILT_IN_PERMISSIONS)
 *   - Replaces `governance-permissions.ts` string-based keys
 *   - Replaces local FE constants in `apps/web/src/routes/projects/permissions.ts`
 *   - Replaces local FE constants in `apps/web/src/routes/notifications/permissions.ts`
 */

// ---------------------------------------------------------------------------
// Re-export existing tuple-based definitions for backwards compatibility
// ---------------------------------------------------------------------------
export {
  RESOURCES,
  ACTIONS,
  MANAGE_ACTIONS,
  SCOPES,
  BUILT_IN_PERMISSIONS,
} from './permissions.js';
export type { Resource, Action, Scope } from './permissions.js';

// ---------------------------------------------------------------------------
// Canonical permission key list (ordered, 29 entries)
// ---------------------------------------------------------------------------
export const PERMISSION_KEYS = [
  // Organization
  'organization.create.org',
  'organization.read.org',
  'organization.update.org',
  'organization.delete.org',

  // Invitation
  'invitation.create.org',
  'invitation.read.org',
  'invitation.update.org',
  'invitation.delete.org',

  // Membership
  'membership.read.org',
  'membership.update.org',
  'membership.delete.org',

  // Role
  'role.create.org',
  'role.read.org',
  'role.update.org',
  'role.delete.org',

  // Permission
  'permission.read.org',
  'permission.update.org',

  // Project
  'project.create.org',
  'project.read.org',
  'project.update.org',
  'project.delete.org',

  // Notification
  'notification.create.org',
  'notification.read.org',
  'notification.update.org',
  'notification.delete.org',

  // Task
  'task.create.project',
  'task.read.project',
  'task.update.project',
  'task.delete.project',
] as const;

/** Branded type derived from the canonical key list */
export type PermissionKey = (typeof PERMISSION_KEYS)[number];

/** Fast O(1) lookup set for permission key validation */
export const PERMISSION_SET: ReadonlySet<string> = new Set<string>(PERMISSION_KEYS);

// ---------------------------------------------------------------------------
// Convenience named constants (project/task/notification/organization)
// ---------------------------------------------------------------------------

// Organization permissions
export const ORGANIZATION_CREATE_PERMISSION: PermissionKey = 'organization.create.org';
export const ORGANIZATION_READ_PERMISSION: PermissionKey = 'organization.read.org';
export const ORGANIZATION_UPDATE_PERMISSION: PermissionKey = 'organization.update.org';
export const ORGANIZATION_DELETE_PERMISSION: PermissionKey = 'organization.delete.org';

// Invitation permissions
export const INVITATION_CREATE_PERMISSION: PermissionKey = 'invitation.create.org';
export const INVITATION_READ_PERMISSION: PermissionKey = 'invitation.read.org';
export const INVITATION_UPDATE_PERMISSION: PermissionKey = 'invitation.update.org';
export const INVITATION_DELETE_PERMISSION: PermissionKey = 'invitation.delete.org';

// Membership permissions
export const MEMBERSHIP_READ_PERMISSION: PermissionKey = 'membership.read.org';
export const MEMBERSHIP_UPDATE_PERMISSION: PermissionKey = 'membership.update.org';
export const MEMBERSHIP_DELETE_PERMISSION: PermissionKey = 'membership.delete.org';

// Role permissions
export const ROLE_CREATE_PERMISSION: PermissionKey = 'role.create.org';
export const ROLE_READ_PERMISSION: PermissionKey = 'role.read.org';
export const ROLE_UPDATE_PERMISSION: PermissionKey = 'role.update.org';
export const ROLE_DELETE_PERMISSION: PermissionKey = 'role.delete.org';

// Permission (meta) permissions
export const PERMISSION_READ_PERMISSION: PermissionKey = 'permission.read.org';
export const PERMISSION_UPDATE_PERMISSION: PermissionKey = 'permission.update.org';

// Project permissions
export const PROJECT_CREATE_PERMISSION: PermissionKey = 'project.create.org';
export const PROJECT_READ_PERMISSION: PermissionKey = 'project.read.org';
export const PROJECT_UPDATE_PERMISSION: PermissionKey = 'project.update.org';
export const PROJECT_DELETE_PERMISSION: PermissionKey = 'project.delete.org';

// Notification permissions
export const NOTIFICATION_CREATE_PERMISSION: PermissionKey = 'notification.create.org';
export const NOTIFICATION_READ_PERMISSION: PermissionKey = 'notification.read.org';
export const NOTIFICATION_UPDATE_PERMISSION: PermissionKey = 'notification.update.org';
export const NOTIFICATION_DELETE_PERMISSION: PermissionKey = 'notification.delete.org';

// Task permissions
export const TASK_CREATE_PERMISSION: PermissionKey = 'task.create.project';
export const TASK_READ_PERMISSION: PermissionKey = 'task.read.project';
export const TASK_UPDATE_PERMISSION: PermissionKey = 'task.update.project';
export const TASK_DELETE_PERMISSION: PermissionKey = 'task.delete.project';

// ---------------------------------------------------------------------------
// Helper: governance prefixes for UI permission gates
// ---------------------------------------------------------------------------
export const GOVERNANCE_PREFIXES = [
  'organization.',
  'membership.',
  'invitation.',
  'role.',
  'permission.',
] as const;

/**
 * Returns true if any of the provided permission strings starts with
 * a governance resource prefix (organization, membership, invitation,
 * role, permission).
 */
export function hasAnyGovernancePermission(permissions: string[]): boolean {
  for (const permission of permissions) {
    const isGovernance = GOVERNANCE_PREFIXES.some((prefix) => permission.startsWith(prefix));
    if (isGovernance) return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Conversion utilities
// ---------------------------------------------------------------------------

/** Scope token → full scope name mapping */
const SCOPE_TOKEN_MAP: Record<string, string> = {
  org: 'organization',
  global: 'global',
  project: 'project',
} as const;

/** Full scope name → scope token mapping */
const SCOPE_NAME_MAP: Record<string, string> = {
  organization: 'org',
  global: 'global',
  project: 'project',
} as const;

/**
 * Parse a permission key string into its {resource, action, scope} tuple.
 *
 * Key format: `{resource}.{action}.{scope}`
 *   - scope token: "org", "global", "project"
 *   - action: "create", "read", "update", "delete"
 *   - resource: everything before the last two dot-separated segments
 *
 * @example
 *   toPermissionTuple('organization.create.org')
 *   // → { resource: 'organization', action: 'create', scope: 'organization' }
 *
 *   toPermissionTuple('task.read.project')
 *   // → { resource: 'task', action: 'read', scope: 'project' }
 */
export function toPermissionTuple(key: string): {
  resource: string;
  action: string;
  scope: string;
} {
  const parts = key.split('.');
  if (parts.length < 3) {
    throw new Error(
      `Invalid permission key format: "${key}". Expected at least 3 dot-separated segments.`,
    );
  }

  const scopeToken = parts[parts.length - 1];
  const action = parts[parts.length - 2];
  const resource = parts.slice(0, -2).join('.');
  const scope = SCOPE_TOKEN_MAP[scopeToken] ?? scopeToken;

  return { resource, action, scope };
}

/**
 * Build a permission key string from {resource, action, scope} components.
 *
 * The scope is normalized: "organization" → "org", others kept as-is.
 *
 * @example
 *   toPermissionKey('organization', 'create', 'organization')
 *   // → 'organization.create.org'
 *
 *   toPermissionKey('task', 'read', 'project')
 *   // → 'task.read.project'
 */
export function toPermissionKey(resource: string, action: string, scope: string): string {
  const scopeToken = SCOPE_NAME_MAP[scope] ?? scope;
  return `${resource}.${action}.${scopeToken}`;
}
