import crypto from 'node:crypto';
import { checklistItems, checklists, db, tasks } from '@taskforge/db';
import type {
  CreateChecklistInput,
  CreateChecklistItemInput,
  UpdateChecklistInput,
  UpdateChecklistItemInput,
} from '@taskforge/shared';
import { and, eq, isNull } from 'drizzle-orm';
import { AppError, ErrorCode } from '../utils/errors.js';

export interface ChecklistItemOutput {
  id: string;
  checklistId: string;
  title: string;
  isCompleted: boolean;
  position: number;
  completedBy: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistOutput {
  id: string;
  taskId: string;
  title: string;
  position: number;
  createdAt: string;
  items: ChecklistItemOutput[];
}

function toItemOutput(i: typeof checklistItems.$inferSelect): ChecklistItemOutput {
  return {
    id: i.id,
    checklistId: i.checklistId,
    title: i.title,
    isCompleted: i.isCompleted,
    position: i.position,
    completedBy: i.completedBy ?? null,
    completedAt: i.completedAt ? i.completedAt.toISOString() : null,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  };
}

async function requireTask(taskId: string): Promise<void> {
  const result = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt)))
    .limit(1);
  if (result.length === 0) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Task not found');
  }
}

// --- Checklists ---

export async function createChecklist(
  taskId: string,
  input: CreateChecklistInput,
): Promise<ChecklistOutput> {
  await requireTask(taskId);

  const id = crypto.randomUUID();
  const now = new Date();

  // Get next position
  const existing = await db
    .select({ position: checklists.position })
    .from(checklists)
    .where(eq(checklists.taskId, taskId))
    .orderBy(checklists.position);

  const position = existing.length > 0 ? existing[existing.length - 1].position + 1 : 0;

  await db.insert(checklists).values({
    id,
    taskId,
    title: input.title,
    position,
    createdAt: now,
  });

  return { id, taskId, title: input.title, position, createdAt: now.toISOString(), items: [] };
}

export async function listChecklists(taskId: string): Promise<ChecklistOutput[]> {
  const result = await db
    .select()
    .from(checklists)
    .where(eq(checklists.taskId, taskId))
    .orderBy(checklists.position);

  const output: ChecklistOutput[] = [];
  for (const cl of result) {
    const items = await db
      .select()
      .from(checklistItems)
      .where(eq(checklistItems.checklistId, cl.id))
      .orderBy(checklistItems.position);

    output.push({
      id: cl.id,
      taskId: cl.taskId,
      title: cl.title,
      position: cl.position,
      createdAt: cl.createdAt.toISOString(),
      items: items.map(toItemOutput),
    });
  }

  return output;
}

export async function updateChecklist(
  checklistId: string,
  input: UpdateChecklistInput,
): Promise<ChecklistOutput> {
  const existing = await db
    .select()
    .from(checklists)
    .where(eq(checklists.id, checklistId))
    .limit(1);

  if (existing.length === 0) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Checklist not found');
  }

  const updates: Record<string, unknown> = {};
  if (input.title !== undefined) updates.title = input.title;
  if (input.position !== undefined) updates.position = input.position;

  if (Object.keys(updates).length > 0) {
    await db.update(checklists).set(updates).where(eq(checklists.id, checklistId));
  }

  const items = await db
    .select()
    .from(checklistItems)
    .where(eq(checklistItems.checklistId, checklistId))
    .orderBy(checklistItems.position);

  const cl = { ...existing[0], ...updates };
  return {
    id: cl.id as string,
    taskId: cl.taskId as string,
    title: cl.title as string,
    position: cl.position as number,
    createdAt: (existing[0].createdAt as Date).toISOString(),
    items: items.map(toItemOutput),
  };
}

export async function deleteChecklist(checklistId: string): Promise<void> {
  const existing = await db
    .select({ id: checklists.id })
    .from(checklists)
    .where(eq(checklists.id, checklistId))
    .limit(1);

  if (existing.length === 0) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Checklist not found');
  }

  // Cascade delete items
  await db.delete(checklistItems).where(eq(checklistItems.checklistId, checklistId));
  await db.delete(checklists).where(eq(checklists.id, checklistId));
}

// --- Checklist Items ---

export async function createChecklistItem(
  checklistId: string,
  input: CreateChecklistItemInput,
): Promise<ChecklistItemOutput> {
  const cl = await db
    .select({ id: checklists.id })
    .from(checklists)
    .where(eq(checklists.id, checklistId))
    .limit(1);

  if (cl.length === 0) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Checklist not found');
  }

  const existing = await db
    .select({ position: checklistItems.position })
    .from(checklistItems)
    .where(eq(checklistItems.checklistId, checklistId))
    .orderBy(checklistItems.position);

  const position = existing.length > 0 ? existing[existing.length - 1].position + 1 : 0;

  const id = crypto.randomUUID();
  const now = new Date();

  await db.insert(checklistItems).values({
    id,
    checklistId,
    title: input.title,
    isCompleted: false,
    position,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id,
    checklistId,
    title: input.title,
    isCompleted: false,
    position,
    completedBy: null,
    completedAt: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export async function updateChecklistItem(
  itemId: string,
  userId: string,
  input: UpdateChecklistItemInput,
): Promise<ChecklistItemOutput> {
  const existing = await db
    .select()
    .from(checklistItems)
    .where(eq(checklistItems.id, itemId))
    .limit(1);

  if (existing.length === 0) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Checklist item not found');
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (input.title !== undefined) updates.title = input.title;
  if (input.position !== undefined) updates.position = input.position;

  if (input.isCompleted !== undefined) {
    updates.isCompleted = input.isCompleted;
    if (input.isCompleted) {
      updates.completedBy = userId;
      updates.completedAt = new Date();
    } else {
      updates.completedBy = null;
      updates.completedAt = null;
    }
  }

  await db.update(checklistItems).set(updates).where(eq(checklistItems.id, itemId));

  const updated = await db
    .select()
    .from(checklistItems)
    .where(eq(checklistItems.id, itemId))
    .limit(1);

  return toItemOutput(updated[0]);
}

export async function deleteChecklistItem(itemId: string): Promise<void> {
  const existing = await db
    .select({ id: checklistItems.id })
    .from(checklistItems)
    .where(eq(checklistItems.id, itemId))
    .limit(1);

  if (existing.length === 0) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Checklist item not found');
  }

  await db.delete(checklistItems).where(eq(checklistItems.id, itemId));
}

// --- Helpers ---

export async function getTaskIdForChecklist(checklistId: string): Promise<string> {
  const result = await db
    .select({ taskId: checklists.taskId })
    .from(checklists)
    .where(eq(checklists.id, checklistId))
    .limit(1);

  if (result.length === 0) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Checklist not found');
  }
  return result[0].taskId;
}

export async function getTaskIdForChecklistItem(itemId: string): Promise<string> {
  const result = await db
    .select({ taskId: checklists.taskId })
    .from(checklistItems)
    .innerJoin(checklists, eq(checklistItems.checklistId, checklists.id))
    .where(eq(checklistItems.id, itemId))
    .limit(1);

  if (result.length === 0) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Checklist item not found');
  }
  return result[0].taskId;
}
