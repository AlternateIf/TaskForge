import { type AuthUser, useAuthStore } from '@/stores/auth.store';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { apiClient, queryClient } from './client';

// ─── Response shapes ───────────────────────────────────────────────────────────

interface AuthResponse {
  data: {
    accessToken: string;
    user: AuthUser;
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

// ─── useLogin ─────────────────────────────────────────────────────────────────

interface LoginInput {
  email: string;
  password: string;
}

export function useLogin() {
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: (input: LoginInput) => apiClient.post<AuthResponse>('/auth/login', input),
    onSuccess: (res) => {
      const { accessToken, user, requiresMfa } = res.data;
      if (!requiresMfa) {
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

export function initiateOAuth(provider: string) {
  const apiBase = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1';
  window.location.href = `${apiBase}/auth/oauth/${provider}`;
}
