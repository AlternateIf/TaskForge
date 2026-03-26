import crypto from 'node:crypto';
import { db, projects, taskDependencies, tasks, workflowStatuses } from '@taskforge/db';
import type { CreateDependencyInput } from '@taskforge/shared';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { AppError, ErrorCode } from '../utils/errors.js';
import * as activityService from './activity.service.js';

export interface DependencyOutput {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  type: string;
  createdAt: string;
}

export interface DependencyListOutput {
  blockedBy: DependencyOutput[];
  blocking: DependencyOutput[];
}

async function requireTask(taskId: string): Promise<typeof tasks.$inferSelect> {
  const result = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt)))
    .limit(1);

  if (result.length === 0) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Task not found');
  }
  return result[0];
}

async function getOrgIdForTask(taskId: string): Promise<string> {
  const result = await db
    .select({ orgId: projects.organizationId })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(eq(tasks.id, taskId))
    .limit(1);

  if (result.length === 0) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Task not found');
  }
  return result[0].orgId;
}

/**
 * BFS to detect circular dependencies.
 * Starting from `fromTaskId`, follow blocked_by links to see if we reach `toTaskId`.
 */
async function wouldCreateCycle(fromTaskId: string, toTaskId: string): Promise<boolean> {
  const visited = new Set<string>();
  const queue = [toTaskId];

  while (queue.length > 0) {
    const current = queue.shift() as string;
    if (current === fromTaskId) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    // Find all tasks that `current` depends on (blocked_by)
    const deps = await db
      .select({ dependsOnTaskId: taskDependencies.dependsOnTaskId })
      .from(taskDependencies)
      .where(eq(taskDependencies.taskId, current));

    for (const dep of deps) {
      if (!visited.has(dep.dependsOnTaskId)) {
        queue.push(dep.dependsOnTaskId);
      }
    }
  }

  return false;
}

function toOutput(d: typeof taskDependencies.$inferSelect): DependencyOutput {
  return {
    id: d.id,
    taskId: d.taskId,
    dependsOnTaskId: d.dependsOnTaskId,
    type: d.type,
    createdAt: d.createdAt.toISOString(),
  };
}

export async function createDependency(
  taskId: string,
  input: CreateDependencyInput,
  actorId?: string,
): Promise<DependencyOutput> {
  // Self-dependency check
  if (taskId === input.dependsOnTaskId) {
    throw new AppError(422, ErrorCode.UNPROCESSABLE_ENTITY, 'A task cannot depend on itself');
  }

  // Verify both tasks exist
  await requireTask(taskId);
  await requireTask(input.dependsOnTaskId);

  // Cross-project: verify same organization
  const orgA = await getOrgIdForTask(taskId);
  const orgB = await getOrgIdForTask(input.dependsOnTaskId);
  if (orgA !== orgB) {
    throw new AppError(
      422,
      ErrorCode.UNPROCESSABLE_ENTITY,
      'Dependencies across organizations are not allowed',
    );
  }

  // Duplicate check
  const existing = await db
    .select({ id: taskDependencies.id })
    .from(taskDependencies)
    .where(
      and(
        eq(taskDependencies.taskId, taskId),
        eq(taskDependencies.dependsOnTaskId, input.dependsOnTaskId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    throw new AppError(409, ErrorCode.CONFLICT, 'Dependency already exists');
  }

  // Circular dependency check
  const circular = await wouldCreateCycle(taskId, input.dependsOnTaskId);
  if (circular) {
    throw new AppError(422, ErrorCode.UNPROCESSABLE_ENTITY, 'Circular dependency detected');
  }

  const id = crypto.randomUUID();
  const now = new Date();

  await db.insert(taskDependencies).values({
    id,
    taskId,
    dependsOnTaskId: input.dependsOnTaskId,
    type: input.type,
    createdAt: now,
  });

  if (actorId) {
    await activityService.log({
      organizationId: orgA,
      actorId,
      entityType: 'task',
      entityId: taskId,
      action: 'dependency_added',
      changes: { dependsOn: { before: null, after: input.dependsOnTaskId } },
    });
  }

  return {
    id,
    taskId,
    dependsOnTaskId: input.dependsOnTaskId,
    type: input.type,
    createdAt: now.toISOString(),
  };
}

export async function listDependencies(taskId: string): Promise<DependencyListOutput> {
  // Tasks that this task is blocked by
  const blockedBy = await db
    .select()
    .from(taskDependencies)
    .where(eq(taskDependencies.taskId, taskId));

  // Tasks that this task blocks
  const blocking = await db
    .select()
    .from(taskDependencies)
    .where(eq(taskDependencies.dependsOnTaskId, taskId));

  return {
    blockedBy: blockedBy.map(toOutput),
    blocking: blocking.map(toOutput),
  };
}

export async function deleteDependency(dependencyId: string, actorId?: string): Promise<void> {
  const existing = await db
    .select()
    .from(taskDependencies)
    .where(eq(taskDependencies.id, dependencyId))
    .limit(1);

  if (existing.length === 0) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Dependency not found');
  }

  await db.delete(taskDependencies).where(eq(taskDependencies.id, dependencyId));

  if (actorId) {
    const orgId = await getOrgIdForTask(existing[0].taskId);
    await activityService.log({
      organizationId: orgId,
      actorId,
      entityType: 'task',
      entityId: existing[0].taskId,
      action: 'dependency_removed',
      changes: { dependsOn: { before: existing[0].dependsOnTaskId, after: null } },
    });
  }
}

/**
 * Compute blocked status for a task.
 * A task is blocked if any of its `blocked_by` dependencies point to tasks
 * that are NOT in a final workflow status.
 */
export async function computeBlockedStatus(
  taskId: string,
): Promise<{ isBlocked: boolean; blockedByCount: number }> {
  const deps = await db
    .select({ dependsOnTaskId: taskDependencies.dependsOnTaskId })
    .from(taskDependencies)
    .where(eq(taskDependencies.taskId, taskId));

  if (deps.length === 0) {
    return { isBlocked: false, blockedByCount: 0 };
  }

  const blockerIds = deps.map((d) => d.dependsOnTaskId);

  // Get the statuses of all blocker tasks
  const blockerTasks = await db
    .select({ id: tasks.id, statusId: tasks.statusId })
    .from(tasks)
    .where(and(inArray(tasks.id, blockerIds), isNull(tasks.deletedAt)));

  if (blockerTasks.length === 0) {
    return { isBlocked: false, blockedByCount: 0 };
  }

  const statusIds = [...new Set(blockerTasks.map((t) => t.statusId))];
  const finalStatuses = await db
    .select({ id: workflowStatuses.id })
    .from(workflowStatuses)
    .where(and(inArray(workflowStatuses.id, statusIds), eq(workflowStatuses.isFinal, true)));

  const finalSet = new Set(finalStatuses.map((s) => s.id));
  const unresolvedBlockers = blockerTasks.filter((t) => !finalSet.has(t.statusId));

  return {
    isBlocked: unresolvedBlockers.length > 0,
    blockedByCount: unresolvedBlockers.length,
  };
}

/**
 * Get the taskId for a dependency (for authorization).
 */
export async function getTaskIdForDependency(dependencyId: string): Promise<string> {
  const result = await db
    .select({ taskId: taskDependencies.taskId })
    .from(taskDependencies)
    .where(eq(taskDependencies.id, dependencyId))
    .limit(1);

  if (result.length === 0) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Dependency not found');
  }
  return result[0].taskId;
}
