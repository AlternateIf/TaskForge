import { relations } from 'drizzle-orm';
import { boolean, datetime, index, mysqlTable, text, varchar } from 'drizzle-orm/mysql-core';

export const users = mysqlTable(
  'users',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }),
    displayName: varchar('display_name', { length: 255 }).notNull(),
    avatarUrl: text('avatar_url'),
    mfaEnabled: boolean('mfa_enabled').notNull().default(false),
    mfaSecret: varchar('mfa_secret', { length: 255 }),
    emailVerifiedAt: datetime('email_verified_at'),
    lastLoginAt: datetime('last_login_at'),
    createdAt: datetime('created_at').notNull().default(new Date()),
    updatedAt: datetime('updated_at').notNull().default(new Date()),
    deletedAt: datetime('deleted_at'),
  },
  (table) => [index('users_email_idx').on(table.email)],
);

export const oauthAccounts = mysqlTable(
  'oauth_accounts',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id),
    provider: varchar('provider', { length: 50 }).notNull(),
    providerUserId: varchar('provider_user_id', { length: 255 }).notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    expiresAt: datetime('expires_at'),
    createdAt: datetime('created_at').notNull().default(new Date()),
    updatedAt: datetime('updated_at').notNull().default(new Date()),
  },
  (table) => [
    index('oauth_provider_idx').on(table.provider, table.providerUserId),
    index('oauth_user_idx').on(table.userId),
  ],
);

export const sessions = mysqlTable(
  'sessions',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id),
    tokenHash: varchar('token_hash', { length: 255 }).notNull(),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    expiresAt: datetime('expires_at').notNull(),
    createdAt: datetime('created_at').notNull().default(new Date()),
  },
  (table) => [
    index('sessions_user_idx').on(table.userId),
    index('sessions_token_idx').on(table.tokenHash),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  oauthAccounts: many(oauthAccounts),
  sessions: many(sessions),
}));

export const oauthAccountsRelations = relations(oauthAccounts, ({ one }) => ({
  user: one(users, { fields: [oauthAccounts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));
