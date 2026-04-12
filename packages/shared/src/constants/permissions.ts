export const RESOURCES = {
  ORGANIZATION: 'organization',
  INVITATION: 'invitation',
  MEMBERSHIP: 'membership',
  ROLE: 'role',
  PERMISSION: 'permission',
  PROJECT: 'project',
  TASK: 'task',
  COMMENT: 'comment',
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
    // Organization (4)
    { resource: 'organization', action: 'create', scope: 'organization' },
    { resource: 'organization', action: 'read', scope: 'organization' },
    { resource: 'organization', action: 'update', scope: 'organization' },
    { resource: 'organization', action: 'delete', scope: 'organization' },
    // Invitation (4)
    { resource: 'invitation', action: 'create', scope: 'organization' },
    { resource: 'invitation', action: 'read', scope: 'organization' },
    { resource: 'invitation', action: 'update', scope: 'organization' },
    { resource: 'invitation', action: 'delete', scope: 'organization' },
    // Membership (3)
    { resource: 'membership', action: 'read', scope: 'organization' },
    { resource: 'membership', action: 'update', scope: 'organization' },
    { resource: 'membership', action: 'delete', scope: 'organization' },
    // Role (4)
    { resource: 'role', action: 'create', scope: 'organization' },
    { resource: 'role', action: 'read', scope: 'organization' },
    { resource: 'role', action: 'update', scope: 'organization' },
    { resource: 'role', action: 'delete', scope: 'organization' },
    // Permission (2)
    { resource: 'permission', action: 'read', scope: 'organization' },
    { resource: 'permission', action: 'update', scope: 'organization' },
    // Project (4)
    { resource: 'project', action: 'create', scope: 'organization' },
    { resource: 'project', action: 'read', scope: 'organization' },
    { resource: 'project', action: 'update', scope: 'organization' },
    { resource: 'project', action: 'delete', scope: 'organization' },
    // Notification (3)
    { resource: 'notification', action: 'create', scope: 'organization' },
    { resource: 'notification', action: 'read', scope: 'organization' },
    { resource: 'notification', action: 'delete', scope: 'organization' },
    // Task (4, project scope)
    { resource: 'task', action: 'create', scope: 'project' },
    { resource: 'task', action: 'read', scope: 'project' },
    { resource: 'task', action: 'update', scope: 'project' },
    { resource: 'task', action: 'delete', scope: 'project' },
  ],
  'Backend Developer': [
    { resource: 'organization', action: 'read', scope: 'organization' },
    { resource: 'project', action: 'read', scope: 'organization' },
    { resource: 'task', action: 'create', scope: 'project' },
    { resource: 'task', action: 'read', scope: 'project' },
    { resource: 'task', action: 'update', scope: 'project' },
  ],
  'Frontend Developer': [
    { resource: 'organization', action: 'read', scope: 'organization' },
    { resource: 'project', action: 'read', scope: 'organization' },
    { resource: 'task', action: 'create', scope: 'project' },
    { resource: 'task', action: 'read', scope: 'project' },
    { resource: 'task', action: 'update', scope: 'project' },
  ],
  Designer: [
    { resource: 'organization', action: 'read', scope: 'organization' },
    { resource: 'project', action: 'read', scope: 'organization' },
    { resource: 'task', action: 'create', scope: 'project' },
    { resource: 'task', action: 'read', scope: 'project' },
    { resource: 'task', action: 'update', scope: 'project' },
  ],
  'QA Engineer': [
    { resource: 'organization', action: 'read', scope: 'organization' },
    { resource: 'project', action: 'read', scope: 'organization' },
    { resource: 'task', action: 'create', scope: 'project' },
    { resource: 'task', action: 'read', scope: 'project' },
    { resource: 'task', action: 'update', scope: 'project' },
    { resource: 'task', action: 'delete', scope: 'project' },
  ],
  'DevOps/SRE': [
    { resource: 'organization', action: 'read', scope: 'organization' },
    { resource: 'project', action: 'create', scope: 'organization' },
    { resource: 'project', action: 'read', scope: 'organization' },
    { resource: 'project', action: 'update', scope: 'organization' },
    { resource: 'task', action: 'create', scope: 'project' },
    { resource: 'task', action: 'read', scope: 'project' },
    { resource: 'task', action: 'update', scope: 'project' },
    { resource: 'notification', action: 'read', scope: 'organization' },
    { resource: 'notification', action: 'delete', scope: 'organization' },
  ],
  'Support Engineer': [
    { resource: 'organization', action: 'read', scope: 'organization' },
    { resource: 'project', action: 'read', scope: 'organization' },
    { resource: 'task', action: 'read', scope: 'project' },
    { resource: 'task', action: 'update', scope: 'project' },
    { resource: 'membership', action: 'read', scope: 'organization' },
  ],
  'Product Manager': [
    { resource: 'organization', action: 'read', scope: 'organization' },
    { resource: 'project', action: 'create', scope: 'organization' },
    { resource: 'project', action: 'read', scope: 'organization' },
    { resource: 'project', action: 'update', scope: 'organization' },
    { resource: 'task', action: 'create', scope: 'project' },
    { resource: 'task', action: 'read', scope: 'project' },
    { resource: 'task', action: 'update', scope: 'project' },
  ],
  'SEO Specialist': [
    { resource: 'organization', action: 'read', scope: 'organization' },
    { resource: 'project', action: 'read', scope: 'organization' },
    { resource: 'task', action: 'create', scope: 'project' },
    { resource: 'task', action: 'read', scope: 'project' },
  ],
  'Auth Flow Manager': [
    { resource: 'organization', action: 'read', scope: 'organization' },
    { resource: 'invitation', action: 'create', scope: 'organization' },
    { resource: 'invitation', action: 'read', scope: 'organization' },
    { resource: 'invitation', action: 'update', scope: 'organization' },
    { resource: 'membership', action: 'read', scope: 'organization' },
    { resource: 'membership', action: 'update', scope: 'organization' },
  ],
  'Customer Reporter': [
    { resource: 'task', action: 'create', scope: 'project' },
    { resource: 'task', action: 'read', scope: 'project' },
  ],
  'Customer Stakeholder': [{ resource: 'task', action: 'read', scope: 'project' }],
  'Org Owner': [
    { resource: 'organization', action: 'read', scope: 'organization' },
    // Invitation (3 — create/read/update, no delete)
    { resource: 'invitation', action: 'create', scope: 'organization' },
    { resource: 'invitation', action: 'read', scope: 'organization' },
    { resource: 'invitation', action: 'update', scope: 'organization' },
    // Membership (2 — read/update, no delete)
    { resource: 'membership', action: 'read', scope: 'organization' },
    { resource: 'membership', action: 'update', scope: 'organization' },
    // Role (3 — create/read/update, no delete)
    { resource: 'role', action: 'create', scope: 'organization' },
    { resource: 'role', action: 'read', scope: 'organization' },
    { resource: 'role', action: 'update', scope: 'organization' },
    // Project (3 — create/read/update, no delete)
    { resource: 'project', action: 'create', scope: 'organization' },
    { resource: 'project', action: 'read', scope: 'organization' },
    { resource: 'project', action: 'update', scope: 'organization' },
    // Notification (3 — create/read/update, no delete)
    { resource: 'notification', action: 'create', scope: 'organization' },
    { resource: 'notification', action: 'read', scope: 'organization' },
    { resource: 'notification', action: 'update', scope: 'organization' },
  ],
  'Project Admin': [
    { resource: 'project', action: 'read', scope: 'organization' },
    { resource: 'project', action: 'update', scope: 'organization' },
    { resource: 'task', action: 'create', scope: 'project' },
    { resource: 'task', action: 'read', scope: 'project' },
    { resource: 'task', action: 'update', scope: 'project' },
    { resource: 'task', action: 'delete', scope: 'project' },
  ],
};
