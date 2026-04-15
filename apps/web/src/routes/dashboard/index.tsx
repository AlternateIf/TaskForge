import {
  type DashboardUpcomingTaskItem,
  useDashboardMyTasks,
  useDashboardProjectProgress,
  useDashboardSummary,
  useDashboardUpcoming,
} from '@/api/dashboard';
import { useProjects } from '@/api/projects';
import { DashboardListTimeline } from '@/components/dashboard/dashboard-list-timeline';
import { DashboardProjectProgress } from '@/components/dashboard/dashboard-project-progress';
import { DashboardUpcoming } from '@/components/dashboard/dashboard-upcoming';
import { DashboardWelcomeBanner } from '@/components/dashboard/dashboard-welcome-banner';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useAuthStore } from '@/stores/auth.store';
import { useMemo, useState } from 'react';

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isDateWithinRange(dateISO: string, startISO: string, endISO: string): boolean {
  return dateISO >= startISO && dateISO <= endISO;
}

export function DashboardPage() {
  useDocumentTitle('Dashboard');
  const { user } = useAuthStore();
  const [weekOffset, setWeekOffset] = useState(0);

  const myTasksQuery = useDashboardMyTasks({ limit: 200 });
  const projectProgressQuery = useDashboardProjectProgress({ limit: 200 });
  const summaryQuery = useDashboardSummary();
  const upcomingQuery = useDashboardUpcoming(weekOffset);
  const projectsQuery = useProjects();

  const firstName = user?.displayName?.split(' ')[0] ?? 'there';

  const projectIdByName = useMemo(() => {
    const entries = (projectsQuery.data ?? []).map(
      (project) => [project.name, project.id] as const,
    );
    return Object.fromEntries(entries);
  }, [projectsQuery.data]);

  const upcoming = upcomingQuery.data;

  const fullTasksByDay = useMemo(() => {
    if (!upcoming) return {};

    const weekStart = upcoming.weekStart;
    const weekEnd = upcoming.weekEnd;
    const groupedFromMyTasks = new Map<string, DashboardUpcomingTaskItem[]>();

    for (const task of myTasksQuery.data?.data ?? []) {
      if (!task.dueDate) continue;
      const taskDueDate = toDateOnly(new Date(task.dueDate));
      if (!isDateWithinRange(taskDueDate, weekStart, weekEnd)) continue;

      const current = groupedFromMyTasks.get(taskDueDate) ?? [];
      current.push({
        id: task.id,
        title: task.title,
        projectName: task.projectName,
        projectColor: task.projectColor,
        priority: task.priority,
      });
      groupedFromMyTasks.set(taskDueDate, current);
    }

    return Object.fromEntries(
      upcoming.days.map((day) => {
        const combined = [...day.tasks, ...(groupedFromMyTasks.get(day.date) ?? [])];
        const deduped = Array.from(new Map(combined.map((task) => [task.id, task])).values());
        return [day.date, deduped] as const;
      }),
    );
  }, [myTasksQuery.data?.data, upcoming]);

  return (
    <div className="space-y-lg">
      <DashboardWelcomeBanner
        firstName={firstName}
        organizationName={user?.organizationName}
        summary={summaryQuery.data}
        isSummaryLoading={summaryQuery.isLoading}
      />

      <DashboardListTimeline
        tasks={myTasksQuery.data?.data ?? []}
        projectIdByName={projectIdByName}
        isLoading={myTasksQuery.isLoading}
        isError={myTasksQuery.isError}
      />

      <DashboardProjectProgress
        projects={projectProgressQuery.data?.data ?? []}
        isLoading={projectProgressQuery.isLoading}
        isError={projectProgressQuery.isError}
      />

      <DashboardUpcoming
        key={upcoming?.weekStart ?? `week-${weekOffset}`}
        weekStart={upcoming?.weekStart ?? ''}
        weekEnd={upcoming?.weekEnd ?? ''}
        days={upcoming?.days ?? []}
        fallbackTasks={myTasksQuery.data?.data ?? []}
        fullTasksByDay={fullTasksByDay}
        projectIdByName={projectIdByName}
        weekOffset={weekOffset}
        onWeekOffsetChange={setWeekOffset}
        isLoading={upcomingQuery.isLoading}
        isError={upcomingQuery.isError}
      />
    </div>
  );
}
