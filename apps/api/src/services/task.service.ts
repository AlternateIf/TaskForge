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
import { and, desc, eq, gte, inArray, isNull, lte, sql } from 'drizzle-orm';
import { AppError, ErrorCode } from '../utils/errors.js';
import * as activityService from './activity.service.js';
import { computeBlockedStatus, createDependency } from './dependency.service.js';
import * as searchService from './search.service.js';

const POSITION_GAP = 1000;

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
  assigneeId?: string;
  labelId?: string[];
  dueDateFrom?: string;
  dueDateTo?: string;
  search?: string;
  sort?: string;
  order?: string;
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

  const orgId = await getOrgIdForProject(projectId);
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

export async function listTasks(projectId: string, filters: TaskFilters): Promise<TaskOutput[]> {
  const conditions: ReturnType<typeof eq>[] = [
    eq(tasks.projectId, projectId),
    isNull(tasks.deletedAt),
  ];

  if (filters.status && filters.status.length > 0) {
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

  if (filters.assigneeId) {
    conditions.push(eq(tasks.assigneeId, filters.assigneeId));
  }

  if (filters.dueDateFrom) {
    conditions.push(gte(tasks.dueDate, new Date(filters.dueDateFrom)));
  }

  if (filters.dueDateTo) {
    conditions.push(lte(tasks.dueDate, new Date(filters.dueDateTo)));
  }

  // Label filtering: find task IDs with matching labels
  let labelTaskIds: string[] | undefined;
  if (filters.labelId && filters.labelId.length > 0) {
    const labelResults = await db
      .select({ taskId: taskLabels.taskId })
      .from(taskLabels)
      .where(inArray(taskLabels.labelId, filters.labelId));
    labelTaskIds = labelResults.map((r) => r.taskId);
    if (labelTaskIds.length === 0) {
      return [];
    }
    conditions.push(inArray(tasks.id, labelTaskIds));
  }

  // Determine sort
  const sortField = filters.sort ?? 'position';
  const sortOrder = filters.order === 'desc' ? 'desc' : 'asc';

  const sortColumn =
    {
      position: tasks.position,
      dueDate: tasks.dueDate,
      priority: tasks.priority,
      createdAt: tasks.createdAt,
    }[sortField] ?? tasks.position;

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

  const ordered =
    sortOrder === 'desc' ? query.orderBy(desc(sortColumn)) : query.orderBy(sortColumn);

  const result = await ordered;

  // In-memory search filter on title (Meilisearch later)
  let filtered = result;
  if (filters.search) {
    const term = filters.search.toLowerCase();
    filtered = result.filter((r) => r.task.title.toLowerCase().includes(term));
  }

  // Batch-fetch labels for all returned tasks
  const taskIds = filtered.map((r) => r.task.id);
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
      let taskLabelsList = labelsMap.get(row.taskId);
      if (!taskLabelsList) {
        taskLabelsList = [];
        labelsMap.set(row.taskId, taskLabelsList);
      }
      taskLabelsList.push({ id: row.id, name: row.name, color: row.color ?? null });
    }
  }

  return filtered.map((r) =>
    toTaskOutput(
      r.task,
      r.statusName,
      null,
      null,
      r.task.assigneeId
        ? {
            id: r.task.assigneeId,
            displayName: r.assigneeDisplayName ?? '',
            avatarUrl: r.assigneeAvatarUrl ?? null,
          }
        : null,
      labelsMap.get(r.task.id) ?? [],
    ),
  );
}

export async function getTask(taskId: string): Promise<TaskOutput> {
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
): Promise<TaskOutput> {
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

export async function updateTaskPosition(
  taskId: string,
  projectId: string,
  position: number,
  statusId?: string,
): Promise<TaskOutput> {
  const existing = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt)))
    .limit(1);

  if (existing.length === 0) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Task not found');
  }

  const targetStatusId = statusId ?? existing[0].statusId;

  if (statusId) {
    await validateStatusBelongsToProject(statusId, projectId);
  }

  const updates: Record<string, unknown> = {
    position,
    updatedAt: new Date(),
  };

  if (statusId) {
    updates.statusId = statusId;
  }

  await db.update(tasks).set(updates).where(eq(tasks.id, taskId));

  // Shift positions of tasks at or after the new position (excluding the moved task)
  await db
    .update(tasks)
    .set({ position: sql`${tasks.position} + ${POSITION_GAP}` })
    .where(
      and(
        eq(tasks.projectId, projectId),
        eq(tasks.statusId, targetStatusId),
        gte(tasks.position, position),
        isNull(tasks.deletedAt),
        sql`${tasks.id} != ${taskId}`,
      ),
    );

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

export async function listSubtasks(parentTaskId: string): Promise<TaskOutput[]> {
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
