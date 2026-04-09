import { useAuthStore } from '@/stores/auth.store';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MfaTwoPanelModal } from '../mfa-two-panel-modal';

const mockSetupMutate = vi.fn();
const mockSetupMutateAsync = vi.fn();
const mockSetupReset = vi.fn();
const mockVerifySetupMutate = vi.fn();
const mockVerifySetupReset = vi.fn();
const mockDisableMutate = vi.fn();
const mockDisableReset = vi.fn();
const mockResetMutate = vi.fn();
const mockResetMutateAsync = vi.fn();
const mockResetReset = vi.fn();

vi.mock('@/api/auth', () => ({
  useMfaSetup: () => ({
    mutate: mockSetupMutate,
    mutateAsync: mockSetupMutateAsync,
    reset: mockSetupReset,
    isPending: false,
    isError: false,
    data: null,
  }),
  useMfaVerifySetup: () => ({
    mutate: mockVerifySetupMutate,
    mutateAsync: vi.fn().mockResolvedValue({}),
    reset: mockVerifySetupReset,
    isPending: false,
  }),
  useMfaDisable: () => ({
    mutate: mockDisableMutate,
    mutateAsync: vi.fn().mockResolvedValue({}),
    reset: mockDisableReset,
    isPending: false,
  }),
  useMfaReset: () => ({
    mutate: mockResetMutate,
    mutateAsync: mockResetMutateAsync,
    reset: mockResetReset,
    isPending: false,
  }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function renderModal(props: Partial<React.ComponentProps<typeof MfaTwoPanelModal>> = {}) {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    mfaEnabled: false,
    ...props,
  };
  return render(<MfaTwoPanelModal {...defaultProps} />, { wrapper });
}

function setAuthenticated() {
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
      permissions: [],
    },
  });
}

describe('MfaTwoPanelModal recovery flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      token: null,
      isAuthenticated: false,
      activeOrganizationId: null,
      user: null,
    });
  });

  describe('pending setup error shows recovery UI', () => {
    it('shows recovery form when setup fails with pending setup error', async () => {
      setAuthenticated();

      mockSetupMutate.mockImplementationOnce((_, { onError }) => {
        onError({ status: 400, message: 'pending MFA setup exists' });
      });

      renderModal();

      expect(screen.getByLabelText(/account password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reset and start over/i })).toBeInTheDocument();
    });

    it('displays pending setup alert when recovery UI is shown', async () => {
      setAuthenticated();

      mockSetupMutate.mockImplementationOnce((_, { onError }) => {
        onError({ status: 400, message: 'pending MFA setup exists' });
      });

      renderModal();

      expect(screen.getByText(/pending MFA setup that was never completed/i)).toBeInTheDocument();
    });
  });

  describe('submitting password calls useMfaReset', () => {
    it('calls resetMfa.mutateAsync with password when recovery form is submitted', async () => {
      setAuthenticated();

      mockSetupMutate.mockImplementationOnce((_, { onError }) => {
        onError({ status: 400, message: 'pending MFA setup exists' });
      });
      mockResetMutateAsync.mockResolvedValueOnce({});

      renderModal();

      const passwordInput = screen.getByLabelText(/account password/i);
      await userEvent.type(passwordInput, 'currentpassword123');

      await userEvent.click(screen.getByRole('button', { name: /reset and start over/i }));

      expect(mockResetMutateAsync).toHaveBeenCalledWith({ password: 'currentpassword123' });
    });

    it('does not call resetMfa when password field is empty', async () => {
      setAuthenticated();

      mockSetupMutate.mockImplementationOnce((_, { onError }) => {
        onError({ status: 400, message: 'pending MFA setup exists' });
      });

      renderModal();

      await userEvent.click(screen.getByRole('button', { name: /reset and start over/i }));

      expect(mockResetMutateAsync).not.toHaveBeenCalled();
    });
  });

  describe('successful reset retries setup and shows QR/manual key state', () => {
    it('calls setup.mutateAsync after successful reset', async () => {
      setAuthenticated();

      mockSetupMutate.mockImplementationOnce((_, { onError }) => {
        onError({ status: 400, message: 'pending MFA setup exists' });
      });
      mockResetMutateAsync.mockResolvedValueOnce({});
      mockSetupMutateAsync.mockResolvedValueOnce({ uri: 'otpauth://test', secret: 'TESTSECRET' });

      renderModal();

      const passwordInput = screen.getByLabelText(/account password/i);
      await userEvent.type(passwordInput, 'currentpassword123');

      await userEvent.click(screen.getByRole('button', { name: /reset and start over/i }));

      expect(mockSetupMutateAsync).toHaveBeenCalledWith();
    });

    it('hides recovery form and shows QR code after successful reset', async () => {
      setAuthenticated();

      mockSetupMutate.mockImplementationOnce((_, { onError }) => {
        onError({ status: 400, message: 'pending MFA setup exists' });
      });
      mockResetMutateAsync.mockResolvedValueOnce({});
      mockSetupMutateAsync.mockResolvedValueOnce({ uri: 'otpauth://test', secret: 'TESTSECRET' });

      renderModal();

      // Recovery UI should be shown after pending setup error
      expect(screen.getByLabelText(/account password/i)).toBeInTheDocument();

      const passwordInput = screen.getByLabelText(/account password/i);
      await userEvent.type(passwordInput, 'currentpassword123');

      await userEvent.click(screen.getByRole('button', { name: /reset and start over/i }));

      // After successful reset, QR/manual key should be visible
      await waitFor(() => {
        expect(screen.getByText(/can[’']t scan the qr code/i)).toBeInTheDocument();
      });
      await waitFor(() => {
        expect(screen.getByText(/use this manual key/i)).toBeInTheDocument();
      });
    });
  });

  describe('invalid password error is surfaced to user', () => {
    it('displays incorrect password error when API returns 400 with Invalid password', async () => {
      setAuthenticated();

      mockSetupMutate.mockImplementationOnce((_, { onError }) => {
        onError({ status: 400, message: 'pending MFA setup exists' });
      });
      mockResetMutateAsync.mockRejectedValueOnce({ status: 400, message: 'Invalid password' });

      renderModal();

      const passwordInput = screen.getByLabelText(/account password/i);
      await userEvent.type(passwordInput, 'wrongpassword');

      await userEvent.click(screen.getByRole('button', { name: /reset and start over/i }));

      expect(screen.getByText(/incorrect password/i)).toBeInTheDocument();
    });

    it('keeps recovery form visible after invalid password error', async () => {
      setAuthenticated();

      mockSetupMutate.mockImplementationOnce((_, { onError }) => {
        onError({ status: 400, message: 'pending MFA setup exists' });
      });
      mockResetMutateAsync.mockRejectedValueOnce({ status: 400, message: 'Invalid password' });

      renderModal();

      const passwordInput = screen.getByLabelText(/account password/i);
      await userEvent.type(passwordInput, 'wrongpassword');

      await userEvent.click(screen.getByRole('button', { name: /reset and start over/i }));

      expect(screen.getByLabelText(/account password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reset and start over/i })).toBeInTheDocument();
    });

    it('clears error when user types new password after error', async () => {
      setAuthenticated();

      mockSetupMutate.mockImplementationOnce((_, { onError }) => {
        onError({ status: 400, message: 'pending MFA setup exists' });
      });
      mockResetMutateAsync.mockRejectedValueOnce({ status: 400, message: 'Invalid password' });

      renderModal();

      const passwordInput = screen.getByLabelText(/account password/i);
      await userEvent.type(passwordInput, 'wrongpassword');

      await userEvent.click(screen.getByRole('button', { name: /reset and start over/i }));

      expect(screen.getByText(/incorrect password/i)).toBeInTheDocument();

      await userEvent.clear(passwordInput);
      await userEvent.type(passwordInput, 'newpassword123');

      expect(screen.queryByText(/incorrect password/i)).not.toBeInTheDocument();
    });
  });
});
