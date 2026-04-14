import { apiClient } from '@/api/client';
import { showErrorToast } from '@/lib/error-toast';
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';

export interface OrgMember {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  roleId: string | null;
  roleName: string | null;
  joinedAt: string;
}

interface ApiEnvelope<T> {
  data: T;
  meta?: {
    hasMore?: boolean;
    totalCount?: number;
  };
}

export interface OrgMembersPageResult {
  items: OrgMember[];
  totalCount: number;
  hasMore: boolean;
  page: number;
  limit: number;
}

export const orgKeys = {
  members: (orgId: string) => ['organizations', orgId, 'members'] as const,
  membersPaged: (orgId: string, params: { page: number; limit: number }) =>
    ['organizations', orgId, 'members', 'paged', params] as const,
};

export function useOrgMembers(orgId: string | undefined) {
  return useQuery({
    queryKey: orgKeys.members(orgId ?? ''),
    queryFn: () =>
      apiClient
        .get<ApiEnvelope<OrgMember[]>>(`/organizations/${orgId}/members`)
        .then((r) => r.data),
    enabled: !!orgId,
    staleTime: 60_000,
  });
}

export function useOrgMembersPage(
  orgId: string | undefined,
  options: { page: number; limit: number },
) {
  return useQuery({
    queryKey: orgKeys.membersPaged(orgId ?? '', options),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', `${options.page}`);
      params.set('limit', `${options.limit}`);

      const response = await apiClient.get<ApiEnvelope<OrgMember[]>>(
        `/organizations/${orgId}/members?${params.toString()}`,
      );

      return {
        items: response.data,
        totalCount: response.meta?.totalCount ?? response.data.length,
        hasMore: response.meta?.hasMore ?? false,
        page: options.page,
        limit: options.limit,
      } satisfies OrgMembersPageResult;
    },
    placeholderData: keepPreviousData,
    enabled: !!orgId,
    staleTime: 60_000,
  });
}

export function useRemoveOrgMember(orgId: string | undefined) {
  return useMutation({
    mutationFn: (memberId: string) =>
      apiClient.delete(`/organizations/${orgId}/members/${memberId}`),
    onError: (error) => {
      showErrorToast(error, 'Failed to remove member. Please try again.', {
        id: 'remove-org-member-error',
      });
    },
  });
}
