import { relations } from 'drizzle-orm';
import {
  boolean,
  datetime,
  index,
  int,
  json,
  mysqlTable,
  text,
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
    roleId: varchar('role_id', { length: 36 })
      .notNull()
      .references(() => roles.id),
    joinedAt: datetime('joined_at').notNull().default(new Date()),
    createdAt: datetime('created_at').notNull().default(new Date()),
    updatedAt: datetime('updated_at').notNull().default(new Date()),
  },
  (table) => [
    index('org_members_org_idx').on(table.organizationId),
    index('org_members_user_idx').on(table.userId),
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
