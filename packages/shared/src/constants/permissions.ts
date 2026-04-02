export const RESOURCES = {
  ORGANIZATION: 'organization',
  ORGANIZATION_SETTINGS: 'organization_settings',
  ORGANIZATION_AUTH_SETTINGS: 'organization_auth_settings',
  ORGANIZATION_FEATURES: 'organization_features',
  INVITATION: 'invitation',
  MEMBERSHIP: 'membership',
  ROLE: 'role',
  PERMISSION: 'permission',
  GLOBAL_ROLE_ASSIGNMENT: 'global_role_assignment',
  PROJECT: 'project',
  TASK: 'task',
  COMMENT: 'comment',
  ATTACHMENT: 'attachment',
  NOTIFICATION: 'notification',
} as const;

export type Resource = (typeof RESOURCES)[keyof typeof RESOURCES];

export const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  MANAGE: 'manage',
} as const;

export type Action = (typeof ACTIONS)[keyof typeof ACTIONS];

/** Actions that 'manage' expands to during permission checks */
export const MANAGE_ACTIONS: Action[] = ['create', 'read', 'update', 'delete'];

export const SCOPES = {
  GLOBAL: 'global',
  ORGANIZATION: 'organization',
  PROJECT: 'project',
} as const;

export type Scope = (typeof SCOPES)[keyof typeof SCOPES];

/**
 * Built-in permission matrix.
 * Each role maps to a list of (resource, action, scope) tuples.
 * 'manage' means all CRUD actions on that resource.
 */
export const BUILT_IN_PERMISSIONS: Record<
  string,
  { resource: Resource; action: Action; scope: Scope }[]
> = {
  'Super Admin': [
    { resource: 'organization', action: 'manage', scope: 'global' },
    { resource: 'organization_settings', action: 'manage', scope: 'organization' },
    { resource: 'organization_auth_settings', action: 'manage', scope: 'organization' },
    { resource: 'organization_features', action: 'manage', scope: 'organization' },
    { resource: 'invitation', action: 'manage', scope: 'organization' },
    { resource: 'membership', action: 'manage', scope: 'organization' },
    { resource: 'role', action: 'manage', scope: 'organization' },
    { resource: 'permission', action: 'manage', scope: 'organization' },
    { resource: 'global_role_assignment', action: 'manage', scope: 'global' },
    { resource: 'project', action: 'manage', scope: 'organization' },
    { resource: 'task', action: 'manage', scope: 'organization' },
    { resource: 'comment', action: 'manage', scope: 'organization' },
    { resource: 'attachment', action: 'manage', scope: 'organization' },
    { resource: 'notification', action: 'manage', scope: 'organization' },
  ],
  Admin: [
    { resource: 'organization', action: 'read', scope: 'organization' },
    { resource: 'organization', action: 'update', scope: 'organization' },
    { resource: 'project', action: 'manage', scope: 'organization' },
    { resource: 'task', action: 'manage', scope: 'organization' },
    { resource: 'comment', action: 'manage', scope: 'organization' },
    { resource: 'attachment', action: 'manage', scope: 'organization' },
    { resource: 'notification', action: 'manage', scope: 'organization' },
  ],
  'Project Manager': [
    { resource: 'organization', action: 'read', scope: 'organization' },
    { resource: 'project', action: 'create', scope: 'organization' },
    { resource: 'project', action: 'read', scope: 'organization' },
    { resource: 'project', action: 'update', scope: 'project' },
    { resource: 'task', action: 'manage', scope: 'project' },
    { resource: 'comment', action: 'manage', scope: 'project' },
    { resource: 'attachment', action: 'manage', scope: 'project' },
    { resource: 'notification', action: 'read', scope: 'organization' },
  ],
  'Team Member': [
    { resource: 'organization', action: 'read', scope: 'organization' },
    { resource: 'project', action: 'read', scope: 'organization' },
    { resource: 'task', action: 'create', scope: 'project' },
    { resource: 'task', action: 'read', scope: 'project' },
    { resource: 'task', action: 'update', scope: 'project' },
    { resource: 'comment', action: 'create', scope: 'project' },
    { resource: 'comment', action: 'read', scope: 'project' },
    { resource: 'comment', action: 'update', scope: 'project' },
    { resource: 'attachment', action: 'create', scope: 'project' },
    { resource: 'attachment', action: 'read', scope: 'project' },
    { resource: 'notification', action: 'read', scope: 'organization' },
  ],
  Guest: [
    { resource: 'organization', action: 'read', scope: 'organization' },
    { resource: 'project', action: 'read', scope: 'project' },
    { resource: 'task', action: 'read', scope: 'project' },
    { resource: 'comment', action: 'read', scope: 'project' },
    { resource: 'attachment', action: 'read', scope: 'project' },
    { resource: 'notification', action: 'read', scope: 'organization' },
  ],
};
