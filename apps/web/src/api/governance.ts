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

export interface OrganizationDetail {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  settings: Record<string, unknown> | null;
  trialExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationAuthSettings {
  organizationId: string;
  passwordAuthEnabled: boolean;
  googleOauthEnabled: boolean;
  githubOauthEnabled: boolean;
  mfaEnforced: boolean;
  mfaEnforcedAt: string | null;
  mfaGracePeriodDays: number;
  allowedEmailDomains: string[] | null;
  updatedAt: string;
}

export interface RoleRow {
  id: string;
  organizationId?: string | null;
  name: string;
  description?: string | null;
  isSystem: boolean;
  permissions?: string[];
}

export interface PermissionMatrixRole {
  id: string;
  name: string;
  permissions: string[];
}

export interface PermissionMatrixResponse {
  categories: Record<string, Array<{ key: string; description?: string }>>;
  roles: PermissionMatrixRole[];
}

interface RolePermissionInput {
  resource: string;
  action: string;
  scope: string;
}

function toRolePermissionInput(permissionKey: string): RolePermissionInput | null {
  const [resource, action, scope] = permissionKey.split('.');
  if (!resource || !action || !scope) return null;
  return { resource, action, scope };
}

export interface PermissionAssignmentRow {
  id: string;
  userId: string;
  organizationId?: string | null;
  permissionKey: string;
  assignedByUserId?: string | null;
}

export interface RoleAssignmentRow {
  id: string;
  userId: string;
  roleId: string;
  organizationId?: string | null;
  assignedByUserId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface MemberEffectivePermission {
  key: string;
  granted: boolean;
  sources: Array<{
    type: 'role' | 'direct';
    roleId?: string;
    roleName?: string;
    assignmentId?: string;
  }>;
}

export interface MemberEffectivePermissionsResponse {
  userId: string;
  organizationId: string;
  permissions: MemberEffectivePermission[];
  roles: Array<{ roleId: string; roleName: string; scope: 'organization' }>;
  isSuperAdmin: boolean;
}

export const governanceKeys = {
  sentInvites: (orgId: string) => ['governance', orgId, 'invites', 'sent'] as const,
  organizations: ['governance', 'organizations'] as const,
  organization: (orgId: string) => ['governance', orgId, 'organization'] as const,
  authSettings: (orgId: string) => ['governance', orgId, 'auth-settings'] as const,
  roles: (orgId: string) => ['governance', orgId, 'roles'] as const,
  roleAssignments: (orgId: string) => ['governance', orgId, 'role-assignments'] as const,
  permissionAssignments: (orgId: string) =>
    ['governance', orgId, 'permission-assignments'] as const,
  permissionMatrix: (orgId: string) => ['governance', orgId, 'permission-matrix'] as const,
  effectivePermissions: (orgId: string, userId: string) =>
    ['governance', orgId, 'effective-permissions', userId] as const,
};

export function useOrganization(orgId: string | null) {
  return useQuery({
    queryKey: governanceKeys.organization(orgId ?? ''),
    queryFn: () =>
      apiClient
        .get<ApiEnvelope<OrganizationDetail>>(`/organizations/${orgId}`)
        .then((res) => res.data),
    enabled: Boolean(orgId),
  });
}

export function useUpdateOrganization(orgId: string | null) {
  return useMutation({
    mutationFn: (input: { name?: string; logoUrl?: string | null }) =>
      apiClient.patch(`/organizations/${orgId}`, input),
    onSuccess: () => {
      if (!orgId) return;
      void queryClient.invalidateQueries({ queryKey: governanceKeys.organization(orgId) });
      void queryClient.invalidateQueries({ queryKey: governanceKeys.organizations });
    },
  });
}

export function useOrganizationAuthSettings(orgId: string | null) {
  return useQuery({
    queryKey: governanceKeys.authSettings(orgId ?? ''),
    queryFn: () =>
      apiClient
        .get<ApiEnvelope<OrganizationAuthSettings>>(`/organizations/${orgId}/auth-settings`)
        .then((res) => res.data),
    enabled: Boolean(orgId),
  });
}

export function useUpdateOrganizationAuthSettings(orgId: string | null) {
  return useMutation({
    mutationFn: (input: { mfaEnforced?: boolean; mfaGracePeriodDays?: number }) =>
      apiClient.patch(`/organizations/${orgId}/auth-settings`, input),
    onSuccess: () => {
      if (!orgId) return;
      void queryClient.invalidateQueries({ queryKey: governanceKeys.authSettings(orgId) });
    },
  });
}

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
    mutationFn: (input: { name: string; description?: string; permissionKeys?: string[] }) =>
      apiClient.post(`/organizations/${orgId}/roles`, {
        name: input.name,
        description: input.description,
        permissions: (input.permissionKeys ?? [])
          .map((permissionKey) => toRolePermissionInput(permissionKey))
          .filter((permission): permission is RolePermissionInput => permission !== null),
      }),
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

export function useUpdateRole(orgId: string | null) {
  return useMutation({
    mutationFn: (input: {
      roleId: string;
      name?: string;
      description?: string | null;
      permissionKeys?: string[];
    }) => {
      const parsedPermissions = input.permissionKeys
        ?.map((permissionKey) => toRolePermissionInput(permissionKey))
        .filter((permission): permission is RolePermissionInput => permission !== null);

      return apiClient.patch(`/organizations/${orgId}/roles/${input.roleId}`, {
        name: input.name,
        description: input.description,
        ...(parsedPermissions ? { permissions: parsedPermissions } : {}),
      });
    },
    onSuccess: () => {
      if (orgId) {
        void queryClient.invalidateQueries({ queryKey: governanceKeys.roles(orgId) });
      }
    },
  });
}

export function useRoleAssignments(orgId: string | null) {
  return useQuery({
    queryKey: governanceKeys.roleAssignments(orgId ?? ''),
    queryFn: () =>
      apiClient
        .get<ApiEnvelope<RoleAssignmentRow[]>>(`/organizations/${orgId}/role-assignments`)
        .then((res) => res.data),
    enabled: Boolean(orgId),
  });
}

export function useCreateRoleAssignment(orgId: string | null) {
  return useMutation({
    mutationFn: (input: { userId: string; roleId: string }) =>
      apiClient.post(`/organizations/${orgId}/role-assignments`, input),
    onSuccess: () => {
      if (!orgId) return;
      void queryClient.invalidateQueries({ queryKey: governanceKeys.roleAssignments(orgId) });
    },
  });
}

export function useDeleteRoleAssignment(orgId: string | null) {
  return useMutation({
    mutationFn: (assignmentId: string) =>
      apiClient.delete(`/organizations/${orgId}/role-assignments/${assignmentId}`),
    onSuccess: () => {
      if (!orgId) return;
      void queryClient.invalidateQueries({ queryKey: governanceKeys.roleAssignments(orgId) });
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

export function usePermissionMatrix(orgId: string | null) {
  return useQuery({
    queryKey: governanceKeys.permissionMatrix(orgId ?? ''),
    queryFn: () =>
      apiClient
        .get<ApiEnvelope<PermissionMatrixResponse>>(`/organizations/${orgId}/permission-matrix`)
        .then((res) => res.data),
    enabled: Boolean(orgId),
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

export function useMemberEffectivePermissions(orgId: string | null, userId: string | null) {
  return useQuery({
    queryKey: governanceKeys.effectivePermissions(orgId ?? '', userId ?? ''),
    queryFn: () =>
      apiClient
        .get<ApiEnvelope<MemberEffectivePermissionsResponse>>(
          `/organizations/${orgId}/members/${userId}/effective-permissions`,
        )
        .then((res) => res.data),
    enabled: Boolean(orgId && userId),
    retry: false,
  });
}

export function useUploadOrganizationLogo(orgId: string | null) {
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiClient.post(`/organizations/${orgId}/logo`, formData);
    },
    onSuccess: () => {
      if (orgId) {
        void queryClient.invalidateQueries({ queryKey: governanceKeys.organization(orgId) });
        void queryClient.invalidateQueries({ queryKey: governanceKeys.organizations });
      }
    },
  });
}
