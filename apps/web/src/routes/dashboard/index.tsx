import { useDocumentTitle } from '@/hooks/use-document-title';
import { useAuthStore } from '@/stores/auth.store';
import { LayoutDashboard } from 'lucide-react';

export function DashboardPage() {
  useDocumentTitle('Dashboard');
  const { user } = useAuthStore();

  return (
    <div className="space-y-xl">
      <div>
        <h1 className="text-heading-1 font-bold text-foreground">
          Welcome back, {user?.displayName?.split(' ')[0] ?? 'there'} 👋
        </h1>
        <p className="mt-xs text-body text-muted">
          {user?.organizationName} · Here&apos;s what&apos;s happening today.
        </p>
      </div>

      {/* Placeholder content — replaced by personalized dashboard feature */}
      <div className="flex min-h-96 flex-col items-center justify-center gap-md rounded-radius-xl border border-dashed border-border bg-surface-container-low text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
          <LayoutDashboard className="size-7" />
        </div>
        <div>
          <p className="text-body font-medium text-foreground">Dashboard coming soon</p>
          <p className="mt-xs text-small text-muted">
            Your tasks, projects, and activity will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}
