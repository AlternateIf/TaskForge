import { useAuthConfig, useRegister } from '@/api/auth';
import type { ApiError } from '@/api/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigate } from '@tanstack/react-router';
import { Check, Circle, Eye, EyeOff } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { AuthMobileHeader } from './auth-mobile-header';
import { AuthBrandPanel } from './brand-panel';
import { OAuthButtons } from './oauth-buttons';

// ─── Password strength ────────────────────────────────────────────────────────

interface PasswordRequirement {
  id: string;
  label: string;
  test: (pw: string) => boolean;
}

const REQUIREMENTS: PasswordRequirement[] = [
  { id: 'length', label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
  { id: 'upper', label: 'Uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
  { id: 'lower', label: 'Lowercase letter', test: (pw) => /[a-z]/.test(pw) },
  { id: 'number', label: 'Number', test: (pw) => /\d/.test(pw) },
  { id: 'special', label: 'Special character', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

type StrengthLevel = 0 | 1 | 2 | 3 | 4;

function getStrengthLevel(password: string): StrengthLevel {
  const met = REQUIREMENTS.filter((r) => r.test(password)).length;
  if (met === 0) return 0;
  if (met === 1) return 1;
  if (met <= 3) return 2;
  if (met === 4) return 3;
  return 4;
}

const STRENGTH_LABELS: Record<StrengthLevel, string> = {
  0: '',
  1: 'Weak',
  2: 'Fair',
  3: 'Good',
  4: 'Strong',
};

const SEGMENT_COLORS: Record<StrengthLevel, string> = {
  0: 'bg-surface-container-high',
  1: 'bg-danger',
  2: 'bg-warning',
  3: 'bg-warning',
  4: 'bg-success',
};

interface PasswordStrengthProps {
  password: string;
}

function PasswordStrength({ password }: PasswordStrengthProps) {
  const strength = getStrengthLevel(password);
  const label = STRENGTH_LABELS[strength];
  const segColor = SEGMENT_COLORS[strength];

  return (
    <div className="mt-sm space-y-sm">
      {/* 4-segment bar */}
      <div className="flex items-center gap-xs">
        <div
          className="flex flex-1 gap-xs"
          role="meter"
          aria-label="Password strength"
          aria-valuenow={strength}
          aria-valuemin={0}
          aria-valuemax={4}
        >
          {(['s0', 's1', 's2', 's3'] as const).map((key, i) => (
            <div
              key={key}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors duration-normal',
                i < strength ? segColor : 'bg-surface-container-high',
              )}
            />
          ))}
        </div>
        {label && (
          <span
            className={cn(
              'text-label font-medium',
              strength <= 1 && 'text-danger',
              strength === 2 && 'text-warning',
              strength === 3 && 'text-warning',
              strength === 4 && 'text-success',
            )}
          >
            {label}
          </span>
        )}
      </div>

      {/* Requirements checklist */}
      <ul className="space-y-xs" aria-label="Password requirements">
        {REQUIREMENTS.map((req) => {
          const met = req.test(password);
          return (
            <li key={req.id} className="flex items-center gap-xs">
              {met ? (
                <Check className="size-3.5 text-success" aria-hidden="true" />
              ) : (
                <Circle className="size-3.5 text-muted" aria-hidden="true" />
              )}
              <span className={cn('text-label', met ? 'text-success' : 'text-muted')}>
                {req.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

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
