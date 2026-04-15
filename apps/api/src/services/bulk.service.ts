import {
  db,
  labels,
  projectMembers,
  projects,
  taskLabels,
  tasks,
  workflowStatuses,
  workflows,
} from '@taskforge/db';
import type { BulkActionInput } from '@taskforge/shared';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { AppError, ErrorCode } from '../utils/errors.js';
import type { TransitionBlockDetails } from '../utils/errors.js';
import * as activityService from './activity.service.js';
import { ensureAssigneeProjectMembership, validateStatusTransition } from './task.service.js';

interface BulkFailure {
  id: string;
  error: { code: string; message: string; transitionDetails?: TransitionBlockDetails };
}

export interface BulkResult {
  succeeded: string[];
  failed: BulkFailure[];
  total: number;
}

async function getOrgIdForProject(projectId: string): Promise<string | null> {
  const result = await db
    .select({ orgId: projects.organizationId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  return result[0]?.orgId ?? null;
}

async function getInitialStatusForProject(projectId: string): Promise<string | null> {
  const result = await db
    .select({ id: workflowStatuses.id })
    .from(workflowStatuses)
    .innerJoin(workflows, eq(workflows.id, workflowStatuses.workflowId))
    .where(and(eq(workflows.projectId, projectId), eq(workflowStatuses.isInitial, true)))
    .limit(1);
  return result[0]?.id ?? null;
}

/**
 * Validates that the caller has project membership for all tasks in the bulk action.
 * Throws 403 if any task belongs to a project the user is not a member of.
 */
export async function validateBulkTaskAccess(taskIds: string[], userId: string): Promise<void> {
  if (taskIds.length === 0) return;

  // Get all tasks and their project IDs
  const taskRows = await db
    .select({ id: tasks.id, projectId: tasks.projectId })
    .from(tasks)
    .where(and(inArray(tasks.id, taskIds), isNull(tasks.deletedAt)));

  // Get unique project IDs
  const projectIds = [...new Set(taskRows.map((t) => t.projectId))];
  if (projectIds.length === 0) return; // tasks not found will fail later in executeBulkAction

  // Check membership for all projects
  const memberships = await db
    .select({ projectId: projectMembers.projectId })
    .from(projectMembers)
    .where(and(inArray(projectMembers.projectId, projectIds), eq(projectMembers.userId, userId)));

  const memberProjectIds = new Set(memberships.map((m) => m.projectId));
  const unauthorized = projectIds.filter((pid) => !memberProjectIds.has(pid));

  if (unauthorized.length > 0) {
    throw new AppError(
      403,
      ErrorCode.FORBIDDEN,
      'You do not have access to one or more tasks in this bulk action',
    );
  }
}

export async function executeBulkAction(
  input: BulkActionInput,
  actorId?: string,
): Promise<BulkResult> {
  const succeeded: string[] = [];
  const failed: BulkFailure[] = [];

  // Pre-fetch all tasks
  const allTasks = await db
    .select()
    .from(tasks)
    .where(and(inArray(tasks.id, input.ids), isNull(tasks.deletedAt)));

  const taskMap = new Map(allTasks.map((t) => [t.id, t]));

  for (const taskId of input.ids) {
    try {
      const task = taskMap.get(taskId);
      if (!task) {
        failed.push({ id: taskId, error: { code: 'NOT_FOUND', message: 'Task not found' } });
        continue;
      }

      switch (input.action) {
        case 'updateStatus': {
          const statusId = input.data?.statusId;
          if (!statusId) {
            failed.push({
              id: taskId,
              error: { code: 'BAD_REQUEST', message: 'statusId is required' },
            });
            continue;
          }
          // Validate status belongs to the task's project
          const statusCheck = await db
            .select({ id: workflowStatuses.id })
            .from(workflowStatuses)
            .innerJoin(workflows, eq(workflows.id, workflowStatuses.workflowId))
            .where(and(eq(workflowStatuses.id, statusId), eq(workflows.projectId, task.projectId)))
            .limit(1);

          if (statusCheck.length === 0) {
            failed.push({
              id: taskId,
              error: { code: 'UNPROCESSABLE_ENTITY', message: 'Status not in project workflow' },
            });
            continue;
          }

          // Enforce transition guard for final/validated statuses
          if (statusId !== task.statusId) {
            await validateStatusTransition(taskId, statusId, task.projectId);
          }

          await db
            .update(tasks)
            .set({ statusId, updatedAt: new Date() })
            .where(eq(tasks.id, taskId));
          if (actorId) {
            const orgId = await getOrgIdForProject(task.projectId);
            if (orgId) {
              await activityService.log({
                organizationId: orgId,
                actorId,
                entityType: 'task',
                entityId: taskId,
                action: 'status_changed',
                changes: { statusId: { before: task.statusId, after: statusId } },
              });
            }
          }
          succeeded.push(taskId);
          break;
        }

        case 'assign': {
          const assigneeId = input.data?.assigneeId ?? null;
          if (assigneeId) {
            await ensureAssigneeProjectMembership(assigneeId, task.projectId);
          }
          await db
            .update(tasks)
            .set({ assigneeId, updatedAt: new Date() })
            .where(eq(tasks.id, taskId));
          if (actorId) {
            const orgId = await getOrgIdForProject(task.projectId);
            if (orgId) {
              await activityService.log({
                organizationId: orgId,
                actorId,
                entityType: 'task',
                entityId: taskId,
                action: 'assigned',
                changes: { assigneeId: { before: task.assigneeId, after: assigneeId } },
              });
            }
          }
          succeeded.push(taskId);
          break;
        }

        case 'updatePriority': {
          const priority = input.data?.priority;
          if (!priority) {
            failed.push({
              id: taskId,
              error: { code: 'BAD_REQUEST', message: 'priority is required' },
            });
            continue;
          }
          await db
            .update(tasks)
            .set({ priority, updatedAt: new Date() })
            .where(eq(tasks.id, taskId));
          if (actorId) {
            const orgId = await getOrgIdForProject(task.projectId);
            if (orgId) {
              await activityService.log({
                organizationId: orgId,
                actorId,
                entityType: 'task',
                entityId: taskId,
                action: 'updated',
                changes: { priority: { before: task.priority, after: priority } },
              });
            }
          }
          succeeded.push(taskId);
          break;
        }

        case 'addLabel': {
          const labelId = input.data?.labelId;
          if (!labelId) {
            failed.push({
              id: taskId,
              error: { code: 'BAD_REQUEST', message: 'labelId is required' },
            });
            continue;
          }
          // Verify label belongs to the same project
          const labelCheck = await db
            .select({ id: labels.id })
            .from(labels)
            .where(and(eq(labels.id, labelId), eq(labels.projectId, task.projectId)))
            .limit(1);

          if (labelCheck.length === 0) {
            failed.push({
              id: taskId,
              error: { code: 'UNPROCESSABLE_ENTITY', message: 'Label not in this project' },
            });
            continue;
          }

          // Skip if already attached
          const existingLabel = await db
            .select({ taskId: taskLabels.taskId })
            .from(taskLabels)
            .where(and(eq(taskLabels.taskId, taskId), eq(taskLabels.labelId, labelId)))
            .limit(1);

          if (existingLabel.length === 0) {
            await db.insert(taskLabels).values({ taskId, labelId });
          }
          if (actorId) {
            const orgId = await getOrgIdForProject(task.projectId);
            if (orgId) {
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
          succeeded.push(taskId);
          break;
        }

        case 'delete': {
          await db.update(tasks).set({ deletedAt: new Date() }).where(eq(tasks.id, taskId));
          if (actorId) {
            const orgId = await getOrgIdForProject(task.projectId);
            if (orgId) {
              await activityService.log({
                organizationId: orgId,
                actorId,
                entityType: 'task',
                entityId: taskId,
                action: 'deleted',
              });
            }
          }
          succeeded.push(taskId);
          break;
        }

        case 'moveToProject': {
          const targetProjectId = input.data?.projectId;
          if (!targetProjectId) {
            failed.push({
              id: taskId,
              error: { code: 'BAD_REQUEST', message: 'projectId is required' },
            });
            continue;
          }

          // Verify target project exists and is in the same org
          const sourceOrg = await getOrgIdForProject(task.projectId);
          const targetOrg = await getOrgIdForProject(targetProjectId);
          if (!targetOrg || sourceOrg !== targetOrg) {
            failed.push({
              id: taskId,
              error: {
                code: 'UNPROCESSABLE_ENTITY',
                message: 'Target project not in same organization',
              },
            });
            continue;
          }

          // Get initial status for target project
          const newStatusId = await getInitialStatusForProject(targetProjectId);
          if (!newStatusId) {
            failed.push({
              id: taskId,
              error: {
                code: 'UNPROCESSABLE_ENTITY',
                message: 'Target project has no initial status',
              },
            });
            continue;
          }

          // Move task: update project, status, clear labels
          if (task.assigneeId) {
            await ensureAssigneeProjectMembership(task.assigneeId, targetProjectId);
          }
          await db
            .update(tasks)
            .set({
              projectId: targetProjectId,
              statusId: newStatusId,
              updatedAt: new Date(),
            })
            .where(eq(tasks.id, taskId));

          // Clear labels (project-scoped)
          await db.delete(taskLabels).where(eq(taskLabels.taskId, taskId));

          if (actorId) {
            const orgId = await getOrgIdForProject(task.projectId);
            if (orgId) {
              await activityService.log({
                organizationId: orgId,
                actorId,
                entityType: 'task',
                entityId: taskId,
                action: 'moved_to_project',
                changes: { projectId: { before: task.projectId, after: targetProjectId } },
              });
            }
          }

          succeeded.push(taskId);
          break;
        }
      }
    } catch (err) {
      const message = err instanceof AppError ? err.message : 'Internal error';
      const code = err instanceof AppError ? err.code : 'INTERNAL_ERROR';
      const transitionDetails =
        err instanceof AppError && err.code === ErrorCode.TRANSITION_BLOCKED
          ? err.transitionDetails
          : undefined;
      failed.push({ id: taskId, error: { code, message, transitionDetails } });
    }
  }

  return { succeeded, failed, total: input.ids.length };
}
