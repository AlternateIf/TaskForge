import { useResetPassword } from '@/api/auth';
import { Button } from '@/components/ui/button';
import { showErrorToast } from '@/lib/error-toast';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { CheckCircle, Eye, EyeOff } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { AuthMobileHeader } from './auth-mobile-header';
import { AuthBrandPanel } from './brand-panel';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: '/auth/reset-password' });
  const resetPassword = useResetPassword();

  const token = (search as { token: string }).token;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    try {
      await resetPassword.mutateAsync({ token, password });
      setDone(true);
    } catch (err) {
      showErrorToast(err, 'Failed to reset password. The link may have expired.', {
        id: 'reset-password-error',
      });
    }
  }

  return (
    <div className="flex min-h-screen w-full">
      <AuthBrandPanel />

      <main className="flex flex-1 flex-col" id="main-content">
        <AuthMobileHeader />
        <div className="flex flex-1 items-center justify-center px-xl py-xl sm:px-2xl lg:px-3xl">
          <div className="w-full max-w-112 space-y-xl">
            {done ? (
              <div className="flex flex-col items-center gap-md text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-success/10 text-success">
                  <CheckCircle className="size-7" />
                </div>
                <div>
                  <h2 className="text-heading-1 font-bold text-foreground">Password reset</h2>
                  <p className="mt-xs text-body text-muted">
                    Your password has been updated. You can now sign in with your new password.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={() =>
                    void navigate({ to: '/auth/login', search: { redirect: undefined } })
                  }
                >
                  Sign in
                </Button>
              </div>
            ) : (
              <>
                <div>
                  <h2 className="text-heading-1 font-bold text-foreground">Set new password</h2>
                  <p className="mt-xs text-body text-muted">
                    Choose a strong password for your account.
                  </p>
                </div>

                <form onSubmit={(e) => void handleSubmit(e)} className="space-y-md" noValidate>
                  <div>
                    <label
                      htmlFor="new-password"
                      className="mb-xs block text-small font-medium text-foreground"
                    >
                      New password
                    </label>
                    <div className="relative">
                      <input
                        id="new-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="flex h-10 w-full rounded-radius-md border border-border bg-surface-container-lowest px-md py-sm pr-10 text-body text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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

                  <div>
                    <label
                      htmlFor="confirm-password"
                      className="mb-xs block text-small font-medium text-foreground"
                    >
                      Confirm password
                    </label>
                    <input
                      id="confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="flex h-10 w-full rounded-radius-md border border-border bg-surface-container-lowest px-md py-sm text-body text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      placeholder="••••••••"
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full"
                    loading={resetPassword.isPending}
                  >
                    Reset password
                  </Button>
                </form>

                <p className="text-center text-small text-muted">
                  <button
                    type="button"
                    onClick={() =>
                      void navigate({ to: '/auth/login', search: { redirect: undefined } })
                    }
                    className="font-medium text-brand-primary hover:underline focus-visible:outline-none focus-visible:underline"
                  >
                    Back to sign in
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
