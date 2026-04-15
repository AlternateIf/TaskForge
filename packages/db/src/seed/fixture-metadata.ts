/**
 * Fixture metadata constants consumed by seed, validate, and summary.
 *
 * These counts must stay in sync with the actual fixture arrays.
 * Tests assert that metadata counts match fixture array lengths.
 */

// Counts are determined by the builder functions and target configurations.
// The actual validation happens in validate.ts against real DB counts.
// Metadata here provides expected baseline counts for the core profile.

export const CORE_COUNTS = {
  users: 67,
  organizations: 5,
  organizationAuthSettings: 5,
  roles: 44,
  permissions: 537,
  organizationMembers: 75,
  roleAssignments: 28,
  permissionAssignments: 5,
  invitations: 2,
  invitationTargets: 2,
  invitationTargetRoles: 2,
  invitationTargetPermissions: 2,
  oauthAccounts: 1,
  sessions: 3,
  verificationTokens: 2,
  projects: 22,
  workflows: 22,
  workflowStatuses: 88,
  projectMembers: 188,
  labels: 48,
  tasks: 430,
  taskLabels: 657,
  taskWatchers: 215,
  taskDependencies: 90,
  checklists: 86,
  checklistItems: 275,
  comments: 170,
  commentMentions: 160,
  activityLog: 80,
  notificationPreferences: 96,
  notifications: 120,
} as const;

export const SAMPLE_COUNTS = {
  projects: 0,
  tasks: 0,
  workflowStatuses: 0,
  projectMembers: 0,
  labels: 0,
  taskLabels: 0,
  taskWatchers: 0,
  taskDependencies: 0,
  checklists: 0,
  checklistItems: 0,
  comments: 0,
  commentMentions: 0,
  activityLog: 0,
  notifications: 0,
} as const;

/**
 * Combined counts for the core+sample profile.
 * With the overhaul, sample fixtures are absorbed into core.
 */
const CORE_PLUS_SAMPLE_COUNTS = {
  ...CORE_COUNTS,
} as const;

export type SeedCounts = { [K in keyof typeof CORE_COUNTS]: number };

export const SEED_PROFILES: Record<string, SeedCounts> = {
  core: CORE_COUNTS,
  'core+sample': CORE_PLUS_SAMPLE_COUNTS,
};

export const CORE_SEEDED_TABLES: readonly string[] = [
  'activity_log',
  'notification_preferences',
  'notifications',
  'comment_mentions',
  'comments',
  'checklist_items',
  'checklists',
  'task_dependencies',
  'task_watchers',
  'task_labels',
  'tasks',
  'labels',
  'project_members',
  'workflow_statuses',
  'workflows',
  'projects',
  'verification_tokens',
  'sessions',
  'oauth_accounts',
  'invitation_target_permissions',
  'invitation_target_roles',
  'invitation_targets',
  'invitations',
  'permission_assignments',
  'role_assignments',
  'organization_members',
  'permissions',
  'roles',
  'organization_auth_settings',
  'organizations',
  'users',
] as const;

export const SAMPLE_SEEDED_TABLES: readonly string[] = [] as const;

/**
 * All tables that need to be truncated for a reseed, in a
 * foreign-key-safe order (children before parents).
 */
export function getAllSeededTables(): string[] {
  return [...CORE_SEEDED_TABLES];
}
