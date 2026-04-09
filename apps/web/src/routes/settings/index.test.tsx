import { useAuthStore } from '@/stores/auth.store';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsPage } from './index';

vi.mock('@/api/governance', () => {
  const mutation = { mutate: vi.fn(), isPending: false };
  return {
    useOrganizations: () => ({ isLoading: false, data: [] }),
    useCreateOrganization: () => mutation,
  };
});

vi.mock('@/api/users', () => {
  const mutation = { mutate: vi.fn(), isPending: false };
  const query = { isLoading: false, data: null };
  return {
    useUpdateProfile: () => mutation,
    useUploadAvatar: () => mutation,
    useRemoveAvatar: () => mutation,
    useRequestEmailChange: () => mutation,
    useSecurityOverview: () => query,
    useListSessions: () => ({ isLoading: false, data: [] }),
    useRevokeSession: () => mutation,
    useRevokeOtherSessions: () => mutation,
  };
});

vi.mock('@/api/auth', () => ({
  useChangePassword: () => ({ mutate: vi.fn(), isPending: false }),
  useMfaSetup: () => ({ mutate: vi.fn(), isPending: false, reset: vi.fn() }),
  useMfaVerifySetup: () => ({ mutate: vi.fn(), isPending: false, reset: vi.fn() }),
  useMfaDisable: () => ({ mutate: vi.fn(), isPending: false, reset: vi.fn() }),
  useMfaReset: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
    reset: vi.fn(),
  }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

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

  it('renders the Settings page heading', () => {
    setUserPermissions([]);
    render(<SettingsPage />, { wrapper });
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
  });

  it('shows Profile, Security, and Organizations tabs', () => {
    setUserPermissions([]);
    render(<SettingsPage />, { wrapper });
    expect(screen.getByRole('tab', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Security' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Organizations' })).toBeInTheDocument();
  });

  it('shows Profile content by default', () => {
    setUserPermissions([]);
    render(<SettingsPage />, { wrapper });
    expect(screen.getByText('Profile Information')).toBeInTheDocument();
  });

  it('switches to Security tab', async () => {
    setUserPermissions([]);
    render(<SettingsPage />, { wrapper });
    await userEvent.click(screen.getByRole('tab', { name: 'Security' }));
    expect(screen.getByText('Change Password')).toBeInTheDocument();
  });

  it('switches to Organizations tab', async () => {
    setUserPermissions([]);
    render(<SettingsPage />, { wrapper });
    await userEvent.click(screen.getByRole('tab', { name: 'Organizations' }));
    expect(screen.getByText('Your Organizations')).toBeInTheDocument();
  });
});
