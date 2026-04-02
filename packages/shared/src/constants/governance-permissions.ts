export const GOVERNANCE_PERMISSION_KEYS = [
  'organization.create.global',
  'organization.read.org',
  'organization.update.org',
  'organization.delete.org',
  'organization.settings.read.org',
  'organization.settings.update.org',
  'organization.auth_settings.read.org',
  'organization.auth_settings.update.org',
  'organization.features.read.org',
  'organization.features.update.org',
  'invitation.create.org',
  'invitation.read.org',
  'invitation.update.org',
  'invitation.delete.org',
  'membership.create.org',
  'membership.read.org',
  'membership.update.org',
  'membership.delete.org',
  'role.create.org',
  'role.read.org',
  'role.update.org',
  'role.delete.org',
  'permission.read.org',
  'permission.update.org',
  'global_role_assignment.create',
  'global_role_assignment.read',
  'global_role_assignment.update',
  'global_role_assignment.delete',
] as const;

export type GovernancePermissionKey = (typeof GOVERNANCE_PERMISSION_KEYS)[number];

export const GOVERNANCE_PERMISSION_SET = new Set<string>(GOVERNANCE_PERMISSION_KEYS);
