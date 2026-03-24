import { relations } from 'drizzle-orm';
import { datetime, index, json, mysqlTable, varchar } from 'drizzle-orm/mysql-core';
import { organizations } from './organizations.js';
import { users } from './users.js';

export const activityLog = mysqlTable(
  'activity_log',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 })
      .notNull()
      .references(() => organizations.id),
    actorId: varchar('actor_id', { length: 36 }).references(() => users.id),
    actorDisplay: varchar('actor_display', { length: 255 }).notNull(),
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    entityId: varchar('entity_id', { length: 36 }).notNull(),
    action: varchar('action', { length: 100 }).notNull(),
    changes: json('changes').$type<Record<string, { before: unknown; after: unknown }>>(),
    createdAt: datetime('created_at').notNull().default(new Date()),
  },
  (table) => [
    index('activity_entity_idx').on(table.entityType, table.entityId),
    index('activity_org_idx').on(table.organizationId),
    index('activity_created_idx').on(table.createdAt),
    index('activity_actor_idx').on(table.actorId),
  ],
);

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  organization: one(organizations, {
    fields: [activityLog.organizationId],
    references: [organizations.id],
  }),
  actor: one(users, { fields: [activityLog.actorId], references: [users.id] }),
}));
