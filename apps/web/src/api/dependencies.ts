import { apiClient } from '@/api/client';
import { showErrorToast } from '@/lib/error-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface ApiEnvelope<T> {
  data: T;
  meta?: {
    cursor?: string;
    hasMore?: boolean;
    totalCount?: number;
  };
}

export interface Dependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  type: string;
  createdAt: string;
}

export interface DependencyList {
  blockedBy: Dependency[];
  blocking: Dependency[];
}

export const dependencyKeys = {
  all: ['dependencies'] as const,
  byTask: (taskId: string) => [...dependencyKeys.all, 'task', taskId] as const,
};

export function useDependencies(taskId: string) {
  return useQuery({
    queryKey: dependencyKeys.byTask(taskId),
    queryFn: () =>
      apiClient
        .get<ApiEnvelope<DependencyList>>(`/tasks/${taskId}/dependencies`)
        .then((r) => r.data),
    enabled: !!taskId,
  });
}

export function useAddDependency(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dependsOnTaskId: string) =>
      apiClient
        .post<ApiEnvelope<Dependency>>(`/tasks/${taskId}/dependencies`, {
          dependsOnTaskId,
          type: 'blocked_by',
        })
        .then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dependencyKeys.byTask(taskId) });
      void queryClient.invalidateQueries({ queryKey: ['tasks', 'detail', taskId] });
    },
    onError: (error) => {
      showErrorToast(error, 'Failed to add dependency. Please try again.', {
        id: 'add-dependency-error',
      });
    },
  });
}
