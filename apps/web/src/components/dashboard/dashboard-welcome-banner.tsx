import type { DashboardSummary } from '@/api/dashboard';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'tf:dashboard:welcome-dismissed:v1';

interface DashboardWelcomeBannerProps {
  firstName: string;
  organizationName?: string;
  summary?: DashboardSummary;
  isSummaryLoading?: boolean;
}

export function DashboardWelcomeBanner({
  firstName,
  organizationName,
  summary,
  isSummaryLoading,
}: DashboardWelcomeBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    setIsDismissed(saved === '1');
  }, []);

  if (isDismissed) {
    return null;
  }

  const subtitle = isSummaryLoading
    ? 'Preparing your dashboard overview...'
    : summary
      ? `${summary.myTasksCount} active tasks, ${summary.overdueTasksCount} overdue, ${summary.activeProjectsCount} active projects.`
      : 'Spacious dashboard with timeline, progress, and upcoming workload.';

  return (
    <section className="rounded-radius-lg border border-border bg-surface-container-lowest p-lg shadow-1">
      <div className="rounded-radius-sm border-l-4 border-brand-primary pl-md">
        <div className="flex items-start justify-between gap-md">
          <div>
            <h1 className="text-heading-1 font-bold text-foreground">
              Welcome back, {firstName} 👋
            </h1>
            <p className="mt-xs text-body text-muted">
              {organizationName ? `${organizationName} · ` : ''}
              {subtitle}
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Dismiss welcome banner"
            onClick={() => {
              setIsDismissed(true);
              localStorage.setItem(STORAGE_KEY, '1');
            }}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
