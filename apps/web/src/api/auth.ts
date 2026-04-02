import { type AuthUser, useAuthStore } from '@/stores/auth.store';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { apiClient, queryClient } from './client';

// ─── Response shapes ───────────────────────────────────────────────────────────

interface AuthResponse {
  data: {
    accessToken: string;
    user: AuthUser;
    mfaRequired?: boolean;
    requiresMfa?: boolean;
    mfaToken?: string;
  };
}

interface MeResponse {
  data: AuthUser;
}

interface MessageResponse {
  data: { message: string };
}

interface AuthConfigResponse {
  data: {
    allowPublicRegister: boolean;
    enabledOAuthProviders: string[];
  };
}

// ─── useLogin ─────────────────────────────────────────────────────────────────

interface LoginInput {
  email: string;
  password: string;
  organizationId?: string;
}

export function useLogin() {
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: (input: LoginInput) => apiClient.post<AuthResponse>('/auth/login', input),
    onSuccess: (res) => {
      const { accessToken, user, requiresMfa } = res.data;
      const mfaRequired = requiresMfa ?? res.data.mfaRequired ?? false;
      if (!mfaRequired) {
        setAuth(accessToken, user);
      }
    },
  });
}

// ─── useRegister ──────────────────────────────────────────────────────────────

interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
  organizationName?: string;
}

export function useRegister() {
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: (input: RegisterInput) => apiClient.post<AuthResponse>('/auth/register', input),
    onSuccess: (res) => {
      const { accessToken, user } = res.data;
      setAuth(accessToken, user);
    },
  });
}

// ─── useVerifyMfa ─────────────────────────────────────────────────────────────

interface VerifyMfaInput {
  mfaToken: string;
  code: string;
}

export function useVerifyMfa() {
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: (input: VerifyMfaInput) => apiClient.post<AuthResponse>('/auth/mfa/verify', input),
    onSuccess: (res) => {
      const { accessToken, user } = res.data;
      setAuth(accessToken, user);
    },
  });
}

// ─── useLogout ────────────────────────────────────────────────────────────────

export function useLogout() {
  const { clearAuth } = useAuthStore();

  return useMutation({
    mutationFn: () => apiClient.post<void>('/auth/logout'),
    onSettled: () => {
      clearAuth();
      queryClient.clear();
    },
  });
}

// ─── useMe ────────────────────────────────────────────────────────────────────

export function useMe() {
  const { isAuthenticated, setUser } = useAuthStore();

  const query = useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.get<MeResponse>('/users/me'),
    enabled: isAuthenticated,
    select: (res: MeResponse) => res.data,
  });

  useEffect(() => {
    if (query.data) setUser(query.data);
  }, [query.data, setUser]);

  return query;
}

// ─── useForgotPassword ────────────────────────────────────────────────────────

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) =>
      apiClient.post<MessageResponse>('/auth/forgot-password', { email }),
  });
}

// ─── useResetPassword ─────────────────────────────────────────────────────────

interface ResetPasswordInput {
  token: string;
  password: string;
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (input: ResetPasswordInput) =>
      apiClient.post<MessageResponse>('/auth/reset-password', input),
  });
}

interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export function useChangePassword() {
  const { setUser } = useAuthStore();

  return useMutation({
    mutationFn: (input: ChangePasswordInput) =>
      apiClient.patch<MessageResponse>('/users/me/password', input),
    onSuccess: async () => {
      try {
        const me = await apiClient.get<MeResponse>('/users/me');
        setUser(me.data);
      } catch {
        // Ignore hydration failure; guard will refresh on next route load.
      }
    },
  });
}

// ─── useOAuthProviders ────────────────────────────────────────────────────────

export interface OAuthProviderInfo {
  id: string;
  name: string;
  logoUrl?: string;
}

interface OAuthProvidersResponse {
  data: { providers: OAuthProviderInfo[] };
}

export function useOAuthProviders() {
  return useQuery({
    queryKey: ['oauth-providers'],
    queryFn: () => apiClient.get<OAuthProvidersResponse>('/auth/oauth/providers'),
    select: (res: OAuthProvidersResponse) => res.data.providers,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useAuthConfig() {
  return useQuery({
    queryKey: ['auth-config'],
    queryFn: () => apiClient.get<AuthConfigResponse>('/auth/config'),
    select: (res: AuthConfigResponse) => res.data,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function initiateOAuth(provider: string) {
  const apiBase = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1';
  window.location.href = `${apiBase}/auth/oauth/${provider}`;
}

export function initiateInviteOAuth(token: string, provider: string) {
  const apiBase = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1';
  window.location.href = `${apiBase}/invitations/tokens/${token}/oauth/${provider}`;
}

interface InviteTokenValidationResponse {
  data: {
    invitationId: string;
    email: string;
    allowedAuthMethods: string[];
    targets: Array<{ organizationId: string; organizationName: string }>;
    status: 'sent' | 'accepted' | 'revoked' | 'expired';
  };
}

interface AcceptInvitePasswordInput {
  token: string;
  password: string;
}

export function useInviteTokenValidation(token: string | undefined) {
  return useQuery({
    queryKey: ['invite-token', token],
    queryFn: () =>
      apiClient
        .get<InviteTokenValidationResponse>(`/invitations/tokens/${token}`)
        .then((res) => res.data),
    enabled: Boolean(token),
    retry: false,
  });
}

export function useAcceptInvitePassword() {
  const { setAuth } = useAuthStore();
  return useMutation({
    mutationFn: (input: AcceptInvitePasswordInput) =>
      apiClient.post<AuthResponse>(`/invitations/tokens/${input.token}/accept-password`, {
        password: input.password,
      }),
    onSuccess: (res) => {
      const { accessToken, user } = res.data;
      setAuth(accessToken, user);
    },
  });
}

interface AcceptInviteExistingInput {
  token: string;
}

interface AcceptInviteExistingResponse {
  data: {
    user: AuthUser;
  };
}

export function useAcceptInviteExisting() {
  const { setUser } = useAuthStore();

  return useMutation({
    mutationFn: (input: AcceptInviteExistingInput) =>
      apiClient.post<AcceptInviteExistingResponse>(
        `/invitations/tokens/${input.token}/accept-existing`,
      ),
    onSuccess: (res) => {
      setUser(res.data.user);
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}
