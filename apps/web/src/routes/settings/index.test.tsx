import { useAuthStore } from '@/stores/auth.store';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsPage } from './index';

vi.mock('@/api/governance', () => {
  const mutation = { mutate: vi.fn(), isPending: false };
  return {
    useSentInvitations: () => ({ isLoading: false, data: [] }),
    useCreateInvitation: () => mutation,
    useResendInvitation: () => mutation,
    useRevokeInvitation: () => mutation,
    useOrganizations: () => ({ data: [] }),
    useCreateOrganization: () => mutation,
    useDeleteOrganization: () => mutation,
    useRoles: () => ({ data: [] }),
    useCreateRole: () => mutation,
    useDeleteRole: () => mutation,
    usePermissionAssignments: () => ({ data: [] }),
    useCreatePermissionAssignment: () => mutation,
    useDeletePermissionAssignment: () => mutation,
  };
});

function setUserPermissions(permissions: string[]) {
  useAuthStore.setState({
    token: 'token',
    isAuthenticated: true,
    activeOrganizationId: 'org-1',
    user: {
      id: 'user-1',
      email: 'user@example.com',
      displayName: 'User One',
      organizationId: 'org-1',
      organizationName: 'Org One',
      organizations: [{ id: 'org-1', name: 'Org One' }],
      permissions,
    },
  });
}

describe('SettingsPage', () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: null,
      isAuthenticated: false,
      activeOrganizationId: null,
      user: null,
    });
  });

  it('always renders profile section', () => {
    setUserPermissions([]);
    render(<SettingsPage />);
    expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument();
  });

  it('renders governance sections in fixed order when permissions allow', () => {
    setUserPermissions([
      'invitation.read.org',
      'organization.read.org',
      'role.read.org',
      'permission.read.org',
    ]);
    render(<SettingsPage />);

    const headings = screen.getAllByRole('heading', { level: 2 }).map((node) => node.textContent);
    expect(headings).toEqual(['Profile', 'Invitations', 'Organizations', 'Roles', 'Permissions']);
  });

  it('omits unauthorized sections while preserving visible section order', () => {
    setUserPermissions(['invitation.read.org', 'role.read.org']);
    render(<SettingsPage />);

    const headings = screen.getAllByRole('heading', { level: 2 }).map((node) => node.textContent);
    expect(headings).toEqual(['Profile', 'Invitations', 'Roles']);
    expect(screen.queryByRole('heading', { name: 'Organizations' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Permissions' })).not.toBeInTheDocument();
  });
});
