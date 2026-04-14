import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from './login';

const mockNavigate = vi.fn();

const { authConfigResult, loginMutation } = vi.hoisted(() => ({
  authConfigResult: {
    data: {
      allowPublicRegister: false,
      enabledOAuthProviders: [],
      requiresInitialSetup: false,
    },
  },
  loginMutation: {
    mutateAsync: vi.fn(),
    isPending: false,
  },
}));

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<object>('@tanstack/react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearch: () => ({}),
  };
});

vi.mock('@/api/auth', () => ({
  useAuthConfig: () => authConfigResult,
  useLogin: () => loginMutation,
}));

vi.mock('./brand-panel', () => ({
  AuthBrandPanel: () => <div data-testid="auth-brand-panel" />,
}));

vi.mock('./auth-mobile-header', () => ({
  AuthMobileHeader: () => <div data-testid="auth-mobile-header" />,
}));

vi.mock('./oauth-buttons', () => ({
  OAuthButtons: () => null,
}));

describe('LoginPage', () => {
  beforeEach(() => {
    loginMutation.mutateAsync.mockReset();
    mockNavigate.mockReset();
    authConfigResult.data = {
      allowPublicRegister: false,
      enabledOAuthProviders: [],
      requiresInitialSetup: false,
    };
  });

  it('shows setup hint when initial setup is required', () => {
    authConfigResult.data.requiresInitialSetup = true;

    render(<LoginPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('Initial setup required');
    expect(screen.getByText(/AUTH_BOOTSTRAP_SUPER_ADMIN_EMAIL/)).toBeInTheDocument();
    expect(screen.getByText(/AUTH_BOOTSTRAP_SUPER_ADMIN_PASSWORD/)).toBeInTheDocument();
  });

  it('does not show setup hint when initial setup is not required', () => {
    authConfigResult.data.requiresInitialSetup = false;

    render(<LoginPage />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
