import { useForgotPassword } from '@/api/auth';
import type { ApiError } from '@/api/client';
import { Button } from '@/components/ui/button';
import { useNavigate } from '@tanstack/react-router';
import { Mail } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { AuthMobileHeader } from './auth-mobile-header';
import { AuthBrandPanel } from './brand-panel';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const forgotPassword = useForgotPassword();

  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await forgotPassword.mutateAsync(email);
      setSubmitted(true);
    } catch (err) {
      const msg = (err as ApiError).message ?? 'Something went wrong';
      toast.error(msg);
    }
  }

  return (
    <div className="flex min-h-screen w-full">
      <AuthBrandPanel />

      <main className="flex flex-1 flex-col" id="main-content">
        <AuthMobileHeader />
        <div className="flex flex-1 items-center justify-center px-xl py-xl sm:px-2xl lg:px-3xl">
          <div className="w-full max-w-112 space-y-xl">
            {submitted ? (
              <div className="flex flex-col items-center gap-md text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-success/10 text-success">
                  <Mail className="size-7" />
                </div>
                <div>
                  <h2 className="text-heading-1 font-bold text-foreground">Check your email</h2>
                  <p className="mt-xs text-body text-muted">
                    If an account exists for{' '}
                    <span className="font-medium text-foreground">{email}</span>, we've sent a
                    password reset link.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    void navigate({ to: '/auth/login', search: { redirect: undefined } })
                  }
                  className="text-small font-medium text-brand-primary hover:underline focus-visible:outline-none focus-visible:underline"
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <>
                <div>
                  <h2 className="text-heading-1 font-bold text-foreground">
                    Forgot your password?
                  </h2>
                  <p className="mt-xs text-body text-muted">
                    Enter your email and we&apos;ll send you a link to reset it.
                  </p>
                </div>

                <form onSubmit={(e) => void handleSubmit(e)} className="space-y-md" noValidate>
                  <div>
                    <label
                      htmlFor="forgot-email"
                      className="mb-xs block text-small font-medium text-foreground"
                    >
                      Email address
                    </label>
                    <input
                      id="forgot-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="flex h-10 w-full rounded-radius-md border border-border bg-surface-container-lowest px-md py-sm text-body text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      placeholder="you@example.com"
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full"
                    loading={forgotPassword.isPending}
                  >
                    Send reset link
                  </Button>
                </form>

                <p className="text-center text-small text-muted">
                  Remembered it?{' '}
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
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
