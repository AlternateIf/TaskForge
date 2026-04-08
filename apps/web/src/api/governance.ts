import { apiClient, queryClient } from '@/api/client';
import { useMutation, useQuery } from '@tanstack/react-query';

interface ApiEnvelope<T> {
  data: T;
}

export interface InvitationRow {
  id: string;
  email: string;
  status: 'sent' | 'accepted' | 'revoked' | 'expired';
  sentAt: string;
  expiresAt: string;
  allowedAuthMethods: string[];
}

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  memberCount: number;
  userRole: string | null;
}

export interface RoleRow {
  id: string;
  organizationId?: string | null;
  name: string;
  description?: string | null;
  isSystem: boolean;
}

export interface PermissionAssignmentRow {
  id: string;
  userId: string;
  organizationId?: string | null;
  permissionKey: string;
  assignedByUserId?: string | null;
}

export const governanceKeys = {
  sentInvites: (orgId: string) => ['governance', orgId, 'invites', 'sent'] as const,
  organizations: ['governance', 'organizations'] as const,
  roles: (orgId: string) => ['governance', orgId, 'roles'] as const,
  permissionAssignments: (orgId: string) =>
    ['governance', orgId, 'permission-assignments'] as const,
};

export function useSentInvitations(orgId: string | null) {
  return useQuery({
    queryKey: governanceKeys.sentInvites(orgId ?? ''),
    queryFn: () =>
      apiClient
        .get<ApiEnvelope<InvitationRow[]>>(`/organizations/${orgId}/invitations`)
        .then((res) => res.data),
    enabled: Boolean(orgId),
  });
}

export function useCreateInvitation(orgId: string | null) {
  return useMutation({
    mutationFn: (input: { email: string; permissionKeys?: string[]; roleIds?: string[] }) =>
      apiClient.post(`/organizations/${orgId}/invitations`, {
        email: input.email,
        targets: [
          {
            organizationId: orgId,
            roleIds: input.roleIds ?? [],
            permissionKeys: input.permissionKeys ?? [],
          },
        ],
      }),
    onSuccess: () => {
      if (orgId) {
        void queryClient.invalidateQueries({ queryKey: governanceKeys.sentInvites(orgId) });
      }
    },
  });
}

export function useResendInvitation(orgId: string | null) {
  return useMutation({
    mutationFn: (invitationId: string) =>
      apiClient.post(`/organizations/${orgId}/invitations/${invitationId}/resend`),
    onSuccess: () => {
      if (orgId) {
        void queryClient.invalidateQueries({ queryKey: governanceKeys.sentInvites(orgId) });
      }
    },
  });
}

export function useRevokeInvitation(orgId: string | null) {
  return useMutation({
    mutationFn: (invitationId: string) =>
      apiClient.post(`/organizations/${orgId}/invitations/${invitationId}/revoke`),
    onSuccess: () => {
      if (orgId) {
        void queryClient.invalidateQueries({ queryKey: governanceKeys.sentInvites(orgId) });
      }
    },
  });
}

export function useOrganizations() {
  return useQuery({
    queryKey: governanceKeys.organizations,
    queryFn: () =>
      apiClient.get<ApiEnvelope<OrganizationSummary[]>>('/organizations').then((res) => res.data),
  });
}

export function useCreateOrganization() {
  return useMutation({
    mutationFn: (input: { name: string }) => apiClient.post('/organizations', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: governanceKeys.organizations });
    },
  });
}

export function useDeleteOrganization() {
  return useMutation({
    mutationFn: (organizationId: string) => apiClient.delete(`/organizations/${organizationId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: governanceKeys.organizations });
    },
  });
}

export function useRoles(orgId: string | null) {
  return useQuery({
    queryKey: governanceKeys.roles(orgId ?? ''),
    queryFn: () =>
      apiClient
        .get<ApiEnvelope<RoleRow[]>>(`/organizations/${orgId}/roles`)
        .then((res) => res.data),
    enabled: Boolean(orgId),
  });
}

export function useCreateRole(orgId: string | null) {
  return useMutation({
    mutationFn: (input: { name: string; description?: string }) =>
      apiClient.post(`/organizations/${orgId}/roles`, input),
    onSuccess: () => {
      if (orgId) {
        void queryClient.invalidateQueries({ queryKey: governanceKeys.roles(orgId) });
      }
    },
  });
}

export function useDeleteRole(orgId: string | null) {
  return useMutation({
    mutationFn: (roleId: string) => apiClient.delete(`/organizations/${orgId}/roles/${roleId}`),
    onSuccess: () => {
      if (orgId) {
        void queryClient.invalidateQueries({ queryKey: governanceKeys.roles(orgId) });
      }
    },
  });
}

export function usePermissionAssignments(orgId: string | null) {
  return useQuery({
    queryKey: governanceKeys.permissionAssignments(orgId ?? ''),
    queryFn: () =>
      apiClient
        .get<ApiEnvelope<PermissionAssignmentRow[]>>(
          `/organizations/${orgId}/permission-assignments`,
        )
        .then((res) => res.data),
    enabled: Boolean(orgId),
  });
}

export function useCreatePermissionAssignment(orgId: string | null) {
  return useMutation({
    mutationFn: (input: { userId: string; permissionKey: string }) =>
      apiClient.post(`/organizations/${orgId}/permission-assignments`, input),
    onSuccess: () => {
      if (orgId) {
        void queryClient.invalidateQueries({
          queryKey: governanceKeys.permissionAssignments(orgId),
        });
      }
    },
  });
}

export function useDeletePermissionAssignment(orgId: string | null) {
  return useMutation({
    mutationFn: (assignmentId: string) =>
      apiClient.delete(`/organizations/${orgId}/permission-assignments/${assignmentId}`),
    onSuccess: () => {
      if (orgId) {
        void queryClient.invalidateQueries({
          queryKey: governanceKeys.permissionAssignments(orgId),
        });
      }
    },
  });
}
