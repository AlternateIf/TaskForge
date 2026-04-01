import { apiClient } from '@/api/client';
import { useQuery } from '@tanstack/react-query';

interface ApiEnvelope<T> {
  data: T;
  meta?: {
    cursor?: string | null;
    hasMore?: boolean;
    totalCount?: number;
  };
}

export interface ActivityItem {
  id: string;
  organizationId: string;
  actorId: string | null;
  actorDisplay: string;
  entityType: string;
  entityId: string;
  action: string;
  changes: Record<string, { before: unknown; after: unknown }> | null;
  createdAt: string;
}

export const activityKeys = {
  all: ['activity'] as const,
  byTask: (taskId: string) => [...activityKeys.all, 'task', taskId] as const,
};

export function useTaskActivity(taskId: string) {
  return useQuery({
    queryKey: activityKeys.byTask(taskId),
    queryFn: () =>
      apiClient
        .get<ApiEnvelope<ActivityItem[]>>(`/tasks/${taskId}/activity?limit=50`)
        .then((r) => r.data),
    enabled: !!taskId,
  });
}
