/**
 * Fixture metadata constants consumed by seed, validate, and summary.
 *
 * These counts must stay in sync with the actual fixture arrays.
 * Tests assert that metadata counts match fixture array lengths.
 */

export const CORE_COUNTS = {
  users: 11,
  organizations: 2,
  organizationAuthSettings: 2,
  roles: 13,
  permissions: 292,
  organizationMembers: 16,
  roleAssignments: 19,
  permissionAssignments: 5,
  invitations: 3,
  invitationTargets: 2,
  invitationTargetRoles: 2,
  invitationTargetPermissions: 2,
  oauthAccounts: 1,
  sessions: 3,
  verificationTokens: 2,
  projects: 4,
  workflows: 4,
  workflowStatuses: 16,
  projectMembers: 17,
  labels: 12,
  tasks: 15,
  taskLabels: 13,
  taskWatchers: 8,
  taskDependencies: 3,
  checklists: 3,
  checklistItems: 5,
  comments: 6,
  commentMentions: 3,
  activityLog: 6,
  notificationPreferences: 4,
  notifications: 4,
} as const;

export const SAMPLE_COUNTS = {
  projects: 1,
  tasks: 2, // 1 overdue + 1 completed with activity trail
  workflowStatuses: 4,
  projectMembers: 2,
  labels: 2,
  taskLabels: 3,
  taskWatchers: 2,
  taskDependencies: 0,
  checklists: 1,
  checklistItems: 3,
  comments: 2,
  commentMentions: 1,
  activityLog: 2,
  notifications: 1,
} as const;

/**
 * Combined counts for the core+sample profile.
 * Keys mirror CORE_COUNTS; values are the sum of core + sample.
 */
const CORE_PLUS_SAMPLE_COUNTS = {
  users: CORE_COUNTS.users,
  organizations: CORE_COUNTS.organizations,
  organizationAuthSettings: CORE_COUNTS.organizationAuthSettings,
  roles: CORE_COUNTS.roles,
  permissions: CORE_COUNTS.permissions,
  organizationMembers: CORE_COUNTS.organizationMembers,
  roleAssignments: CORE_COUNTS.roleAssignments,
  permissionAssignments: CORE_COUNTS.permissionAssignments,
  invitations: CORE_COUNTS.invitations,
  invitationTargets: CORE_COUNTS.invitationTargets,
  invitationTargetRoles: CORE_COUNTS.invitationTargetRoles,
  invitationTargetPermissions: CORE_COUNTS.invitationTargetPermissions,
  oauthAccounts: CORE_COUNTS.oauthAccounts,
  sessions: CORE_COUNTS.sessions,
  verificationTokens: CORE_COUNTS.verificationTokens,
  projects: CORE_COUNTS.projects + SAMPLE_COUNTS.projects,
  workflows: CORE_COUNTS.workflows + SAMPLE_COUNTS.projects,
  workflowStatuses: CORE_COUNTS.workflowStatuses + SAMPLE_COUNTS.workflowStatuses,
  projectMembers: CORE_COUNTS.projectMembers + SAMPLE_COUNTS.projectMembers,
  labels: CORE_COUNTS.labels + SAMPLE_COUNTS.labels,
  tasks: CORE_COUNTS.tasks + SAMPLE_COUNTS.tasks,
  taskLabels: CORE_COUNTS.taskLabels + SAMPLE_COUNTS.taskLabels,
  taskWatchers: CORE_COUNTS.taskWatchers + SAMPLE_COUNTS.taskWatchers,
  taskDependencies: CORE_COUNTS.taskDependencies + SAMPLE_COUNTS.taskDependencies,
  checklists: CORE_COUNTS.checklists + SAMPLE_COUNTS.checklists,
  checklistItems: CORE_COUNTS.checklistItems + SAMPLE_COUNTS.checklistItems,
  comments: CORE_COUNTS.comments + SAMPLE_COUNTS.comments,
  commentMentions: CORE_COUNTS.commentMentions + SAMPLE_COUNTS.commentMentions,
  activityLog: CORE_COUNTS.activityLog + SAMPLE_COUNTS.activityLog,
  notificationPreferences: CORE_COUNTS.notificationPreferences,
  notifications: CORE_COUNTS.notifications + SAMPLE_COUNTS.notifications,
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

export const SAMPLE_SEEDED_TABLES: readonly string[] = [
  // Sample data goes into the same tables as core, so truncating core tables
  // is sufficient for reseed. This list is kept for documentation symmetry.
  // Tables are the same as CORE_SEEDED_TABLES because sample fixtures
  // are additive into the same tables.
] as const;

/**
 * All tables that need to be truncated for a reseed, in a
 * foreign-key-safe order (children before parents).
 */
export function getAllSeededTables(): string[] {
  return [...CORE_SEEDED_TABLES];
}
