import { Avatar } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/auth.store';
import { Settings } from 'lucide-react';

export function SettingsPage() {
  const { user } = useAuthStore();

  return (
    <div className="mx-auto max-w-[42rem] space-y-lg">
      <div className="flex items-center gap-sm">
        <Settings className="size-6 text-brand-primary" />
        <h1 className="text-heading-1 font-semibold text-foreground">Settings</h1>
      </div>

      {/* Profile section */}
      <section className="rounded-radius-xl border border-border/30 bg-surface-container-lowest p-lg space-y-md">
        <h2 className="text-heading-2 font-semibold text-foreground">Profile</h2>
        <div className="flex items-center gap-md">
          <Avatar name={user?.displayName} userId={user?.id} size="xl" />
          <div className="space-y-xs">
            <p className="text-body font-semibold text-foreground">{user?.displayName}</p>
            <p className="text-body text-secondary">{user?.email}</p>
            {user?.organizationName && (
              <p className="text-label text-muted">{user.organizationName}</p>
            )}
          </div>
        </div>
      </section>

      {/* Placeholder sections */}
      <section className="rounded-radius-xl border border-border/30 bg-surface-container-lowest p-lg space-y-sm">
        <h2 className="text-heading-2 font-semibold text-foreground">Account</h2>
        <p className="text-body text-secondary">Account management settings coming soon.</p>
      </section>

      <section className="rounded-radius-xl border border-border/30 bg-surface-container-lowest p-lg space-y-sm">
        <h2 className="text-heading-2 font-semibold text-foreground">Notifications</h2>
        <p className="text-body text-secondary">Notification preferences coming soon.</p>
      </section>
    </div>
  );
}
