import { relations } from 'drizzle-orm';
import { boolean, datetime, index, mysqlTable, text, varchar } from 'drizzle-orm/mysql-core';
import { users } from './users.js';

export const notifications = mysqlTable(
  'notifications',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id),
    type: varchar('type', { length: 100 }).notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    body: text('body'),
    entityType: varchar('entity_type', { length: 50 }),
    entityId: varchar('entity_id', { length: 36 }),
    readAt: datetime('read_at'),
    createdAt: datetime('created_at').notNull().default(new Date()),
  },
  (table) => [
    index('notifications_user_read_idx').on(table.userId, table.readAt),
    index('notifications_user_created_idx').on(table.userId, table.createdAt),
  ],
);

export const notificationPreferences = mysqlTable(
  'notification_preferences',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id),
    eventType: varchar('event_type', { length: 100 }).notNull(),
    channel: varchar('channel', { length: 50 }).notNull(),
    enabled: boolean('enabled').notNull().default(true),
    createdAt: datetime('created_at').notNull().default(new Date()),
    updatedAt: datetime('updated_at').notNull().default(new Date()),
  },
  (table) => [index('notif_prefs_user_idx').on(table.userId)],
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, {
    fields: [notificationPreferences.userId],
    references: [users.id],
  }),
}));
