import { apiClient } from '@/api/client';
import { useAuthStore } from '@/stores/auth.store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProjectMember {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  initials: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
}

export interface WorkflowStatus {
  id: string;
  name: string;
  color: string;
  position: number;
  isDefault: boolean;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  color: string | null;
  icon?: string | null;
  taskCount?: number;
  memberCount?: number;
  members?: ProjectMember[];
  statuses?: WorkflowStatus[];
  labels?: Label[];
  createdAt: string;
  updatedAt: string;
}

interface ApiEnvelope<T> {
  data: T;
  meta?: {
    cursor?: string;
    hasMore?: boolean;
    totalCount?: number;
  };
}

// ─── Query keys ───────────────────────────────────────────────────────────────

export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  detail: (id: string) => [...projectKeys.all, 'detail', id] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useProjects() {
  const orgId = useAuthStore((s) => s.user?.organizationId);
  return useQuery({
    queryKey: projectKeys.lists(),
    queryFn: () =>
      apiClient.get<ApiEnvelope<Project[]>>(`/organizations/${orgId}/projects`).then((r) => r.data),
    enabled: !!orgId,
  });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: projectKeys.detail(projectId),
    queryFn: () =>
      apiClient.get<ApiEnvelope<Project>>(`/projects/${projectId}`).then((r) => r.data),
    enabled: !!projectId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; color: string; icon?: string }) => {
      const orgId = useAuthStore.getState().user?.organizationId;
      return apiClient
        .post<ApiEnvelope<Project>>(`/organizations/${orgId}/projects`, data)
        .then((r) => r.data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

export function useUpdateProject(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Pick<Project, 'name' | 'description' | 'color' | 'icon'>>) =>
      apiClient.patch<ApiEnvelope<Project>>(`/projects/${projectId}`, data).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

export function useUpdateProjectStatuses(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (statuses: Array<Partial<WorkflowStatus> & { id?: string }>) =>
      apiClient
        .patch<ApiEnvelope<Project>>(`/projects/${projectId}/workflow`, { statuses })
        .then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}

export function useUpdateProjectLabels(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (labels: Array<Partial<Label> & { id?: string }>) =>
      apiClient
        .patch<ApiEnvelope<Project>>(`/projects/${projectId}/labels`, { labels })
        .then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}

export function useAddProjectMember(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { userId: string; role: ProjectMember['role'] }) =>
      apiClient
        .post<ApiEnvelope<Project>>(`/projects/${projectId}/members`, data)
        .then((r) => r.data),
    onSuccess: (updated) => {
      queryClient.setQueryData(projectKeys.detail(projectId), updated);
    },
  });
}

export function useRemoveProjectMember(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiClient
        .delete<ApiEnvelope<Project>>(`/projects/${projectId}/members/${userId}`)
        .then((r) => r.data),
    onSuccess: (updated) => {
      queryClient.setQueryData(projectKeys.detail(projectId), updated);
    },
  });
}
