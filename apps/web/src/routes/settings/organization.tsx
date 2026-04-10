import {
  type PermissionAssignmentRow,
  type RoleAssignmentRow,
  type RoleRow,
  useCreateInvitation,
  useCreatePermissionAssignment,
  useCreateRole,
  useCreateRoleAssignment,
  useDeleteRole,
  useOrganization,
  useOrganizationAuthSettings,
  usePermissionAssignments,
  usePermissionMatrix,
  useResendInvitation,
  useRevokeInvitation,
  useRoleAssignments,
  useRoles,
  useSentInvitations,
  useUpdateOrganization,
  useUpdateOrganizationAuthSettings,
  useUpdateRole,
  useUploadOrganizationLogo,
} from '@/api/governance';
import { useOrgMembers, useRemoveOrgMember } from '@/api/organizations';
import { Avatar, getAvatarColor, getInitials } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useAuthStore } from '@/stores/auth.store';
import { useNavigate } from '@tanstack/react-router';
import {
  AlertTriangle,
  Building2,
  ChevronDown,
  Key,
  Mail,
  ShieldCheck,
  UserMinus,
  Users,
} from 'lucide-react';
import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

const ORG_INFO_READ_PERMISSION = 'organization.read.org';
const ORG_INFO_UPDATE_PERMISSION = 'organization.update.org';
const ORG_MANAGE_PERMISSION = 'organization.manage.org';
const MEMBERS_READ_PERMISSION = 'membership.read.org';
const MEMBERS_UPDATE_PERMISSION = 'membership.update.org';
const MEMBERS_DELETE_PERMISSION = 'membership.delete.org';
const INVITE_READ_PERMISSION = 'invitation.read.org';
const INVITE_CREATE_PERMISSION = 'invitation.create.org';
const INVITE_UPDATE_PERMISSION = 'invitation.update.org';
const ROLE_READ_PERMISSION = 'role.read.org';
const ROLE_CREATE_PERMISSION = 'role.create.org';
const ROLE_UPDATE_PERMISSION = 'role.update.org';
const ROLE_DELETE_PERMISSION = 'role.delete.org';
const PERMISSION_READ_PERMISSION = 'permission.read.org';
const PERMISSION_UPDATE_PERMISSION = 'permission.update.org';
const GLOBAL_ROLE_ASSIGNMENT_PERMISSIONS = [
  'global_role_assignment.create',
  'global_role_assignment.read',
  'global_role_assignment.update',
  'global_role_assignment.delete',
];
const ROLE_PERMISSION_PREVIEW_COUNT = 4;
const DIRECT_PERMISSION_PREVIEW_COUNT = 4;
const MAX_LOGO_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_LOGO_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
]);

const GOVERNANCE_PREFIXES = [
  'organization.',
  'membership.',
  'invitation.',
  'role.',
  'permission.',
  'global_role_assignment.',
];

function hasAnyGovernancePermission(permissions: string[]): boolean {
  for (const permission of permissions) {
    const isGovernance = GOVERNANCE_PREFIXES.some((prefix) => permission.startsWith(prefix));
    if (isGovernance) return true;
  }
  return false;
}

function formatPermissionKeyLabel(permissionKey: string): string {
  return permissionKey.endsWith('.org')
    ? permissionKey.slice(0, permissionKey.length - '.org'.length)
    : permissionKey;
}

function parsePermissionKeysFromDescription(description?: string | null): string[] {
  if (!description) return [];
  const prefix = 'Selected permissions:';
  if (!description.startsWith(prefix)) return [];
  return description
    .slice(prefix.length)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getPermissionCategory(permissionKey: string): string {
  if (permissionKey.startsWith('organization.')) return 'Organization';
  if (permissionKey.startsWith('invitation.')) return 'Invitations';
  if (permissionKey.startsWith('membership.')) return 'Membership';
  if (permissionKey.startsWith('global_role_assignment.')) return 'Global Role Assignment';
  if (permissionKey.startsWith('role.')) return 'Roles';
  if (permissionKey.startsWith('permission.')) return 'Permissions';
  return 'Other';
}

function groupPermissionKeys(permissionKeys: string[]): Array<[string, string[]]> {
  const grouped = permissionKeys.reduce<Record<string, string[]>>((acc, key) => {
    const category = getPermissionCategory(key);
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(key);
    return acc;
  }, {});

  const preferredOrder = [
    'Organization',
    'Invitations',
    'Membership',
    'Global Role Assignment',
    'Roles',
    'Permissions',
    'Other',
  ];
  return preferredOrder
    .filter((category) => grouped[category]?.length)
    .map((category) => [category, grouped[category].sort((a, b) => a.localeCompare(b))]);
}

function SectionCard({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className="group rounded-lg border border-border/30 bg-surface-container-lowest"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2.5 px-3.5 py-3 marker:content-none">
        <span className="text-blue-500">{icon}</span>
        <span className="text-body font-semibold text-foreground">{title}</span>
        <ChevronDown className="ml-auto size-4 text-muted transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="px-3.5 pb-3.5">{children}</div>
    </details>
  );
}

function collectMemberRoleNames(
  memberUserId: string,
  roleAssignments: RoleAssignmentRow[],
  roles: RoleRow[],
): string[] {
  const roleMap = new Map(roles.map((role) => [role.id, role.name]));
  return roleAssignments
    .filter((assignment) => assignment.userId === memberUserId)
    .map((assignment) => roleMap.get(assignment.roleId))
    .filter((name): name is string => Boolean(name));
}

function collectDirectPermissions(
  memberUserId: string,
  assignments: PermissionAssignmentRow[],
): string[] {
  return assignments
    .filter((assignment) => assignment.userId === memberUserId)
    .map((assignment) => assignment.permissionKey)
    .sort((a, b) => a.localeCompare(b));
}

function formatInviteDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null) {
    const maybeError = error as {
      message?: unknown;
      error?: {
        message?: unknown;
      };
    };

    if (typeof maybeError.message === 'string' && maybeError.message.trim().length > 0) {
      return maybeError.message;
    }

    if (
      maybeError.error &&
      typeof maybeError.error.message === 'string' &&
      maybeError.error.message.trim().length > 0
    ) {
      return maybeError.error.message;
    }
  }

  return fallback;
}

function getLogoUploadErrorMessage(error: unknown): string {
  const message = getApiErrorMessage(error, 'Could not upload organization logo.');
  const normalized = message.toLowerCase();

  if (normalized.includes('too large') || normalized.includes('payload too large')) {
    return 'File too large. Maximum size is 5MB.';
  }

  if (
    normalized.includes('invalid file type') ||
    normalized.includes('unsupported media type') ||
    normalized.includes('invalid mime')
  ) {
    return 'Invalid file type. Please upload a PNG, JPG, GIF, or WebP image.';
  }

  return message;
}

export function OrganizationSettingsPage() {
  const navigate = useNavigate();
  const { user, activeOrganizationId } = useAuthStore();
  const permissionSet = useMemo(() => new Set(user?.permissions ?? []), [user?.permissions]);

  const canSeeGovernance = hasAnyGovernancePermission(user?.permissions ?? []);
  const canViewOrgInfo = permissionSet.has(ORG_INFO_READ_PERMISSION);
  const canEditOrgInfo = permissionSet.has(ORG_INFO_UPDATE_PERMISSION);
  const canViewMembers = permissionSet.has(MEMBERS_READ_PERMISSION);
  const canRemoveMember =
    permissionSet.has(MEMBERS_DELETE_PERMISSION) ||
    permissionSet.has(MEMBERS_UPDATE_PERMISSION) ||
    permissionSet.has(ORG_INFO_UPDATE_PERMISSION);
  const canViewInvite = permissionSet.has(INVITE_READ_PERMISSION);
  const canSendInvite = permissionSet.has(INVITE_CREATE_PERMISSION);
  const canManageInvites = permissionSet.has(INVITE_UPDATE_PERMISSION);
  const canViewRoleManagement = permissionSet.has(ROLE_READ_PERMISSION);
  const canCreateRole = permissionSet.has(ROLE_CREATE_PERMISSION);
  const canManageRoleAssignments = permissionSet.has(ROLE_UPDATE_PERMISSION);
  const canDeleteRole = permissionSet.has(ROLE_DELETE_PERMISSION);
  const canViewPermissionManagement = permissionSet.has(PERMISSION_READ_PERMISSION);
  const canEditPermissions = permissionSet.has(PERMISSION_UPDATE_PERMISSION);
  const canManageOrganization = permissionSet.has(ORG_MANAGE_PERMISSION);

  const canLoadMembers = canViewMembers;
  const canLoadRoles = canViewRoleManagement || canManageRoleAssignments || canEditPermissions;
  const canLoadRoleAssignments = canViewRoleManagement;
  const canLoadPermissionAssignments = canViewPermissionManagement;
  const canLoadPermissionMatrix = canViewRoleManagement || canManageOrganization;

  const orgIdForOrgInfo = canViewOrgInfo ? activeOrganizationId : null;
  const orgIdForMembers = canLoadMembers ? (activeOrganizationId ?? undefined) : undefined;
  const orgIdForRoles = canLoadRoles ? activeOrganizationId : null;
  const orgIdForInvites = canViewInvite ? activeOrganizationId : null;
  const orgIdForRoleAssignments = canLoadRoleAssignments ? activeOrganizationId : null;
  const orgIdForPermissionAssignments = canLoadPermissionAssignments ? activeOrganizationId : null;
  const orgIdForPermissionMatrix = canLoadPermissionMatrix ? activeOrganizationId : null;

  const organization = useOrganization(orgIdForOrgInfo);
  const authSettings = useOrganizationAuthSettings(orgIdForOrgInfo);
  const members = useOrgMembers(orgIdForMembers);
  const roles = useRoles(orgIdForRoles);
  const invitations = useSentInvitations(orgIdForInvites);
  const roleAssignments = useRoleAssignments(orgIdForRoleAssignments);
  const permissionAssignments = usePermissionAssignments(orgIdForPermissionAssignments);
  const permissionMatrix = usePermissionMatrix(orgIdForPermissionMatrix);
  const updateOrganization = useUpdateOrganization(activeOrganizationId);
  const updateAuthSettings = useUpdateOrganizationAuthSettings(activeOrganizationId);
  const removeMember = useRemoveOrgMember(activeOrganizationId ?? undefined);
  const createInvitation = useCreateInvitation(activeOrganizationId);
  const resendInvitation = useResendInvitation(activeOrganizationId);
  const revokeInvitation = useRevokeInvitation(activeOrganizationId);
  const createRole = useCreateRole(activeOrganizationId);
  const updateRole = useUpdateRole(activeOrganizationId);
  const deleteRole = useDeleteRole(activeOrganizationId);
  const createRoleAssignment = useCreateRoleAssignment(activeOrganizationId);
  const createPermissionAssignment = useCreatePermissionAssignment(activeOrganizationId);
  const uploadOrganizationLogo = useUploadOrganizationLogo(activeOrganizationId);

  const [orgName, setOrgName] = useState('');
  const [originalOrgName, setOriginalOrgName] = useState('');
  const [mfaEnforced, setMfaEnforced] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [roleName, setRoleName] = useState('');
  const [memberForRole, setMemberForRole] = useState('');
  const [roleForAssignment, setRoleForAssignment] = useState('');
  const [memberForPermission, setMemberForPermission] = useState('');
  const [permissionKey, setPermissionKey] = useState('');
  const [editingRole, setEditingRole] = useState<RoleRow | null>(null);
  const [editingRolePermissions, setEditingRolePermissions] = useState<string[]>([]);
  const [roleDeleteConfirmRoleId, setRoleDeleteConfirmRoleId] = useState<string | null>(null);
  const [expandedRolePermissionCards, setExpandedRolePermissionCards] = useState<
    Record<string, boolean>
  >({});
  const [rolePermissionHintsByRoleId, setRolePermissionHintsByRoleId] = useState<
    Record<string, string[]>
  >({});
  const [selectedMemberUserId, setSelectedMemberUserId] = useState<string | null>(null);
  const [showAllMemberDirectPermissions, setShowAllMemberDirectPermissions] = useState(false);
  const [memberRemoveConfirmId, setMemberRemoveConfirmId] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!canSeeGovernance) {
      toast.error('You do not have organization governance access.');
      void navigate({ to: '/dashboard', replace: true });
    }
  }, [canSeeGovernance, navigate]);

  useEffect(() => {
    if (typeof organization.data?.name === 'string') {
      setOrgName(organization.data.name);
      setOriginalOrgName(organization.data.name);
    }
  }, [organization.data?.name]);

  useEffect(() => {
    if (typeof authSettings.data?.mfaEnforced === 'boolean') {
      setMfaEnforced(authSettings.data.mfaEnforced);
    }
  }, [authSettings.data?.mfaEnforced]);

  useEffect(() => {
    if (!memberRemoveConfirmId) return;
    const exists = (members.data ?? []).some((member) => member.id === memberRemoveConfirmId);
    if (!exists) {
      setMemberRemoveConfirmId(null);
    }
  }, [memberRemoveConfirmId, members.data]);

  const availablePermissionKeys = useMemo(() => {
    const fromUser = (user?.permissions ?? []).filter(
      (key) => key.endsWith('.org') || key.startsWith('global_role_assignment.'),
    );
    return [...new Set([...fromUser, ...GLOBAL_ROLE_ASSIGNMENT_PERMISSIONS])].sort((a, b) =>
      a.localeCompare(b),
    );
  }, [user?.permissions]);
  const groupedAvailablePermissionKeys = useMemo(
    () => groupPermissionKeys(availablePermissionKeys),
    [availablePermissionKeys],
  );
  const assignedDirectPermissionKeysForSelectedMember = useMemo(() => {
    if (!memberForPermission) return new Set<string>();

    return new Set(collectDirectPermissions(memberForPermission, permissionAssignments.data ?? []));
  }, [memberForPermission, permissionAssignments.data]);
  const availableDirectPermissionKeysForSelectedMember = useMemo(
    () =>
      availablePermissionKeys.filter(
        (key) => !assignedDirectPermissionKeysForSelectedMember.has(key),
      ),
    [availablePermissionKeys, assignedDirectPermissionKeysForSelectedMember],
  );

  useEffect(() => {
    const roleRows = roles.data ?? [];
    if (roleRows.length === 0) return;
    setRolePermissionHintsByRoleId((current) => {
      const next = { ...current };
      for (const role of roleRows) {
        if (!next[role.id]) {
          next[role.id] = role.permissions ?? parsePermissionKeysFromDescription(role.description);
        }
      }
      return next;
    });
  }, [roles.data]);

  useEffect(() => {
    if (!permissionKey) return;
    if (availableDirectPermissionKeysForSelectedMember.includes(permissionKey)) return;
    setPermissionKey('');
  }, [availableDirectPermissionKeysForSelectedMember, permissionKey]);

  const rolePermissionsByRoleId = useMemo(() => {
    const map = new Map<string, string[]>();

    for (const role of permissionMatrix.data?.roles ?? []) {
      map.set(role.id, role.permissions);
    }

    for (const role of roles.data ?? []) {
      if (map.has(role.id)) continue;
      if (role.permissions && role.permissions.length > 0) {
        map.set(role.id, role.permissions);
        continue;
      }
      map.set(role.id, parsePermissionKeysFromDescription(role.description));
    }

    return map;
  }, [permissionMatrix.data?.roles, roles.data]);

  const selectedMember =
    members.data?.find((member) => member.userId === selectedMemberUserId) ?? null;
  const selectedMemberRoleDetails = useMemo(() => {
    if (!selectedMemberUserId) return [];
    const selectedRoleIds = new Set(
      (roleAssignments.data ?? [])
        .filter((assignment) => assignment.userId === selectedMemberUserId)
        .map((assignment) => assignment.roleId),
    );

    return (roles.data ?? [])
      .filter((role) => selectedRoleIds.has(role.id))
      .map((role) => ({
        roleId: role.id,
        roleName: role.name,
        permissions:
          rolePermissionsByRoleId.get(role.id) ??
          rolePermissionHintsByRoleId[role.id] ??
          role.permissions ??
          parsePermissionKeysFromDescription(role.description),
      }));
  }, [
    roleAssignments.data,
    rolePermissionHintsByRoleId,
    rolePermissionsByRoleId,
    roles.data,
    selectedMemberUserId,
  ]);
  const selectedMemberDirectPermissions = selectedMemberUserId
    ? collectDirectPermissions(selectedMemberUserId, permissionAssignments.data ?? [])
    : [];
  const hasOrgNameChanged = orgName.trim() !== originalOrgName.trim();
  const canSubmitInvite = inviteEmail.trim().length > 0;
  const visibleSelectedMemberDirectPermissions = showAllMemberDirectPermissions
    ? selectedMemberDirectPermissions
    : selectedMemberDirectPermissions.slice(0, DIRECT_PERMISSION_PREVIEW_COUNT);

  if (!canSeeGovernance) {
    return null;
  }

  if (!activeOrganizationId) {
    return (
      <div className="rounded-radius-xl border border-border/30 bg-surface-container-lowest p-lg">
        <p className="text-body text-secondary">
          Select an organization in the sidebar to continue.
        </p>
      </div>
    );
  }

  async function handleSaveOrganizationInfo() {
    if (!hasOrgNameChanged) return;

    try {
      const nextOrgName = orgName.trim();
      await updateOrganization.mutateAsync({ name: nextOrgName });
      setOrgName(nextOrgName);
      setOriginalOrgName(nextOrgName);
      toast.success('Organization profile updated.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not update organization profile.'));
    }
  }

  async function handleMfaToggle(nextValue: boolean) {
    const previousValue = mfaEnforced;
    setMfaEnforced(nextValue);

    try {
      await updateAuthSettings.mutateAsync({ mfaEnforced: nextValue });
      toast.success(nextValue ? 'MFA enforcement enabled.' : 'MFA enforcement disabled.');
    } catch (error) {
      setMfaEnforced(previousValue);
      toast.error(getApiErrorMessage(error, 'Could not update MFA policy.'));
    }
  }

  async function handleRemoveMember(memberId: string) {
    try {
      await removeMember.mutateAsync(memberId);
      setMemberRemoveConfirmId(null);
      toast.success('Member removed from organization.');
      await members.refetch();
      if (canLoadRoleAssignments) {
        await roleAssignments.refetch();
      }
      if (canLoadPermissionAssignments) {
        await permissionAssignments.refetch();
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not remove member.'));
    }
  }

  async function handleSendInvite(event: FormEvent) {
    event.preventDefault();
    const nextInviteEmail = inviteEmail.trim();
    if (!nextInviteEmail) return;

    try {
      await createInvitation.mutateAsync({ email: nextInviteEmail });
      setInviteEmail('');
      toast.success('Invite sent.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not send invite.'));
    }
  }

  async function handleCreateRole(event: FormEvent) {
    event.preventDefault();
    if (!roleName.trim()) return;
    try {
      await createRole.mutateAsync({
        name: roleName.trim(),
      });
      toast.success('Role created.');
      setRoleName('');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not create role.'));
    }
  }

  async function handleAssignRole(event: FormEvent) {
    event.preventDefault();
    if (!memberForRole || !roleForAssignment) return;
    try {
      await createRoleAssignment.mutateAsync({ userId: memberForRole, roleId: roleForAssignment });
      toast.success('Role assigned.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not assign role.'));
    }
  }

  async function handleAssignPermission(event: FormEvent) {
    event.preventDefault();
    if (!memberForPermission || !permissionKey) return;
    try {
      await createPermissionAssignment.mutateAsync({ userId: memberForPermission, permissionKey });
      toast.success('Permission assigned.');
      setMemberForPermission('');
      setPermissionKey('');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not assign permission.'));
    }
  }

  function triggerLogoPicker() {
    if (!canEditOrgInfo || uploadOrganizationLogo.isPending) return;
    logoInputRef.current?.click();
  }

  async function handleLogoSelected(event: FormEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    if (file.size > MAX_LOGO_FILE_SIZE_BYTES) {
      toast.error('File too large. Maximum size is 5MB.');
      input.value = '';
      return;
    }

    if (file.type && !ALLOWED_LOGO_MIME_TYPES.has(file.type)) {
      toast.error('Invalid file type. Please upload a PNG, JPG, GIF, or WebP image.');
      input.value = '';
      return;
    }

    try {
      await uploadOrganizationLogo.mutateAsync(file);
      toast.success('Organization logo updated.');
    } catch (error) {
      toast.error(getLogoUploadErrorMessage(error));
    } finally {
      input.value = '';
    }
  }

  function openRolePermissionEditor(role: RoleRow) {
    setEditingRole(role);
    setEditingRolePermissions(
      rolePermissionsByRoleId.get(role.id) ??
        role.permissions ??
        rolePermissionHintsByRoleId[role.id] ??
        parsePermissionKeysFromDescription(role.description),
    );
  }

  async function handleSaveRolePermissions() {
    if (!editingRole) return;
    try {
      await updateRole.mutateAsync({
        roleId: editingRole.id,
        name: editingRole.name,
        description: editingRole.description ?? null,
        permissionKeys: editingRolePermissions,
      });
      setRolePermissionHintsByRoleId((current) => ({
        ...current,
        [editingRole.id]: editingRolePermissions,
      }));
      toast.success('Role permissions updated.');
      setEditingRole(null);
      setEditingRolePermissions([]);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not update role permissions.'));
    }
  }

  return (
    <div className="space-y-3 p-1">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/30 bg-surface-container-lowest px-4 py-3">
        <div>
          <h1 className="text-lg font-bold leading-snug text-foreground">
            Organization Settings & Permissions
          </h1>
          <p className="text-small text-secondary">
            Manage organization profile, members, invites, roles, and permissions.
          </p>
        </div>
      </div>

      <div className="grid gap-md">
        {canViewOrgInfo ? (
          <SectionCard title="Organization Info" icon={<Building2 className="size-4" />}>
            {organization.isLoading || authSettings.isLoading ? (
              <p className="text-body text-secondary">Loading organization info…</p>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-[96px_minmax(0,1fr)] md:items-start">
                  <div className="space-y-2">
                    {organization.data?.logoUrl ? (
                      <Avatar
                        src={organization.data.logoUrl}
                        name={organization.data.name}
                        size="xl"
                      />
                    ) : (
                      <div
                        className="flex size-16 items-center justify-center rounded-full font-bold text-white"
                        style={{ backgroundColor: getAvatarColor(activeOrganizationId) }}
                      >
                        {getInitials(organization.data?.name ?? 'TF') || 'TF'}
                      </div>
                    )}
                    <button
                      type="button"
                      className="text-small font-medium text-blue-500 underline-offset-2 hover:underline disabled:opacity-50"
                      onClick={triggerLogoPicker}
                      disabled={!canEditOrgInfo || uploadOrganizationLogo.isPending}
                    >
                      {uploadOrganizationLogo.isPending ? 'Uploading…' : 'Upload Logo'}
                    </button>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                      className="hidden"
                      onChange={(event) => void handleLogoSelected(event)}
                    />
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label
                        className="text-label font-semibold text-foreground"
                        htmlFor="org-name"
                      >
                        Organization name
                      </label>
                      <Input
                        id="org-name"
                        value={orgName}
                        className="rounded-md border border-border bg-surface-container-lowest"
                        onChange={(event) => setOrgName(event.target.value)}
                        disabled={!canEditOrgInfo}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-label font-semibold text-foreground">
                        Authentication policy
                      </span>
                      <div className="flex items-center gap-2">
                        <Switch
                          className="rounded-full"
                          checked={mfaEnforced}
                          onChange={(event) => void handleMfaToggle(event.target.checked)}
                          disabled={!canEditOrgInfo || updateAuthSettings.isPending}
                        />
                        <span className="text-body">Force MFA for organization members</span>
                      </div>
                    </div>
                  </div>
                </div>

                {canEditOrgInfo ? (
                  <div className="flex flex-wrap gap-sm">
                    <Button
                      type="button"
                      loading={updateOrganization.isPending}
                      disabled={!hasOrgNameChanged}
                      onClick={handleSaveOrganizationInfo}
                    >
                      Save Organization
                    </Button>
                  </div>
                ) : (
                  <p className="text-small text-muted">
                    You have read-only access for this section.
                  </p>
                )}
              </div>
            )}
          </SectionCard>
        ) : null}

        {canViewMembers ? (
          <SectionCard title="Members" icon={<Users className="size-4" />}>
            {members.isLoading ? (
              <p className="text-body text-secondary">Loading members…</p>
            ) : members.data && members.data.length > 0 ? (
              <div className="space-y-sm">
                {members.data.map((member) => {
                  const roleNames = collectMemberRoleNames(
                    member.userId,
                    roleAssignments.data ?? [],
                    roles.data ?? [],
                  );

                  return (
                    <div
                      key={member.id}
                      className="flex flex-wrap items-center justify-between gap-2 border-b border-border/30 py-2.5 last:border-b-0"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar name={member.displayName} userId={member.userId} size="md" />
                        <div className="min-w-0">
                          <p className="truncate text-body font-medium text-foreground">
                            {member.displayName}
                          </p>
                          <p className="truncate text-small text-muted">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex flex-wrap items-center gap-1">
                          {(roleNames.length > 0 ? roleNames : [member.roleName ?? 'No role']).map(
                            (roleName) => (
                              <Badge key={`${member.id}-${roleName}`} variant="primary">
                                {roleName}
                              </Badge>
                            ),
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setSelectedMemberUserId(member.userId)}
                        >
                          View
                        </Button>
                        {canRemoveMember ? (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="shadow-none"
                            onClick={() => {
                              if (memberRemoveConfirmId !== member.id) {
                                setMemberRemoveConfirmId(member.id);
                                return;
                              }

                              void handleRemoveMember(member.id);
                            }}
                          >
                            <UserMinus className="size-3.5" />
                            {memberRemoveConfirmId === member.id ? 'Confirm?' : 'Remove'}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-body text-secondary">No members found.</p>
            )}
          </SectionCard>
        ) : null}

        {canViewInvite ? (
          <SectionCard title="Invite Members" icon={<Mail className="size-4" />}>
            <div className="space-y-md">
              {canSendInvite ? (
                <form
                  className="flex flex-wrap gap-sm"
                  onSubmit={(event) => void handleSendInvite(event)}
                >
                  <Input
                    type="email"
                    className="w-full max-w-90 rounded-md border border-border bg-surface-container-lowest"
                    value={inviteEmail}
                    placeholder="person@taskforge.dev"
                    onChange={(event) => setInviteEmail(event.target.value)}
                    required
                  />
                  <Button
                    type="submit"
                    loading={createInvitation.isPending}
                    disabled={!canSubmitInvite}
                  >
                    Send Invite
                  </Button>
                </form>
              ) : (
                <p className="text-small text-muted">
                  You can view invites but cannot create new invites.
                </p>
              )}

              {invitations.isLoading ? (
                <p className="text-body text-secondary">Loading pending invites…</p>
              ) : invitations.data && invitations.data.length > 0 ? (
                <div className="space-y-sm">
                  {invitations.data.map((invite) => (
                    <div
                      key={invite.id}
                      className="flex flex-wrap items-center justify-between gap-2 border-b border-border/30 py-2.5 last:border-b-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-body font-medium text-foreground">
                          {invite.email}
                        </p>
                        <p className="text-small text-muted">
                          Sent {formatInviteDate(invite.sentAt)} · {invite.status}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-xs">
                        {canManageInvites ? (
                          <>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                resendInvitation.mutate(invite.id, {
                                  onSuccess: () => toast.success('Invite resent.'),
                                  onError: (error) =>
                                    toast.error(
                                      getApiErrorMessage(error, 'Could not resend invite.'),
                                    ),
                                });
                              }}
                            >
                              Resend
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                revokeInvitation.mutate(invite.id, {
                                  onSuccess: () => toast.success('Invite revoked.'),
                                  onError: (error) =>
                                    toast.error(
                                      getApiErrorMessage(error, 'Could not revoke invite.'),
                                    ),
                                });
                              }}
                            >
                              Revoke
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-body text-secondary">No pending invites.</p>
              )}
            </div>
          </SectionCard>
        ) : null}

        <SectionCard title="Role Management" icon={<ShieldCheck className="size-4" />}>
          <div className="space-y-md">
            {!canViewRoleManagement &&
            !canCreateRole &&
            !canManageRoleAssignments &&
            !canEditPermissions ? (
              <p className="text-small text-muted">
                You do not currently have permissions to manage roles in this organization.
              </p>
            ) : null}

            <div className="rounded-lg border border-border/30 p-3">
              <p className="mb-2 text-small font-semibold text-foreground">Create custom role</p>
              {canCreateRole ? (
                <form
                  className="flex flex-wrap gap-sm"
                  onSubmit={(event) => void handleCreateRole(event)}
                >
                  <Input
                    value={roleName}
                    onChange={(event) => setRoleName(event.target.value)}
                    placeholder="Role name"
                    className="w-full max-w-80 rounded-md border border-border bg-surface-container-lowest"
                    required
                  />
                  <Button type="submit" loading={createRole.isPending} disabled={!roleName.trim()}>
                    Create
                  </Button>
                </form>
              ) : (
                <p className="text-small text-muted">Requires role.create.org permission.</p>
              )}
            </div>

            <div className="rounded-lg border border-border/30 p-3">
              <p className="mb-2 text-small font-semibold text-foreground">Assign role to member</p>
              {canManageRoleAssignments && canViewMembers ? (
                <form
                  className="grid gap-sm lg:grid-cols-4"
                  onSubmit={(event) => void handleAssignRole(event)}
                >
                  <select
                    className="h-9 rounded-md border border-border bg-surface-container-lowest px-3 text-sm text-foreground"
                    value={memberForRole}
                    onChange={(event) => setMemberForRole(event.target.value)}
                    required
                  >
                    <option value="">Select member</option>
                    {(members.data ?? []).map((member) => (
                      <option key={member.id} value={member.userId}>
                        {member.displayName}
                      </option>
                    ))}
                  </select>
                  <select
                    className="h-9 rounded-md border border-border bg-surface-container-lowest px-3 text-sm text-foreground"
                    value={roleForAssignment}
                    onChange={(event) => setRoleForAssignment(event.target.value)}
                    required
                  >
                    <option value="">Select role</option>
                    {(roles.data ?? []).map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="submit"
                    loading={createRoleAssignment.isPending}
                    disabled={!memberForRole || !roleForAssignment}
                  >
                    Assign role
                  </Button>
                </form>
              ) : canManageRoleAssignments ? (
                <p className="text-small text-muted">
                  Member assignment requires membership.read.org to select members.
                </p>
              ) : (
                <p className="text-small text-muted">Requires role.update.org permission.</p>
              )}
            </div>

            <div className="rounded-lg border border-border/30 p-3">
              <p className="mb-2 text-small font-semibold text-foreground">
                Assign direct permission
              </p>
              {canEditPermissions && canViewMembers ? (
                <form
                  className="grid gap-sm lg:grid-cols-4"
                  onSubmit={(event) => void handleAssignPermission(event)}
                >
                  <select
                    className="h-9 rounded-md border border-border bg-surface-container-lowest px-3 text-sm text-foreground"
                    value={memberForPermission}
                    onChange={(event) => setMemberForPermission(event.target.value)}
                    required
                  >
                    <option value="">Select member</option>
                    {(members.data ?? []).map((member) => (
                      <option key={member.id} value={member.userId}>
                        {member.displayName}
                      </option>
                    ))}
                  </select>
                  <select
                    className="h-9 rounded-md border border-border bg-surface-container-lowest px-3 text-sm text-foreground"
                    value={permissionKey}
                    onChange={(event) => setPermissionKey(event.target.value)}
                    required
                    disabled={
                      !memberForPermission ||
                      availableDirectPermissionKeysForSelectedMember.length === 0
                    }
                  >
                    <option value="">Select direct permission</option>
                    {availableDirectPermissionKeysForSelectedMember.map((key) => (
                      <option key={key} value={key}>
                        {key}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="submit"
                    loading={createPermissionAssignment.isPending}
                    disabled={!memberForPermission || !permissionKey}
                  >
                    Add Permission
                  </Button>
                </form>
              ) : canEditPermissions ? (
                <p className="text-small text-muted">
                  Direct permission assignment requires membership.read.org to select members.
                </p>
              ) : (
                <p className="text-small text-muted">Requires permission.update.org permission.</p>
              )}
            </div>
          </div>
        </SectionCard>

        {canViewPermissionManagement ? (
          <SectionCard title="Permission Management" icon={<Key className="size-4" />}>
            {!canViewRoleManagement ? (
              <p className="text-small text-muted">
                Role details require role.read.org and are hidden for your access level.
              </p>
            ) : permissionMatrix.isLoading ? (
              <p className="text-body text-secondary">Loading permission matrix…</p>
            ) : permissionMatrix.error ? (
              <p className="text-small text-muted">
                {getApiErrorMessage(
                  permissionMatrix.error,
                  'Could not load permission matrix. Role permissions may be incomplete.',
                )}
              </p>
            ) : roles.isLoading ? (
              <p className="text-body text-secondary">Loading roles…</p>
            ) : roles.data && roles.data.length > 0 ? (
              <div className="space-y-sm">
                {roles.data.map((role) => {
                  const assignmentsForRole = (roleAssignments.data ?? []).filter(
                    (assignment) => assignment.roleId === role.id,
                  );
                  return (
                    <div
                      key={role.id}
                      className="space-y-sm rounded-md border border-border/30 bg-surface-container-lowest px-3 py-2.5"
                    >
                      <div>
                        <p className="text-body font-medium text-foreground">{role.name}</p>
                        <p className="text-small text-muted">
                          Assigned members: {assignmentsForRole.length}
                        </p>
                      </div>

                      <div className="space-y-xs">
                        {(() => {
                          const rolePermissions =
                            rolePermissionsByRoleId.get(role.id) ??
                            role.permissions ??
                            rolePermissionHintsByRoleId[role.id] ??
                            parsePermissionKeysFromDescription(role.description);
                          const isExpanded = Boolean(expandedRolePermissionCards[role.id]);
                          const visiblePermissions = isExpanded
                            ? rolePermissions
                            : rolePermissions.slice(0, ROLE_PERMISSION_PREVIEW_COUNT);

                          if (rolePermissions.length === 0) {
                            return (
                              <p className="text-small text-muted">
                                No permissions assigned to this role.
                              </p>
                            );
                          }

                          return (
                            <>
                              <div className="flex flex-wrap gap-xs">
                                {visiblePermissions.map((permissionKey) => (
                                  <Badge
                                    key={`${role.id}-${permissionKey}`}
                                    className="font-mono text-[11px]"
                                  >
                                    {permissionKey}
                                  </Badge>
                                ))}
                              </div>
                              {rolePermissions.length > ROLE_PERMISSION_PREVIEW_COUNT ? (
                                <button
                                  type="button"
                                  className="text-small text-blue-500 underline-offset-2 hover:underline"
                                  onClick={() => {
                                    setExpandedRolePermissionCards((current) => ({
                                      ...current,
                                      [role.id]: !isExpanded,
                                    }));
                                  }}
                                >
                                  {isExpanded ? 'Show less' : 'Show more'}
                                </button>
                              ) : null}
                            </>
                          );
                        })()}
                      </div>

                      <div className="flex flex-wrap gap-xs">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="shadow-none"
                          onClick={() => openRolePermissionEditor(role)}
                          disabled={!canEditPermissions}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="shadow-none"
                          onClick={() => {
                            if (!canDeleteRole) return;

                            if (roleDeleteConfirmRoleId !== role.id) {
                              setRoleDeleteConfirmRoleId(role.id);
                              return;
                            }

                            deleteRole.mutate(role.id, {
                              onSuccess: () => {
                                toast.success('Role deleted.');
                                setRoleDeleteConfirmRoleId(null);
                              },
                              onError: (error) =>
                                toast.error(getApiErrorMessage(error, 'Could not delete role.')),
                            });
                          }}
                          disabled={!canDeleteRole}
                        >
                          {roleDeleteConfirmRoleId === role.id ? 'Confirm?' : 'Delete'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-body text-secondary">No roles found.</p>
            )}
          </SectionCard>
        ) : null}

        {!canViewOrgInfo &&
        !canViewMembers &&
        !canViewInvite &&
        !canViewRoleManagement &&
        !canViewPermissionManagement ? (
          <div className="rounded-radius-xl border border-warning/30 bg-warning/10 p-lg text-warning">
            <div className="flex items-center gap-sm">
              <AlertTriangle className="size-4" />
              <p className="text-body font-medium">
                No organization management permissions available.
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <Dialog
        open={Boolean(editingRole)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingRole(null);
            setEditingRolePermissions([]);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] w-[96vw] max-w-6xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>Edit role permissions</DialogTitle>
            <DialogDescription>
              Add or remove permissions for <strong>{editingRole?.name ?? 'this role'}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-xs">
            <p className="text-label font-semibold text-foreground">Permissions</p>
            <div className="max-h-[70vh] overflow-y-auto rounded-md border border-border/30 p-3">
              {groupedAvailablePermissionKeys.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {groupedAvailablePermissionKeys.map(([category, keys]) => (
                    <div key={category} className="rounded-md border border-border/30 p-2.5">
                      <p className="mb-2 text-small font-semibold text-foreground">{category}</p>
                      <div className="space-y-1">
                        {keys.map((key) => {
                          const checked = editingRolePermissions.includes(key);
                          return (
                            <div key={key} className="flex items-start gap-2">
                              <Checkbox
                                checked={checked}
                                onChange={(event) => {
                                  setEditingRolePermissions((current) => {
                                    if (event.target.checked) return [...current, key];
                                    return current.filter((permission) => permission !== key);
                                  });
                                }}
                              />
                              <span className="rounded-sm bg-surface-container px-1.5 py-0.5 font-mono text-[11px] leading-snug text-secondary break-all">
                                {formatPermissionKeyLabel(key)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-small text-muted">No governance permission keys available.</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditingRole(null);
                setEditingRolePermissions([]);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              loading={updateRole.isPending}
              onClick={() => void handleSaveRolePermissions()}
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(selectedMemberUserId)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedMemberUserId(null);
            setShowAllMemberDirectPermissions(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Member details</DialogTitle>
            <DialogDescription>View assigned roles and direct permissions.</DialogDescription>
          </DialogHeader>

          {selectedMember ? (
            <div className="space-y-md">
              <div className="border-b border-border/30 pb-4 text-center">
                <Avatar
                  name={selectedMember.displayName}
                  userId={selectedMember.userId}
                  size="xl"
                  className="mx-auto"
                />
                <p className="mt-2 text-body font-semibold text-foreground">
                  {selectedMember.displayName}
                </p>
                <p className="text-small text-muted">{selectedMember.email}</p>
              </div>

              <div className="rounded-lg border border-border/30 p-3">
                <p className="text-label font-semibold text-foreground">Roles</p>
                <div className="mt-2 space-y-2">
                  {selectedMemberRoleDetails.length > 0 ? (
                    selectedMemberRoleDetails.map((roleDetail) => (
                      <div
                        key={roleDetail.roleId}
                        className="rounded-lg border border-border/30 p-2.5"
                      >
                        {roleDetail.permissions.length > 0 ? (
                          <p className="text-small text-foreground">
                            <span className="font-semibold">Role: {roleDetail.roleName}</span> {'→'}{' '}
                            includes:{' '}
                            <span className="font-mono text-[11px] text-secondary">
                              {roleDetail.permissions.join(', ')}
                            </span>
                          </p>
                        ) : (
                          <p className="text-small text-muted">
                            Role: {roleDetail.roleName} {'→'} includes: no permissions
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <span className="text-small text-muted">No assigned role.</span>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border/30 p-3">
                <p className="text-label font-semibold text-foreground">Direct permissions</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedMemberDirectPermissions.length > 0 ? (
                    visibleSelectedMemberDirectPermissions.map((key) => (
                      <Badge key={key} className="font-mono text-[11px]">
                        {key}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-small text-muted">No direct permissions.</span>
                  )}
                </div>
                {selectedMemberDirectPermissions.length > DIRECT_PERMISSION_PREVIEW_COUNT ? (
                  <button
                    type="button"
                    className="mt-xs text-small text-blue-500 underline-offset-2 hover:underline"
                    onClick={() => setShowAllMemberDirectPermissions((current) => !current)}
                  >
                    {showAllMemberDirectPermissions ? 'Show less' : 'Show more'}
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="text-body text-secondary">Member not found.</p>
          )}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setSelectedMemberUserId(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
