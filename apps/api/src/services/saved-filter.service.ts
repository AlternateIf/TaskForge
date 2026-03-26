import crypto from 'node:crypto';
import { db, savedFilters } from '@taskforge/db';
import { and, eq } from 'drizzle-orm';
import { AppError, ErrorCode } from '../utils/errors.js';

export interface SavedFilterOutput {
  id: string;
  userId: string;
  organizationId: string;
  name: string;
  entityType: string;
  filters: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

function toOutput(row: typeof savedFilters.$inferSelect): SavedFilterOutput {
  return {
    id: row.id,
    userId: row.userId,
    organizationId: row.organizationId,
    name: row.name,
    entityType: row.entityType,
    filters: row.filters,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function createSavedFilter(
  userId: string,
  organizationId: string,
  input: { name: string; entityType: string; filters: Record<string, unknown> },
): Promise<SavedFilterOutput> {
  const id = crypto.randomUUID();
  const now = new Date();

  await db.insert(savedFilters).values({
    id,
    userId,
    organizationId,
    name: input.name,
    entityType: input.entityType,
    filters: input.filters,
    createdAt: now,
    updatedAt: now,
  });

  const rows = await db.select().from(savedFilters).where(eq(savedFilters.id, id)).limit(1);
  return toOutput(rows[0]);
}

export async function listSavedFilters(
  userId: string,
  organizationId: string,
): Promise<SavedFilterOutput[]> {
  const rows = await db
    .select()
    .from(savedFilters)
    .where(and(eq(savedFilters.userId, userId), eq(savedFilters.organizationId, organizationId)));

  return rows.map(toOutput);
}

export async function updateSavedFilter(
  filterId: string,
  userId: string,
  input: { name?: string; filters?: Record<string, unknown> },
): Promise<SavedFilterOutput> {
  const existing = await db
    .select()
    .from(savedFilters)
    .where(eq(savedFilters.id, filterId))
    .limit(1);

  if (existing.length === 0) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Saved filter not found');
  }

  if (existing[0].userId !== userId) {
    throw new AppError(403, ErrorCode.FORBIDDEN, 'Only the owner can update a saved filter');
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name !== undefined) updates.name = input.name;
  if (input.filters !== undefined) updates.filters = input.filters;

  await db.update(savedFilters).set(updates).where(eq(savedFilters.id, filterId));

  const rows = await db.select().from(savedFilters).where(eq(savedFilters.id, filterId)).limit(1);
  return toOutput(rows[0]);
}

export async function deleteSavedFilter(filterId: string, userId: string): Promise<void> {
  const existing = await db
    .select()
    .from(savedFilters)
    .where(eq(savedFilters.id, filterId))
    .limit(1);

  if (existing.length === 0) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Saved filter not found');
  }

  if (existing[0].userId !== userId) {
    throw new AppError(403, ErrorCode.FORBIDDEN, 'Only the owner can delete a saved filter');
  }

  await db.delete(savedFilters).where(eq(savedFilters.id, filterId));
}
