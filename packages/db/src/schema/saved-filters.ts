import { relations } from 'drizzle-orm';
import { datetime, index, json, mysqlTable, varchar } from 'drizzle-orm/mysql-core';
import { organizations } from './organizations.js';
import { users } from './users.js';

export const savedFilters = mysqlTable(
  'saved_filters',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id),
    organizationId: varchar('organization_id', { length: 36 })
      .notNull()
      .references(() => organizations.id),
    name: varchar('name', { length: 255 }).notNull(),
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    filters: json('filters').$type<Record<string, unknown>>().notNull(),
    createdAt: datetime('created_at').notNull().default(new Date()),
    updatedAt: datetime('updated_at').notNull().default(new Date()),
  },
  (table) => [
    index('saved_filters_user_idx').on(table.userId),
    index('saved_filters_org_idx').on(table.organizationId),
  ],
);

export const savedFiltersRelations = relations(savedFilters, ({ one }) => ({
  user: one(users, { fields: [savedFilters.userId], references: [users.id] }),
  organization: one(organizations, {
    fields: [savedFilters.organizationId],
    references: [organizations.id],
  }),
}));
