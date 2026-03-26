import crypto from 'node:crypto';
import { activityLog, db, users } from '@taskforge/db';
import { and, desc, eq, lt } from 'drizzle-orm';

export interface LogActivityInput {
  organizationId: string;
  actorId: string;
  entityType: string;
  entityId: string;
  action: string;
  changes?: Record<string, { before: unknown; after: unknown }>;
}

export interface ActivityOutput {
  id: string;
  organizationId: string;
  actorId: string | null;
  actorDisplay: string;
  entityType: string;
  entityId: string;
  action: string;
  changes: Record<string, { before: unknown; after: unknown }> | null;
  createdAt: string;
}

function toOutput(row: typeof activityLog.$inferSelect): ActivityOutput {
  return {
    id: row.id,
    organizationId: row.organizationId,
    actorId: row.actorId,
    actorDisplay: row.actorDisplay,
    entityType: row.entityType,
    entityId: row.entityId,
    action: row.action,
    changes: row.changes ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

async function resolveActorDisplay(actorId: string): Promise<string> {
  const result = await db
    .select({ displayName: users.displayName })
    .from(users)
    .where(eq(users.id, actorId))
    .limit(1);

  return result.length > 0 ? result[0].displayName : 'Unknown User';
}

export async function log(input: LogActivityInput): Promise<void> {
  const actorDisplay = await resolveActorDisplay(input.actorId);
  const now = new Date();

  await db.insert(activityLog).values({
    id: crypto.randomUUID(),
    organizationId: input.organizationId,
    actorId: input.actorId,
    actorDisplay,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    changes: input.changes ?? null,
    createdAt: now,
  });
}

interface ListActivityOptions {
  entityType: string;
  entityId: string;
  cursor?: string;
  limit?: number;
}

export async function listActivity(
  options: ListActivityOptions,
): Promise<{ items: ActivityOutput[]; cursor: string | null; hasMore: boolean }> {
  const limit = Math.min(options.limit ?? 25, 100);
  const fetchCount = limit + 1;

  const conditions = [
    eq(activityLog.entityType, options.entityType),
    eq(activityLog.entityId, options.entityId),
  ];

  if (options.cursor) {
    const cursorDate = new Date(Buffer.from(options.cursor, 'base64url').toString());
    conditions.push(lt(activityLog.createdAt, cursorDate));
  }

  const rows = await db
    .select()
    .from(activityLog)
    .where(and(...conditions))
    .orderBy(desc(activityLog.createdAt))
    .limit(fetchCount);

  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit).map(toOutput);

  let cursor: string | null = null;
  if (hasMore && items.length > 0) {
    const lastItem = items[items.length - 1];
    cursor = Buffer.from(lastItem.createdAt).toString('base64url');
  }

  return { items, cursor, hasMore };
}

interface ListOrgActivityOptions {
  organizationId: string;
  cursor?: string;
  limit?: number;
}

export async function listOrgActivity(
  options: ListOrgActivityOptions,
): Promise<{ items: ActivityOutput[]; cursor: string | null; hasMore: boolean }> {
  const limit = Math.min(options.limit ?? 25, 100);
  const fetchCount = limit + 1;

  const conditions = [eq(activityLog.organizationId, options.organizationId)];

  if (options.cursor) {
    const cursorDate = new Date(Buffer.from(options.cursor, 'base64url').toString());
    conditions.push(lt(activityLog.createdAt, cursorDate));
  }

  const rows = await db
    .select()
    .from(activityLog)
    .where(and(...conditions))
    .orderBy(desc(activityLog.createdAt))
    .limit(fetchCount);

  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit).map(toOutput);

  let cursor: string | null = null;
  if (hasMore && items.length > 0) {
    const lastItem = items[items.length - 1];
    cursor = Buffer.from(lastItem.createdAt).toString('base64url');
  }

  return { items, cursor, hasMore };
}
