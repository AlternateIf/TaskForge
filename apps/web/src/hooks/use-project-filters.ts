import type { TaskFilters } from '@/api/tasks';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useCallback, useMemo } from 'react';

type ProjectRoute =
  | '/_authenticated/projects/$projectId/board'
  | '/_authenticated/projects/$projectId/list';

export function useProjectFilters(from: ProjectRoute, projectId: string) {
  const search = useSearch({ from });
  const navigate = useNavigate();

  const filters: TaskFilters = useMemo(
    () => ({
      search: search.search,
      statusId: search.statusId,
      priority: search.priority,
      assigneeId: search.assigneeId,
      labelId: search.labelId,
      dueDateFrom: search.dueDateFrom,
      dueDateTo: search.dueDateTo,
    }),
    [search],
  );

  const setFilters = useCallback(
    (next: TaskFilters) => {
      const nextSearch = {
        task: search.task,
        search: next.search || undefined,
        statusId: Array.isArray(next.statusId) && next.statusId.length ? next.statusId : undefined,
        priority: Array.isArray(next.priority) && next.priority.length ? next.priority : undefined,
        assigneeId:
          Array.isArray(next.assigneeId) && next.assigneeId.length ? next.assigneeId : undefined,
        labelId: Array.isArray(next.labelId) && next.labelId.length ? next.labelId : undefined,
        dueDateFrom: next.dueDateFrom || undefined,
        dueDateTo: next.dueDateTo || undefined,
      };

      if (from === '/_authenticated/projects/$projectId/board') {
        void navigate({
          to: '/projects/$projectId/board',
          params: { projectId },
          search: nextSearch,
          replace: true,
        });
      } else {
        void navigate({
          to: '/projects/$projectId/list',
          params: { projectId },
          search: nextSearch,
          replace: true,
        });
      }
    },
    [navigate, from, projectId, search.task],
  );

  return { filters, setFilters };
}
