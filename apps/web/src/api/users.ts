import { type AuthUser, useAuthStore } from '@/stores/auth.store';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from './client';

export interface SessionRow {
  id: string;
  isCurrent: boolean;
  ipAddress: string | null;
  browser: string;
  os: string;
  deviceType: 'desktop' | 'mobile';
  createdAt: string;
  expiresAt: string;
}

export function useListSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: () => apiClient.get<{ data: SessionRow[] }>('/users/me/sessions'),
    select: (res) => res.data,
  });
}

export function useRevokeSession() {
  return useMutation({
    mutationFn: (sessionId: string) =>
      apiClient.delete<{ data: { revoked: number } }>(`/users/me/sessions/${sessionId}`),
  });
}

export interface SecurityOverview {
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  activeSessions: number;
  mfaEnforcedByOrg?: boolean;
  mfaGracePeriodEndsAt?: string | null;
}

interface SecurityOverviewResponse {
  data: SecurityOverview;
}

export function useSecurityOverview() {
  return useQuery({
    queryKey: ['security-overview'],
    queryFn: () => apiClient.get<SecurityOverviewResponse>('/users/me/security'),
    select: (res) => res.data,
  });
}

interface UpdateProfileInput {
  displayName?: string;
  avatarUrl?: string | null;
}

interface MeResponse {
  data: AuthUser;
}

export function useUpdateProfile() {
  const { setUser } = useAuthStore();

  return useMutation({
    mutationFn: (input: UpdateProfileInput) => apiClient.patch<MeResponse>('/users/me', input),
    onSuccess: (res) => {
      setUser(res.data);
    },
  });
}

export function useUploadAvatar() {
  const { setUser } = useAuthStore();

  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiClient.post<MeResponse>('/users/me/avatar', formData);
    },
    onSuccess: (res) => {
      setUser(res.data);
    },
  });
}

export function useRequestEmailChange() {
  return useMutation({
    mutationFn: (input: { newEmail: string; currentPassword: string }) =>
      apiClient.post<{ data: { message: string } }>('/users/me/email', input),
  });
}

export function useConfirmEmailChange() {
  return useMutation({
    mutationFn: (token: string) =>
      apiClient.post<{ data: { message: string } }>('/auth/confirm-email-change', { token }),
  });
}

export function useRevokeOtherSessions() {
  return useMutation({
    mutationFn: () => apiClient.delete<{ data: { revoked: number } }>('/users/me/sessions'),
  });
}

export function useRemoveAvatar() {
  const { setUser } = useAuthStore();

  return useMutation({
    mutationFn: () => apiClient.delete<MeResponse>('/users/me/avatar'),
    onSuccess: (res) => {
      setUser(res.data);
    },
  });
}
