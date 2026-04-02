import { relations } from 'drizzle-orm';
import {
  boolean,
  datetime,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';
import { users } from './users.js';

export const organizations = mysqlTable('organizations', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  logoUrl: text('logo_url'),
  settings: json('settings').$type<Record<string, unknown>>(),
  trialExpiresAt: datetime('trial_expires_at'),
  createdAt: datetime('created_at').notNull().default(new Date()),
  updatedAt: datetime('updated_at').notNull().default(new Date()),
  deletedAt: datetime('deleted_at'),
});

export const organizationMembers = mysqlTable(
  'organization_members',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 })
      .notNull()
      .references(() => organizations.id),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id),
    roleId: varchar('role_id', { length: 36 }).references(() => roles.id),
    joinedAt: datetime('joined_at').notNull().default(new Date()),
    createdAt: datetime('created_at').notNull().default(new Date()),
    updatedAt: datetime('updated_at').notNull().default(new Date()),
  },
  (table) => [
    index('org_members_org_idx').on(table.organizationId),
    index('org_members_user_idx').on(table.userId),
    uniqueIndex('org_members_org_user_uidx').on(table.organizationId, table.userId),
  ],
);

export const roles = mysqlTable(
  'roles',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 }).references(() => organizations.id),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    isSystem: boolean('is_system').notNull().default(false),
    createdAt: datetime('created_at').notNull().default(new Date()),
    updatedAt: datetime('updated_at').notNull().default(new Date()),
  },
  (table) => [index('roles_org_idx').on(table.organizationId)],
);

export const permissions = mysqlTable(
  'permissions',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    roleId: varchar('role_id', { length: 36 })
      .notNull()
      .references(() => roles.id),
    resource: varchar('resource', { length: 100 }).notNull(),
    action: varchar('action', { length: 50 }).notNull(),
    scope: varchar('scope', { length: 50 }).notNull(),
  },
  (table) => [index('permissions_role_idx').on(table.roleId)],
);

export const roleAssignments = mysqlTable(
  'role_assignments',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id),
    roleId: varchar('role_id', { length: 36 })
      .notNull()
      .references(() => roles.id),
    organizationId: varchar('organization_id', { length: 36 }).references(() => organizations.id),
    assignedByUserId: varchar('assigned_by_user_id', { length: 36 }).references(() => users.id),
    createdAt: datetime('created_at').notNull().default(new Date()),
    updatedAt: datetime('updated_at').notNull().default(new Date()),
  },
  (table) => [
    index('role_assignments_user_idx').on(table.userId),
    index('role_assignments_role_idx').on(table.roleId),
    index('role_assignments_org_idx').on(table.organizationId),
    uniqueIndex('role_assignments_user_role_org_uidx').on(
      table.userId,
      table.roleId,
      table.organizationId,
    ),
  ],
);

export const permissionAssignments = mysqlTable(
  'permission_assignments',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id),
    organizationId: varchar('organization_id', { length: 36 }).references(() => organizations.id),
    permissionKey: varchar('permission_key', { length: 191 }).notNull(),
    assignedByUserId: varchar('assigned_by_user_id', { length: 36 }).references(() => users.id),
    createdAt: datetime('created_at').notNull().default(new Date()),
    updatedAt: datetime('updated_at').notNull().default(new Date()),
  },
  (table) => [
    index('permission_assignments_user_idx').on(table.userId),
    index('permission_assignments_org_idx').on(table.organizationId),
    uniqueIndex('permission_assignments_user_key_org_uidx').on(
      table.userId,
      table.permissionKey,
      table.organizationId,
    ),
  ],
);

export const invitations = mysqlTable(
  'invitations',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    inviterOrgId: varchar('inviter_org_id', { length: 36 })
      .notNull()
      .references(() => organizations.id),
    invitedByUserId: varchar('invited_by_user_id', { length: 36 })
      .notNull()
      .references(() => users.id),
    email: varchar('email', { length: 255 }).notNull(),
    tokenHash: varchar('token_hash', { length: 64 }).notNull(),
    status: mysqlEnum('status', ['sent', 'accepted', 'revoked']).notNull().default('sent'),
    allowedAuthMethods: json('allowed_auth_methods').$type<string[] | null>(),
    sentAt: datetime('sent_at').notNull(),
    expiresAt: datetime('expires_at').notNull(),
    acceptedAt: datetime('accepted_at'),
    revokedAt: datetime('revoked_at'),
    consumedByUserId: varchar('consumed_by_user_id', { length: 36 }).references(() => users.id),
    createdAt: datetime('created_at').notNull().default(new Date()),
    updatedAt: datetime('updated_at').notNull().default(new Date()),
  },
  (table) => [
    index('invitations_inviter_org_idx').on(table.inviterOrgId),
    index('invitations_email_idx').on(table.email),
    index('invitations_status_idx').on(table.status),
    uniqueIndex('invitations_token_hash_uidx').on(table.tokenHash),
  ],
);

export const invitationTargets = mysqlTable(
  'invitation_targets',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    invitationId: varchar('invitation_id', { length: 36 })
      .notNull()
      .references(() => invitations.id),
    organizationId: varchar('organization_id', { length: 36 })
      .notNull()
      .references(() => organizations.id),
    createdAt: datetime('created_at').notNull().default(new Date()),
  },
  (table) => [
    index('invitation_targets_invitation_idx').on(table.invitationId),
    index('invitation_targets_org_idx').on(table.organizationId),
    uniqueIndex('invitation_targets_invitation_org_uidx').on(
      table.invitationId,
      table.organizationId,
    ),
  ],
);

export const invitationTargetRoles = mysqlTable(
  'invitation_target_roles',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    invitationTargetId: varchar('invitation_target_id', { length: 36 })
      .notNull()
      .references(() => invitationTargets.id),
    roleId: varchar('role_id', { length: 36 })
      .notNull()
      .references(() => roles.id),
    createdAt: datetime('created_at').notNull().default(new Date()),
  },
  (table) => [
    index('invitation_target_roles_target_idx').on(table.invitationTargetId),
    index('invitation_target_roles_role_idx').on(table.roleId),
    uniqueIndex('invitation_target_roles_target_role_uidx').on(
      table.invitationTargetId,
      table.roleId,
    ),
  ],
);

export const invitationTargetPermissions = mysqlTable(
  'invitation_target_permissions',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    invitationTargetId: varchar('invitation_target_id', { length: 36 })
      .notNull()
      .references(() => invitationTargets.id),
    permissionKey: varchar('permission_key', { length: 191 }).notNull(),
    createdAt: datetime('created_at').notNull().default(new Date()),
  },
  (table) => [
    index('invitation_target_permissions_target_idx').on(table.invitationTargetId),
    uniqueIndex('invitation_target_permissions_target_key_uidx').on(
      table.invitationTargetId,
      table.permissionKey,
    ),
  ],
);

export const organizationAuthSettings = mysqlTable('organization_auth_settings', {
  id: varchar('id', { length: 36 }).primaryKey(),
  organizationId: varchar('organization_id', { length: 36 })
    .notNull()
    .unique()
    .references(() => organizations.id),
  passwordAuthEnabled: boolean('password_auth_enabled').notNull().default(true),
  googleOauthEnabled: boolean('google_oauth_enabled').notNull().default(false),
  githubOauthEnabled: boolean('github_oauth_enabled').notNull().default(false),
  mfaEnforced: boolean('mfa_enforced').notNull().default(false),
  mfaEnforcedAt: datetime('mfa_enforced_at'),
  mfaGracePeriodDays: int('mfa_grace_period_days').notNull().default(7),
  allowedEmailDomains: json('allowed_email_domains').$type<string[] | null>(),
  createdAt: datetime('created_at').notNull().default(new Date()),
  updatedAt: datetime('updated_at').notNull().default(new Date()),
});

export const organizationsRelations = relations(organizations, ({ many, one }) => ({
  members: many(organizationMembers),
  roles: many(roles),
  authSettings: one(organizationAuthSettings),
  roleAssignments: many(roleAssignments),
  permissionAssignments: many(permissionAssignments),
  invitationTargets: many(invitationTargets),
  invitesCreatedFromOrg: many(invitations),
}));

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationMembers.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [organizationMembers.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [organizationMembers.roleId],
    references: [roles.id],
  }),
}));

export const rolesRelations = relations(roles, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [roles.organizationId],
    references: [organizations.id],
  }),
  permissions: many(permissions),
  assignments: many(roleAssignments),
  invitationTargetRoles: many(invitationTargetRoles),
}));

export const permissionsRelations = relations(permissions, ({ one }) => ({
  role: one(roles, { fields: [permissions.roleId], references: [roles.id] }),
}));

export const organizationAuthSettingsRelations = relations(organizationAuthSettings, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationAuthSettings.organizationId],
    references: [organizations.id],
  }),
}));

export const roleAssignmentsRelations = relations(roleAssignments, ({ one }) => ({
  user: one(users, { fields: [roleAssignments.userId], references: [users.id] }),
  role: one(roles, { fields: [roleAssignments.roleId], references: [roles.id] }),
  organization: one(organizations, {
    fields: [roleAssignments.organizationId],
    references: [organizations.id],
  }),
  assignedBy: one(users, {
    fields: [roleAssignments.assignedByUserId],
    references: [users.id],
  }),
}));

export const permissionAssignmentsRelations = relations(permissionAssignments, ({ one }) => ({
  user: one(users, { fields: [permissionAssignments.userId], references: [users.id] }),
  organization: one(organizations, {
    fields: [permissionAssignments.organizationId],
    references: [organizations.id],
  }),
  assignedBy: one(users, {
    fields: [permissionAssignments.assignedByUserId],
    references: [users.id],
  }),
}));

export const invitationsRelations = relations(invitations, ({ one, many }) => ({
  inviterOrg: one(organizations, {
    fields: [invitations.inviterOrgId],
    references: [organizations.id],
  }),
  invitedBy: one(users, {
    fields: [invitations.invitedByUserId],
    references: [users.id],
  }),
  consumedBy: one(users, {
    fields: [invitations.consumedByUserId],
    references: [users.id],
  }),
  targets: many(invitationTargets),
}));

export const invitationTargetsRelations = relations(invitationTargets, ({ one, many }) => ({
  invitation: one(invitations, {
    fields: [invitationTargets.invitationId],
    references: [invitations.id],
  }),
  organization: one(organizations, {
    fields: [invitationTargets.organizationId],
    references: [organizations.id],
  }),
  roles: many(invitationTargetRoles),
  permissions: many(invitationTargetPermissions),
}));

export const invitationTargetRolesRelations = relations(invitationTargetRoles, ({ one }) => ({
  target: one(invitationTargets, {
    fields: [invitationTargetRoles.invitationTargetId],
    references: [invitationTargets.id],
  }),
  role: one(roles, { fields: [invitationTargetRoles.roleId], references: [roles.id] }),
}));

export const invitationTargetPermissionsRelations = relations(
  invitationTargetPermissions,
  ({ one }) => ({
    target: one(invitationTargets, {
      fields: [invitationTargetPermissions.invitationTargetId],
      references: [invitationTargets.id],
    }),
  }),
);
