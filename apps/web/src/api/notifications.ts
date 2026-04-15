import { apiClient } from '@/api/client';
import { showErrorToast } from '@/lib/error-toast';
import { useAuthStore } from '@/stores/auth.store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { NOTIFICATION_READ_PERMISSION } from '@taskforge/shared';

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
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const userPermissions = useAuthStore((s) => s.user?.permissions ?? []);
  const canReadNotifications = userPermissions.includes(NOTIFICATION_READ_PERMISSION);

  return useQuery({
    queryKey: [...notificationKeys.list(), limit, orgId] as const,
    queryFn: () =>
      apiClient
        .get<ApiEnvelope<NotificationItem[]>>(`/notifications?orgId=${orgId}&limit=${limit}`)
        .then((r) => r.data),
    enabled: Boolean(orgId && canReadNotifications),
  });
}

export function useUnreadNotificationCount() {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const userPermissions = useAuthStore((s) => s.user?.permissions ?? []);
  const canReadNotifications = userPermissions.includes(NOTIFICATION_READ_PERMISSION);

  return useQuery({
    queryKey: [...notificationKeys.unreadCount(), orgId] as const,
    queryFn: () =>
      apiClient
        .get<ApiEnvelope<{ count: number }>>(`/notifications/unread-count?orgId=${orgId}`)
        .then((r) => r.data.count),
    enabled: Boolean(orgId && canReadNotifications),
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.activeOrganizationId);

  return useMutation({
    mutationFn: (notificationId: string) =>
      apiClient.patch(`/notifications/${notificationId}/read?orgId=${orgId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    onError: (error) => {
      showErrorToast(error, 'Failed to update notification status. Please try again.', {
        id: 'mark-notification-read-error',
      });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const orgId = useAuthStore((s) => s.activeOrganizationId);

  return useMutation({
    mutationFn: async () => {
      if (!orgId) {
        throw new Error('No active organization selected.');
      }

      return apiClient.post(`/notifications/read-all?orgId=${orgId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    onError: (error) => {
      showErrorToast(error, 'Failed to mark all notifications as read. Please try again.', {
        id: 'mark-all-notifications-read-error',
      });
    },
  });
}
