import { apiClient } from '@/api/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface ApiEnvelope<T> {
  data: T;
  meta?: {
    cursor?: string;
    hasMore?: boolean;
    totalCount?: number;
  };
}

export interface ChecklistItem {
  id: string;
  checklistId: string;
  title: string;
  isCompleted: boolean;
  position: number;
  completedBy: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Checklist {
  id: string;
  taskId: string;
  title: string;
  position: number;
  createdAt: string;
  items: ChecklistItem[];
}

export const checklistKeys = {
  all: ['checklists'] as const,
  byTask: (taskId: string) => [...checklistKeys.all, 'task', taskId] as const,
};

export function useChecklists(taskId: string) {
  return useQuery({
    queryKey: checklistKeys.byTask(taskId),
    queryFn: () =>
      apiClient.get<ApiEnvelope<Checklist[]>>(`/tasks/${taskId}/checklists`).then((r) => r.data),
    enabled: !!taskId,
  });
}

interface ToggleChecklistItemInput {
  itemId: string;
  isCompleted: boolean;
  taskId: string;
}

export function useToggleItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, isCompleted }: ToggleChecklistItemInput) =>
      apiClient
        .patch<ApiEnvelope<ChecklistItem>>(`/checklist-items/${itemId}`, { isCompleted })
        .then((r) => r.data),
    onMutate: async ({ itemId, isCompleted, taskId }) => {
      await queryClient.cancelQueries({ queryKey: checklistKeys.byTask(taskId) });
      const previous = queryClient.getQueryData<Checklist[]>(checklistKeys.byTask(taskId));

      queryClient.setQueryData<Checklist[]>(checklistKeys.byTask(taskId), (old) => {
        if (!old) return old;
        return old.map((checklist) => ({
          ...checklist,
          items: checklist.items.map((item) =>
            item.id === itemId ? { ...item, isCompleted } : item,
          ),
        }));
      });

      return { previous, taskId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous && context.taskId) {
        queryClient.setQueryData(checklistKeys.byTask(context.taskId), context.previous);
      }
    },
    onSettled: (_data, _error, { taskId }) => {
      void queryClient.invalidateQueries({ queryKey: checklistKeys.byTask(taskId) });
      void queryClient.invalidateQueries({ queryKey: ['tasks', 'detail'] });
    },
  });
}
