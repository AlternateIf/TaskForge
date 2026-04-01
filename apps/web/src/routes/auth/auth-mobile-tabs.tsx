import { cn } from '@/lib/utils';
import { useRouter } from '@tanstack/react-router';

interface AuthTab {
  label: string;
  path: string;
  external?: boolean;
}

const TABS: AuthTab[] = [
  { label: 'Sign In', path: '/auth/login' },
  { label: 'Join', path: '/auth/register' },
  { label: 'Help', path: 'mailto:support@taskforge.io', external: true },
];

interface AuthMobileTabsProps {
  currentPath: string;
}

export function AuthMobileTabs({ currentPath }: AuthMobileTabsProps) {
  const router = useRouter();

  return (
    <nav
      className="flex w-full items-center justify-around border-t border-border/30 bg-surface-container-lowest px-sm pb-safe pt-xs lg:hidden"
      aria-label="Auth navigation"
    >
      {TABS.map((tab) => {
        const isActive = !tab.external && currentPath === tab.path;
        return tab.external ? (
          <a
            key={tab.path}
            href={tab.path}
            className={cn(
              'flex flex-1 flex-col items-center gap-0.5 rounded-radius-md px-sm py-xs text-small font-medium transition-colors',
              'text-muted hover:text-foreground',
            )}
          >
            {tab.label}
          </a>
        ) : (
          <button
            key={tab.path}
            type="button"
            onClick={() => void router.navigate({ to: tab.path })}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex flex-1 flex-col items-center gap-0.5 rounded-radius-md px-sm py-xs text-small font-medium transition-colors',
              isActive
                ? 'bg-surface-container-low text-brand-primary'
                : 'text-muted hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
