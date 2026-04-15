import crypto from 'node:crypto';
import {
  checklistItems,
  checklists,
  db,
  labels,
  organizationMembers,
  projects,
  taskLabels,
  taskWatchers,
  tasks,
  users,
  workflowStatuses,
  workflows,
} from '@taskforge/db';
import type { CreateSubtaskInput, CreateTaskInput, UpdateTaskInput } from '@taskforge/shared';
import type { SQL } from 'drizzle-orm';
import { and, asc, count, desc, eq, gt, gte, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import { AppError, ErrorCode } from '../utils/errors.js';
import type { TransitionBlockDetails } from '../utils/errors.js';
import { decodeCursor, encodeCursor, normalizeLimit } from '../utils/pagination.js';
import * as activityService from './activity.service.js';
import { computeBlockedStatus, createDependency } from './dependency.service.js';
import { hasOrgPermission } from './permission.service.js';
import * as searchService from './search.service.js';

const POSITION_GAP = 1000;
const NULL_DUE_DATE_SORT_SENTINEL = new Date('9999-12-31T23:59:59.000Z');

async function syncTaskSearch(taskId: string): Promise<void> {
  try {
    await searchService.indexTask(taskId);
  } catch {
    // Search indexing is best-effort and should not block task writes.
  }
}

async function removeTaskSearch(taskId: string): Promise<void> {
  try {
    await searchService.removeTask(taskId);
  } catch {
    // Search indexing is best-effort and should not block task writes.
  }
}

export interface TaskProgress {
  subtaskCount: number;
  subtaskCompletedCount: number;
  checklistTotal: number;
  checklistCompleted: number;
}

export interface TaskOutput {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  statusId: string;
  statusName: string | null;
  priority: string;
  assigneeId: string | null;
  assignee: { id: string; displayName: string; avatarUrl: string | null } | null;
  reporterId: string;
  parentTaskId: string | null;
  dueDate: string | null;
  startDate: string | null;
  estimatedHours: string | null;
  position: number;
  progress: TaskProgress | null;
  isBlocked: boolean;
  blockedByCount: number;
  labels: Array<{ id: string; name: string; color: string | null }>;
  createdAt: string;
  updatedAt: string;
}

interface TaskFilters {
  status?: string[];
  priority?: string[];
  assigneeId?: string | string[];
  labelId?: string[];
  dueDateFrom?: string;
  dueDateTo?: string;
  search?: string;
  sort?: string;
  order?: string;
}

interface BoardTaskFilters {
  status?: string[];
  priority?: string[];
  assigneeId?: string[];
  labelId?: string[];
  dueDateFrom?: string;
  dueDateTo?: string;
  search?: string;
}

export interface BoardColumnPageMeta {
  cursor: string | null;
  hasMore: boolean;
  totalCount: number;
  nextUnloadedTaskId: string | null;
}

export interface BoardColumnPage {
  statusId: string;
  items: TaskOutput[];
  meta: BoardColumnPageMeta;
}

interface BoardColumnCursor {
  id: string;
  position: number;
}

export interface TaskListPageResult {
  items: TaskOutput[];
  cursor: string | null;
  hasMore: boolean;
  totalCount: number;
}

interface TaskListCursorPayload {
  id: string;
  sortField: string;
  sortOrder: 'asc' | 'desc';
  sortValue: string;
}

async function getInitialStatusId(projectId: string): Promise<string> {
  const result = await db
    .select({ id: workflowStatuses.id })
    .from(workflowStatuses)
    .innerJoin(workflows, eq(workflows.id, workflowStatuses.workflowId))
    .where(and(eq(workflows.projectId, projectId), eq(workflowStatuses.isInitial, true)))
    .limit(1);

  if (result.length === 0) {
    throw new AppError(
      422,
      ErrorCode.UNPROCESSABLE_ENTITY,
      'Project has no initial workflow status',
    );
  }
  return result[0].id;
}

async function validateStatusBelongsToProject(statusId: string, projectId: string): Promise<void> {
  const result = await db
    .select({ id: workflowStatuses.id })
    .from(workflowStatuses)
    .innerJoin(workflows, eq(workflows.id, workflowStatuses.workflowId))
    .where(and(eq(workflowStatuses.id, statusId), eq(workflows.projectId, projectId)))
    .limit(1);

  if (result.length === 0) {
    throw new AppError(
      422,
      ErrorCode.UNPROCESSABLE_ENTITY,
      'Status does not belong to this project',
    );
  }
}

async function validateAssigneeInOrg(assigneeId: string, projectId: string): Promise<void> {
  const project = await db
    .select({ organizationId: projects.organizationId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (project.length === 0) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Project not found');
  }

  const member = await db
    .select({ id: organizationMembers.id })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, project[0].organizationId),
        eq(organizationMembers.userId, assigneeId),
      ),
    )
    .limit(1);

  if (member.length === 0) {
    throw new AppError(
      422,
      ErrorCode.UNPROCESSABLE_ENTITY,
      'Assignee is not a member of the organization',
    );
  }
}

/**
 * Validate that a status transition is allowed.
 * When the target status has isFinal === true OR isValidated === true,
 * the task must have zero unresolved blockers and zero incomplete checklist items.
 */
export async function validateStatusTransition(
  taskId: string,
  targetStatusId: string,
  projectId: string,
): Promise<void> {
  // Check if target status is final or validated
  const targetStatus = await db
    .select({
      isFinal: workflowStatuses.isFinal,
      isValidated: workflowStatuses.isValidated,
    })
    .from(workflowStatuses)
    .innerJoin(workflows, eq(workflows.id, workflowStatuses.workflowId))
    .where(and(eq(workflowStatuses.id, targetStatusId), eq(workflows.projectId, projectId)))
    .limit(1);

  if (targetStatus.length === 0) {
    throw new AppError(
      422,
      ErrorCode.UNPROCESSABLE_ENTITY,
      'Status does not belong to this project',
    );
  }

  const { isFinal, isValidated } = targetStatus[0];

  // If neither flag is true, no transition guard needed
  if (!isFinal && !isValidated) {
    return;
  }

  // Check unresolved blockers
  const blockedStatus = await computeBlockedStatus(taskId);
  const unresolvedBlockersCount = blockedStatus.isBlocked ? blockedStatus.blockedByCount : 0;

  // Check incomplete checklist items
  const progress = await loadTaskProgress(taskId);
  const incompleteChecklistCount = progress.checklistTotal - progress.checklistCompleted;

  if (unresolvedBlockersCount > 0 || incompleteChecklistCount > 0) {
    const details: TransitionBlockDetails = {
      unresolvedBlockersCount,
      incompleteChecklistCount,
    };

    const reasons: string[] = [];
    if (unresolvedBlockersCount > 0) {
      reasons.push(
        `${unresolvedBlockersCount} unresolved blocker${unresolvedBlockersCount > 1 ? 's' : ''}`,
      );
    }
    if (incompleteChecklistCount > 0) {
      reasons.push(
        `${incompleteChecklistCount} incomplete checklist item${incompleteChecklistCount > 1 ? 's' : ''}`,
      );
    }

    const statusLabel = isValidated ? 'validated' : 'final';
    const message = `Cannot move to ${statusLabel} status: ${reasons.join(' and ')}`;

    throw new AppError(422, ErrorCode.TRANSITION_BLOCKED, message, undefined, details);
  }
}

async function getNextPosition(projectId: string, statusId: string): Promise<number> {
  const result = await db
    .select({ maxPos: sql<number>`COALESCE(MAX(${tasks.position}), 0)` })
    .from(tasks)
    .where(
      and(eq(tasks.projectId, projectId), eq(tasks.statusId, statusId), isNull(tasks.deletedAt)),
    );

  return (result[0].maxPos ?? 0) + POSITION_GAP;
}

function toTaskOutput(
  t: typeof tasks.$inferSelect,
  statusName?: string | null,
  progress?: TaskProgress | null,
  blockedStatus?: { isBlocked: boolean; blockedByCount: number } | null,
  assignee?: { id: string; displayName: string; avatarUrl: string | null } | null,
  taskLabelList?: Array<{ id: string; name: string; color: string | null }>,
): TaskOutput {
  return {
    id: t.id,
    projectId: t.projectId,
    title: t.title,
    description: t.description ?? null,
    statusId: t.statusId,
    statusName: statusName ?? null,
    priority: t.priority,
    assigneeId: t.assigneeId ?? null,
    assignee: assignee ?? null,
    reporterId: t.reporterId,
    parentTaskId: t.parentTaskId ?? null,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    startDate: t.startDate ? t.startDate.toISOString() : null,
    estimatedHours: t.estimatedHours ?? null,
    position: t.position,
    progress: progress ?? null,
    isBlocked: blockedStatus?.isBlocked ?? false,
    blockedByCount: blockedStatus?.blockedByCount ?? 0,
    labels: taskLabelList ?? [],
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

async function loadTaskProgress(taskId: string): Promise<TaskProgress> {
  // Subtask progress
  const subtaskRows = await db
    .select({
      id: tasks.id,
      statusId: tasks.statusId,
    })
    .from(tasks)
    .where(and(eq(tasks.parentTaskId, taskId), isNull(tasks.deletedAt)));

  let subtaskCompletedCount = 0;
  if (subtaskRows.length > 0) {
    const statusIds = [...new Set(subtaskRows.map((s) => s.statusId))];
    const finalStatuses = await db
      .select({ id: workflowStatuses.id })
      .from(workflowStatuses)
      .where(and(inArray(workflowStatuses.id, statusIds), eq(workflowStatuses.isFinal, true)));
    const finalSet = new Set(finalStatuses.map((s) => s.id));
    subtaskCompletedCount = subtaskRows.filter((s) => finalSet.has(s.statusId)).length;
  }

  // Checklist progress
  const checklistRows = await db
    .select({ id: checklists.id })
    .from(checklists)
    .where(eq(checklists.taskId, taskId));

  let checklistTotal = 0;
  let checklistCompleted = 0;
  if (checklistRows.length > 0) {
    const checklistIds = checklistRows.map((c) => c.id);
    const itemRows = await db
      .select({ isCompleted: checklistItems.isCompleted })
      .from(checklistItems)
      .where(inArray(checklistItems.checklistId, checklistIds));
    checklistTotal = itemRows.length;
    checklistCompleted = itemRows.filter((i) => i.isCompleted).length;
  }

  return {
    subtaskCount: subtaskRows.length,
    subtaskCompletedCount,
    checklistTotal,
    checklistCompleted,
  };
}

async function getOrgIdForProject(projectId: string): Promise<string> {
  const result = await db
    .select({ organizationId: projects.organizationId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  return result[0]?.organizationId ?? '';
}

// --- CRUD ---

export async function createTask(
  projectId: string,
  userId: string,
  input: CreateTaskInput,
): Promise<TaskOutput> {
  // Defense-in-depth: verify task.create.project permission
  const orgId = await getOrgIdForProject(projectId);
  if (orgId) {
    const canCreate = await hasOrgPermission(userId, orgId, 'task', 'create');
    if (!canCreate) {
      throw new AppError(
        403,
        ErrorCode.FORBIDDEN,
        'Insufficient permissions to create tasks in this project',
      );
    }
  }

  const statusId = input.statusId ?? (await getInitialStatusId(projectId));

  await validateStatusBelongsToProject(statusId, projectId);

  if (input.assigneeId) {
    await validateAssigneeInOrg(input.assigneeId, projectId);
  }

  const taskId = crypto.randomUUID();
  const position = await getNextPosition(projectId, statusId);
  const now = new Date();

  await db.insert(tasks).values({
    id: taskId,
    projectId,
    title: input.title,
    description: input.description ?? null,
    statusId,
    priority: input.priority ?? 'none',
    assigneeId: input.assigneeId ?? null,
    reporterId: userId,
    parentTaskId: input.parentTaskId ?? null,
    dueDate: input.dueDate ? new Date(input.dueDate) : null,
    startDate: input.startDate ? new Date(input.startDate) : null,
    estimatedHours: input.estimatedHours?.toString() ?? null,
    position,
    createdAt: now,
    updatedAt: now,
  });

  // Attach labels if provided
  if (input.labelIds && input.labelIds.length > 0) {
    const validLabels = await db
      .select({ id: labels.id })
      .from(labels)
      .where(and(eq(labels.projectId, projectId), inArray(labels.id, input.labelIds)));

    if (validLabels.length > 0) {
      await db.insert(taskLabels).values(validLabels.map((l) => ({ taskId, labelId: l.id })));
    }
  }

  // Auto-add reporter as watcher
  await db.insert(taskWatchers).values({ taskId, userId });

  // Auto-add assignee as watcher if different from reporter
  if (input.assigneeId && input.assigneeId !== userId) {
    await db.insert(taskWatchers).values({ taskId, userId: input.assigneeId });
  }

  // Fetch the status name for the response
  const statusRow = await db
    .select({ name: workflowStatuses.name })
    .from(workflowStatuses)
    .where(eq(workflowStatuses.id, statusId))
    .limit(1);

  const created = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);

  if (orgId) {
    await activityService.log({
      organizationId: orgId,
      actorId: userId,
      entityType: 'task',
      entityId: taskId,
      action: 'created',
    });
  }

  await syncTaskSearch(taskId);

  return toTaskOutput(created[0], statusRow[0]?.name);
}

type TaskRow = {
  task: typeof tasks.$inferSelect;
  statusName: string | null;
  assigneeDisplayName: string | null;
  assigneeAvatarUrl: string | null;
};

interface TaskFilterArtifacts {
  matchedTaskIds?: string[];
  labelTaskIds?: string[];
}

function normalizeBoardFilters(filters: TaskFilters | BoardTaskFilters): BoardTaskFilters {
  const assigneeInput = filters.assigneeId;
  const assigneeIds = Array.isArray(assigneeInput)
    ? assigneeInput
    : assigneeInput
      ? [assigneeInput]
      : undefined;

  return {
    status: filters.status,
    priority: filters.priority,
    assigneeId: assigneeIds,
    labelId: filters.labelId,
    dueDateFrom: filters.dueDateFrom,
    dueDateTo: filters.dueDateTo,
    search: filters.search,
  };
}

async function ensureCanReadProjectTasks(projectId: string, userId?: string): Promise<void> {
  if (!userId) return;

  const orgId = await getOrgIdForProject(projectId);
  if (!orgId) return;

  const canRead = await hasOrgPermission(userId, orgId, 'task', 'read');
  if (!canRead) {
    throw new AppError(
      403,
      ErrorCode.FORBIDDEN,
      'Insufficient permissions to read tasks in this project',
    );
  }
}

async function buildTaskFilterArtifacts(
  projectId: string,
  filters: BoardTaskFilters,
): Promise<TaskFilterArtifacts | null> {
  const artifacts: TaskFilterArtifacts = {};

  if (filters.search?.trim()) {
    const matchedTaskIds = await searchService.searchProjectTaskIds({
      query: filters.search.trim(),
      projectId,
    });
    if (matchedTaskIds.length === 0) {
      return null;
    }
    artifacts.matchedTaskIds = matchedTaskIds;
  }

  if (filters.labelId && filters.labelId.length > 0) {
    const labelResults = await db
      .select({ taskId: taskLabels.taskId })
      .from(taskLabels)
      .where(inArray(taskLabels.labelId, filters.labelId));
    const labelTaskIds = labelResults.map((row) => row.taskId);
    if (labelTaskIds.length === 0) {
      return null;
    }
    artifacts.labelTaskIds = labelTaskIds;
  }

  return artifacts;
}

function buildTaskConditions({
  projectId,
  statusId,
  filters,
  artifacts,
}: {
  projectId: string;
  statusId?: string;
  filters: BoardTaskFilters;
  artifacts: TaskFilterArtifacts;
}): SQL<unknown>[] | null {
  if (
    statusId &&
    filters.status &&
    filters.status.length > 0 &&
    !filters.status.includes(statusId)
  ) {
    return null;
  }

  const conditions: SQL<unknown>[] = [eq(tasks.projectId, projectId), isNull(tasks.deletedAt)];

  if (statusId) {
    conditions.push(eq(tasks.statusId, statusId));
  } else if (filters.status && filters.status.length > 0) {
    conditions.push(inArray(tasks.statusId, filters.status));
  }

  if (filters.priority && filters.priority.length > 0) {
    conditions.push(
      inArray(
        tasks.priority,
        filters.priority as ('none' | 'low' | 'medium' | 'high' | 'critical')[],
      ),
    );
  }

  if (filters.assigneeId && filters.assigneeId.length > 0) {
    conditions.push(inArray(tasks.assigneeId, filters.assigneeId));
  }

  if (filters.dueDateFrom) {
    conditions.push(gte(tasks.dueDate, new Date(filters.dueDateFrom)));
  }

  if (filters.dueDateTo) {
    conditions.push(lte(tasks.dueDate, new Date(filters.dueDateTo)));
  }

  if (artifacts.matchedTaskIds) {
    if (artifacts.matchedTaskIds.length === 0) return null;
    conditions.push(inArray(tasks.id, artifacts.matchedTaskIds));
  }

  if (artifacts.labelTaskIds) {
    if (artifacts.labelTaskIds.length === 0) return null;
    conditions.push(inArray(tasks.id, artifacts.labelTaskIds));
  }

  return conditions;
}

async function attachTaskLabels(taskRows: TaskRow[]): Promise<TaskOutput[]> {
  const taskIds = taskRows.map((row) => row.task.id);
  const labelsMap = new Map<string, Array<{ id: string; name: string; color: string | null }>>();

  if (taskIds.length > 0) {
    const labelRows = await db
      .select({
        taskId: taskLabels.taskId,
        id: labels.id,
        name: labels.name,
        color: labels.color,
      })
      .from(taskLabels)
      .innerJoin(labels, eq(labels.id, taskLabels.labelId))
      .where(inArray(taskLabels.taskId, taskIds));

    for (const row of labelRows) {
      const bucket = labelsMap.get(row.taskId);
      if (bucket) {
        bucket.push({ id: row.id, name: row.name, color: row.color ?? null });
      } else {
        labelsMap.set(row.taskId, [{ id: row.id, name: row.name, color: row.color ?? null }]);
      }
    }
  }

  return taskRows.map((row) =>
    toTaskOutput(
      row.task,
      row.statusName,
      null,
      null,
      row.task.assigneeId
        ? {
            id: row.task.assigneeId,
            displayName: row.assigneeDisplayName ?? '',
            avatarUrl: row.assigneeAvatarUrl ?? null,
          }
        : null,
      labelsMap.get(row.task.id) ?? [],
    ),
  );
}

function parseBoardColumnCursor(cursor?: string): BoardColumnCursor | null {
  if (!cursor) return null;

  const decoded = decodeCursor(cursor);
  const parsedPosition = decoded?.position;
  if (
    !decoded ||
    (typeof parsedPosition !== 'number' && typeof parsedPosition !== 'string') ||
    !Number.isFinite(Number(parsedPosition))
  ) {
    throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Invalid board column cursor');
  }

  return {
    id: decoded.id,
    position: Number(parsedPosition),
  };
}

function normalizeBoardLimit(limit?: number): number {
  if (!limit || !Number.isFinite(limit) || limit < 1) return 15;
  return Math.min(Math.floor(limit), 50);
}

async function listProjectStatusIds(projectId: string): Promise<string[]> {
  const rows = await db
    .select({ id: workflowStatuses.id })
    .from(workflowStatuses)
    .innerJoin(workflows, eq(workflows.id, workflowStatuses.workflowId))
    .where(eq(workflows.projectId, projectId))
    .orderBy(asc(workflowStatuses.position));

  return rows.map((row) => row.id);
}

async function listBoardColumnPage(
  projectId: string,
  statusId: string,
  filters: BoardTaskFilters,
  artifacts: TaskFilterArtifacts,
  limit: number,
  cursor?: string,
): Promise<BoardColumnPage> {
  const conditions = buildTaskConditions({ projectId, statusId, filters, artifacts });
  if (!conditions) {
    return {
      statusId,
      items: [],
      meta: { cursor: null, hasMore: false, totalCount: 0, nextUnloadedTaskId: null },
    };
  }

  const parsedCursor = parseBoardColumnCursor(cursor);
  const cursorCondition = parsedCursor
    ? or(
        gt(tasks.position, parsedCursor.position),
        and(eq(tasks.position, parsedCursor.position), gt(tasks.id, parsedCursor.id)),
      )
    : undefined;

  const totalRows = await db
    .select({ count: count(tasks.id) })
    .from(tasks)
    .where(and(...conditions));
  const totalCount = Number(totalRows[0]?.count ?? 0);

  const queryConditions = cursorCondition ? [...conditions, cursorCondition] : conditions;
  const rows = await db
    .select({
      task: tasks,
      statusName: workflowStatuses.name,
      assigneeDisplayName: users.displayName,
      assigneeAvatarUrl: users.avatarUrl,
    })
    .from(tasks)
    .leftJoin(workflowStatuses, eq(tasks.statusId, workflowStatuses.id))
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .where(and(...queryConditions))
    .orderBy(asc(tasks.position), asc(tasks.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const visibleRows = hasMore ? rows.slice(0, limit) : rows;
  const nextUnloadedTaskId = hasMore ? (rows[limit]?.task.id ?? null) : null;
  const lastVisible = visibleRows[visibleRows.length - 1];
  const nextCursor =
    hasMore && lastVisible
      ? encodeCursor({ id: lastVisible.task.id, position: lastVisible.task.position })
      : null;

  const items = await attachTaskLabels(visibleRows);

  return {
    statusId,
    items,
    meta: {
      cursor: nextCursor,
      hasMore,
      totalCount,
      nextUnloadedTaskId,
    },
  };
}

export async function listBoardTasks(
  projectId: string,
  filters: BoardTaskFilters,
  options?: { statusId?: string; cursor?: string; limit?: number },
  userId?: string,
): Promise<BoardColumnPage[]> {
  await ensureCanReadProjectTasks(projectId, userId);

  const statusId = options?.statusId;
  if (statusId) {
    await validateStatusBelongsToProject(statusId, projectId);
  }

  if (options?.cursor && !statusId) {
    throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Cursor requires a statusId');
  }

  const statusIds = statusId ? [statusId] : await listProjectStatusIds(projectId);
  if (statusIds.length === 0) {
    return [];
  }

  const normalizedFilters = normalizeBoardFilters(filters);
  const artifacts = await buildTaskFilterArtifacts(projectId, normalizedFilters);
  if (!artifacts) {
    return statusIds.map((sid) => ({
      statusId: sid,
      items: [],
      meta: { cursor: null, hasMore: false, totalCount: 0, nextUnloadedTaskId: null },
    }));
  }

  const limit = normalizeBoardLimit(options?.limit);

  return Promise.all(
    statusIds.map((sid) =>
      listBoardColumnPage(
        projectId,
        sid,
        normalizedFilters,
        artifacts,
        limit,
        sid === statusId ? options?.cursor : undefined,
      ),
    ),
  );
}

export async function listTasks(
  projectId: string,
  filters: TaskFilters,
  userId?: string,
): Promise<TaskOutput[]> {
  await ensureCanReadProjectTasks(projectId, userId);

  const normalizedFilters = normalizeBoardFilters(filters);
  const artifacts = await buildTaskFilterArtifacts(projectId, normalizedFilters);
  if (!artifacts) {
    return [];
  }

  const conditions = buildTaskConditions({
    projectId,
    filters: normalizedFilters,
    artifacts,
  });
  if (!conditions) {
    return [];
  }

  const sort = resolveTaskSort(filters.sort, filters.order);
  const query = db
    .select({
      task: tasks,
      statusName: workflowStatuses.name,
      assigneeDisplayName: users.displayName,
      assigneeAvatarUrl: users.avatarUrl,
    })
    .from(tasks)
    .leftJoin(workflowStatuses, eq(tasks.statusId, workflowStatuses.id))
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .where(and(...conditions));

  const rows =
    sort.order === 'desc'
      ? await query.orderBy(desc(sort.expression), asc(tasks.id))
      : await query.orderBy(asc(sort.expression), asc(tasks.id));

  return attachTaskLabels(rows);
}

interface ListTasksPageOptions {
  cursor?: string;
  limit?: number;
}

interface ResolvedTaskSort {
  field: 'position' | 'dueDate' | 'priority' | 'createdAt' | 'title' | 'status' | 'assignee';
  order: 'asc' | 'desc';
  expression: SQL<unknown>;
}

function resolveTaskSort(sort?: string, order?: string): ResolvedTaskSort {
  const field =
    sort === 'dueDate' ||
    sort === 'priority' ||
    sort === 'createdAt' ||
    sort === 'title' ||
    sort === 'status' ||
    sort === 'assignee'
      ? sort
      : 'position';

  const expression: ResolvedTaskSort['expression'] =
    field === 'dueDate'
      ? sql<Date>`COALESCE(${tasks.dueDate}, ${NULL_DUE_DATE_SORT_SENTINEL})`
      : field === 'priority'
        ? sql`${tasks.priority}`
        : field === 'createdAt'
          ? sql`${tasks.createdAt}`
          : field === 'title'
            ? sql`${tasks.title}`
            : field === 'status'
              ? sql<string>`COALESCE(${workflowStatuses.name}, '')`
              : field === 'assignee'
                ? sql<string>`COALESCE(${users.displayName}, '')`
                : sql`${tasks.position}`;

  return {
    field,
    order: order === 'desc' ? 'desc' : 'asc',
    expression,
  };
}

function getRowSortValue(row: TaskRow, sortField: ResolvedTaskSort['field']): string {
  if (sortField === 'position') {
    return `${row.task.position}`;
  }
  if (sortField === 'dueDate') {
    return (row.task.dueDate ?? NULL_DUE_DATE_SORT_SENTINEL).toISOString();
  }
  if (sortField === 'priority') {
    return row.task.priority;
  }
  if (sortField === 'createdAt') {
    return row.task.createdAt.toISOString();
  }
  if (sortField === 'title') {
    return row.task.title;
  }
  if (sortField === 'status') {
    return row.statusName ?? '';
  }

  return row.assigneeDisplayName ?? '';
}

function parseTaskListCursor(
  cursor: string | undefined,
  sort: ResolvedTaskSort,
): TaskListCursorPayload | null {
  if (!cursor) return null;

  const decoded = decodeCursor(cursor);
  const sortField = decoded?.sortField;
  const sortOrder = decoded?.sortOrder;
  const sortValue = decoded?.sortValue;

  if (
    !decoded ||
    typeof sortField !== 'string' ||
    typeof sortOrder !== 'string' ||
    typeof sortValue !== 'string'
  ) {
    throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Invalid task cursor');
  }

  if (sortField !== sort.field || sortOrder !== sort.order) {
    throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Task cursor does not match current sort');
  }

  return {
    id: decoded.id,
    sortField,
    sortOrder: sortOrder === 'desc' ? 'desc' : 'asc',
    sortValue,
  };
}

function parseCursorCompareValue(
  sortField: ResolvedTaskSort['field'],
  sortValue: string,
): string | number | Date {
  if (sortField === 'position') {
    const numeric = Number(sortValue);
    if (!Number.isFinite(numeric)) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Invalid task cursor value');
    }
    return numeric;
  }

  if (sortField === 'dueDate' || sortField === 'createdAt') {
    const dateValue = new Date(sortValue);
    if (Number.isNaN(dateValue.getTime())) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Invalid task cursor value');
    }
    return dateValue;
  }

  return sortValue;
}

export async function listTasksPaged(
  projectId: string,
  filters: TaskFilters,
  options: ListTasksPageOptions,
  userId?: string,
): Promise<TaskListPageResult> {
  await ensureCanReadProjectTasks(projectId, userId);

  const normalizedFilters = normalizeBoardFilters(filters);
  const artifacts = await buildTaskFilterArtifacts(projectId, normalizedFilters);
  if (!artifacts) {
    return { items: [], cursor: null, hasMore: false, totalCount: 0 };
  }

  const conditions = buildTaskConditions({
    projectId,
    filters: normalizedFilters,
    artifacts,
  });
  if (!conditions) {
    return { items: [], cursor: null, hasMore: false, totalCount: 0 };
  }

  const sort = resolveTaskSort(filters.sort, filters.order);
  const parsedCursor = parseTaskListCursor(options.cursor, sort);
  const limit = normalizeLimit(options.limit);

  const totalRows = await db
    .select({ count: count(tasks.id) })
    .from(tasks)
    .leftJoin(workflowStatuses, eq(tasks.statusId, workflowStatuses.id))
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .where(and(...conditions));
  const totalCount = Number(totalRows[0]?.count ?? 0);

  const cursorCondition = parsedCursor
    ? (() => {
        const compareValue = parseCursorCompareValue(sort.field, parsedCursor.sortValue);
        return sort.order === 'desc'
          ? sql`(${sort.expression} < ${compareValue}) OR (${sort.expression} = ${compareValue} AND ${tasks.id} > ${parsedCursor.id})`
          : sql`(${sort.expression} > ${compareValue}) OR (${sort.expression} = ${compareValue} AND ${tasks.id} > ${parsedCursor.id})`;
      })()
    : null;

  const queryConditions = cursorCondition ? [...conditions, cursorCondition] : conditions;
  const rows = await db
    .select({
      task: tasks,
      statusName: workflowStatuses.name,
      assigneeDisplayName: users.displayName,
      assigneeAvatarUrl: users.avatarUrl,
    })
    .from(tasks)
    .leftJoin(workflowStatuses, eq(tasks.statusId, workflowStatuses.id))
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .where(and(...queryConditions))
    .orderBy(sort.order === 'desc' ? desc(sort.expression) : asc(sort.expression), asc(tasks.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const visibleRows = hasMore ? rows.slice(0, limit) : rows;
  const items = await attachTaskLabels(visibleRows);
  const lastVisible = visibleRows[visibleRows.length - 1];
  const cursor =
    hasMore && lastVisible
      ? encodeCursor({
          id: lastVisible.task.id,
          sortField: sort.field,
          sortOrder: sort.order,
          sortValue: getRowSortValue(lastVisible, sort.field),
        })
      : null;

  return { items, cursor, hasMore, totalCount };
}

export async function getTask(taskId: string, userId?: string): Promise<TaskOutput> {
  // Defense-in-depth: verify task.read.project permission
  if (userId) {
    const taskProject = await db
      .select({ projectId: tasks.projectId })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
    if (taskProject.length > 0) {
      const orgId = await getOrgIdForProject(taskProject[0].projectId);
      if (orgId) {
        const canRead = await hasOrgPermission(userId, orgId, 'task', 'read');
        if (!canRead) {
          throw new AppError(
            403,
            ErrorCode.FORBIDDEN,
            'Insufficient permissions to read tasks in this project',
          );
        }
      }
    }
  }

  const result = await db
    .select({
      task: tasks,
      statusName: workflowStatuses.name,
      assigneeDisplayName: users.displayName,
      assigneeAvatarUrl: users.avatarUrl,
    })
    .from(tasks)
    .leftJoin(workflowStatuses, eq(tasks.statusId, workflowStatuses.id))
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt)))
    .limit(1);

  if (result.length === 0) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Task not found');
  }

  const labelRows = await db
    .select({
      id: labels.id,
      name: labels.name,
      color: labels.color,
    })
    .from(taskLabels)
    .innerJoin(labels, eq(labels.id, taskLabels.labelId))
    .where(eq(taskLabels.taskId, taskId));

  const progress = await loadTaskProgress(taskId);
  const blocked = await computeBlockedStatus(taskId);
  return toTaskOutput(
    result[0].task,
    result[0].statusName,
    progress,
    blocked,
    result[0].task.assigneeId
      ? {
          id: result[0].task.assigneeId,
          displayName: result[0].assigneeDisplayName ?? '',
          avatarUrl: result[0].assigneeAvatarUrl ?? null,
        }
      : null,
    labelRows.map((row) => ({ id: row.id, name: row.name, color: row.color ?? null })),
  );
}

export async function updateTask(
  taskId: string,
  projectId: string,
  input: UpdateTaskInput,
  actorId?: string,
): Promise<TaskOutput> {
  // Defense-in-depth: verify task.update.project permission
  if (actorId) {
    const orgId = await getOrgIdForProject(projectId);
    if (orgId) {
      const canUpdate = await hasOrgPermission(actorId, orgId, 'task', 'update');
      if (!canUpdate) {
        throw new AppError(
          403,
          ErrorCode.FORBIDDEN,
          'Insufficient permissions to update tasks in this project',
        );
      }
    }
  }

  const existing = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt)))
    .limit(1);

  if (existing.length === 0) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Task not found');
  }

  if (input.statusId) {
    await validateStatusBelongsToProject(input.statusId, projectId);
    // Enforce transition guard for final/validated statuses
    if (input.statusId !== existing[0].statusId) {
      await validateStatusTransition(taskId, input.statusId, projectId);
    }
  }

  if (input.assigneeId) {
    await validateAssigneeInOrg(input.assigneeId, projectId);
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (input.title !== undefined) updates.title = input.title;
  if (input.description !== undefined) updates.description = input.description;
  if (input.statusId !== undefined) updates.statusId = input.statusId;
  if (input.priority !== undefined) updates.priority = input.priority;
  if (input.assigneeId !== undefined) updates.assigneeId = input.assigneeId;
  if (input.dueDate !== undefined) updates.dueDate = input.dueDate ? new Date(input.dueDate) : null;
  if (input.startDate !== undefined)
    updates.startDate = input.startDate ? new Date(input.startDate) : null;
  if (input.estimatedHours !== undefined)
    updates.estimatedHours = input.estimatedHours?.toString() ?? null;
  if (input.parentTaskId !== undefined) updates.parentTaskId = input.parentTaskId;

  await db.update(tasks).set(updates).where(eq(tasks.id, taskId));

  // Log activity with before/after changes
  if (actorId) {
    const changes: Record<string, { before: unknown; after: unknown }> = {};
    const old = existing[0];
    if (input.title !== undefined && old.title !== input.title) {
      changes.title = { before: old.title, after: input.title };
    }
    if (input.statusId !== undefined && old.statusId !== input.statusId) {
      changes.statusId = { before: old.statusId, after: input.statusId };
    }
    if (input.priority !== undefined && old.priority !== input.priority) {
      changes.priority = { before: old.priority, after: input.priority };
    }
    if (input.assigneeId !== undefined && old.assigneeId !== input.assigneeId) {
      changes.assigneeId = { before: old.assigneeId, after: input.assigneeId };
    }
    if (input.description !== undefined && old.description !== input.description) {
      changes.description = { before: old.description, after: input.description };
    }
    if (Object.keys(changes).length > 0) {
      const orgId = await getOrgIdForProject(projectId);
      const action = changes.statusId
        ? 'status_changed'
        : changes.assigneeId
          ? 'assigned'
          : 'updated';
      await activityService.log({
        organizationId: orgId,
        actorId,
        entityType: 'task',
        entityId: taskId,
        action,
        changes,
      });
    }
  }

  // If assignee changed, add new assignee as watcher
  if (input.assigneeId && input.assigneeId !== existing[0].assigneeId) {
    const existingWatcher = await db
      .select({ taskId: taskWatchers.taskId })
      .from(taskWatchers)
      .where(and(eq(taskWatchers.taskId, taskId), eq(taskWatchers.userId, input.assigneeId)))
      .limit(1);

    if (existingWatcher.length === 0) {
      await db.insert(taskWatchers).values({ taskId, userId: input.assigneeId });
    }
  }

  await syncTaskSearch(taskId);

  return getTask(taskId);
}

export async function deleteTask(taskId: string, actorId?: string): Promise<void> {
  // Defense-in-depth: verify task.update.project permission (delete is a mutation)
  if (actorId) {
    const taskProject = await db
      .select({ projectId: tasks.projectId })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
    if (taskProject.length > 0) {
      const orgId = await getOrgIdForProject(taskProject[0].projectId);
      if (orgId) {
        const canUpdate = await hasOrgPermission(actorId, orgId, 'task', 'update');
        if (!canUpdate) {
          throw new AppError(
            403,
            ErrorCode.FORBIDDEN,
            'Insufficient permissions to delete tasks in this project',
          );
        }
      }
    }
  }

  const existing = await db
    .select({ id: tasks.id, projectId: tasks.projectId })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt)))
    .limit(1);

  if (existing.length === 0) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Task not found');
  }

  await db.update(tasks).set({ deletedAt: new Date() }).where(eq(tasks.id, taskId));

  if (actorId) {
    const orgId = await getOrgIdForProject(existing[0].projectId);
    await activityService.log({
      organizationId: orgId,
      actorId,
      entityType: 'task',
      entityId: taskId,
      action: 'deleted',
    });
  }

  await removeTaskSearch(taskId);
}

// --- Assignment ---

export async function assignTask(
  taskId: string,
  projectId: string,
  assigneeId: string | null,
  actorId?: string,
): Promise<TaskOutput> {
  // Defense-in-depth: verify task.update.project permission
  if (actorId) {
    const orgId = await getOrgIdForProject(projectId);
    if (orgId) {
      const canUpdate = await hasOrgPermission(actorId, orgId, 'task', 'update');
      if (!canUpdate) {
        throw new AppError(
          403,
          ErrorCode.FORBIDDEN,
          'Insufficient permissions to assign tasks in this project',
        );
      }
    }
  }

  const existing = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt)))
    .limit(1);

  if (existing.length === 0) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Task not found');
  }

  if (assigneeId) {
    await validateAssigneeInOrg(assigneeId, projectId);

    // Add as watcher if not already
    const existingWatcher = await db
      .select({ taskId: taskWatchers.taskId })
      .from(taskWatchers)
      .where(and(eq(taskWatchers.taskId, taskId), eq(taskWatchers.userId, assigneeId)))
      .limit(1);

    if (existingWatcher.length === 0) {
      await db.insert(taskWatchers).values({ taskId, userId: assigneeId });
    }
  }

  await db.update(tasks).set({ assigneeId, updatedAt: new Date() }).where(eq(tasks.id, taskId));

  await syncTaskSearch(taskId);

  return getTask(taskId);
}

// --- Watchers ---

export async function addWatcher(taskId: string, userId: string): Promise<void> {
  const existing = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt)))
    .limit(1);

  if (existing.length === 0) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Task not found');
  }

  const alreadyWatching = await db
    .select({ taskId: taskWatchers.taskId })
    .from(taskWatchers)
    .where(and(eq(taskWatchers.taskId, taskId), eq(taskWatchers.userId, userId)))
    .limit(1);

  if (alreadyWatching.length === 0) {
    await db.insert(taskWatchers).values({ taskId, userId });
  }
}

export async function removeWatcher(taskId: string, userId: string): Promise<void> {
  await db
    .delete(taskWatchers)
    .where(and(eq(taskWatchers.taskId, taskId), eq(taskWatchers.userId, userId)));
}

// --- Labels ---

export async function getTaskLabels(
  taskId: string,
): Promise<{ labelId: string; name: string; color: string | null }[]> {
  const result = await db
    .select({
      labelId: labels.id,
      name: labels.name,
      color: labels.color,
    })
    .from(taskLabels)
    .innerJoin(labels, eq(taskLabels.labelId, labels.id))
    .where(eq(taskLabels.taskId, taskId));

  return result.map((r) => ({
    labelId: r.labelId,
    name: r.name,
    color: r.color ?? null,
  }));
}

export async function addTaskLabel(
  taskId: string,
  labelId: string,
  projectId: string,
  actorId?: string,
): Promise<void> {
  // Defense-in-depth: verify task.update.project permission
  if (actorId) {
    const orgId = await getOrgIdForProject(projectId);
    if (orgId) {
      const canUpdate = await hasOrgPermission(actorId, orgId, 'task', 'update');
      if (!canUpdate) {
        throw new AppError(
          403,
          ErrorCode.FORBIDDEN,
          'Insufficient permissions to modify task labels in this project',
        );
      }
    }
  }

  // Verify task exists
  const task = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt)))
    .limit(1);

  if (task.length === 0) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Task not found');
  }

  // Verify label belongs to the same project
  const label = await db
    .select({ id: labels.id })
    .from(labels)
    .where(and(eq(labels.id, labelId), eq(labels.projectId, projectId)))
    .limit(1);

  if (label.length === 0) {
    throw new AppError(
      422,
      ErrorCode.UNPROCESSABLE_ENTITY,
      'Label does not belong to this project',
    );
  }

  // Check if already attached
  const existing = await db
    .select({ taskId: taskLabels.taskId })
    .from(taskLabels)
    .where(and(eq(taskLabels.taskId, taskId), eq(taskLabels.labelId, labelId)))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(taskLabels).values({ taskId, labelId });

    if (actorId) {
      const orgId = await getOrgIdForProject(projectId);
      await activityService.log({
        organizationId: orgId,
        actorId,
        entityType: 'task',
        entityId: taskId,
        action: 'label_added',
        changes: { labelId: { before: null, after: labelId } },
      });
    }
  }

  await syncTaskSearch(taskId);
}

export async function removeTaskLabel(
  taskId: string,
  labelId: string,
  actorId?: string,
): Promise<void> {
  // Defense-in-depth: verify task.update.project permission
  if (actorId) {
    const projectId = await getProjectIdForTask(taskId);
    const orgId = await getOrgIdForProject(projectId);
    if (orgId) {
      const canUpdate = await hasOrgPermission(actorId, orgId, 'task', 'update');
      if (!canUpdate) {
        throw new AppError(
          403,
          ErrorCode.FORBIDDEN,
          'Insufficient permissions to modify task labels in this project',
        );
      }
    }
  }

  await db
    .delete(taskLabels)
    .where(and(eq(taskLabels.taskId, taskId), eq(taskLabels.labelId, labelId)));

  if (actorId) {
    const projectId = await getProjectIdForTask(taskId);
    const orgId = await getOrgIdForProject(projectId);
    await activityService.log({
      organizationId: orgId,
      actorId,
      entityType: 'task',
      entityId: taskId,
      action: 'label_removed',
      changes: { labelId: { before: labelId, after: null } },
    });
  }

  await syncTaskSearch(taskId);
}

// --- Position / Reordering ---

export interface TaskMoveInput {
  statusId?: string;
  position?: number;
  beforeTaskId?: string;
  afterTaskId?: string;
}

interface TaskAnchor {
  id: string;
  statusId: string;
  position: number;
}

async function getTaskAnchor(projectId: string, taskId: string): Promise<TaskAnchor | null> {
  const row = await db
    .select({
      id: tasks.id,
      statusId: tasks.statusId,
      position: tasks.position,
    })
    .from(tasks)
    .where(and(eq(tasks.projectId, projectId), eq(tasks.id, taskId), isNull(tasks.deletedAt)))
    .limit(1);

  return row[0] ?? null;
}

async function hasPositionConflict(
  projectId: string,
  statusId: string,
  position: number,
  taskId: string,
): Promise<boolean> {
  const conflict = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(
      and(
        eq(tasks.projectId, projectId),
        eq(tasks.statusId, statusId),
        eq(tasks.position, position),
        isNull(tasks.deletedAt),
        sql`${tasks.id} != ${taskId}`,
      ),
    )
    .limit(1);

  return conflict.length > 0;
}

async function rebalanceStatusPositions(projectId: string, statusId: string): Promise<void> {
  const rows = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(
      and(eq(tasks.projectId, projectId), eq(tasks.statusId, statusId), isNull(tasks.deletedAt)),
    )
    .orderBy(asc(tasks.position), asc(tasks.id));

  for (const [index, row] of rows.entries()) {
    await db
      .update(tasks)
      .set({ position: (index + 1) * POSITION_GAP, updatedAt: new Date() })
      .where(eq(tasks.id, row.id));
  }
}

function computeAnchoredPosition(
  beforeTask: TaskAnchor | null,
  afterTask: TaskAnchor | null,
): number | null {
  if (beforeTask && afterTask) {
    const gap = beforeTask.position - afterTask.position;
    if (gap <= 1) return null;
    return afterTask.position + Math.floor(gap / 2);
  }

  if (afterTask) {
    return afterTask.position + POSITION_GAP;
  }

  if (beforeTask) {
    const candidate = beforeTask.position - POSITION_GAP;
    return candidate >= 0 ? candidate : null;
  }

  return null;
}

export async function updateTaskPosition(
  taskId: string,
  projectId: string,
  input: TaskMoveInput,
  actorId?: string,
): Promise<TaskOutput> {
  // Defense-in-depth: verify task.update.project permission
  if (actorId) {
    const orgId = await getOrgIdForProject(projectId);
    if (orgId) {
      const canUpdate = await hasOrgPermission(actorId, orgId, 'task', 'update');
      if (!canUpdate) {
        throw new AppError(
          403,
          ErrorCode.FORBIDDEN,
          'Insufficient permissions to update task position in this project',
        );
      }
    }
  }

  const existing = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt)))
    .limit(1);

  if (existing.length === 0) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Task not found');
  }

  if (input.position !== undefined) {
    const targetStatusId = input.statusId ?? existing[0].statusId;

    if (input.statusId) {
      await validateStatusBelongsToProject(input.statusId, projectId);
      // Enforce transition guard for final/validated statuses
      if (input.statusId !== existing[0].statusId) {
        await validateStatusTransition(taskId, input.statusId, projectId);
      }
    }

    const updates: Record<string, unknown> = {
      position: input.position,
      updatedAt: new Date(),
    };

    if (input.statusId) {
      updates.statusId = input.statusId;
    }

    await db.update(tasks).set(updates).where(eq(tasks.id, taskId));

    // Legacy positional mode shifts collisions forward.
    await db
      .update(tasks)
      .set({ position: sql`${tasks.position} + ${POSITION_GAP}` })
      .where(
        and(
          eq(tasks.projectId, projectId),
          eq(tasks.statusId, targetStatusId),
          gte(tasks.position, input.position),
          isNull(tasks.deletedAt),
          sql`${tasks.id} != ${taskId}`,
        ),
      );

    await syncTaskSearch(taskId);
    return getTask(taskId);
  }

  const beforeTask = input.beforeTaskId ? await getTaskAnchor(projectId, input.beforeTaskId) : null;
  const afterTask = input.afterTaskId ? await getTaskAnchor(projectId, input.afterTaskId) : null;

  if (input.beforeTaskId && !beforeTask) {
    throw new AppError(422, ErrorCode.UNPROCESSABLE_ENTITY, 'beforeTaskId is invalid');
  }
  if (input.afterTaskId && !afterTask) {
    throw new AppError(422, ErrorCode.UNPROCESSABLE_ENTITY, 'afterTaskId is invalid');
  }
  if (beforeTask?.id === taskId || afterTask?.id === taskId) {
    throw new AppError(422, ErrorCode.UNPROCESSABLE_ENTITY, 'Task cannot be anchored to itself');
  }
  if (beforeTask && afterTask && beforeTask.statusId !== afterTask.statusId) {
    throw new AppError(422, ErrorCode.UNPROCESSABLE_ENTITY, 'Anchor tasks must share a status');
  }

  const targetStatusId =
    input.statusId ?? beforeTask?.statusId ?? afterTask?.statusId ?? existing[0].statusId;
  if (input.statusId) {
    await validateStatusBelongsToProject(input.statusId, projectId);
  }
  // Enforce transition guard for final/validated statuses in anchored branch
  if (targetStatusId !== existing[0].statusId) {
    await validateStatusTransition(taskId, targetStatusId, projectId);
  }
  if (beforeTask && beforeTask.statusId !== targetStatusId) {
    throw new AppError(
      422,
      ErrorCode.UNPROCESSABLE_ENTITY,
      'beforeTaskId must be in target status',
    );
  }
  if (afterTask && afterTask.statusId !== targetStatusId) {
    throw new AppError(422, ErrorCode.UNPROCESSABLE_ENTITY, 'afterTaskId must be in target status');
  }

  let targetPosition = computeAnchoredPosition(beforeTask, afterTask);
  if (targetPosition === null) {
    await rebalanceStatusPositions(projectId, targetStatusId);
    const refreshedBefore = input.beforeTaskId
      ? await getTaskAnchor(projectId, input.beforeTaskId)
      : null;
    const refreshedAfter = input.afterTaskId
      ? await getTaskAnchor(projectId, input.afterTaskId)
      : null;
    targetPosition = computeAnchoredPosition(refreshedBefore, refreshedAfter);
  }
  if (targetPosition === null) {
    targetPosition = await getNextPosition(projectId, targetStatusId);
  }

  if (await hasPositionConflict(projectId, targetStatusId, targetPosition, taskId)) {
    await rebalanceStatusPositions(projectId, targetStatusId);
    targetPosition = await getNextPosition(projectId, targetStatusId);
  }

  await db
    .update(tasks)
    .set({
      statusId: targetStatusId,
      position: targetPosition,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, taskId));

  await syncTaskSearch(taskId);

  return getTask(taskId);
}

// --- Subtasks ---

export async function createSubtask(
  parentTaskId: string,
  userId: string,
  input: CreateSubtaskInput,
): Promise<TaskOutput> {
  const parent = await db
    .select({ id: tasks.id, projectId: tasks.projectId, parentTaskId: tasks.parentTaskId })
    .from(tasks)
    .where(and(eq(tasks.id, parentTaskId), isNull(tasks.deletedAt)))
    .limit(1);

  if (parent.length === 0) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Parent task not found');
  }

  if (parent[0].parentTaskId) {
    throw new AppError(
      422,
      ErrorCode.UNPROCESSABLE_ENTITY,
      'Cannot create subtask of a subtask (max 1 level of nesting)',
    );
  }

  // Defense-in-depth: verify task.create.project permission
  const orgId = await getOrgIdForProject(parent[0].projectId);
  if (orgId) {
    const canCreate = await hasOrgPermission(userId, orgId, 'task', 'create');
    if (!canCreate) {
      throw new AppError(
        403,
        ErrorCode.FORBIDDEN,
        'Insufficient permissions to create tasks in this project',
      );
    }
  }

  const subtask = await createTask(parent[0].projectId, userId, {
    ...input,
    parentTaskId,
  });

  // A parent task is blocked by its newly created subtask until it is completed.
  await createDependency(
    parentTaskId,
    {
      dependsOnTaskId: subtask.id,
      type: 'blocked_by',
    },
    userId,
  );

  return subtask;
}

export async function listSubtasks(parentTaskId: string, userId?: string): Promise<TaskOutput[]> {
  // Defense-in-depth: verify task.read.project permission
  if (userId) {
    const parentTask = await db
      .select({ projectId: tasks.projectId })
      .from(tasks)
      .where(eq(tasks.id, parentTaskId))
      .limit(1);
    if (parentTask.length > 0) {
      const orgId = await getOrgIdForProject(parentTask[0].projectId);
      if (orgId) {
        const canRead = await hasOrgPermission(userId, orgId, 'task', 'read');
        if (!canRead) {
          throw new AppError(
            403,
            ErrorCode.FORBIDDEN,
            'Insufficient permissions to read tasks in this project',
          );
        }
      }
    }
  }

  const result = await db
    .select({
      task: tasks,
      statusName: workflowStatuses.name,
    })
    .from(tasks)
    .leftJoin(workflowStatuses, eq(tasks.statusId, workflowStatuses.id))
    .where(and(eq(tasks.parentTaskId, parentTaskId), isNull(tasks.deletedAt)))
    .orderBy(tasks.position);

  return result.map((r) => toTaskOutput(r.task, r.statusName));
}

// --- Helpers for handlers ---

export async function getProjectIdForTask(taskId: string): Promise<string> {
  const result = await db
    .select({ projectId: tasks.projectId })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);

  if (result.length === 0) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Task not found');
  }

  return result[0].projectId;
}
