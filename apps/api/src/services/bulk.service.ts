import {
  db,
  labels,
  projects,
  taskLabels,
  tasks,
  workflowStatuses,
  workflows,
} from '@taskforge/db';
import type { BulkActionInput } from '@taskforge/shared';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { AppError } from '../utils/errors.js';

interface BulkFailure {
  id: string;
  error: { code: string; message: string };
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

export async function executeBulkAction(input: BulkActionInput): Promise<BulkResult> {
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

          await db
            .update(tasks)
            .set({ statusId, updatedAt: new Date() })
            .where(eq(tasks.id, taskId));
          succeeded.push(taskId);
          break;
        }

        case 'assign': {
          const assigneeId = input.data?.assigneeId ?? null;
          await db
            .update(tasks)
            .set({ assigneeId, updatedAt: new Date() })
            .where(eq(tasks.id, taskId));
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
          succeeded.push(taskId);
          break;
        }

        case 'delete': {
          await db.update(tasks).set({ deletedAt: new Date() }).where(eq(tasks.id, taskId));
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

          succeeded.push(taskId);
          break;
        }
      }
    } catch (err) {
      const message = err instanceof AppError ? err.message : 'Internal error';
      const code = err instanceof AppError ? err.code : 'INTERNAL_ERROR';
      failed.push({ id: taskId, error: { code, message } });
    }
  }

  return { succeeded, failed, total: input.ids.length };
}
