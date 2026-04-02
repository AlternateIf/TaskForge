import { apiClient } from '@/api/client';
import { useAuthStore } from '@/stores/auth.store';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';

interface MeResponse {
  data: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl?: string | null;
    organizationId?: string;
    organizationName?: string;
    organizations?: Array<{ id: string; name: string }>;
    permissions?: string[];
    mustChangePassword?: boolean;
  };
}

export function OAuthCallbackPage() {
  const navigate = useNavigate();
  const hasHandled = useRef(false);

  useEffect(() => {
    if (hasHandled.current) return;
    hasHandled.current = true;

    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const token = params.get('token');

    if (!token) {
      useAuthStore.getState().clearAuth();
      void navigate({ to: '/auth/login', search: { redirect: undefined } });
      return;
    }

    useAuthStore.getState().setToken(token);

    void (async () => {
      try {
        const res = await apiClient.get<MeResponse>('/users/me');
        const me = res.data;

        useAuthStore.getState().setUser({
          id: me.id,
          email: me.email,
          displayName: me.displayName,
          avatarUrl: me.avatarUrl ?? null,
          organizationId: me.organizationId,
          organizationName: me.organizationName,
          organizations: me.organizations ?? [],
          permissions: me.permissions ?? [],
          mustChangePassword: me.mustChangePassword ?? false,
        });
      } catch {
        // If profile fetch fails, keep the token flow conservative and require re-login.
        useAuthStore.getState().clearAuth();
        void navigate({ to: '/auth/login', search: { redirect: undefined } });
        return;
      }

      void navigate({ to: '/dashboard' });
    })();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-lg">
      <div className="text-center">
        <h1 className="text-heading-3 font-semibold text-foreground">Signing you in...</h1>
        <p className="mt-xs text-small text-muted">Please wait while we complete OAuth login.</p>
      </div>
    </div>
  );
}
