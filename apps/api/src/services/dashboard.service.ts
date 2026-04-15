import { db, projects, tasks, workflowStatuses } from '@taskforge/db';
import { and, asc, count, eq, gte, isNotNull, isNull, lte, ne, sql } from 'drizzle-orm';
import { checkPermission, loadPermissionContext } from './permission.service.js';
import type { PermissionContext } from './permission.service.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DashboardMyTaskItem {
  id: string;
  title: string;
  projectName: string;
  projectColor: string | null;
  priority: string;
  dueDate: string | null;
}

export interface DashboardMyTasksPage {
  items: DashboardMyTaskItem[];
  cursor: string | null;
  hasMore: boolean;
  totalCount: number;
}

export interface DashboardUpcomingTaskItem {
  id: string;
  title: string;
  projectName: string;
  projectColor: string | null;
  priority: string;
}

export interface DashboardDayGroup {
  date: string; // ISO date string (YYYY-MM-DD)
  dayLabel: string; // Human-readable day name
  tasks: DashboardUpcomingTaskItem[];
  totalTaskCount: number;
}

export interface DashboardUpcomingResult {
  weekStart: string; // ISO date
  weekEnd: string; // ISO date
  days: DashboardDayGroup[];
}

export interface DashboardProjectProgressItem {
  id: string;
  name: string;
  color: string | null;
  progress: number; // 0-100
  totalTasks: number;
  completedTasks: number;
}

export interface DashboardProjectProgressPage {
  items: DashboardProjectProgressItem[];
  cursor: string | null;
  hasMore: boolean;
  totalCount: number;
}

export interface DashboardSummary {
  myTasksCount: number;
  overdueTasksCount: number;
  upcomingTasksCount: number;
  activeProjectsCount: number;
  completedTasksThisWeek: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get the start of the ISO week (Monday) for a given date.
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  // getUTCDay() returns 0=Sunday, 1=Monday, ..., 6=Saturday
  // We want Monday as start of week
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function formatDateISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Service: My Tasks (paginated, sorted by due date asc then priority)
// ---------------------------------------------------------------------------

export async function getMyTasks(
  orgId: string,
  userId: string,
  options: {
    limit?: number;
    cursor?: string;
  } = {},
): Promise<DashboardMyTasksPage> {
  const limit = Math.max(1, Math.min(200, options.limit ?? 50));
  const cursor = options.cursor;

  // Load permission context for the org
  const permCtx = await loadPermissionContext(userId, orgId);
  if (!permCtx) {
    return { items: [], cursor: null, hasMore: false, totalCount: 0 };
  }

  // Get all projects in the org where the user has task.read permission
  const accessibleProjectIds = await getAccessibleProjectIds(orgId, userId, permCtx);

  if (accessibleProjectIds.length === 0) {
    return { items: [], cursor: null, hasMore: false, totalCount: 0 };
  }

  // Build conditions
  const conditions = [
    eq(tasks.assigneeId, userId),
    isNull(tasks.deletedAt),
    isNull(tasks.parentTaskId),
    ne(projects.status, 'archived'),
    sql`${tasks.projectId} IN (${sql.join(
      accessibleProjectIds.map((id) => sql`${id}`),
      sql`, `,
    )})`,
  ];

  // Count total matching tasks
  const countResult = await db
    .select({ count: count(tasks.id) })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(and(...conditions));

  const totalCount = countResult[0]?.count ?? 0;

  // Fetch paginated results sorted by due date ASC (nulls last), then priority
  // We use a subquery approach with COALESCE for null due dates
  const fetchLimit = limit + 1; // +1 to detect hasMore

  // Cursor-based pagination: cursor encodes {id, dueDate, priority}
  if (cursor) {
    try {
      const payload = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf-8'));
      if (payload?.id) {
        // Re-fetch with cursor condition
        // We need tasks that come after the cursor position
        const cursorDueDate = payload.dueDate ?? null;
        const cursorPriority = payload.priority ?? 'none';
        const cursorId = payload.id;

        const cursorDueDateValue = cursorDueDate ? sql`${new Date(cursorDueDate)}` : sql`NULL`;

        // Compound cursor: (dueDate, priority, id) > (cursor values)
        // Using COALESCE for null handling
        conditions.push(
          sql`(
            COALESCE(${tasks.dueDate}, '9999-12-31T23:59:59') > COALESCE(${cursorDueDateValue}, '9999-12-31T23:59:59')
            OR (
              COALESCE(${tasks.dueDate}, '9999-12-31T23:59:59') = COALESCE(${cursorDueDateValue}, '9999-12-31T23:59:59')
              AND CASE ${tasks.priority}
                WHEN 'critical' THEN 0
                WHEN 'high' THEN 1
                WHEN 'medium' THEN 2
                WHEN 'low' THEN 3
                WHEN 'none' THEN 4
                ELSE 5 END > CASE ${sql.raw(`'${cursorPriority}'`)}
                WHEN 'critical' THEN 0
                WHEN 'high' THEN 1
                WHEN 'medium' THEN 2
                WHEN 'low' THEN 3
                WHEN 'none' THEN 4
                ELSE 5 END
            )
            OR (
              COALESCE(${tasks.dueDate}, '9999-12-31T23:59:59') = COALESCE(${cursorDueDateValue}, '9999-12-31T23:59:59')
              AND CASE ${tasks.priority}
                WHEN 'critical' THEN 0
                WHEN 'high' THEN 1
                WHEN 'medium' THEN 2
                WHEN 'low' THEN 3
                WHEN 'none' THEN 4
                ELSE 5 END = CASE ${sql.raw(`'${cursorPriority}'`)}
                WHEN 'critical' THEN 0
                WHEN 'high' THEN 1
                WHEN 'medium' THEN 2
                WHEN 'low' THEN 3
                WHEN 'none' THEN 4
                ELSE 5 END
              AND ${tasks.id} > ${cursorId}
            )
          )`,
        );
      }
    } catch {
      // Invalid cursor — ignore and start from beginning
    }
  }

  const query = db
    .select({
      id: tasks.id,
      title: tasks.title,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      projectName: projects.name,
      projectColor: projects.color,
    })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(and(...conditions))
    .orderBy(
      asc(sql`COALESCE(${tasks.dueDate}, '9999-12-31T23:59:59')`),
      asc(sql`CASE ${tasks.priority}
        WHEN 'critical' THEN 0
        WHEN 'high' THEN 1
        WHEN 'medium' THEN 2
        WHEN 'low' THEN 3
        WHEN 'none' THEN 4
        ELSE 5 END`),
      asc(tasks.id),
    )
    .limit(fetchLimit);

  const rows = await query;

  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit).map((row) => ({
    id: row.id,
    title: row.title,
    projectName: row.projectName,
    projectColor: row.projectColor ?? null,
    priority: row.priority,
    dueDate: row.dueDate ? row.dueDate.toISOString() : null,
  }));

  let nextCursor: string | null = null;
  if (hasMore && items.length > 0) {
    const last = items[items.length - 1];
    nextCursor = Buffer.from(
      JSON.stringify({
        id: last.id,
        dueDate: last.dueDate,
        priority: last.priority,
      }),
    ).toString('base64url');
  }

  return { items, cursor: nextCursor, hasMore, totalCount };
}

// ---------------------------------------------------------------------------
// Service: Upcoming Tasks (grouped by day, week-offset aware)
// ---------------------------------------------------------------------------

export async function getUpcomingTasks(
  orgId: string,
  userId: string,
  options: {
    weekOffset?: number;
  } = {},
): Promise<DashboardUpcomingResult> {
  const weekOffset = Math.max(0, options.weekOffset ?? 0);

  // Load permission context
  const permCtx = await loadPermissionContext(userId, orgId);
  if (!permCtx) {
    return { weekStart: '', weekEnd: '', days: [] };
  }

  // Get accessible projects
  const accessibleProjectIds = await getAccessibleProjectIds(orgId, userId, permCtx);

  if (accessibleProjectIds.length === 0) {
    return { weekStart: '', weekEnd: '', days: [] };
  }

  // Calculate the week range (Monday to Sunday)
  const now = new Date();
  const weekStart = getWeekStart(now);
  weekStart.setUTCDate(weekStart.getUTCDate() + weekOffset * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);

  const weekStartISO = formatDateISO(weekStart);
  const weekEndISO = formatDateISO(weekEnd);

  // Query tasks due in the week range, assigned to user, not completed, not deleted, not subtask
  // "Not completed" = workflow status isFinal = false
  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      projectName: projects.name,
      projectColor: projects.color,
      isFinal: workflowStatuses.isFinal,
    })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .innerJoin(workflowStatuses, eq(tasks.statusId, workflowStatuses.id))
    .where(
      and(
        eq(tasks.assigneeId, userId),
        isNull(tasks.deletedAt),
        isNull(tasks.parentTaskId),
        ne(projects.status, 'archived'),
        isNotNull(tasks.dueDate),
        gte(tasks.dueDate, weekStart),
        lte(tasks.dueDate, weekEnd),
        eq(workflowStatuses.isFinal, false),
        sql`${tasks.projectId} IN (${sql.join(
          accessibleProjectIds.map((id) => sql`${id}`),
          sql`, `,
        )})`,
      ),
    )
    .orderBy(
      asc(tasks.dueDate),
      asc(sql`CASE ${tasks.priority}
        WHEN 'critical' THEN 0
        WHEN 'high' THEN 1
        WHEN 'medium' THEN 2
        WHEN 'low' THEN 3
        WHEN 'none' THEN 4
        ELSE 5 END`),
    );

  // Group by day
  const dayMap = new Map<string, DashboardUpcomingTaskItem[]>();

  // Initialize all days of the week
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setUTCDate(weekStart.getUTCDate() + i);
    const key = formatDateISO(d);
    dayMap.set(key, []);
  }

  // Assign tasks to days
  for (const row of rows) {
    const dayKey = row.dueDate ? formatDateISO(row.dueDate) : null;
    if (dayKey && dayMap.has(dayKey)) {
      dayMap.get(dayKey)?.push({
        id: row.id,
        title: row.title,
        projectName: row.projectName,
        projectColor: row.projectColor ?? null,
        priority: row.priority,
      });
    }
  }

  // Build day groups (cap at 20 per day)
  const days: DashboardDayGroup[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setUTCDate(weekStart.getUTCDate() + i);
    const key = formatDateISO(d);
    const dayTasks = dayMap.get(key) ?? [];
    const dayOfWeek = d.getUTCDay(); // 0=Sun
    // Convert to Monday=0 based index
    const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    days.push({
      date: key,
      dayLabel: DAY_NAMES[dayIndex] ?? key,
      tasks: dayTasks.slice(0, 20),
      totalTaskCount: dayTasks.length,
    });
  }

  return {
    weekStart: weekStartISO,
    weekEnd: weekEndISO,
    days,
  };
}

// ---------------------------------------------------------------------------
// Service: Project Progress
// ---------------------------------------------------------------------------

export async function getProjectProgress(
  orgId: string,
  userId: string,
  options: {
    limit?: number;
    cursor?: string;
  } = {},
): Promise<DashboardProjectProgressPage> {
  const limit = Math.max(1, Math.min(200, options.limit ?? 10));
  const cursor = options.cursor;

  // Load permission context
  const permCtx = await loadPermissionContext(userId, orgId);
  if (!permCtx) {
    return { items: [], cursor: null, hasMore: false, totalCount: 0 };
  }

  // Get accessible projects
  const accessibleProjectIds = await getAccessibleProjectIds(orgId, userId, permCtx);

  if (accessibleProjectIds.length === 0) {
    return { items: [], cursor: null, hasMore: false, totalCount: 0 };
  }

  // Query active projects in this org that the user can access
  const conditions = [
    eq(projects.organizationId, orgId),
    eq(projects.status, 'active'),
    isNull(projects.deletedAt),
    sql`${projects.id} IN (${sql.join(
      accessibleProjectIds.map((id) => sql`${id}`),
      sql`, `,
    )})`,
  ];

  if (cursor) {
    try {
      const payload = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf-8'));
      if (payload?.id) {
        conditions.push(sql`${projects.id} > ${payload.id}`);
      }
    } catch {
      // Invalid cursor — start from beginning
    }
  }

  const fetchLimit = limit + 1;

  const projectRows = await db
    .select({
      id: projects.id,
      name: projects.name,
      color: projects.color,
    })
    .from(projects)
    .where(and(...conditions))
    .orderBy(asc(projects.id))
    .limit(fetchLimit);

  const hasMore = projectRows.length > limit;
  const paged = projectRows.slice(0, limit);

  if (paged.length === 0) {
    return { items: [], cursor: null, hasMore: false, totalCount: 0 };
  }

  // Get task counts for these projects
  const projectIds = paged.map((p) => p.id);

  // Total tasks per project (non-deleted, non-subtask)
  const totalRows = await db
    .select({
      projectId: tasks.projectId,
      count: count(tasks.id),
    })
    .from(tasks)
    .where(
      and(
        sql`${tasks.projectId} IN (${sql.join(
          projectIds.map((id) => sql`${id}`),
          sql`, `,
        )})`,
        isNull(tasks.deletedAt),
        isNull(tasks.parentTaskId),
      ),
    )
    .groupBy(tasks.projectId);

  const totalMap = new Map(totalRows.map((r) => [r.projectId, r.count]));

  // Completed tasks per project (non-deleted, non-subtask, isFinal status)
  const completedRows = await db
    .select({
      projectId: tasks.projectId,
      count: count(tasks.id),
    })
    .from(tasks)
    .innerJoin(workflowStatuses, eq(tasks.statusId, workflowStatuses.id))
    .where(
      and(
        sql`${tasks.projectId} IN (${sql.join(
          projectIds.map((id) => sql`${id}`),
          sql`, `,
        )})`,
        isNull(tasks.deletedAt),
        isNull(tasks.parentTaskId),
        eq(workflowStatuses.isFinal, true),
      ),
    )
    .groupBy(tasks.projectId);

  const completedMap = new Map(completedRows.map((r) => [r.projectId, r.count]));

  // Build results
  const items = paged.map((p) => {
    const totalTasks = totalMap.get(p.id) ?? 0;
    const completedTasks = completedMap.get(p.id) ?? 0;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      id: p.id,
      name: p.name,
      color: p.color ?? null,
      progress,
      totalTasks,
      completedTasks,
    };
  });

  // Total count of all matching projects (for meta)
  const countResult = await db
    .select({ count: count(projects.id) })
    .from(projects)
    .where(
      and(
        eq(projects.organizationId, orgId),
        eq(projects.status, 'active'),
        isNull(projects.deletedAt),
        sql`${projects.id} IN (${sql.join(
          accessibleProjectIds.map((id) => sql`${id}`),
          sql`, `,
        )})`,
      ),
    );

  const totalCount = countResult[0]?.count ?? 0;

  let nextCursor: string | null = null;
  if (hasMore && paged.length > 0) {
    const last = paged[paged.length - 1];
    nextCursor = Buffer.from(JSON.stringify({ id: last.id })).toString('base64url');
  }

  return { items, cursor: nextCursor, hasMore, totalCount };
}

// ---------------------------------------------------------------------------
// Service: Summary
// ---------------------------------------------------------------------------

export async function getDashboardSummary(
  orgId: string,
  userId: string,
): Promise<DashboardSummary> {
  // Load permission context
  const permCtx = await loadPermissionContext(userId, orgId);
  if (!permCtx) {
    return {
      myTasksCount: 0,
      overdueTasksCount: 0,
      upcomingTasksCount: 0,
      activeProjectsCount: 0,
      completedTasksThisWeek: 0,
    };
  }

  // Get accessible projects
  const accessibleProjectIds = await getAccessibleProjectIds(orgId, userId, permCtx);

  if (accessibleProjectIds.length === 0) {
    return {
      myTasksCount: 0,
      overdueTasksCount: 0,
      upcomingTasksCount: 0,
      activeProjectsCount: 0,
      completedTasksThisWeek: 0,
    };
  }

  const projectFilter = sql`${tasks.projectId} IN (${sql.join(
    accessibleProjectIds.map((id) => sql`${id}`),
    sql`, `,
  )})`;
  const now = new Date();
  const weekStart = getWeekStart(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);

  // My tasks count (assigned to me, not deleted, not subtask, non-final status)
  const myTasksCountResult = await db
    .select({ count: count(tasks.id) })
    .from(tasks)
    .innerJoin(workflowStatuses, eq(tasks.statusId, workflowStatuses.id))
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(
      and(
        eq(tasks.assigneeId, userId),
        isNull(tasks.deletedAt),
        isNull(tasks.parentTaskId),
        ne(projects.status, 'archived'),
        eq(workflowStatuses.isFinal, false),
        projectFilter,
      ),
    );
  const myTasksCount = myTasksCountResult[0]?.count ?? 0;

  // Overdue tasks (due before now, not completed)
  const overdueResult = await db
    .select({ count: count(tasks.id) })
    .from(tasks)
    .innerJoin(workflowStatuses, eq(tasks.statusId, workflowStatuses.id))
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(
      and(
        eq(tasks.assigneeId, userId),
        isNull(tasks.deletedAt),
        isNull(tasks.parentTaskId),
        ne(projects.status, 'archived'),
        eq(workflowStatuses.isFinal, false),
        isNotNull(tasks.dueDate),
        lte(tasks.dueDate, now),
        projectFilter,
      ),
    );
  const overdueTasksCount = overdueResult[0]?.count ?? 0;

  // Upcoming tasks (due this week, not completed)
  const upcomingResult = await db
    .select({ count: count(tasks.id) })
    .from(tasks)
    .innerJoin(workflowStatuses, eq(tasks.statusId, workflowStatuses.id))
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(
      and(
        eq(tasks.assigneeId, userId),
        isNull(tasks.deletedAt),
        isNull(tasks.parentTaskId),
        ne(projects.status, 'archived'),
        eq(workflowStatuses.isFinal, false),
        isNotNull(tasks.dueDate),
        gte(tasks.dueDate, weekStart),
        lte(tasks.dueDate, weekEnd),
        projectFilter,
      ),
    );
  const upcomingTasksCount = upcomingResult[0]?.count ?? 0;

  // Active projects count
  const activeProjectsResult = await db
    .select({ count: count(projects.id) })
    .from(projects)
    .where(
      and(
        eq(projects.organizationId, orgId),
        eq(projects.status, 'active'),
        isNull(projects.deletedAt),
        sql`${projects.id} IN (${sql.join(
          accessibleProjectIds.map((id) => sql`${id}`),
          sql`, `,
        )})`,
      ),
    );
  const activeProjectsCount = activeProjectsResult[0]?.count ?? 0;

  // Completed tasks this week (tasks that moved to a final status this week)
  const completedThisWeekResult = await db
    .select({ count: count(tasks.id) })
    .from(tasks)
    .innerJoin(workflowStatuses, eq(tasks.statusId, workflowStatuses.id))
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(
      and(
        eq(tasks.assigneeId, userId),
        isNull(tasks.deletedAt),
        isNull(tasks.parentTaskId),
        ne(projects.status, 'archived'),
        eq(workflowStatuses.isFinal, true),
        gte(tasks.updatedAt, weekStart),
        lte(tasks.updatedAt, weekEnd),
        projectFilter,
      ),
    );
  const completedTasksThisWeek = completedThisWeekResult[0]?.count ?? 0;

  return {
    myTasksCount,
    overdueTasksCount,
    upcomingTasksCount,
    activeProjectsCount,
    completedTasksThisWeek,
  };
}

// ---------------------------------------------------------------------------
// Helper: Get project IDs the user can read tasks in
// ---------------------------------------------------------------------------

async function getAccessibleProjectIds(
  orgId: string,
  userId: string,
  permCtx: PermissionContext,
): Promise<string[]> {
  // Get all active projects in the org
  const orgProjects = await db
    .select({
      id: projects.id,
    })
    .from(projects)
    .where(
      and(
        eq(projects.organizationId, orgId),
        ne(projects.status, 'archived'),
        isNull(projects.deletedAt),
      ),
    );

  // Filter by task.read permission per project
  const accessibleIds: string[] = [];
  for (const project of orgProjects) {
    const canRead = await checkPermission(permCtx, userId, 'task', 'read', project.id);
    if (canRead) {
      accessibleIds.push(project.id);
    }
  }

  return accessibleIds;
}
