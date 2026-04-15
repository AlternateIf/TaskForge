import type {
  DashboardMyTaskItem,
  DashboardUpcomingDay,
  DashboardUpcomingTaskItem,
} from '@/api/dashboard';
import { Button } from '@/components/ui/button';
import { Link } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';

const DEFAULT_DAY_LIMIT = 20;

const PRIORITY_WEIGHT: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  none: 4,
};

function getPriorityWeight(priority: string): number {
  return PRIORITY_WEIGHT[priority.toLowerCase()] ?? 99;
}

function formatRangeDateLabel(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

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

function parseIsoDate(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return formatIsoDateUTC(date);
}

function buildFallbackDays(
  weekStart: string,
  fallbackTasks: DashboardMyTaskItem[],
  weekOffset: number,
): DashboardUpcomingDay[] {
  const parsedWeekStart = parseIsoDate(weekStart);
  const start = parsedWeekStart
    ? new Date(parsedWeekStart)
    : (() => {
        const shiftedToday = new Date();
        shiftedToday.setUTCDate(shiftedToday.getUTCDate() + weekOffset * 7);
        return getWeekStartUTC(shiftedToday);
      })();

  const startDate = formatIsoDateUTC(start);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  const endDate = formatIsoDateUTC(end);

  const tasksByDate = new Map<string, DashboardUpcomingTaskItem[]>();

  for (const task of fallbackTasks) {
    const taskDueDate = parseIsoDate(task.dueDate);
    if (!taskDueDate) continue;
    if (taskDueDate < startDate || taskDueDate > endDate) continue;

    const current = tasksByDate.get(taskDueDate) ?? [];
    current.push({
      id: task.id,
      title: task.title,
      projectName: task.projectName,
      projectColor: task.projectColor,
      priority: task.priority,
      dueDate: task.dueDate,
    });
    tasksByDate.set(taskDueDate, current);
  }

  return Array.from({ length: 7 }, (_, index) => {
    const current = new Date(start);
    current.setUTCDate(start.getUTCDate() + index);
    const date = formatIsoDateUTC(current);
    const tasks = (tasksByDate.get(date) ?? []).slice().sort((a, b) => {
      return getPriorityWeight(a.priority) - getPriorityWeight(b.priority);
    });

    return {
      date,
      dayLabel: current.toLocaleDateString('en-US', { weekday: 'short' }),
      tasks,
      totalTaskCount: tasks.length,
    };
  });
}

interface DashboardUpcomingProps {
  weekStart: string;
  weekEnd: string;
  days: DashboardUpcomingDay[];
  fallbackTasks: DashboardMyTaskItem[];
  fullTasksByDay?: Record<string, DashboardUpcomingTaskItem[]>;
  projectIdByName: Record<string, string>;
  weekOffset: number;
  onWeekOffsetChange: (next: number) => void;
  isLoading?: boolean;
  isError?: boolean;
}

export function DashboardUpcoming({
  weekStart,
  weekEnd,
  days,
  fallbackTasks,
  fullTasksByDay,
  projectIdByName,
  weekOffset,
  onWeekOffsetChange,
  isLoading,
  isError,
}: DashboardUpcomingProps) {
  const [visibleCountByDay, setVisibleCountByDay] = useState<Record<string, number>>({});

  const fallbackDays = useMemo(
    () => buildFallbackDays(weekStart, fallbackTasks, weekOffset),
    [weekStart, fallbackTasks, weekOffset],
  );

  const resolvedDays = useMemo(() => {
    const apiHasAnyTask = days.some((day) => {
      const fullTasksCount = fullTasksByDay?.[day.date]?.length ?? 0;
      return fullTasksCount > 0 || day.tasks.length > 0 || day.totalTaskCount > 0;
    });

    if (days.length > 0 && apiHasAnyTask) return days;
    return fallbackDays;
  }, [days, fallbackDays, fullTasksByDay]);

  if (import.meta.env.DEV) {
    console.log('[DashboardUpcoming] fallback resolution', {
      weekOffset,
      weekStart,
      weekEnd,
      apiDaysCount: days.length,
      fallbackDaysCount: fallbackDays.length,
      resolvedDaysCount: resolvedDays.length,
      apiTasksCount: days.reduce((count, day) => count + day.tasks.length, 0),
      fallbackTasksCount: fallbackTasks.length,
    });
  }

  const daysWithSortedTasks = useMemo(
    () =>
      resolvedDays.map((day) => {
        const allTasks = (fullTasksByDay?.[day.date] ?? day.tasks).slice().sort((a, b) => {
          return getPriorityWeight(a.priority) - getPriorityWeight(b.priority);
        });
        const visibleCount = visibleCountByDay[day.date] ?? DEFAULT_DAY_LIMIT;
        const visibleTasks = allTasks.slice(0, visibleCount);
        const totalTaskCount = Math.max(day.totalTaskCount, allTasks.length);
        const remainingCount = Math.max(0, totalTaskCount - visibleTasks.length);

        return {
          day,
          allTasks,
          visibleTasks,
          totalTaskCount,
          remainingCount,
        };
      }),
    [resolvedDays, fullTasksByDay, visibleCountByDay],
  );

  return (
    <section className="rounded-radius-lg border border-border bg-surface-container-lowest p-lg shadow-1">
      <div className="mb-md grid grid-cols-[auto_1fr_auto] items-center gap-sm">
        <h2 className="text-heading-3 font-semibold text-foreground">Upcoming</h2>
        <span className="text-small text-muted" aria-live="polite">
          {weekStart && weekEnd
            ? `${formatRangeDateLabel(weekStart)} → ${formatRangeDateLabel(weekEnd)}`
            : ''}
        </span>

        <div className="flex items-center gap-xs">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Previous week"
            disabled={weekOffset <= 0}
            onClick={() => onWeekOffsetChange(Math.max(0, weekOffset - 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Next week"
            onClick={() => onWeekOffsetChange(weekOffset + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-radius-md border border-border bg-surface-container-low p-lg text-small text-muted">
          Loading upcoming tasks...
        </div>
      ) : daysWithSortedTasks.length === 0 ? (
        <div className="rounded-radius-md border border-dashed border-border bg-surface-container-low p-lg text-center text-small text-muted">
          No upcoming work scheduled for this range.
        </div>
      ) : (
        <>
          {isError ? (
            <div className="mb-md rounded-radius-md border border-danger/30 bg-danger/10 p-lg text-small text-danger">
              We couldn&apos;t load upcoming tasks from the server. Showing fallback tasks.
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-sm sm:grid-cols-3 lg:grid-cols-7 lg:overflow-x-auto">
            {daysWithSortedTasks.map(
              ({ day, visibleTasks, totalTaskCount, remainingCount, allTasks }) => (
                <article
                  key={day.date}
                  className="flex min-h-[220px] flex-col rounded-radius-md border border-border bg-surface-container-low p-sm"
                >
                  <h3 className="mb-sm flex items-start justify-between gap-sm text-small font-semibold text-foreground">
                    <span>{formatRangeDateLabel(day.date)}</span>
                    <span className="font-normal text-muted">{totalTaskCount}</span>
                  </h3>

                  <ul className="grid list-none content-start gap-sm p-0">
                    {visibleTasks.map((task) => {
                      const projectId = projectIdByName[task.projectName];

                      return (
                        <li
                          key={task.id}
                          className="rounded-radius-md border border-border bg-surface-container-lowest p-sm shadow-1"
                        >
                          <div className="grid gap-xs">
                            <div className="flex items-start justify-between gap-sm">
                              <div className="flex min-w-0 items-start gap-xs">
                                <span
                                  className="mt-1 inline-block size-2 shrink-0 rounded-full"
                                  style={{
                                    backgroundColor:
                                      task.projectColor ?? 'var(--color-brand-primary)',
                                  }}
                                  aria-hidden
                                />

                                {projectId ? (
                                  <Link
                                    to="/projects/$projectId/tasks/$taskId"
                                    params={{ projectId, taskId: task.id }}
                                    className="line-clamp-2 text-small font-semibold text-foreground hover:text-brand-primary hover:underline"
                                  >
                                    {task.title}
                                  </Link>
                                ) : (
                                  <Link
                                    to="/projects"
                                    className="line-clamp-2 text-small font-semibold text-foreground hover:underline"
                                  >
                                    {task.title}
                                  </Link>
                                )}
                              </div>

                              <span className="rounded-radius-full border border-black px-sm py-[2px] text-label font-semibold lowercase text-black">
                                {task.priority}
                              </span>
                            </div>

                            {projectId ? (
                              <Link
                                to="/projects/$projectId/board"
                                params={{ projectId }}
                                className="w-fit text-label text-muted hover:text-brand-primary hover:underline"
                              >
                                {task.projectName}
                              </Link>
                            ) : (
                              <Link
                                to="/projects"
                                className="w-fit text-label text-muted hover:text-brand-primary hover:underline"
                              >
                                {task.projectName}
                              </Link>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  {remainingCount > 0 ? (
                    <button
                      type="button"
                      className="mt-sm w-fit bg-transparent p-0 text-left text-small text-brand-primary hover:underline disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
                      disabled={visibleTasks.length >= allTasks.length}
                      onClick={() =>
                        setVisibleCountByDay((current) => ({
                          ...current,
                          [day.date]: (current[day.date] ?? DEFAULT_DAY_LIMIT) + DEFAULT_DAY_LIMIT,
                        }))
                      }
                    >
                      ... ({remainingCount} more)
                    </button>
                  ) : null}
                </article>
              ),
            )}
          </div>
        </>
      )}
    </section>
  );
}
