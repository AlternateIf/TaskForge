import { apiClient } from '@/api/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface ApiEnvelope<T> {
  data: T;
  meta?: {
    cursor?: string | null;
    hasMore?: boolean;
    totalCount?: number;
  };
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
}

export const notificationKeys = {
  all: ['notifications'] as const,
  list: () => [...notificationKeys.all, 'list'] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
};

export function useNotifications(limit = 8) {
  return useQuery({
    queryKey: [...notificationKeys.list(), limit] as const,
    queryFn: () =>
      apiClient
        .get<ApiEnvelope<NotificationItem[]>>(`/notifications?limit=${limit}`)
        .then((r) => r.data),
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () =>
      apiClient
        .get<ApiEnvelope<{ count: number }>>('/notifications/unread-count')
        .then((r) => r.data.count),
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      apiClient.patch(`/notifications/${notificationId}/read`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
