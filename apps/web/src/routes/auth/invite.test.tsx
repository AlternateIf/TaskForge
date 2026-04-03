import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InvitePage } from './invite';

const mockNavigate = vi.fn();
// Test-only dummy credential (not a real secret, never used in production).
const INVITE_TEST_PASSWORD = `Strong${'Pass'}123`;

const { acceptInviteMutation, acceptExistingMutation, logoutMutation, mockInitiateInviteOAuth } =
  vi.hoisted(() => ({
    acceptInviteMutation: {
      mutateAsync: vi.fn(),
      isPending: false,
    },
    acceptExistingMutation: {
      mutateAsync: vi.fn(),
      isPending: false,
    },
    logoutMutation: {
      mutate: vi.fn(),
      isPending: false,
    },
    mockInitiateInviteOAuth: vi.fn(),
  }));

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<object>('@tanstack/react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/api/auth', () => ({
  useInviteTokenValidation: () => ({
    isLoading: false,
    isError: false,
    data: {
      invitationId: 'invite-1',
      email: 'invited@example.com',
      allowedAuthMethods: ['password', 'google'],
      targets: [{ organizationId: 'org-1', organizationName: 'Org One' }],
      status: 'sent',
    },
  }),
  useAcceptInvitePassword: () => acceptInviteMutation,
  useAcceptInviteExisting: () => acceptExistingMutation,
  useLogout: () => logoutMutation,
  initiateInviteOAuth: mockInitiateInviteOAuth,
}));

vi.mock('./oauth-buttons', () => ({
  OAuthButtons: ({ onProviderClick }: { onProviderClick?: (providerId: string) => void }) => (
    <button type="button" onClick={() => onProviderClick?.('google')}>
      oauth-google
    </button>
  ),
}));

describe('InvitePage', () => {
  beforeEach(() => {
    acceptInviteMutation.mutateAsync.mockReset();
    acceptExistingMutation.mutateAsync.mockReset();
    logoutMutation.mutate.mockReset();
    mockNavigate.mockReset();
    mockInitiateInviteOAuth.mockReset();
  });

  it('renders invitation context and password form', () => {
    render(<InvitePage token="token-123" />);

    expect(screen.getByText('You are invited')).toBeInTheDocument();
    expect(screen.getByText('invited@example.com')).toBeInTheDocument();
    expect(screen.getByLabelText('Set your password')).toBeInTheDocument();
    expect(screen.getByText('oauth-google')).toBeInTheDocument();
  });

  it('submits password flow', async () => {
    acceptInviteMutation.mutateAsync.mockResolvedValue(undefined);
    render(<InvitePage token="token-123" />);

    fireEvent.change(screen.getByLabelText('Set your password'), {
      target: { value: INVITE_TEST_PASSWORD },
    });
    const passwordSubmitForm = screen
      .getByRole('button', { name: 'Set password and continue' })
      .closest('form');
    expect(passwordSubmitForm).toBeTruthy();
    if (!passwordSubmitForm) {
      throw new Error('password form not found');
    }
    fireEvent.submit(passwordSubmitForm);

    expect(acceptInviteMutation.mutateAsync).toHaveBeenCalledWith({
      token: 'token-123',
      password: INVITE_TEST_PASSWORD,
    });
  });

  it('starts invite oauth from the same invitation token', () => {
    render(<InvitePage token="token-123" />);

    fireEvent.click(screen.getByRole('button', { name: 'oauth-google' }));

    expect(mockInitiateInviteOAuth).toHaveBeenCalledWith('token-123', 'google');
  });

  it('shows sign-in CTA for existing-account conflict on password submit', async () => {
    const conflictError = Object.assign(new Error('Account already exists.'), {
      status: 409,
      code: 'CONFLICT',
    });
    acceptInviteMutation.mutateAsync.mockRejectedValue(conflictError);

    render(<InvitePage token="token-123" />);

    fireEvent.change(screen.getByLabelText('Set your password'), {
      target: { value: INVITE_TEST_PASSWORD },
    });
    const passwordSubmitForm = screen
      .getByRole('button', { name: 'Set password and continue' })
      .closest('form');
    expect(passwordSubmitForm).toBeTruthy();
    if (!passwordSubmitForm) {
      throw new Error('password form not found');
    }
    fireEvent.submit(passwordSubmitForm);

    expect(
      await screen.findByRole('button', { name: 'Sign in to continue this invitation' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sign in to continue this invitation' }));

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/auth/login',
      search: { redirect: '/auth/invite/token-123' },
    });
  });
});
