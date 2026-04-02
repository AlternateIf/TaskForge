import {
  useCreateInvitation,
  useCreateOrganization,
  useCreatePermissionAssignment,
  useCreateRole,
  useDeleteOrganization,
  useDeletePermissionAssignment,
  useDeleteRole,
  useOrganizations,
  usePermissionAssignments,
  useResendInvitation,
  useRevokeInvitation,
  useRoles,
  useSentInvitations,
} from '@/api/governance';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth.store';
import { ChevronDown, ChevronUp, Settings } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

interface SectionProps {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function Section({ title, open, onToggle, children }: SectionProps) {
  return (
    <section className="rounded-radius-xl border border-border/30 bg-surface-container-lowest">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-lg py-md text-left"
      >
        <h2 className="text-heading-2 font-semibold text-foreground">{title}</h2>
        {open ? (
          <ChevronUp className="size-4 text-muted" />
        ) : (
          <ChevronDown className="size-4 text-muted" />
        )}
      </button>
      {open ? <div className="border-t border-border/20 px-lg py-md">{children}</div> : null}
    </section>
  );
}

export function SettingsPage() {
  const { user, activeOrganizationId } = useAuthStore();
  const permissionSet = useMemo(() => new Set(user?.permissions ?? []), [user?.permissions]);

  const canViewInvitations = permissionSet.has('invitation.read.org');
  const canCreateInvitation = permissionSet.has('invitation.create.org');
  const canUpdateInvitation = permissionSet.has('invitation.update.org');
  const canDeleteInvitation = permissionSet.has('invitation.delete.org');

  const canViewOrganizations = permissionSet.has('organization.read.org');
  const canCreateOrganization = permissionSet.has('organization.create.global');
  const canDeleteOrganization = permissionSet.has('organization.delete.org');

  const canViewRoles = permissionSet.has('role.read.org');
  const canCreateRole = permissionSet.has('role.create.org');
  const canDeleteRole = permissionSet.has('role.delete.org');

  const canViewPermissions = permissionSet.has('permission.read.org');
  const canUpdatePermissions = permissionSet.has('permission.update.org');

  const [openProfile, setOpenProfile] = useState(true);
  const [openInvitations, setOpenInvitations] = useState(true);
  const [openOrganizations, setOpenOrganizations] = useState(true);
  const [openRoles, setOpenRoles] = useState(true);
  const [openPermissions, setOpenPermissions] = useState(true);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoleIds, setInviteRoleIds] = useState('');
  const [invitePermissionKeys, setInvitePermissionKeys] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [roleName, setRoleName] = useState('');
  const [permissionUserId, setPermissionUserId] = useState('');
  const [permissionKey, setPermissionKey] = useState('');

  const sentInvitations = useSentInvitations(activeOrganizationId ?? null);
  const createInvitation = useCreateInvitation(activeOrganizationId ?? null);
  const resendInvitation = useResendInvitation(activeOrganizationId ?? null);
  const revokeInvitation = useRevokeInvitation(activeOrganizationId ?? null);

  const organizations = useOrganizations();
  const createOrganization = useCreateOrganization();
  const deleteOrganization = useDeleteOrganization();

  const roles = useRoles(activeOrganizationId ?? null);
  const createRole = useCreateRole(activeOrganizationId ?? null);
  const deleteRole = useDeleteRole(activeOrganizationId ?? null);

  const permissionAssignments = usePermissionAssignments(activeOrganizationId ?? null);
  const createPermissionAssignment = useCreatePermissionAssignment(activeOrganizationId ?? null);
  const deletePermissionAssignment = useDeletePermissionAssignment(activeOrganizationId ?? null);

  return (
    <div className="mx-auto max-w-[64rem] space-y-lg">
      <div className="flex items-center gap-sm">
        <Settings className="size-6 text-brand-primary" />
        <h1 className="text-heading-1 font-semibold text-foreground">Settings</h1>
      </div>

      <Section
        title="Profile"
        open={openProfile}
        onToggle={() => setOpenProfile((value) => !value)}
      >
        <div className="flex flex-col gap-md sm:flex-row sm:items-center">
          <Avatar name={user?.displayName} userId={user?.id} size="xl" />
          <div className="space-y-xs">
            <p className="text-body font-semibold text-foreground">{user?.displayName}</p>
            <p className="text-body text-secondary">{user?.email}</p>
            <div className="flex flex-wrap gap-xs">
              {(user?.organizations ?? []).length > 0 ? (
                (user?.organizations ?? []).map((organization) => (
                  <Badge key={organization.id} variant="default">
                    {organization.name}
                  </Badge>
                ))
              ) : (
                <p className="text-label text-muted">No organization memberships found.</p>
              )}
            </div>
          </div>
        </div>
      </Section>

      {canViewInvitations ? (
        <Section
          title="Invitations"
          open={openInvitations}
          onToggle={() => setOpenInvitations((value) => !value)}
        >
          {canCreateInvitation ? (
            <form
              className="mb-md grid gap-sm md:grid-cols-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (!activeOrganizationId) return;
                const roleIds = inviteRoleIds
                  .split(',')
                  .map((value) => value.trim())
                  .filter(Boolean);
                const permissionKeys = invitePermissionKeys
                  .split(',')
                  .map((value) => value.trim())
                  .filter(Boolean);
                createInvitation.mutate(
                  {
                    email: inviteEmail,
                    roleIds,
                    permissionKeys,
                  },
                  {
                    onSuccess: () => {
                      setInviteEmail('');
                      setInviteRoleIds('');
                      setInvitePermissionKeys('');
                      toast.success('Invitation sent.');
                    },
                    onError: () =>
                      toast.error("We couldn't complete your invitation. Please try again."),
                  },
                );
              }}
            >
              <Input
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                required
              />
              <Input
                placeholder="Role IDs (comma-separated)"
                value={inviteRoleIds}
                onChange={(event) => setInviteRoleIds(event.target.value)}
              />
              <Input
                placeholder="Permission keys (comma-separated)"
                value={invitePermissionKeys}
                onChange={(event) => setInvitePermissionKeys(event.target.value)}
              />
              <Button type="submit" loading={createInvitation.isPending}>
                Invite user
              </Button>
            </form>
          ) : null}

          {sentInvitations.isLoading ? (
            <div className="space-y-xs">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : sentInvitations.data && sentInvitations.data.length > 0 ? (
            <div className="space-y-xs">
              {sentInvitations.data.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex flex-col gap-xs rounded-radius-md border border-border/20 p-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-body font-medium text-foreground">{invitation.email}</p>
                    <p className="text-label text-muted">
                      Expires {new Date(invitation.expiresAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-xs">
                    {canUpdateInvitation ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          resendInvitation.mutate(invitation.id, {
                            onSuccess: () => toast.success('Invitation resent with a new link.'),
                          })
                        }
                      >
                        Resend
                      </Button>
                    ) : null}
                    {canDeleteInvitation ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          revokeInvitation.mutate(invitation.id, {
                            onSuccess: () => toast.success('Invitation revoked.'),
                          })
                        }
                      >
                        Revoke
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-body text-secondary">No pending invitations.</p>
          )}
        </Section>
      ) : null}

      {canViewOrganizations || canCreateOrganization ? (
        <Section
          title="Organizations"
          open={openOrganizations}
          onToggle={() => setOpenOrganizations((value) => !value)}
        >
          {canCreateOrganization ? (
            <form
              className="mb-md flex flex-col gap-sm sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                createOrganization.mutate(
                  { name: organizationName },
                  {
                    onSuccess: () => {
                      setOrganizationName('');
                      toast.success('Changes saved.');
                    },
                  },
                );
              }}
            >
              <Input
                placeholder="Organization name"
                value={organizationName}
                onChange={(event) => setOrganizationName(event.target.value)}
                required
              />
              <Button type="submit" loading={createOrganization.isPending}>
                Add organization
              </Button>
            </form>
          ) : null}

          {organizations.data && organizations.data.length > 0 ? (
            <div className="space-y-xs">
              {organizations.data.map((organization) => (
                <div
                  key={organization.id}
                  className="flex items-center justify-between rounded-radius-md border border-border/20 p-sm"
                >
                  <span className="text-body text-foreground">{organization.name}</span>
                  {canDeleteOrganization ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        deleteOrganization.mutate(organization.id, {
                          onSuccess: () => toast.success('Changes saved.'),
                        })
                      }
                    >
                      Delete
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-body text-secondary">No organizations available.</p>
          )}
        </Section>
      ) : null}

      {canViewRoles ? (
        <Section title="Roles" open={openRoles} onToggle={() => setOpenRoles((value) => !value)}>
          {canCreateRole ? (
            <form
              className="mb-md flex flex-col gap-sm sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                createRole.mutate(
                  { name: roleName },
                  {
                    onSuccess: () => {
                      setRoleName('');
                      toast.success('Changes saved.');
                    },
                  },
                );
              }}
            >
              <Input
                placeholder="Role name"
                value={roleName}
                onChange={(event) => setRoleName(event.target.value)}
                required
              />
              <Button type="submit" loading={createRole.isPending}>
                Create role
              </Button>
            </form>
          ) : null}

          {roles.data && roles.data.length > 0 ? (
            <div className="space-y-xs">
              {roles.data.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center justify-between rounded-radius-md border border-border/20 p-sm"
                >
                  <div className="flex items-center gap-xs">
                    <span className="text-body text-foreground">{role.name}</span>
                    {role.name === 'Super Admin' ? (
                      <Badge variant="default">System role</Badge>
                    ) : null}
                  </div>
                  {canDeleteRole && role.name !== 'Super Admin' ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        deleteRole.mutate(role.id, {
                          onSuccess: () => toast.success('Changes saved.'),
                        })
                      }
                    >
                      Delete
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-body text-secondary">No custom roles yet.</p>
          )}
        </Section>
      ) : null}

      {canViewPermissions ? (
        <Section
          title="Permissions"
          open={openPermissions}
          onToggle={() => setOpenPermissions((value) => !value)}
        >
          {canUpdatePermissions ? (
            <form
              className="mb-md grid gap-sm md:grid-cols-3"
              onSubmit={(event) => {
                event.preventDefault();
                createPermissionAssignment.mutate(
                  { userId: permissionUserId, permissionKey },
                  {
                    onSuccess: () => {
                      setPermissionUserId('');
                      setPermissionKey('');
                      toast.success('Changes saved.');
                    },
                  },
                );
              }}
            >
              <Input
                placeholder="User ID"
                value={permissionUserId}
                onChange={(event) => setPermissionUserId(event.target.value)}
                required
              />
              <Input
                placeholder="Permission key"
                value={permissionKey}
                onChange={(event) => setPermissionKey(event.target.value)}
                required
              />
              <Button type="submit" loading={createPermissionAssignment.isPending}>
                Assign permission
              </Button>
            </form>
          ) : null}

          {permissionAssignments.data && permissionAssignments.data.length > 0 ? (
            <div className="space-y-xs">
              {permissionAssignments.data.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between rounded-radius-md border border-border/20 p-sm"
                >
                  <span className="text-body text-foreground">{assignment.permissionKey}</span>
                  {canUpdatePermissions ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        deletePermissionAssignment.mutate(assignment.id, {
                          onSuccess: () => toast.success('Changes saved.'),
                        })
                      }
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-body text-secondary">No direct permission assignments.</p>
          )}
        </Section>
      ) : null}
    </div>
  );
}
