import { useConfirmEmailChange } from '@/api/users';
import { Button } from '@/components/ui/button';
import { showErrorToast } from '@/lib/error-toast';
import { useAuthStore } from '@/stores/auth.store';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { CheckCircle, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AuthBrandPanel } from './brand-panel';

export function ConfirmEmailChangePage() {
  const navigate = useNavigate();
  const search = useSearch({ from: '/auth/confirm-email-change' });
  const token = (search as { token?: string }).token ?? '';
  const confirm = useConfirmEmailChange();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional one-time effect on mount
  useEffect(() => {
    if (!token) {
      const message = showErrorToast(
        null,
        'This confirmation link is invalid. Please request a new email change link.',
        { id: 'confirm-email-change-error' },
      );
      setError(message);
      return;
    }
    confirm.mutate(token, {
      onSuccess: () => {
        clearAuth();
        setDone(true);
      },
      onError: (err) => {
        const message = showErrorToast(err, 'Invalid or expired confirmation link.', {
          id: 'confirm-email-change-error',
        });
        setError(message);
      },
    });
  }, []);

  return (
    <div className="flex min-h-screen w-full">
      <AuthBrandPanel />
      <main className="flex flex-1 flex-col items-center justify-center px-xl py-xl">
        <div className="w-full max-w-112 space-y-xl text-center">
          {done ? (
            <>
              <div className="flex size-14 items-center justify-center rounded-full bg-success/10 text-success mx-auto">
                <CheckCircle className="size-7" />
              </div>
              <div>
                <h2 className="text-heading-1 font-bold text-foreground">Email address updated</h2>
                <p className="mt-xs text-body text-muted">
                  Your email has been changed. Please sign in with your new address.
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
            </>
          ) : error ? (
            <>
              <div className="flex size-14 items-center justify-center rounded-full bg-danger/10 text-danger mx-auto">
                <XCircle className="size-7" />
              </div>
              <div>
                <h2 className="text-heading-1 font-bold text-foreground">Confirmation failed</h2>
                <p className="mt-xs text-body text-muted">{error}</p>
              </div>
              <Button
                variant="secondary"
                size="lg"
                className="w-full"
                onClick={() =>
                  void navigate({ to: '/auth/login', search: { redirect: undefined } })
                }
              >
                Back to sign in
              </Button>
            </>
          ) : (
            <p className="text-body text-muted">Confirming your new email address…</p>
          )}
        </div>
      </main>
    </div>
  );
}
