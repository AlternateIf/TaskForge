import { apiClient } from '@/api/client';
import { useAuthStore } from '@/stores/auth.store';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

type DashboardPriority = 'critical' | 'high' | 'medium' | 'low' | 'none' | string;

interface SuccessEnvelope<T> {
  data: T;
}

interface PaginatedEnvelope<T> {
  data: T[];
  meta: {
    cursor: string | null;
    hasMore: boolean;
    totalCount?: number;
  };
}

export interface DashboardTaskLabel {
  id: string;
  name: string;
  color: string | null;
}

export interface DashboardMyTaskItem {
  id: string;
  title: string;
  projectName: string;
  projectColor: string | null;
  priority: DashboardPriority;
  dueDate: string | null;
  labels?: DashboardTaskLabel[];
}

export interface DashboardUpcomingTaskItem {
  id: string;
  title: string;
  projectName: string;
  projectColor: string | null;
  priority: DashboardPriority;
  dueDate?: string | null;
}

export interface DashboardUpcomingDay {
  date: string;
  dayLabel: string;
  tasks: DashboardUpcomingTaskItem[];
  totalTaskCount: number;
}

export interface DashboardUpcomingResult {
  weekStart: string;
  weekEnd: string;
  days: DashboardUpcomingDay[];
}

export interface DashboardProjectProgressItem {
  id: string;
  name: string;
  color: string | null;
  progress: number;
  totalTasks: number;
  completedTasks: number;
}

export interface DashboardSummary {
  myTasksCount: number;
  overdueTasksCount: number;
  upcomingTasksCount: number;
  activeProjectsCount: number;
  completedTasksThisWeek: number;
}

export const dashboardKeys = {
  all: ['dashboard'] as const,
  myTasks: (orgId: string, params: { limit: number; cursor?: string }) =>
    [...dashboardKeys.all, orgId, 'my-tasks', params] as const,
  upcoming: (orgId: string, weekOffset: number) =>
    [...dashboardKeys.all, orgId, 'upcoming', weekOffset] as const,
  projectProgress: (orgId: string, params: { limit: number; cursor?: string }) =>
    [...dashboardKeys.all, orgId, 'project-progress', params] as const,
  summary: (orgId: string) => [...dashboardKeys.all, orgId, 'summary'] as const,
};

interface UseDashboardCursorOptions {
  limit?: number;
  cursor?: string;
  enabled?: boolean;
}

function buildCursorParams(limit: number, cursor?: string): string {
  const params = new URLSearchParams();
  params.set('limit', `${limit}`);
  if (cursor) params.set('cursor', cursor);
  return params.toString();
}

export function useDashboardMyTasks(options?: UseDashboardCursorOptions) {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const limit = options?.limit ?? 200;
  const cursor = options?.cursor;

  return useQuery({
    queryKey: dashboardKeys.myTasks(orgId ?? '', { limit, cursor }),
    queryFn: () => {
      const query = buildCursorParams(limit, cursor);
      return apiClient.get<PaginatedEnvelope<DashboardMyTaskItem>>(
        `/organizations/${orgId}/dashboard/tasks/my-tasks?${query}`,
      );
    },
    enabled: Boolean(orgId && (options?.enabled ?? true)),
  });
}

interface UseDashboardUpcomingOptions {
  enabled?: boolean;
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

function formatIsoDateUTC(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getWeekStartUTC(baseDate: Date): Date {
  const start = new Date(baseDate);
  const day = start.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  start.setUTCDate(start.getUTCDate() + diffToMonday);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

function buildWeekSkeleton(weekOffset: number): DashboardUpcomingResult {
  const weekStart = getWeekStartUTC(new Date());
  weekStart.setUTCDate(weekStart.getUTCDate() + weekOffset * 7);

  const days: DashboardUpcomingDay[] = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setUTCDate(weekStart.getUTCDate() + index);

    return {
      date: formatIsoDateUTC(date),
      dayLabel: DAY_NAMES[index],
      tasks: [],
      totalTaskCount: 0,
    };
  });

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);

  return {
    weekStart: formatIsoDateUTC(weekStart),
    weekEnd: formatIsoDateUTC(weekEnd),
    days,
  };
}

function isDashboardUpcomingResult(value: unknown): value is DashboardUpcomingResult {
  return (
    value !== null &&
    typeof value === 'object' &&
    'weekStart' in value &&
    'weekEnd' in value &&
    'days' in value
  );
}

function normalizeUpcomingPayload(
  response: SuccessEnvelope<DashboardUpcomingResult> | DashboardUpcomingResult,
): DashboardUpcomingResult {
  if (isDashboardUpcomingResult(response)) {
    return response;
  }

  if (isDashboardUpcomingResult(response.data)) {
    return response.data;
  }

  return {
    weekStart: '',
    weekEnd: '',
    days: [],
  };
}

function mapMyTasksToUpcomingWeek(
  items: DashboardMyTaskItem[],
  weekOffset: number,
): DashboardUpcomingResult {
  const week = buildWeekSkeleton(weekOffset);
  const byDay = new Map(week.days.map((day) => [day.date, [] as DashboardUpcomingTaskItem[]]));

  for (const task of items) {
    if (!task.dueDate) continue;
    const dueDateISO = formatIsoDateUTC(new Date(task.dueDate));
    const dayBucket = byDay.get(dueDateISO);
    if (!dayBucket) continue;

    dayBucket.push({
      id: task.id,
      title: task.title,
      projectName: task.projectName,
      projectColor: task.projectColor,
      priority: task.priority,
      dueDate: task.dueDate,
    });
  }

  return {
    weekStart: week.weekStart,
    weekEnd: week.weekEnd,
    days: week.days.map((day) => {
      const tasks = byDay.get(day.date) ?? [];
      return {
        ...day,
        tasks,
        totalTaskCount: tasks.length,
      };
    }),
  };
}

export function useDashboardUpcoming(weekOffset: number, options?: UseDashboardUpcomingOptions) {
  const orgId = useAuthStore((s) => s.activeOrganizationId);

  return useQuery({
    queryKey: dashboardKeys.upcoming(orgId ?? '', weekOffset),
    queryFn: async () => {
      const upcomingResponse = await apiClient.get<
        SuccessEnvelope<DashboardUpcomingResult> | DashboardUpcomingResult
      >(`/organizations/${orgId}/dashboard/tasks/upcoming?weekOffset=${weekOffset}`);

      const upcoming = normalizeUpcomingPayload(upcomingResponse);

      if (upcoming.days.length > 0) {
        return upcoming;
      }

      const myTasksFallback = await apiClient.get<PaginatedEnvelope<DashboardMyTaskItem>>(
        `/organizations/${orgId}/dashboard/tasks/my-tasks?${buildCursorParams(200)}`,
      );

      return mapMyTasksToUpcomingWeek(myTasksFallback.data, weekOffset);
    },
    enabled: Boolean(orgId && (options?.enabled ?? true)),
    placeholderData: keepPreviousData,
  });
}

export function useDashboardProjectProgress(options?: UseDashboardCursorOptions) {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const limit = options?.limit ?? 200;
  const cursor = options?.cursor;

  return useQuery({
    queryKey: dashboardKeys.projectProgress(orgId ?? '', { limit, cursor }),
    queryFn: () => {
      const query = buildCursorParams(limit, cursor);
      return apiClient.get<PaginatedEnvelope<DashboardProjectProgressItem>>(
        `/organizations/${orgId}/dashboard/projects/progress?${query}`,
      );
    },
    enabled: Boolean(orgId && (options?.enabled ?? true)),
  });
}

export function useDashboardSummary(options?: { enabled?: boolean }) {
  const orgId = useAuthStore((s) => s.activeOrganizationId);

  return useQuery({
    queryKey: dashboardKeys.summary(orgId ?? ''),
    queryFn: () =>
      apiClient
        .get<SuccessEnvelope<DashboardSummary>>(`/organizations/${orgId}/dashboard/summary`)
        .then((response) => response.data),
    enabled: Boolean(orgId && (options?.enabled ?? true)),
  });
}
