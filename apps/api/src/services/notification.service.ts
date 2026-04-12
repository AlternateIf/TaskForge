import { db, notificationPreferences, notifications } from '@taskforge/db';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { AppError, ErrorCode } from '../utils/errors.js';
import { hasOrgPermission } from './permission.service.js';

const DEFAULT_PREFERENCES: Record<string, { in_app: boolean; email: boolean }> = {
  task_assigned: { in_app: true, email: true },
  task_status_changed: { in_app: true, email: false },
  comment_mentioned: { in_app: true, email: true },
  task_deadline_approaching: { in_app: true, email: true },
};

// ── Notification CRUD ──────────────────────────────────────────────

export async function createNotification(input: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
}): Promise<void> {
  const id = crypto.randomUUID();
  await db.insert(notifications).values({
    id,
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
  });
}

export async function listNotifications(
  userId: string,
  cursor?: string,
  limit = 25,
  orgId?: string,
): Promise<{
  items: (typeof notifications.$inferSelect)[];
  cursor: string | null;
  hasMore: boolean;
}> {
  // Defense-in-depth: if orgId is provided, verify notification.read.org permission
  if (orgId) {
    const canRead = await hasOrgPermission(userId, orgId, 'notification', 'read');
    if (!canRead) {
      throw new AppError(
        403,
        ErrorCode.FORBIDDEN,
        'Insufficient permissions to read notifications in this organization',
      );
    }
  }

  const conditions = [eq(notifications.userId, userId)];
  if (cursor) {
    conditions.push(sql`${notifications.createdAt} < ${cursor}`);
  }

  const rows = await db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor =
    hasMore && items.length > 0 ? (items[items.length - 1].createdAt?.toISOString() ?? null) : null;

  return { items, cursor: nextCursor, hasMore };
}

export async function markAsRead(
  notificationId: string,
  userId: string,
  orgId?: string,
): Promise<void> {
  // Defense-in-depth: if orgId is provided, verify notification.read.org permission
  if (orgId) {
    const canRead = await hasOrgPermission(userId, orgId, 'notification', 'read');
    if (!canRead) {
      throw new AppError(
        403,
        ErrorCode.FORBIDDEN,
        'Insufficient permissions to read notifications in this organization',
      );
    }
  }

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

export async function markAllAsRead(userId: string, orgId?: string): Promise<void> {
  // Defense-in-depth: if orgId is provided, verify notification.read.org permission
  if (orgId) {
    const canRead = await hasOrgPermission(userId, orgId, 'notification', 'read');
    if (!canRead) {
      throw new AppError(
        403,
        ErrorCode.FORBIDDEN,
        'Insufficient permissions to read notifications in this organization',
      );
    }
  }

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}

export async function getUnreadCount(userId: string, orgId?: string): Promise<number> {
  // Defense-in-depth: if orgId is provided, verify notification.read.org permission
  if (orgId) {
    const canRead = await hasOrgPermission(userId, orgId, 'notification', 'read');
    if (!canRead) {
      throw new AppError(
        403,
        ErrorCode.FORBIDDEN,
        'Insufficient permissions to read notifications in this organization',
      );
    }
  }

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));

  return result[0]?.count ?? 0;
}

// ── Notification Preferences ───────────────────────────────────────

export async function getPreferences(
  userId: string,
  orgId?: string,
): Promise<Record<string, { in_app: boolean; email: boolean }>> {
  // Defense-in-depth: if orgId is provided, verify notification.read.org permission
  if (orgId) {
    const canRead = await hasOrgPermission(userId, orgId, 'notification', 'read');
    if (!canRead) {
      throw new AppError(
        403,
        ErrorCode.FORBIDDEN,
        'Insufficient permissions to read notifications in this organization',
      );
    }
  }

  const rows = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId));

  // Start from defaults
  const prefs: Record<string, { in_app: boolean; email: boolean }> = {};
  for (const [key, val] of Object.entries(DEFAULT_PREFERENCES)) {
    prefs[key] = { ...val };
  }

  // Apply user overrides
  for (const row of rows) {
    if (!prefs[row.eventType]) {
      prefs[row.eventType] = { in_app: true, email: true };
    }
    if (row.channel === 'in_app') prefs[row.eventType].in_app = row.enabled;
    if (row.channel === 'email') prefs[row.eventType].email = row.enabled;
  }

  return prefs;
}

export async function updatePreferences(
  userId: string,
  updates: Record<string, { in_app?: boolean; email?: boolean }>,
): Promise<Record<string, { in_app: boolean; email: boolean }>> {
  for (const [eventType, channels] of Object.entries(updates)) {
    for (const [channel, enabled] of Object.entries(channels)) {
      if (enabled === undefined) continue;

      // Upsert: check if preference exists
      const existing = await db
        .select()
        .from(notificationPreferences)
        .where(
          and(
            eq(notificationPreferences.userId, userId),
            eq(notificationPreferences.eventType, eventType),
            eq(notificationPreferences.channel, channel),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(notificationPreferences)
          .set({ enabled, updatedAt: new Date() })
          .where(eq(notificationPreferences.id, existing[0].id));
      } else {
        await db.insert(notificationPreferences).values({
          id: crypto.randomUUID(),
          userId,
          eventType,
          channel,
          enabled,
        });
      }
    }
  }

  return getPreferences(userId);
}

export async function isChannelEnabled(
  userId: string,
  eventType: string,
  channel: string,
): Promise<boolean> {
  const row = await db
    .select()
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.eventType, eventType),
        eq(notificationPreferences.channel, channel),
      ),
    )
    .limit(1);

  if (row.length > 0) return row[0].enabled;

  // Return default
  const defaults = DEFAULT_PREFERENCES[eventType];
  if (!defaults) return true;
  return channel === 'in_app' ? defaults.in_app : defaults.email;
}
