import { apiClient } from '@/api/client';
import { dependencyKeys } from '@/api/dependencies';
import { showErrorToast } from '@/lib/error-toast';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BulkAction } from '@taskforge/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';

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
    nextUnloadedTaskId?: string | null;
  };
}

export interface BoardColumnData {
  statusId: string;
  items: Task[];
  meta: {
    cursor: string | null;
    hasMore: boolean;
    totalCount: number;
    nextUnloadedTaskId: string | null;
  };
}

interface BoardColumnsData {
  columns: BoardColumnData[];
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
  board: (projectId: string, filters?: TaskFilters, limit = 15) =>
    [...taskKeys.forProject(projectId), 'board', { filters, limit }] as const,
  detail: (id: string) => [...taskKeys.all, 'detail', id] as const,
  subtasks: (taskId: string) => [...taskKeys.all, 'subtasks', taskId] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

const TASK_SEARCH_DEBOUNCE_MS = 250;

function buildTaskParams(
  filters?: TaskFilters,
  sort?: { field: SortField; order: SortOrder },
  options?: { cursor?: string; limit?: number },
): string {
  const params = new URLSearchParams();
  if (options?.limit !== undefined) params.set('limit', `${options.limit}`);
  if (options?.cursor) params.set('cursor', options.cursor);
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

function useDebouncedTaskFilters(filters?: TaskFilters): TaskFilters | undefined {
  const [debouncedSearch, setDebouncedSearch] = useState(filters?.search);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(filters?.search);
    }, TASK_SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [filters?.search]);

  return useMemo(
    () =>
      filters
        ? {
            ...filters,
            search: debouncedSearch,
          }
        : undefined,
    [filters, debouncedSearch],
  );
}

/** For Kanban board: fetch all tasks for a project (no pagination — loads all for offline DnD) */
export function useTasks(
  projectId: string,
  filters?: TaskFilters,
  sort?: { field: SortField; order: SortOrder },
) {
  const debouncedFilters = useDebouncedTaskFilters(filters);

  return useQuery({
    queryKey: taskKeys.byProject(projectId, debouncedFilters, sort),
    queryFn: () => {
      const qs = buildTaskParams(debouncedFilters, sort);
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
  const debouncedFilters = useDebouncedTaskFilters(filters);

  return useInfiniteQuery({
    queryKey: [...taskKeys.byProject(projectId, debouncedFilters, sort), 'infinite'] as const,
    queryFn: ({ pageParam }) => {
      const qs = buildTaskParams(debouncedFilters, sort, {
        cursor: pageParam as string | undefined,
        limit: 50,
      });
      return apiClient.get<ApiEnvelope<Task[]>>(`/projects/${projectId}/tasks?${qs}`);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.meta?.hasMore ? lastPage.meta.cursor : undefined),
    enabled: !!projectId,
  });
}

export function useBoardTasks(projectId: string, filters?: TaskFilters, limit = 15) {
  const queryClient = useQueryClient();
  const debouncedFilters = useDebouncedTaskFilters(filters);
  const queryKey = taskKeys.board(projectId, debouncedFilters, limit);
  const [loadingMoreByStatus, setLoadingMoreByStatus] = useState<Record<string, boolean>>({});

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const qs = buildTaskParams(debouncedFilters, undefined, { limit });
      const response = await apiClient.get<ApiEnvelope<BoardColumnsData>>(
        `/projects/${projectId}/board-tasks?${qs}`,
      );
      return response.data;
    },
    enabled: !!projectId,
  });

  const loadMore = useCallback(
    async (statusId: string) => {
      if (!projectId || loadingMoreByStatus[statusId]) return;

      const snapshot = queryClient.getQueryData<BoardColumnsData>(queryKey);
      const existingColumn = snapshot?.columns.find((column) => column.statusId === statusId);
      if (!existingColumn?.meta.hasMore || !existingColumn.meta.cursor) return;

      setLoadingMoreByStatus((prev) => ({ ...prev, [statusId]: true }));
      try {
        const params = new URLSearchParams(buildTaskParams(debouncedFilters, undefined, { limit }));
        params.set('statusId', statusId);
        params.set('cursor', existingColumn.meta.cursor);

        const response = await apiClient.get<ApiEnvelope<BoardColumnsData>>(
          `/projects/${projectId}/board-tasks?${params.toString()}`,
        );
        const incoming = response.data.columns.find((column) => column.statusId === statusId);
        if (!incoming) return;

        queryClient.setQueryData<BoardColumnsData>(queryKey, (current) => {
          if (!current) return current;
          return {
            columns: current.columns.map((column) => {
              if (column.statusId !== statusId) return column;
              const existingIds = new Set(column.items.map((task) => task.id));
              const nextItems = [
                ...column.items,
                ...incoming.items.filter((task) => !existingIds.has(task.id)),
              ];
              return {
                ...column,
                items: nextItems,
                meta: incoming.meta,
              };
            }),
          };
        });
      } catch (error) {
        showErrorToast(error, 'Failed to load more tasks. Please try again.', {
          id: `board-load-more-${statusId}`,
        });
      } finally {
        setLoadingMoreByStatus((prev) => ({ ...prev, [statusId]: false }));
      }
    },
    [debouncedFilters, limit, loadingMoreByStatus, projectId, queryClient, queryKey],
  );

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    loadMore,
    loadingMoreByStatus,
  };
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
  beforeTaskId?: string;
  afterTaskId?: string;
  position?: number;
  projectId: string;
}

function isTaskArray(value: unknown): value is Task[] {
  if (!Array.isArray(value)) return false;
  if (value.length === 0) return true;
  const first = value[0];
  if (typeof first !== 'object' || first === null) return false;
  return typeof (first as Record<string, unknown>).id === 'string';
}

function isBoardColumnsData(value: unknown): value is BoardColumnsData {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as BoardColumnsData).columns)
  );
}

function moveTaskInsideTaskArray(tasksData: Task[], payload: MoveTaskPayload): Task[] {
  return tasksData.map((task) =>
    task.id === payload.taskId
      ? {
          ...task,
          statusId: payload.statusId,
          position: payload.position ?? task.position,
        }
      : task,
  );
}

function moveTaskInsideBoardData(
  boardData: BoardColumnsData,
  payload: MoveTaskPayload,
): BoardColumnsData {
  const sourceColumn = boardData.columns.find((column) =>
    column.items.some((task) => task.id === payload.taskId),
  );
  if (!sourceColumn) return boardData;

  const destinationColumn =
    boardData.columns.find((column) => column.statusId === payload.statusId) ?? sourceColumn;

  const movingTask =
    sourceColumn.items.find((task) => task.id === payload.taskId) ??
    destinationColumn.items.find((task) => task.id === payload.taskId);
  if (!movingTask) return boardData;

  const taskToInsert: Task = {
    ...movingTask,
    statusId: payload.statusId,
    position: payload.position ?? movingTask.position,
    updatedAt: new Date().toISOString(),
  };

  const sourceItems = sourceColumn.items.filter((task) => task.id !== payload.taskId);
  const destinationItems =
    sourceColumn.statusId === destinationColumn.statusId
      ? sourceItems
      : [...destinationColumn.items];

  const destinationWithoutTask = destinationItems.filter((task) => task.id !== payload.taskId);
  const beforeIndex = payload.beforeTaskId
    ? destinationWithoutTask.findIndex((task) => task.id === payload.beforeTaskId)
    : -1;
  const afterIndex = payload.afterTaskId
    ? destinationWithoutTask.findIndex((task) => task.id === payload.afterTaskId)
    : -1;

  const insertAt =
    beforeIndex >= 0
      ? beforeIndex
      : afterIndex >= 0
        ? afterIndex + 1
        : destinationWithoutTask.length;
  const nextDestinationItems = [...destinationWithoutTask];
  nextDestinationItems.splice(insertAt, 0, taskToInsert);

  return {
    columns: boardData.columns.map((column) => {
      if (
        column.statusId === sourceColumn.statusId &&
        sourceColumn.statusId === destinationColumn.statusId
      ) {
        return {
          ...column,
          items: nextDestinationItems,
        };
      }
      if (column.statusId === sourceColumn.statusId) {
        return {
          ...column,
          items: sourceItems,
          meta: {
            ...column.meta,
            totalCount: Math.max(0, column.meta.totalCount - 1),
          },
        };
      }
      if (column.statusId === destinationColumn.statusId) {
        return {
          ...column,
          items: nextDestinationItems,
          meta: {
            ...column.meta,
            totalCount: column.meta.totalCount + 1,
          },
        };
      }
      return column;
    }),
  };
}

export function applyTaskMoveToCacheData(data: unknown, payload: MoveTaskPayload): unknown {
  if (isTaskArray(data)) {
    return moveTaskInsideTaskArray(data, payload);
  }
  if (isBoardColumnsData(data)) {
    return moveTaskInsideBoardData(data, payload);
  }
  return data;
}

export function useMoveTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, statusId, position, beforeTaskId, afterTaskId }: MoveTaskPayload) =>
      apiClient
        .patch<ApiEnvelope<Task>>(`/tasks/${taskId}/position`, {
          statusId,
          ...(position !== undefined ? { position: Math.round(position) } : {}),
          ...(beforeTaskId ? { beforeTaskId } : {}),
          ...(afterTaskId ? { afterTaskId } : {}),
        })
        .then((r) => r.data),
    onMutate: async (payload) => {
      const { projectId } = payload;
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: taskKeys.forProject(projectId) });
      // Snapshot the previous value
      const previousTasks = queryClient.getQueriesData({
        queryKey: taskKeys.forProject(projectId),
      });
      // Optimistically update all matching query data
      queryClient.setQueriesData({ queryKey: taskKeys.forProject(projectId) }, (old) =>
        applyTaskMoveToCacheData(old, payload),
      );
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

type SupportedBulkUpdateAction = Extract<BulkAction, 'updateStatus' | 'assign' | 'updatePriority'>;

function resolveBulkUpdateAction(data: BulkUpdatePayload['data']): SupportedBulkUpdateAction {
  const hasStatusId = typeof data.statusId === 'string' && data.statusId.length > 0;
  const hasPriority = data.priority !== undefined;
  const hasAssigneeId = Object.hasOwn(data, 'assigneeId');

  const matchedActions = [
    hasStatusId ? 'updateStatus' : null,
    hasPriority ? 'updatePriority' : null,
    hasAssigneeId ? 'assign' : null,
  ].filter((action): action is SupportedBulkUpdateAction => action !== null);

  if (matchedActions.length !== 1) {
    throw new Error('Bulk update payload must specify exactly one supported update field.');
  }

  return matchedActions[0];
}

export function useBulkUpdateTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, data }: BulkUpdatePayload) => {
      const action = resolveBulkUpdateAction(data);
      return apiClient.post('/tasks/bulk', { action, ids, data });
    },
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
