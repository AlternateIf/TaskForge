import { useLogout } from '@/api/auth';
import { CommandPalette } from '@/components/shortcuts/command-palette';
import type { RecentPage } from '@/components/shortcuts/command-palette';
import { useTheme } from '@/components/theme-provider';
import { Avatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/stores/auth.store';
import { useRouter } from '@tanstack/react-router';
import { Bell, Menu, Moon, Search, Settings, Sun, User } from 'lucide-react';
import { useCallback } from 'react';

interface HeaderProps {
  onMenuClick: () => void;
  commandPaletteOpen: boolean;
  onCommandPaletteOpenChange: (open: boolean) => void;
  recentPages: RecentPage[];
  addRecentPage: (page: RecentPage) => void;
}

export function Header({
  onMenuClick,
  commandPaletteOpen,
  onCommandPaletteOpenChange,
  recentPages,
  addRecentPage,
}: HeaderProps) {
  const { user } = useAuthStore();
  const logout = useLogout();
  const router = useRouter();
  const { resolvedTheme: theme, setTheme } = useTheme();
  const open = commandPaletteOpen;
  const onOpenChange = onCommandPaletteOpenChange;

  const handleNavigate = useCallback(
    (path: string) => {
      void router.navigate({ to: path });
    },
    [router],
  );

  const handleLogout = useCallback(() => {
    logout.mutate(undefined, {
      onSettled: () => {
        void router.navigate({ to: '/auth/login', search: { redirect: undefined } });
      },
    });
  }, [logout, router]);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-sm border-b border-border/30 bg-background px-md">
        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="flex items-center justify-center rounded-radius-md p-xs text-muted hover:bg-surface-container-low lg:hidden"
        >
          <Menu className="size-5" />
        </button>

        {/* Mobile brand name */}
        <span className="text-body font-semibold text-brand-primary lg:hidden">TaskForge</span>

        {/* Search / Command palette trigger */}
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          aria-label="Open command palette"
          className="flex h-9 flex-1 items-center gap-sm rounded-radius-md border border-border/50 bg-surface-container-low px-sm text-muted transition-colors hover:border-border hover:bg-surface-container-lowest"
        >
          <Search className="size-4 shrink-0" />
          <span className="flex-1 text-left text-small">Search&hellip;</span>
          <kbd className="hidden items-center gap-xs rounded px-xs py-[1px] text-label font-mono bg-surface-container-high text-muted lg:flex">
            <span>⌘</span>
            <span>K</span>
          </kbd>
        </button>

        {/* Right actions */}
        <div className="flex items-center gap-xs">
          {/* Notifications */}
          <button
            type="button"
            aria-label="Notifications"
            className="relative flex items-center justify-center rounded-radius-md p-sm text-muted hover:bg-surface-container-low transition-colors"
          >
            <Bell className="size-6" />
            {/* Badge — placeholder until notification API is wired */}
            <span
              className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-danger text-[9px] font-bold text-white"
              aria-label="3 unread notifications"
            >
              3
            </span>
          </button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="User menu"
              className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Avatar name={user?.displayName} userId={user?.id} size="md" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel className="flex flex-col gap-0.5">
                <span className="font-semibold">{user?.displayName}</span>
                <span className="text-label font-normal text-muted">{user?.email}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleNavigate('/settings/profile')}>
                <User className="size-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleNavigate('/settings')}>
                <Settings className="size-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleTheme}>
                {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-danger hover:text-danger">
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <CommandPalette
        open={open}
        onOpenChange={onOpenChange}
        onNavigate={(path) => {
          handleNavigate(path);
          addRecentPage({ path, title: path });
        }}
        recentPages={recentPages}
      />
    </>
  );
}
