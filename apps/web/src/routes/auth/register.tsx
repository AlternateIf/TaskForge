import { useAuthConfig, useRegister } from '@/api/auth';
import type { ApiError } from '@/api/client';
import { Button } from '@/components/ui/button';
import { PasswordStrength } from '@/components/ui/password-strength';
import { useNavigate } from '@tanstack/react-router';
import { Eye, EyeOff } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { AuthMobileHeader } from './auth-mobile-header';
import { AuthBrandPanel } from './brand-panel';
import { OAuthButtons } from './oauth-buttons';

// ─── RegisterPage ─────────────────────────────────────────────────────────────

export function RegisterPage() {
  const navigate = useNavigate();
  const register = useRegister();
  const authConfig = useAuthConfig();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [organizationName, setOrganizationName] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await register.mutateAsync({
        displayName,
        email,
        password,
        organizationName: organizationName || undefined,
      });
      void navigate({ to: '/dashboard' });
    } catch (err) {
      const msg = (err as ApiError).message ?? 'Registration failed';
      toast.error(msg);
    }
  }

  if (!authConfig.isLoading && authConfig.data && !authConfig.data.allowPublicRegister) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-lg">
        <div className="max-w-md rounded-radius-xl border border-border/30 bg-surface-container-lowest p-lg text-center">
          <h1 className="text-heading-3 font-semibold text-foreground">
            Registration by invitation only
          </h1>
          <p className="mt-xs text-body text-secondary">
            Ask your administrator for an invitation link.
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

  return (
    <div className="flex min-h-screen w-full">
      <AuthBrandPanel />

      <main className="flex flex-1 flex-col overflow-y-auto" id="main-content">
        <AuthMobileHeader />
        <div className="flex min-h-full items-center justify-center px-xl py-xl sm:px-2xl lg:px-3xl">
          <div className="w-full max-w-112 space-y-xl" id="register-form">
            <div>
              <h2 className="text-heading-1 font-bold text-foreground">Create your account</h2>
              <p className="mt-xs text-body text-muted">Get started with TaskForge for free</p>
            </div>

            {/* OAuth buttons — only rendered when providers are configured */}
            <OAuthButtons dividerLabel="or sign up with email" />

            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-md" noValidate>
              <div>
                <label
                  htmlFor="displayName"
                  className="mb-xs block text-sm font-medium text-foreground"
                >
                  Full name
                </label>
                <input
                  id="displayName"
                  type="text"
                  autoComplete="name"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="flex h-11 w-full rounded-radius-md border border-border bg-surface-container-lowest px-md py-sm text-base text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  placeholder="Alex Rivera"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-email"
                  className="mb-xs block text-sm font-medium text-foreground"
                >
                  Email address
                </label>
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex h-11 w-full rounded-radius-md border border-border bg-surface-container-lowest px-md py-sm text-base text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-password"
                  className="mb-xs block text-sm font-medium text-foreground"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex h-11 w-full rounded-radius-md border border-border bg-surface-container-lowest px-md py-sm pr-10 text-base text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-sm top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <PasswordStrength password={password} />
              </div>

              <div>
                <label
                  htmlFor="organizationName"
                  className="mb-xs block text-sm font-medium text-foreground"
                >
                  Organization name <span className="font-normal text-muted">(optional)</span>
                </label>
                <input
                  id="organizationName"
                  type="text"
                  autoComplete="organization"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  className="flex h-11 w-full rounded-radius-md border border-border bg-surface-container-lowest px-md py-sm text-base text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  placeholder="Acme Corp"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                loading={register.isPending}
              >
                Create account
              </Button>

              <p className="text-center text-label text-muted">
                By creating an account you agree to our{' '}
                <a href="/terms" className="text-brand-primary hover:underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="text-brand-primary hover:underline">
                  Privacy Policy
                </a>
                .
              </p>
            </form>

            <p className="text-center text-sm text-muted">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() =>
                  void navigate({ to: '/auth/login', search: { redirect: undefined } })
                }
                className="font-medium text-brand-primary hover:underline focus-visible:outline-none focus-visible:underline"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
