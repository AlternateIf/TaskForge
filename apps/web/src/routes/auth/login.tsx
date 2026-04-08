import { useAuthConfig, useLogin } from '@/api/auth';
import type { ApiError } from '@/api/client';
import { Button } from '@/components/ui/button';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Eye, EyeOff } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { AuthMobileHeader } from './auth-mobile-header';
import { AuthBrandPanel } from './brand-panel';
import { OAuthButtons } from './oauth-buttons';

// ─── LoginPage ────────────────────────────────────────────────────────────────

export function LoginPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: '/auth/login' });
  const login = useLogin();
  const authConfig = useAuthConfig();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const redirectTo = (search as { redirect?: string }).redirect ?? '/dashboard';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const res = await login.mutateAsync({ email, password });
      const mfaRequired = res.data.mfaRequired ?? res.data.requiresMfa ?? false;
      const { mfaToken } = res.data;
      if (mfaRequired && mfaToken) {
        void navigate({ to: '/auth/mfa', search: { token: mfaToken } });
      } else {
        void navigate({ to: redirectTo });
      }
    } catch (err) {
      const msg = (err as ApiError).message ?? 'Invalid credentials';
      toast.error(msg);
    }
  }

  return (
    <div className="flex min-h-screen w-full">
      <AuthBrandPanel />

      {/* Form panel */}
      <main className="flex flex-1 flex-col" id="main-content">
        <AuthMobileHeader />
        <div className="flex flex-1 items-center justify-center px-xl py-xl sm:px-2xl lg:px-3xl">
          <div className="w-full max-w-112 space-y-xl" id="login-form">
            {/* Heading */}
            <div>
              <h2 className="text-heading-1 font-bold text-foreground">Welcome back</h2>
              <p className="mt-xs text-sm text-muted">Sign in to your account to continue</p>
            </div>

            {/* OAuth buttons — only rendered when providers are configured */}
            <OAuthButtons dividerLabel="or continue with email" />

            {/* Email/password form */}
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-md" noValidate>
              <div>
                <label htmlFor="email" className="mb-xs block text-sm font-medium text-foreground">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex h-11 w-full rounded-radius-md border border-border bg-surface-container-lowest px-md text-base text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <div className="mb-xs flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium text-foreground">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => void navigate({ to: '/auth/forgot-password' })}
                    className="text-sm text-brand-primary hover:underline focus-visible:outline-none focus-visible:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex h-11 w-full rounded-radius-md border border-border bg-surface-container-lowest px-md pr-10 text-base text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                loading={login.isPending}
              >
                Sign in
              </Button>
            </form>

            {authConfig.data?.allowPublicRegister ? (
              <p className="text-center text-sm text-muted">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => void navigate({ to: '/auth/register' })}
                  className="font-medium text-brand-primary hover:underline focus-visible:outline-none focus-visible:underline"
                >
                  Create one
                </button>
              </p>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
