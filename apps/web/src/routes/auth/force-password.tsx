import { useChangePassword, useLogout } from '@/api/auth';
import type { ApiError } from '@/api/client';
import { Button } from '@/components/ui/button';
import { useNavigate } from '@tanstack/react-router';
import { Eye, EyeOff } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';

export function ForcePasswordPage() {
  const navigate = useNavigate();
  const changePassword = useChangePassword();
  const logout = useLogout();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      toast.success('Password changed successfully.');
      void navigate({ to: '/dashboard' });
    } catch (error) {
      toast.error((error as ApiError).message ?? 'Failed to change password');
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl rounded-radius-xl border border-border/30 bg-surface-container-lowest p-lg">
      <h1 className="text-heading-2 font-semibold text-foreground">Change Password</h1>
      <p className="mt-xs text-body text-secondary">
        You must change your password before continuing.
      </p>

      <form onSubmit={(event) => void handleSubmit(event)} className="mt-md space-y-md">
        <div>
          <label
            htmlFor="force-current-password"
            className="mb-xs block text-sm font-medium text-foreground"
          >
            Current password
          </label>
          <div className="relative">
            <input
              id="force-current-password"
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="flex h-11 w-full rounded-radius-md border border-border bg-surface-container-lowest px-md py-sm pr-10 text-base text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              required
            />
            <button
              type="button"
              onClick={() => setShowCurrent((value) => !value)}
              className="absolute right-sm top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
            >
              {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="force-new-password"
            className="mb-xs block text-sm font-medium text-foreground"
          >
            New password
          </label>
          <div className="relative">
            <input
              id="force-new-password"
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="flex h-11 w-full rounded-radius-md border border-border bg-surface-container-lowest px-md py-sm pr-10 text-base text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              required
            />
            <button
              type="button"
              onClick={() => setShowNew((value) => !value)}
              className="absolute right-sm top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
            >
              {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <div className="flex gap-sm">
          <Button type="submit" variant="primary" loading={changePassword.isPending}>
            Update password
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              logout.mutate(undefined, {
                onSettled: () => {
                  void navigate({ to: '/auth/login', search: { redirect: undefined } });
                },
              })
            }
          >
            Log out
          </Button>
        </div>
      </form>
    </div>
  );
}
