import { apiClient } from '@/api/client';
import { showErrorToast } from '@/lib/error-toast';
import { useAuthStore } from '@/stores/auth.store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProjectMember {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  initials: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  taskCount?: number;
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
  status?: 'active' | 'archived' | 'deleted' | string;
  taskCount?: number;
  completedTaskCount?: number;
  openTaskCount?: number;
  isFinishable?: boolean;
  memberCount?: number;
  members?: ProjectMember[];
  statuses?: WorkflowStatus[];
  labels?: Label[];
  createdAt: string;
  updatedAt: string;
}

export type ProjectListStatus = 'active' | 'archived';

export interface ProjectsPageResult {
  items: Project[];
  totalCount: number;
  hasMore: boolean;
  page: number;
  limit: number;
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
  byOrganization: (orgId: string) => [...projectKeys.lists(), orgId] as const,
  pagedByOrganization: (
    orgId: string,
    params: { status: ProjectListStatus; search?: string; page: number; limit: number },
  ) => [...projectKeys.lists(), orgId, 'paged', params] as const,
  detail: (id: string) => [...projectKeys.all, 'detail', id] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

interface UseProjectsOptions {
  enabled?: boolean;
}

export function useProjects(options?: UseProjectsOptions) {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  return useQuery({
    queryKey: projectKeys.byOrganization(orgId ?? ''),
    queryFn: () =>
      apiClient.get<ApiEnvelope<Project[]>>(`/organizations/${orgId}/projects`).then((r) => r.data),
    enabled: Boolean(orgId && (options?.enabled ?? true)),
  });
}

interface UseProjectsPageOptions {
  status: ProjectListStatus;
  search?: string;
  page: number;
  limit: number;
  enabled?: boolean;
}

export function useProjectsPage(options: UseProjectsPageOptions) {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  return useQuery({
    queryKey: projectKeys.pagedByOrganization(orgId ?? '', {
      status: options.status,
      search: options.search,
      page: options.page,
      limit: options.limit,
    }),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('status', options.status);
      params.set('page', `${options.page}`);
      params.set('limit', `${options.limit}`);
      if (options.search?.trim()) {
        params.set('search', options.search.trim());
      }

      const response = await apiClient.get<ApiEnvelope<Project[]>>(
        `/organizations/${orgId}/projects?${params.toString()}`,
      );

      return {
        items: response.data,
        totalCount: response.meta?.totalCount ?? response.data.length,
        hasMore: response.meta?.hasMore ?? false,
        page: options.page,
        limit: options.limit,
      } satisfies ProjectsPageResult;
    },
    enabled: Boolean(orgId && (options.enabled ?? true)),
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
      const orgId = useAuthStore.getState().activeOrganizationId;
      return apiClient
        .post<ApiEnvelope<Project>>(`/organizations/${orgId}/projects`, data)
        .then((r) => r.data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
    onError: (error) => {
      showErrorToast(error, 'Failed to create project. Please try again.', {
        id: 'create-project-error',
      });
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
    onError: (error) => {
      showErrorToast(error, 'Failed to update project. Please try again.', {
        id: 'update-project-error',
      });
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
    onError: (error) => {
      showErrorToast(error, 'Failed to update statuses. Please try again.', {
        id: 'update-project-statuses-error',
      });
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
    onError: (error) => {
      showErrorToast(error, 'Failed to update labels. Please try again.', {
        id: 'update-project-labels-error',
      });
    },
  });
}

export function useAddProjectMember(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { userId: string }) =>
      apiClient
        .post<ApiEnvelope<Project>>(`/projects/${projectId}/members`, {
          ...data,
          role: 'member',
        })
        .then((r) => r.data),
    onSuccess: (updated) => {
      queryClient.setQueryData(projectKeys.detail(projectId), updated);
    },
    onError: (error) => {
      showErrorToast(error, 'Failed to add member. Please try again.', {
        id: 'add-project-member-error',
      });
    },
  });
}

export function useDeleteProject(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.delete(`/projects/${projectId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      void queryClient.removeQueries({ queryKey: projectKeys.detail(projectId) });
    },
    onError: (error) => {
      showErrorToast(error, 'Failed to delete project. Please try again.', {
        id: 'delete-project-error',
      });
    },
  });
}

export function useFinishProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: string) => {
      try {
        return await apiClient
          .post<ApiEnvelope<Project>>(`/projects/${projectId}/finish`)
          .then((r) => r.data);
      } catch (error) {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status === 404) {
          return apiClient
            .post<ApiEnvelope<Project>>(`/projects/${projectId}/archive`)
            .then((r) => r.data);
        }

        throw error;
      }
    },
    onSuccess: (_data, projectId) => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
    onError: (error) => {
      showErrorToast(error, 'Failed to finish project. Please complete all tasks and try again.', {
        id: 'finish-project-error',
      });
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
    onError: (error) => {
      showErrorToast(error, 'Failed to remove member. Please try again.', {
        id: 'remove-project-member-error',
      });
    },
  });
}
