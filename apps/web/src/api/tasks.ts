import { apiClient } from '@/api/client';
import { dependencyKeys } from '@/api/dependencies';
import { showErrorToast } from '@/lib/error-toast';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Priority = 'critical' | 'high' | 'medium' | 'low' | 'none';

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  statusId: string;
  statusName?: string | null;
  priority: Priority;
  position: number;
  assigneeId?: string | null;
  assignee?: { id: string; displayName: string; avatarUrl?: string | null } | null;
  reporterId?: string | null;
  projectId: string;
  dueDate?: string | null;
  startDate?: string | null;
  estimatedHours?: string | null;
  progress?: {
    subtaskCount: number;
    subtaskCompletedCount: number;
    checklistTotal: number;
    checklistCompleted: number;
  } | null;
  isBlocked?: boolean;
  blockedByCount?: number;
  labels?: Array<{ id: string; name: string; color: string | null }>;
  createdAt: string;
  updatedAt: string;
}

export interface TaskFilters {
  statusId?: string | string[];
  priority?: Priority | Priority[];
  assigneeId?: string | string[];
  labelId?: string | string[];
  dueDateFrom?: string;
  dueDateTo?: string;
  search?: string;
}

export type SortField = 'title' | 'status' | 'priority' | 'assignee' | 'dueDate' | 'createdAt';
export type SortOrder = 'asc' | 'desc';

interface ApiEnvelope<T> {
  data: T;
  meta?: {
    cursor?: string;
    hasMore?: boolean;
    totalCount?: number;
  };
}

// ─── Query keys ───────────────────────────────────────────────────────────────

export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  // projectId as its own array element so prefix-matching works regardless of filters
  forProject: (projectId: string) => [...taskKeys.lists(), projectId] as const,
  byProject: (
    projectId: string,
    filters?: TaskFilters,
    sort?: { field: SortField; order: SortOrder },
  ) => [...taskKeys.forProject(projectId), { filters, sort }] as const,
  detail: (id: string) => [...taskKeys.all, 'detail', id] as const,
  subtasks: (taskId: string) => [...taskKeys.all, 'subtasks', taskId] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

function buildTaskParams(
  filters?: TaskFilters,
  sort?: { field: SortField; order: SortOrder },
  cursor?: string,
): string {
  const params = new URLSearchParams();
  params.set('limit', '50');
  if (cursor) params.set('cursor', cursor);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.statusId) {
    const ids = Array.isArray(filters.statusId) ? filters.statusId : [filters.statusId];
    for (const id of ids) params.append('status', id);
  }
  if (filters?.priority) {
    const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority];
    for (const p of priorities) params.append('priority', p);
  }
  if (filters?.assigneeId) {
    const ids = Array.isArray(filters.assigneeId) ? filters.assigneeId : [filters.assigneeId];
    for (const id of ids) params.append('assigneeId', id);
  }
  if (filters?.labelId) {
    const ids = Array.isArray(filters.labelId) ? filters.labelId : [filters.labelId];
    for (const id of ids) params.append('labelId', id);
  }
  if (filters?.dueDateFrom) params.set('dueDateFrom', filters.dueDateFrom);
  if (filters?.dueDateTo) params.set('dueDateTo', filters.dueDateTo);
  if (sort) {
    params.set('sort', sort.field);
    params.set('order', sort.order);
  }
  return params.toString();
}

/** For Kanban board: fetch all tasks for a project (no pagination — loads all for offline DnD) */
export function useTasks(
  projectId: string,
  filters?: TaskFilters,
  sort?: { field: SortField; order: SortOrder },
) {
  return useQuery({
    queryKey: taskKeys.byProject(projectId, filters, sort),
    queryFn: () => {
      const qs = buildTaskParams(filters, sort);
      return apiClient
        .get<ApiEnvelope<Task[]>>(`/projects/${projectId}/tasks?${qs}`)
        .then((r) => r.data);
    },
    enabled: !!projectId,
  });
}

export function useTask(taskId: string) {
  return useQuery({
    queryKey: taskKeys.detail(taskId),
    queryFn: () => apiClient.get<ApiEnvelope<Task>>(`/tasks/${taskId}`).then((r) => r.data),
    enabled: !!taskId,
  });
}

/** For List view: cursor-based infinite scroll */
export function useInfiniteTasks(
  projectId: string,
  filters?: TaskFilters,
  sort?: { field: SortField; order: SortOrder },
) {
  return useInfiniteQuery({
    queryKey: [...taskKeys.byProject(projectId, filters, sort), 'infinite'] as const,
    queryFn: ({ pageParam }) => {
      const qs = buildTaskParams(filters, sort, pageParam as string | undefined);
      return apiClient.get<ApiEnvelope<Task[]>>(`/projects/${projectId}/tasks?${qs}`);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.meta?.hasMore ? lastPage.meta.cursor : undefined),
    enabled: !!projectId,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      projectId: string;
      parentTaskId?: string;
      title: string;
      statusId?: string;
      priority?: Priority;
      assigneeId?: string;
      dueDate?: string;
      labelIds?: string[];
    }) => {
      const { projectId, parentTaskId, ...body } = data;
      if (parentTaskId) {
        return apiClient
          .post<ApiEnvelope<Task>>(`/tasks/${parentTaskId}/subtasks`, body)
          .then((r) => r.data);
      }
      return apiClient
        .post<ApiEnvelope<Task>>(`/projects/${projectId}/tasks`, body)
        .then((r) => r.data);
    },
    onSuccess: (task, variables) => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.forProject(task.projectId) });
      if (variables.parentTaskId) {
        void queryClient.invalidateQueries({ queryKey: taskKeys.subtasks(variables.parentTaskId) });
        void queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.parentTaskId) });
        void queryClient.invalidateQueries({
          queryKey: dependencyKeys.byTask(variables.parentTaskId),
        });
      }
    },
    onError: (error) => {
      showErrorToast(error, 'Failed to create task. Please try again.', {
        id: 'create-task-error',
      });
    },
  });
}

export function useCreateSubtask(parentTaskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      statusId?: string;
      priority?: Priority;
      assigneeId?: string | null;
      dueDate?: string | null;
      startDate?: string | null;
      estimatedHours?: number;
      description?: string;
      labelIds?: string[];
    }) =>
      apiClient
        .post<ApiEnvelope<Task>>(`/tasks/${parentTaskId}/subtasks`, data)
        .then((r) => r.data),
    onSuccess: (task) => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.subtasks(parentTaskId) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(parentTaskId) });
      void queryClient.invalidateQueries({ queryKey: dependencyKeys.byTask(parentTaskId) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.forProject(task.projectId) });
    },
    onError: (error) => {
      showErrorToast(error, 'Failed to create subtask. Please try again.', {
        id: 'create-subtask-error',
      });
    },
  });
}

export function useSubtasks(taskId: string) {
  return useQuery({
    queryKey: taskKeys.subtasks(taskId),
    queryFn: () =>
      apiClient.get<ApiEnvelope<Task[]>>(`/tasks/${taskId}/subtasks`).then((r) => r.data),
    enabled: !!taskId,
  });
}

export function useUpdateTask(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      data: Partial<
        Pick<Task, 'title' | 'description' | 'statusId' | 'priority' | 'assigneeId' | 'dueDate'>
      > & { labelIds?: string[] },
    ) => apiClient.patch<ApiEnvelope<Task>>(`/tasks/${taskId}`, data).then((r) => r.data),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(taskId) });
      const previousTask = queryClient.getQueryData<Task>(taskKeys.detail(taskId));

      if (previousTask) {
        queryClient.setQueryData<Task>(taskKeys.detail(taskId), {
          ...previousTask,
          ...patch,
          updatedAt: new Date().toISOString(),
        });
      }

      return { previousTask };
    },
    onError: (error, _patch, context) => {
      if (context?.previousTask) {
        queryClient.setQueryData(taskKeys.detail(taskId), context.previousTask);
      }
      showErrorToast(error, 'Failed to update task. Changes have been reverted.', {
        id: 'update-task-error',
      });
    },
    onSuccess: (task) => {
      queryClient.setQueryData(taskKeys.detail(taskId), task);
      void queryClient.invalidateQueries({ queryKey: taskKeys.forProject(task.projectId) });
    },
  });
}

export function useWatchTask(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post(`/tasks/${taskId}/watch`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
    },
    onError: (error) => {
      showErrorToast(error, 'Failed to update watch status.', { id: 'watch-task-error' });
    },
  });
}

export function useUnwatchTask(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.delete(`/tasks/${taskId}/watch`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
    },
    onError: (error) => {
      showErrorToast(error, 'Failed to update watch status.', { id: 'unwatch-task-error' });
    },
  });
}

export interface MoveTaskPayload {
  taskId: string;
  statusId: string;
  position: number;
  projectId: string;
}

export function useMoveTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, statusId, position }: MoveTaskPayload) =>
      apiClient
        .patch<ApiEnvelope<Task>>(`/tasks/${taskId}/position`, {
          statusId,
          position: Math.round(position),
        })
        .then((r) => r.data),
    onMutate: async ({ taskId, statusId, position, projectId }) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: taskKeys.forProject(projectId) });
      // Snapshot the previous value
      const previousTasks = queryClient.getQueriesData<Task[]>({
        queryKey: taskKeys.forProject(projectId),
      });
      // Optimistically update all matching query data
      queryClient.setQueriesData<Task[]>({ queryKey: taskKeys.forProject(projectId) }, (old) => {
        if (!old) return old;
        return old.map((t) => (t.id === taskId ? { ...t, statusId, position } : t));
      });
      return { previousTasks };
    },
    onError: (error, { projectId }, context) => {
      // Revert on error
      if (context?.previousTasks) {
        for (const [queryKey, data] of context.previousTasks) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      void queryClient.invalidateQueries({ queryKey: taskKeys.forProject(projectId) });
      showErrorToast(error, 'Failed to move task. Please try again.', { id: 'move-task-error' });
    },
    onSettled: (_data, _err, { projectId }) => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.forProject(projectId) });
    },
  });
}

export interface BulkUpdatePayload {
  ids: string[];
  data: Partial<Pick<Task, 'statusId' | 'priority' | 'assigneeId'>>;
  projectId: string;
}

export function useBulkUpdateTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, data }: BulkUpdatePayload) =>
      apiClient.post('/tasks/bulk', { action: 'update', ids, data }),
    onSuccess: (_data, { projectId }) => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.forProject(projectId) });
    },
    onError: (error) => {
      showErrorToast(error, 'Failed to bulk update tasks. Please try again.', {
        id: 'bulk-update-tasks-error',
      });
    },
  });
}
