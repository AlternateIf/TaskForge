import {
  initiateInviteOAuth,
  useAcceptInviteExisting,
  useAcceptInvitePassword,
  useInviteTokenValidation,
  useLogout,
} from '@/api/auth';
import type { ApiError } from '@/api/client';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';
import { useNavigate } from '@tanstack/react-router';
import { Eye, EyeOff } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AuthMobileHeader } from './auth-mobile-header';
import { AuthBrandPanel } from './brand-panel';
import { OAuthButtons } from './oauth-buttons';

interface InvitePageProps {
  token: string;
}

export function InvitePage({ token }: InvitePageProps) {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const logout = useLogout();
  const inviteQuery = useInviteTokenValidation(token);
  const acceptPassword = useAcceptInvitePassword();
  const acceptExisting = useAcceptInviteExisting();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [existingAccountError, setExistingAccountError] = useState<string | null>(null);
  const autoAcceptAttemptedRef = useRef(false);

  useEffect(() => {
    const meta = document.querySelector('meta[name="referrer"]') ?? document.createElement('meta');
    meta.setAttribute('name', 'referrer');
    meta.setAttribute('content', 'no-referrer');
    document.head.appendChild(meta);
    return () => {
      if (meta.parentNode) {
        meta.parentNode.removeChild(meta);
      }
    };
  }, []);

  const allowedProviders = useMemo(
    () => (inviteQuery.data?.allowedAuthMethods ?? []).filter((method) => method !== 'password'),
    [inviteQuery.data?.allowedAuthMethods],
  );

  useEffect(() => {
    if (!inviteQuery.data || !isAuthenticated || !user) return;
    if (autoAcceptAttemptedRef.current) return;

    const invitedEmail = inviteQuery.data.email.trim().toLowerCase();
    const signedInEmail = user.email.trim().toLowerCase();

    if (invitedEmail !== signedInEmail) {
      setExistingAccountError(
        `You're signed in as ${user.email}. Sign in with ${inviteQuery.data.email} to continue this invitation.`,
      );
      return;
    }

    autoAcceptAttemptedRef.current = true;
    setExistingAccountError(null);

    void acceptExisting
      .mutateAsync({ token })
      .then(() => {
        toast.success('Invitation accepted.');
        void navigate({ to: '/dashboard' });
      })
      .catch((error) => {
        const message = (error as ApiError).message ?? "We couldn't complete your invitation.";
        setExistingAccountError(message);
        toast.error(message);
      });
  }, [acceptExisting, inviteQuery.data, isAuthenticated, navigate, token, user]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setExistingAccountError(null);
    try {
      await acceptPassword.mutateAsync({ token, password });
      toast.success('Password set successfully.');
      void navigate({ to: '/dashboard' });
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError.status === 409) {
        setExistingAccountError(apiError.message);
      }
      toast.error(apiError.message ?? "We couldn't complete your invitation.");
    }
  }

  if (inviteQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-lg">
        <p className="text-body text-muted">Loading invitation…</p>
      </div>
    );
  }

  if (inviteQuery.isError || !inviteQuery.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-lg">
        <div className="max-w-md rounded-radius-xl border border-border/30 bg-surface-container-lowest p-lg text-center">
          <h1 className="text-heading-3 font-semibold text-foreground">
            This invitation is no longer valid.
          </h1>
          <p className="mt-xs text-body text-secondary">
            Ask your administrator to send a new invitation link.
          </p>
          <Button
            className="mt-md"
            onClick={() => void navigate({ to: '/auth/login', search: { redirect: undefined } })}
          >
            Go to sign in
          </Button>
        </div>
      </div>
    );
  }

  const canSetPassword = inviteQuery.data.allowedAuthMethods.includes('password');

  return (
    <div className="flex min-h-screen w-full">
      <AuthBrandPanel />

      <main className="flex flex-1 flex-col overflow-y-auto" id="main-content">
        <AuthMobileHeader />
        <div className="flex min-h-full items-center justify-center px-xl py-xl sm:px-2xl lg:px-3xl">
          <div className="w-full max-w-112 space-y-xl">
            <div>
              <h2 className="text-heading-1 font-bold text-foreground">You are invited</h2>
              <p className="mt-xs text-body text-muted">{inviteQuery.data.email}</p>
              <p className="mt-xs text-small text-secondary">
                Organizations:{' '}
                {inviteQuery.data.targets.map((target) => target.organizationName).join(', ')}
              </p>
            </div>

            {existingAccountError ? (
              <div className="rounded-radius-md border border-warning/40 bg-warning/10 p-sm">
                <p className="text-body text-foreground">{existingAccountError}</p>
                {isAuthenticated ? (
                  <Button
                    className="mt-sm"
                    variant="secondary"
                    onClick={() =>
                      logout.mutate(undefined, {
                        onSettled: () => {
                          void navigate({
                            to: '/auth/login',
                            search: { redirect: `/auth/invite/${token}` },
                          });
                        },
                      })
                    }
                    loading={logout.isPending}
                  >
                    Sign out and continue
                  </Button>
                ) : (
                  <Button
                    className="mt-sm"
                    variant="secondary"
                    onClick={() =>
                      void navigate({
                        to: '/auth/login',
                        search: { redirect: `/auth/invite/${token}` },
                      })
                    }
                  >
                    Sign in to continue this invitation
                  </Button>
                )}
              </div>
            ) : null}

            {canSetPassword ? (
              <form onSubmit={(event) => void onSubmit(event)} className="space-y-md" noValidate>
                <div>
                  <label
                    htmlFor="invite-password"
                    className="mb-xs block text-sm font-medium text-foreground"
                  >
                    Set your password
                  </label>
                  <div className="relative">
                    <input
                      id="invite-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="flex h-11 w-full rounded-radius-md border border-border bg-surface-container-lowest px-md py-sm pr-10 text-base text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-sm top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  loading={acceptPassword.isPending}
                >
                  Set password and continue
                </Button>
              </form>
            ) : null}

            {allowedProviders.length > 0 ? (
              <OAuthButtons
                dividerLabel={canSetPassword ? 'or continue with OAuth' : 'continue with OAuth'}
                allowedProviderIds={allowedProviders}
                onProviderClick={(providerId) => initiateInviteOAuth(token, providerId)}
              />
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
