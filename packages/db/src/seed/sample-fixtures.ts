/**
 * Sample fixtures — only loaded when SEED_INCLUDE_SAMPLE_DATA=1 (--with-sample-data).
 *
 * All IDs use the 5xx range starting at 1001 to avoid collisions with core fixtures.
 * These are additive: they extend core fixtures without modifying core fixture identities.
 */

import type * as schema from '../schema/index.js';

function getRuntimeSeedBaseTime(): Date {
  return new Date();
}

const BASE_TIME = getRuntimeSeedBaseTime();

function id(num: number): string {
  return `00000000-0000-0000-0000-${num.toString().padStart(12, '0')}`;
}

function at(minutesFromBase: number): Date {
  return new Date(BASE_TIME.getTime() + minutesFromBase * 60_000);
}

// ── Archived project ──────────────────────────────────────────

export const sampleProjects: (typeof schema.projects.$inferInsert)[] = [
  {
    id: id(1001),
    organizationId: id(101),
    name: 'Acme Legacy Migration',
    slug: 'acme-legacy-migration',
    description: 'Archived project for the legacy platform migration.',
    color: '#6B7280',
    icon: 'archive',
    status: 'archived',
    createdBy: id(2),
    createdAt: at(200),
    updatedAt: at(300),
  },
];

export const sampleWorkflows: (typeof schema.workflows.$inferInsert)[] = [
  {
    id: id(1061),
    projectId: id(1001),
    name: 'Default',
    isDefault: true,
    createdAt: at(200),
    updatedAt: at(200),
  },
];

export const sampleWorkflowStatuses: (typeof schema.workflowStatuses.$inferInsert)[] = [
  {
    id: id(1065),
    workflowId: id(1061),
    name: 'Backlog',
    color: '#9CA3AF',
    position: 0,
    isInitial: true,
    isFinal: false,
    isValidated: false,
    createdAt: at(200),
  },
  {
    id: id(1066),
    workflowId: id(1061),
    name: 'In Progress',
    color: '#3B82F6',
    position: 1,
    isInitial: false,
    isFinal: false,
    isValidated: false,
    createdAt: at(201),
  },
  {
    id: id(1067),
    workflowId: id(1061),
    name: 'Review',
    color: '#F59E0B',
    position: 2,
    isInitial: false,
    isFinal: false,
    isValidated: true,
    createdAt: at(202),
  },
  {
    id: id(1068),
    workflowId: id(1061),
    name: 'Done',
    color: '#10B981',
    position: 3,
    isInitial: false,
    isFinal: true,
    isValidated: false,
    createdAt: at(203),
  },
];

export const sampleProjectMembers: (typeof schema.projectMembers.$inferInsert)[] = [
  { id: id(1071), projectId: id(1001), userId: id(3), roleId: id(213), createdAt: at(200) },
  { id: id(1072), projectId: id(1001), userId: id(9), roleId: id(214), createdAt: at(201) },
];

export const sampleLabels: (typeof schema.labels.$inferInsert)[] = [
  { id: id(1081), projectId: id(1001), name: 'Legacy', color: '#6B7280', createdAt: at(200) },
  { id: id(1082), projectId: id(1001), name: 'Data', color: '#0284C7', createdAt: at(201) },
];

// ── Overdue task ──────────────────────────────────────────────

export const sampleTasks: (typeof schema.tasks.$inferInsert)[] = [
  // Overdue task — due date is 24h before BASE_TIME
  {
    id: id(1021),
    projectId: id(1001),
    title: 'Migrate legacy billing data',
    description: 'Extract and transform billing records from the legacy system.',
    statusId: id(1066), // In Progress
    priority: 'high',
    assigneeId: id(3),
    reporterId: id(2),
    position: 0,
    startDate: at(-3 * 1440), // started 3 days before now
    dueDate: at(-60), // due 1h before now (overdue)
    createdAt: at(-3 * 1440),
    updatedAt: at(-60),
  },
  // Completed task with activity trail
  {
    id: id(1022),
    projectId: id(502), // in core project Acme Platform Reliability
    title: 'Complete incident playbook review',
    description: 'Review and finalize the incident response playbook for Q1.',
    statusId: id(624), // Done (core workflow status)
    priority: 'medium',
    assigneeId: id(7),
    reporterId: id(1),
    position: 3,
    startDate: at(-7 * 1440),
    dueDate: at(-5 * 1440),
    createdAt: at(-7 * 1440),
    updatedAt: at(-4 * 1440),
  },
];

export const sampleTaskLabels: { taskId: string; labelId: string }[] = [
  { taskId: id(1021), labelId: id(1081) },
  { taskId: id(1021), labelId: id(1082) },
  { taskId: id(1022), labelId: id(804) }, // core: Reliability label
];

export const sampleTaskWatchers: { taskId: string; userId: string }[] = [
  { taskId: id(1021), userId: id(2) },
  { taskId: id(1022), userId: id(1) },
];

export const sampleChecklists: (typeof schema.checklists.$inferInsert)[] = [
  {
    id: id(1031),
    taskId: id(1022), // completed task
    title: 'Playbook review checklist',
    position: 0,
    createdAt: at(-6 * 1440),
  },
];

export const sampleChecklistItems: (typeof schema.checklistItems.$inferInsert)[] = [
  {
    id: id(1032),
    checklistId: id(1031),
    title: 'Draft playbook shared with team',
    isCompleted: true,
    position: 0,
    completedBy: id(7),
    completedAt: at(-6 * 1440 + 120),
    createdAt: at(-6 * 1440),
    updatedAt: at(-6 * 1440 + 120),
  },
  {
    id: id(1033),
    checklistId: id(1031),
    title: 'Feedback incorporated',
    isCompleted: true,
    position: 1,
    completedBy: id(7),
    completedAt: at(-6 * 1440 + 240),
    createdAt: at(-6 * 1440),
    updatedAt: at(-6 * 1440 + 240),
  },
  {
    id: id(1034),
    checklistId: id(1031),
    title: 'Final sign-off from VP Eng',
    isCompleted: true,
    position: 2,
    completedBy: id(1),
    completedAt: at(-5 * 1440 + 60),
    createdAt: at(-6 * 1440),
    updatedAt: at(-5 * 1440 + 60),
  },
];

export const sampleComments: (typeof schema.comments.$inferInsert)[] = [
  {
    id: id(1051),
    entityType: 'task' as const,
    entityId: id(1022),
    authorId: id(7),
    body: 'Playbook draft complete. Requesting review from @Alex Acme.',
    visibility: 'public',
    parentCommentId: null,
    createdAt: at(-5 * 1440 + 30),
    updatedAt: at(-5 * 1440 + 30),
  },
  {
    id: id(1052),
    entityType: 'task' as const,
    entityId: id(1022),
    authorId: id(1),
    body: 'Looks good. Approved and closed.',
    visibility: 'public',
    parentCommentId: id(1051),
    createdAt: at(-5 * 1440 + 90),
    updatedAt: at(-5 * 1440 + 90),
  },
];

export const sampleCommentMentions: (typeof schema.commentMentions.$inferInsert)[] = [
  { id: id(1053), commentId: id(1051), userId: id(1), createdAt: at(-5 * 1440 + 30) },
];

export const sampleActivityLog: (typeof schema.activityLog.$inferInsert)[] = [
  {
    id: id(1041),
    organizationId: id(101),
    actorId: id(7),
    actorDisplay: 'Anil QA',
    entityType: 'task',
    entityId: id(1022),
    action: 'status_changed',
    changes: {
      statusId: { before: id(623), after: id(624) },
    },
    createdAt: at(-4 * 1440 + 90),
  },
  {
    id: id(1042),
    organizationId: id(101),
    actorId: id(1),
    actorDisplay: 'Alex Acme',
    entityType: 'checklist_item',
    entityId: id(1034),
    action: 'completed',
    changes: {
      isCompleted: { before: false, after: true },
    },
    createdAt: at(-4 * 1440 + 60),
  },
];

export const sampleNotifications: (typeof schema.notifications.$inferInsert)[] = [
  // Additional unread notification in Globex org
  {
    id: id(1054),
    userId: id(6), // Finn Newcomer (Globex member)
    type: 'task_assigned',
    title: 'Assigned: Migrate legacy billing data',
    body: 'You were assigned to the overdue task Migrate legacy billing data.',
    entityType: 'task',
    entityId: id(1021),
    readAt: null,
    createdAt: at(-1440),
  },
];
