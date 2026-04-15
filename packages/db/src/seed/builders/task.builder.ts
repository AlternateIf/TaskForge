/**
 * Task builder — deterministic tasks with varied types, priorities, statuses,
 * watchers, dependencies, labels, checklists.
 */

import type * as schema from '../../schema/index.js';
import { TARGET_COUNTS, TASK_TYPE_DISTRIBUTION, type TaskTypeName } from '../dataset-config.js';
import {
  ORG_IDS,
  PROJECT_IDS,
  PROJECT_ORG_MAP,
  SUPER_USER_ID,
  USER_IDS,
  WORKFLOW_STATUS_IDS,
  id,
} from '../id-registry.js';

function getRuntimeSeedBaseTime(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 9, 0, 0, 0));
}

const BASE_TIME = getRuntimeSeedBaseTime();

function at(minutesFromBase: number): Date {
  return new Date(BASE_TIME.getTime() + minutesFromBase * 60_000);
}

// Deterministic pseudo-random with seed
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) & 0xffffffff;
    return (state >>> 0) / 0xffffffff;
  };
}

// ---------------------------------------------------------------------------
// Task title templates by type
// ---------------------------------------------------------------------------

const BUG_TITLES = [
  'Crash on invalid input in {area} endpoint',
  'Memory leak in {area} worker process',
  'Null reference in {area} handler',
  'Race condition in {area} queue consumer',
  '500 error on {area} POST request',
  'Incorrect pagination count in {area} list',
  'Permission denied for valid {area} access',
  'Timeout in {area} batch processing',
  'Data corruption in {area} sync',
  'UI freeze on {area} form submission',
  'WebSocket disconnection in {area} stream',
  'Deadlock in {area} concurrent writes',
  'Cache invalidation failure in {area}',
  'Migration rollback breaks {area} schema',
  'Rate limiter misfires on {area}',
  'Stale session in {area} auth',
  'Encoding issue in {area} export',
  'Duplicate events in {area} webhook',
  'CORS failure on {area} preflight',
  'Index out of range in {area} parser',
  'Auth token expiry not handled in {area}',
  'File upload fails silently in {area}',
  'Email template renders incorrectly in {area}',
  'Broken pagination on {area} search',
  'Incorrect aggregation in {area} reports',
];

const FEATURE_TITLES = [
  'Implement {area} CRUD API',
  'Add search to {area} module',
  'Create {area} dashboard',
  'Build {area} notification pipeline',
  'Add {area} bulk import',
  'Implement {area} audit trail',
  'Add role-based access for {area}',
  'Create {area} webhook integration',
  'Build {area} reporting engine',
  'Implement {area} real-time sync',
  'Add {area} export to CSV',
  'Build {area} scheduling service',
  'Implement {area} rate limiting',
  'Add {area} health check endpoint',
  'Create {area} self-service portal',
  'Implement {area} event sourcing',
  'Add {area} multi-tenant support',
  'Build {area} analytics pipeline',
  'Create {area} batch processor',
  'Implement {area} soft delete',
  'Add {area} keyboard shortcuts',
  'Build {area} onboarding flow',
  'Implement {area} drag-and-drop',
  'Add {area} dark mode support',
  'Create {area} mobile-responsive layout',
  'Implement {area} offline mode',
  'Add {area} email notifications',
  'Build {area} collaboration features',
  'Implement {area} auto-save',
  'Add {area} version history',
];

const CHORE_TITLES = [
  'Upgrade dependencies for {area}',
  'Refactor {area} error handling',
  'Add integration tests for {area}',
  'Improve logging in {area} module',
  'Document {area} API endpoints',
  'Optimize {area} query performance',
  'Remove deprecated {area} endpoints',
  'Add E2E tests for {area}',
  'Refactor {area} state management',
  'Cleanup {area} configuration',
  'Migrate {area} to new ORM',
  'Standardize {area} error codes',
  'Add type safety to {area} module',
  'Improve {area} test coverage',
  'Consolidate {area} duplicate code',
  'Update {area} to latest framework',
  'Add monitoring to {area} service',
  'Refactor {area} DB queries',
  'Add {area} schema validation',
  'Improve {area} build time',
];

const INCIDENT_TITLES = [
  'Production outage in {area} service',
  'Data loss detected in {area} pipeline',
  'Security breach via {area} endpoint',
  'Performance degradation in {area}',
  'Deployment failure in {area} cluster',
  'Alerting failure in {area} monitor',
  'Database corruption in {area} shard',
  'Authentication bypass in {area}',
  'Memory exhaustion in {area} workers',
  'Disk space pressure on {area} volume',
  'DNS resolution failure for {area}',
  'Certificate expiry on {area} gateway',
];

const TECH_DEBT_TITLES = [
  'Replace {area} legacy adapter',
  'Consolidate {area} dual-write paths',
  'Migrate {area} off deprecated API',
  'Extract {area} from monolith',
  'Simplify {area} permission model',
  'Decouple {area} from shared state',
  'Unify {area} config sources',
  'Replace {area} custom serializer',
  'Remove {area} feature flag dead code',
  'Modernize {area} error propagation',
  'Restructure {area} module boundaries',
  'Pay down {area} test debt',
];

const AREA_NAMES = [
  'auth',
  'billing',
  'notification',
  'user',
  'project',
  'task',
  'search',
  'API',
  'dashboard',
  'settings',
  'workflow',
  'comment',
  'report',
  'integration',
  'permissions',
  'membership',
  'invitation',
  'profile',
  'audit',
  'scheduler',
];

// ---------------------------------------------------------------------------
// Task ID allocation (stable, deterministic)
// ---------------------------------------------------------------------------

let _taskIds: string[] | null = null;

export function getTaskIds(): string[] {
  if (_taskIds) return _taskIds;
  _taskIds = [];
  // First 99 tasks: IDs in 901-999 range
  for (let i = 0; i < 99; i++) {
    _taskIds.push(id(901 + i));
  }
  // Remaining tasks: IDs in 10001+ range
  for (let i = 99; i < TARGET_COUNTS.tasks; i++) {
    _taskIds.push(id(10001 + (i - 99)));
  }
  return _taskIds;
}

// ---------------------------------------------------------------------------
// Build tasks
// ---------------------------------------------------------------------------

function getTaskTitles(type: TaskTypeName): string[] {
  switch (type) {
    case 'bug':
      return BUG_TITLES;
    case 'feature':
      return FEATURE_TITLES;
    case 'chore':
      return CHORE_TITLES;
    case 'incident':
      return INCIDENT_TITLES;
    case 'technical_debt':
      return TECH_DEBT_TITLES;
  }
}

export function buildTasks(): (typeof schema.tasks.$inferInsert)[] {
  const tasks: (typeof schema.tasks.$inferInsert)[] = [];
  const rng = seededRandom(42);
  const taskIdList = getTaskIds();

  const priorities: Array<'none' | 'low' | 'medium' | 'high' | 'critical'> = [
    'none',
    'low',
    'medium',
    'high',
    'critical',
  ];
  const projectList = Object.values(PROJECT_IDS);

  const typeList: TaskTypeName[] = [];
  for (const [type, count] of Object.entries(TASK_TYPE_DISTRIBUTION)) {
    for (let i = 0; i < count; i++) {
      typeList.push(type as TaskTypeName);
    }
  }

  const assigneePoolsByOrg: Record<string, string[]> = {
    [ORG_IDS.taskforgeAgency]: [
      SUPER_USER_ID,
      USER_IDS.taskforgeAgencyOwner,
      USER_IDS.tfBackendDev1,
      USER_IDS.tfFrontendDev1,
      USER_IDS.tfQaEngineer1,
      USER_IDS.tfDevopsSre1,
      USER_IDS.tfProductManager1,
      USER_IDS.sharedQa,
      USER_IDS.sharedSupport,
      USER_IDS.sharedDevops,
    ],
    [ORG_IDS.acmeCorp]: [
      SUPER_USER_ID,
      USER_IDS.acmeCorpOwner,
      USER_IDS.acmeBackendDev1,
      USER_IDS.acmeFrontendDev1,
      USER_IDS.acmeQaEngineer1,
      USER_IDS.acmeDevopsSre1,
      USER_IDS.acmeProductManager1,
      USER_IDS.acmeCustomerReporter1,
      USER_IDS.sharedQa,
      USER_IDS.sharedSupport,
    ],
    [ORG_IDS.globexInc]: [
      SUPER_USER_ID,
      USER_IDS.globexIncOwner,
      USER_IDS.globexBackendDev1,
      USER_IDS.globexFrontendDev1,
      USER_IDS.globexDesigner1,
      USER_IDS.globexSeoSpecialist1,
      USER_IDS.globexProductManager1,
      USER_IDS.globexCustomerReporter1,
    ],
    [ORG_IDS.soylentCorp]: [
      SUPER_USER_ID,
      USER_IDS.soylentCorpOwner,
      USER_IDS.soylentBackendDev1,
      USER_IDS.soylentSupportEngineer1,
      USER_IDS.soylentCustomerReporter1,
      USER_IDS.soylentCustomerStakeholder1,
    ],
    [ORG_IDS.umbrellaCorp]: [
      SUPER_USER_ID,
      USER_IDS.umbrellaCorpOwner,
      USER_IDS.umbrellaBackendDev1,
      USER_IDS.umbrellaQaEngineer1,
      USER_IDS.umbrellaDevopsSre1,
      USER_IDS.umbrellaCustomerReporter1,
      USER_IDS.umbrellaCustomerStakeholder1,
      USER_IDS.sharedQa,
      USER_IDS.sharedDevops,
    ],
  };

  const statusChoices = ['todo', 'inProgress', 'review', 'done'] as const;

  for (let i = 0; i < TARGET_COUNTS.tasks; i++) {
    const type = typeList[i];
    const titles = getTaskTitles(type);
    const titleTemplate = titles[i % titles.length];
    const area = AREA_NAMES[i % AREA_NAMES.length];
    const title = titleTemplate.replace('{area}', area);

    const projectId = projectList[i % projectList.length];
    const projectOrgId = PROJECT_ORG_MAP[projectId];
    const taskAssignees = assigneePoolsByOrg[projectOrgId] ?? [SUPER_USER_ID];
    const statusKey = statusChoices[Math.floor(rng() * 4)];
    const statusId = WORKFLOW_STATUS_IDS[projectId][statusKey];
    const priority = priorities[Math.floor(rng() * 5)];
    const assignee = taskAssignees[Math.floor(rng() * taskAssignees.length)];
    const reporterIdx = Math.floor(rng() * taskAssignees.length);
    const reporter = taskAssignees[reporterIdx];
    const createdAtOffsetMinutes =
      (-45 + Math.floor(rng() * 20)) * 24 * 60 + Math.floor(rng() * 12 * 60);
    const updatedAtOffsetMinutes = createdAtOffsetMinutes + Math.floor(rng() * 7 * 24 * 60);
    const startOffsetDays = Math.floor(rng() * 21) - 7; // -7..+13 days from today
    const dueOffsetDays = Math.max(startOffsetDays + 1, 1 + Math.floor(rng() * 45)); // +1..+45

    tasks.push({
      id: taskIdList[i],
      projectId,
      title,
      description: `${type.replace('_', ' ')}: ${title}`,
      statusId,
      priority,
      assigneeId: assignee,
      reporterId: reporter,
      position: i % 20,
      startDate: at(startOffsetDays * 24 * 60 + 9 * 60 + (i % 8) * 15),
      dueDate: at(dueOffsetDays * 24 * 60 + 17 * 60 + Math.floor(rng() * 120)),
      createdAt: at(createdAtOffsetMinutes),
      updatedAt: at(updatedAtOffsetMinutes),
    });
  }

  return tasks;
}

// ---------------------------------------------------------------------------
// Task labels
// ---------------------------------------------------------------------------

export function buildTaskLabels(
  taskIds: string[],
  labelIds: string[],
  labelIdToProjectId: Map<string, string>,
  taskIdToProjectId: Map<string, string>,
): { taskId: string; labelId: string }[] {
  const result: { taskId: string; labelId: string }[] = [];
  const rng = seededRandom(123);

  // Pre-build per-project label ID lists for efficient lookup
  const labelsByProject = new Map<string, string[]>();
  for (const labelId of labelIds) {
    const projectId = labelIdToProjectId.get(labelId);
    if (projectId) {
      const list = labelsByProject.get(projectId) ?? [];
      list.push(labelId);
      labelsByProject.set(projectId, list);
    }
  }

  // Each task gets 1-2 labels deterministically, only from its own project.
  // If the task's project has no labels (or the project mapping is missing),
  // no task_labels row is created — no labels is better than cross-project labels.
  for (const taskId of taskIds) {
    const projectId = taskIdToProjectId.get(taskId);
    if (!projectId) continue;
    const projectLabelIds = labelsByProject.get(projectId);
    if (!projectLabelIds || projectLabelIds.length === 0) continue;
    const labelCount = Math.min(Math.floor(rng() * 2) + 1, projectLabelIds.length);
    for (let j = 0; j < labelCount; j++) {
      const labelId = projectLabelIds[Math.floor(rng() * projectLabelIds.length)];
      result.push({ taskId, labelId });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Task watchers
// ---------------------------------------------------------------------------

export function buildTaskWatchers(
  taskIds: string[],
  userIds: string[],
): { taskId: string; userId: string }[] {
  const result: { taskId: string; userId: string }[] = [];
  const rng = seededRandom(456);
  const seen = new Set<string>();

  let totalWatchers = 0;
  const targetWatchers = TARGET_COUNTS.taskWatchers;

  while (totalWatchers < targetWatchers) {
    const taskId = taskIds[Math.floor(rng() * taskIds.length)];
    const userId = userIds[Math.floor(rng() * userIds.length)];
    const key = `${taskId}:${userId}`;

    if (!seen.has(key)) {
      seen.add(key);
      result.push({ taskId, userId });
      totalWatchers++;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Task dependencies
// ---------------------------------------------------------------------------

export function buildTaskDependencies(
  taskIds: string[],
): (typeof schema.taskDependencies.$inferInsert)[] {
  const result: (typeof schema.taskDependencies.$inferInsert)[] = [];
  const rng = seededRandom(789);
  const seen = new Set<string>();
  let depIdCounter = 13001;

  let totalDeps = 0;
  const targetDeps = TARGET_COUNTS.taskDependencies;

  while (totalDeps < targetDeps) {
    const idx1 = Math.floor(rng() * taskIds.length);
    const idx2 = Math.floor(rng() * taskIds.length);
    if (idx1 === idx2) continue;

    const taskId = taskIds[idx1];
    const dependsOnTaskId = taskIds[idx2];
    const key = `${taskId}:${dependsOnTaskId}`;

    if (!seen.has(key)) {
      seen.add(key);
      const type = rng() > 0.5 ? ('blocks' as const) : ('blocked_by' as const);
      result.push({
        id: id(depIdCounter++),
        taskId,
        dependsOnTaskId,
        type,
        createdAt: at(130 + totalDeps),
      });
      totalDeps++;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Checklists and items
// ---------------------------------------------------------------------------

export function buildChecklists(taskIds: string[]): (typeof schema.checklists.$inferInsert)[] {
  const result: (typeof schema.checklists.$inferInsert)[] = [];
  let checklistIdCounter = 14001;

  // ~20% of tasks have a checklist
  for (let i = 0; i < taskIds.length; i += 5) {
    result.push({
      id: id(checklistIdCounter++),
      taskId: taskIds[i],
      title: 'Checklist',
      position: 0,
      createdAt: at(140 + i),
    });
  }

  return result;
}

export function buildChecklistItems(
  checklistIds: string[],
  userIds: string[],
): (typeof schema.checklistItems.$inferInsert)[] {
  const result: (typeof schema.checklistItems.$inferInsert)[] = [];
  let itemIdCounter = 14101;
  const rng = seededRandom(654);

  for (const checklistId of checklistIds) {
    const itemCount = Math.floor(rng() * 3) + 2; // 2-4 items per checklist
    for (let j = 0; j < itemCount; j++) {
      const isCompleted = rng() > 0.4;
      result.push({
        id: id(itemIdCounter++),
        checklistId,
        title: `Step ${j + 1}`,
        isCompleted,
        position: j,
        completedBy: isCompleted ? userIds[Math.floor(rng() * userIds.length)] : null,
        completedAt: isCompleted ? at(150 + j) : null,
        createdAt: at(150 + j),
        updatedAt: at(150 + j),
      });
    }
  }

  return result;
}
