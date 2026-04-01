import { apiClient } from '@/api/client';
import { useQuery } from '@tanstack/react-query';

export interface OrgMember {
  userId: string;
  email: string;
  displayName: string;
  roleId: string;
  roleName: string;
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
