import { apiClient } from '@/api/client';
import { showErrorToast } from '@/lib/error-toast';
import { useMutation, useQuery } from '@tanstack/react-query';

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
}

export const orgKeys = {
  members: (orgId: string) => ['organizations', orgId, 'members'] as const,
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
