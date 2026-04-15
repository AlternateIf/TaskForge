import type { DashboardMyTaskItem } from '@/api/dashboard';
import { Button } from '@/components/ui/button';
import { Link } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';

const TASKS_PER_PAGE = 6;

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

interface TimelineDueDatePresentation {
  label: string;
  isLate: boolean;
}

function getTimelineDueDatePresentation(dueDate: string | null): TimelineDueDatePresentation {
  if (!dueDate) {
    return {
      label: 'No due date',
      isLate: false,
    };
  }

  const due = new Date(dueDate);
  const dueUtc = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());

  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const yesterdayUtc = todayUtc - 86_400_000;
  const tomorrowUtc = todayUtc + 86_400_000;

  if (dueUtc === yesterdayUtc) {
    return {
      label: 'Due Yesterday',
      isLate: true,
    };
  }

  if (dueUtc === todayUtc) {
    return {
      label: 'Due Today',
      isLate: true,
    };
  }

  if (dueUtc === tomorrowUtc) {
    return {
      label: 'Due Tomorrow',
      isLate: false,
    };
  }

  const isLate = dueUtc < todayUtc;

  return {
    label: `Due ${due.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })}`,
    isLate,
  };
}

interface DashboardListTimelineProps {
  tasks: DashboardMyTaskItem[];
  projectIdByName: Record<string, string>;
  isLoading?: boolean;
  isError?: boolean;
}

export function DashboardListTimeline({
  tasks,
  projectIdByName,
  isLoading,
  isError,
}: DashboardListTimelineProps) {
  const [startIndex, setStartIndex] = useState(0);

  const sortedTasks = useMemo(
    () =>
      [...tasks].sort((a, b) => {
        const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
        const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
        if (aDue !== bDue) return aDue - bDue;
        return getPriorityWeight(a.priority) - getPriorityWeight(b.priority);
      }),
    [tasks],
  );

  const pageItems = sortedTasks.slice(startIndex, startIndex + TASKS_PER_PAGE);
  const pageIndex = Math.floor(startIndex / TASKS_PER_PAGE) + 1;
  const pageCount = Math.max(1, Math.ceil(sortedTasks.length / TASKS_PER_PAGE));
  const prevDisabled = startIndex === 0;
  const nextDisabled = startIndex + TASKS_PER_PAGE >= sortedTasks.length;

  return (
    <section className="rounded-radius-lg border border-border bg-surface-container-lowest p-lg shadow-1">
      <div className="mb-md grid grid-cols-[auto_1fr_auto] items-center gap-sm">
        <h2 className="text-heading-3 font-semibold text-foreground">List Timeline</h2>
        <span className="text-small text-muted" aria-live="polite">
          Showing {Math.min(TASKS_PER_PAGE, pageItems.length)} of {sortedTasks.length} • Page{' '}
          {pageIndex}/{pageCount}
        </span>

        <div className="flex items-center gap-xs">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Previous tasks"
            disabled={prevDisabled}
            onClick={() => setStartIndex((current) => Math.max(0, current - TASKS_PER_PAGE))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Next tasks"
            disabled={nextDisabled}
            onClick={() =>
              setStartIndex((current) =>
                Math.min(Math.max(0, sortedTasks.length - 1), current + TASKS_PER_PAGE),
              )
            }
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-radius-md border border-border bg-surface-container-low p-lg text-small text-muted">
          Loading your task timeline...
        </div>
      ) : isError ? (
        <div className="rounded-radius-md border border-danger/30 bg-danger/10 p-lg text-small text-danger">
          We couldn&apos;t load your timeline tasks right now.
        </div>
      ) : pageItems.length === 0 ? (
        <div className="rounded-radius-md border border-dashed border-border bg-surface-container-low p-lg text-center text-small text-muted">
          No timeline tasks yet. Assign tasks to populate this list.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-md lg:grid-cols-2">
          {pageItems.map((task) => {
            const projectId = projectIdByName[task.projectName];
            const visibleLabels = task.labels?.slice(0, 5) ?? [];
            const hiddenLabelsCount = Math.max(
              0,
              (task.labels?.length ?? 0) - visibleLabels.length,
            );
            const duePresentation = getTimelineDueDatePresentation(task.dueDate);

            return (
              <article
                key={task.id}
                className="grid gap-sm rounded-radius-lg border border-border bg-surface-container-low p-md"
              >
                <div className="flex items-start justify-between gap-sm">
                  <div className="min-w-0">
                    <div className="flex items-start gap-xs">
                      <span
                        className="mt-1 inline-block size-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor: task.projectColor ?? 'var(--color-brand-primary)',
                        }}
                        aria-hidden
                      />
                      {projectId ? (
                        <Link
                          to="/projects/$projectId/tasks/$taskId"
                          params={{ projectId, taskId: task.id }}
                          className="line-clamp-2 text-body font-semibold text-foreground hover:text-brand-primary hover:underline"
                        >
                          {task.title}
                        </Link>
                      ) : (
                        <Link
                          to="/projects"
                          className="line-clamp-2 text-body font-semibold text-foreground hover:underline"
                        >
                          {task.title}
                        </Link>
                      )}
                    </div>
                  </div>

                  <span className="rounded-radius-full border border-black px-sm py-[2px] text-label font-semibold lowercase text-black">
                    {task.priority}
                  </span>
                </div>

                {projectId ? (
                  <Link
                    to="/projects/$projectId/board"
                    params={{ projectId }}
                    className="w-fit text-small text-secondary hover:text-brand-primary hover:underline"
                  >
                    {task.projectName}
                  </Link>
                ) : (
                  <Link
                    to="/projects"
                    className="w-fit text-small text-secondary hover:text-brand-primary hover:underline"
                  >
                    {task.projectName}
                  </Link>
                )}

                <div className="flex flex-wrap items-start justify-between gap-sm">
                  <div className="flex flex-wrap items-center gap-xs">
                    {visibleLabels.map((label) => (
                      <span
                        key={label.id}
                        className="rounded-radius-full border px-sm py-[2px] text-label"
                        style={{ borderColor: label.color ?? undefined }}
                      >
                        {label.name}
                      </span>
                    ))}
                    {hiddenLabelsCount > 0 ? (
                      <span className="text-label text-muted">+{hiddenLabelsCount} more</span>
                    ) : null}
                  </div>

                  <span
                    className={
                      duePresentation.isLate ? 'text-label text-danger' : 'text-label text-muted'
                    }
                  >
                    {duePresentation.label}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
