import { relations } from 'drizzle-orm';
import {
  boolean,
  datetime,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  varchar,
} from 'drizzle-orm/mysql-core';
import { organizations } from './organizations.js';
import { users } from './users.js';

export const projects = mysqlTable(
  'projects',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    organizationId: varchar('organization_id', { length: 36 })
      .notNull()
      .references(() => organizations.id),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    slug: varchar('slug', { length: 255 }).notNull(),
    color: varchar('color', { length: 7 }),
    icon: varchar('icon', { length: 50 }),
    status: mysqlEnum('status', ['active', 'archived', 'deleted']).notNull().default('active'),
    createdBy: varchar('created_by', { length: 36 }).references(() => users.id),
    createdAt: datetime('created_at').notNull().default(new Date()),
    updatedAt: datetime('updated_at').notNull().default(new Date()),
    deletedAt: datetime('deleted_at'),
  },
  (table) => [
    index('projects_org_idx').on(table.organizationId),
    index('projects_slug_idx').on(table.organizationId, table.slug),
  ],
);

export const projectMembers = mysqlTable(
  'project_members',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    projectId: varchar('project_id', { length: 36 })
      .notNull()
      .references(() => projects.id),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id),
    roleId: varchar('role_id', { length: 36 }),
    createdAt: datetime('created_at').notNull().default(new Date()),
  },
  (table) => [
    index('project_members_project_idx').on(table.projectId),
    index('project_members_user_idx').on(table.userId),
  ],
);

export const workflows = mysqlTable(
  'workflows',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    projectId: varchar('project_id', { length: 36 })
      .notNull()
      .references(() => projects.id),
    name: varchar('name', { length: 100 }).notNull(),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: datetime('created_at').notNull().default(new Date()),
    updatedAt: datetime('updated_at').notNull().default(new Date()),
  },
  (table) => [index('workflows_project_idx').on(table.projectId)],
);

export const workflowStatuses = mysqlTable(
  'workflow_statuses',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    workflowId: varchar('workflow_id', { length: 36 })
      .notNull()
      .references(() => workflows.id),
    name: varchar('name', { length: 100 }).notNull(),
    color: varchar('color', { length: 7 }),
    position: int('position').notNull().default(0),
    isInitial: boolean('is_initial').notNull().default(false),
    isFinal: boolean('is_final').notNull().default(false),
    isValidated: boolean('is_validated').notNull().default(false),
    createdAt: datetime('created_at').notNull().default(new Date()),
  },
  (table) => [index('wf_statuses_workflow_idx').on(table.workflowId)],
);

export const labels = mysqlTable(
  'labels',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    projectId: varchar('project_id', { length: 36 })
      .notNull()
      .references(() => projects.id),
    name: varchar('name', { length: 100 }).notNull(),
    color: varchar('color', { length: 7 }),
    createdAt: datetime('created_at').notNull().default(new Date()),
  },
  (table) => [index('labels_project_idx').on(table.projectId)],
);

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.organizationId],
    references: [organizations.id],
  }),
  createdByUser: one(users, {
    fields: [projects.createdBy],
    references: [users.id],
  }),
  members: many(projectMembers),
  workflows: many(workflows),
  labels: many(labels),
}));

export const workflowsRelations = relations(workflows, ({ one, many }) => ({
  project: one(projects, {
    fields: [workflows.projectId],
    references: [projects.id],
  }),
  statuses: many(workflowStatuses),
}));

export const workflowStatusesRelations = relations(workflowStatuses, ({ one }) => ({
  workflow: one(workflows, {
    fields: [workflowStatuses.workflowId],
    references: [workflows.id],
  }),
}));

export const labelsRelations = relations(labels, ({ one }) => ({
  project: one(projects, {
    fields: [labels.projectId],
    references: [projects.id],
  }),
}));
