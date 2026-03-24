import { relations } from 'drizzle-orm';
import {
  boolean,
  datetime,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  varchar,
} from 'drizzle-orm/mysql-core';
import { labels } from './projects.js';
import { workflowStatuses } from './projects.js';
import { projects } from './projects.js';
import { users } from './users.js';

export const tasks = mysqlTable(
  'tasks',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    projectId: varchar('project_id', { length: 36 })
      .notNull()
      .references(() => projects.id),
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description'),
    statusId: varchar('status_id', { length: 36 })
      .notNull()
      .references(() => workflowStatuses.id),
    priority: mysqlEnum('priority', ['none', 'low', 'medium', 'high', 'critical'])
      .notNull()
      .default('none'),
    assigneeId: varchar('assignee_id', { length: 36 }).references(() => users.id),
    reporterId: varchar('reporter_id', { length: 36 })
      .notNull()
      .references(() => users.id),
    parentTaskId: varchar('parent_task_id', { length: 36 }),
    dueDate: datetime('due_date'),
    startDate: datetime('start_date'),
    estimatedHours: decimal('estimated_hours', { precision: 8, scale: 2 }),
    position: int('position').notNull().default(0),
    createdAt: datetime('created_at').notNull().default(new Date()),
    updatedAt: datetime('updated_at').notNull().default(new Date()),
    deletedAt: datetime('deleted_at'),
  },
  (table) => [
    index('tasks_project_status_idx').on(table.projectId, table.statusId),
    index('tasks_assignee_idx').on(table.assigneeId),
    index('tasks_due_date_idx').on(table.dueDate),
    index('tasks_parent_idx').on(table.parentTaskId),
  ],
);

export const taskDependencies = mysqlTable(
  'task_dependencies',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    taskId: varchar('task_id', { length: 36 })
      .notNull()
      .references(() => tasks.id),
    dependsOnTaskId: varchar('depends_on_task_id', { length: 36 })
      .notNull()
      .references(() => tasks.id),
    type: mysqlEnum('type', ['blocks', 'blocked_by']).notNull(),
    createdAt: datetime('created_at').notNull().default(new Date()),
  },
  (table) => [
    index('task_deps_task_idx').on(table.taskId),
    index('task_deps_depends_idx').on(table.dependsOnTaskId),
  ],
);

export const taskLabels = mysqlTable(
  'task_labels',
  {
    taskId: varchar('task_id', { length: 36 })
      .notNull()
      .references(() => tasks.id),
    labelId: varchar('label_id', { length: 36 })
      .notNull()
      .references(() => labels.id),
  },
  (table) => [
    index('task_labels_task_idx').on(table.taskId),
    index('task_labels_label_idx').on(table.labelId),
  ],
);

export const taskWatchers = mysqlTable(
  'task_watchers',
  {
    taskId: varchar('task_id', { length: 36 })
      .notNull()
      .references(() => tasks.id),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id),
  },
  (table) => [index('task_watchers_task_idx').on(table.taskId)],
);

export const checklists = mysqlTable(
  'checklists',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    taskId: varchar('task_id', { length: 36 })
      .notNull()
      .references(() => tasks.id),
    title: varchar('title', { length: 255 }).notNull(),
    position: int('position').notNull().default(0),
    createdAt: datetime('created_at').notNull().default(new Date()),
  },
  (table) => [index('checklists_task_idx').on(table.taskId)],
);

export const checklistItems = mysqlTable(
  'checklist_items',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    checklistId: varchar('checklist_id', { length: 36 })
      .notNull()
      .references(() => checklists.id),
    title: varchar('title', { length: 500 }).notNull(),
    isCompleted: boolean('is_completed').notNull().default(false),
    position: int('position').notNull().default(0),
    completedBy: varchar('completed_by', { length: 36 }).references(() => users.id),
    completedAt: datetime('completed_at'),
    createdAt: datetime('created_at').notNull().default(new Date()),
    updatedAt: datetime('updated_at').notNull().default(new Date()),
  },
  (table) => [index('checklist_items_checklist_idx').on(table.checklistId)],
);

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, { fields: [tasks.projectId], references: [projects.id] }),
  status: one(workflowStatuses, { fields: [tasks.statusId], references: [workflowStatuses.id] }),
  assignee: one(users, {
    fields: [tasks.assigneeId],
    references: [users.id],
    relationName: 'assignee',
  }),
  reporter: one(users, {
    fields: [tasks.reporterId],
    references: [users.id],
    relationName: 'reporter',
  }),
  parentTask: one(tasks, {
    fields: [tasks.parentTaskId],
    references: [tasks.id],
    relationName: 'subtasks',
  }),
  subtasks: many(tasks, { relationName: 'subtasks' }),
  dependencies: many(taskDependencies),
  labels: many(taskLabels),
  watchers: many(taskWatchers),
  checklists: many(checklists),
}));

export const checklistsRelations = relations(checklists, ({ one, many }) => ({
  task: one(tasks, { fields: [checklists.taskId], references: [tasks.id] }),
  items: many(checklistItems),
}));

export const checklistItemsRelations = relations(checklistItems, ({ one }) => ({
  checklist: one(checklists, { fields: [checklistItems.checklistId], references: [checklists.id] }),
}));
