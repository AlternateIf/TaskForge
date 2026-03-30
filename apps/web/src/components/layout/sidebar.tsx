import { useLogout } from '@/api/auth';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useRouter } from '@tanstack/react-router';
import {
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Plus,
  Settings,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────

const COLLAPSED_KEY = 'tf:sidebar-collapsed';

interface NavItem {
  label: string;
  path: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', Icon: LayoutDashboard },
  { label: 'Projects', path: '/projects', Icon: FolderOpen },
  { label: 'Settings', path: '/settings', Icon: Settings },
];

// ─── SidebarNavItem ───────────────────────────────────────────────────────────

interface SidebarNavItemProps {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
  onClick: () => void;
}

function SidebarNavItem({ item, collapsed, active, onClick }: SidebarNavItemProps) {
  const { Icon } = item;

  const button = (
    <button
      type="button"
      onClick={onClick}
      aria-label={collapsed ? item.label : undefined}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex w-full items-center gap-sm rounded-radius-lg px-sm py-sm text-body transition-all duration-normal',
        active
          ? 'bg-surface-container-lowest text-brand-primary shadow-1'
          : 'text-foreground hover:bg-surface-container-lowest/50',
        collapsed && 'justify-center px-0',
      )}
    >
      <Icon className="size-5 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </button>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger>{button}</TooltipTrigger>
        <TooltipContent className="left-full ml-2 top-1/2 -translate-y-1/2">
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return button;
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const { user } = useAuthStore();
  const logout = useLogout();
  const router = useRouter();
  const currentPath = router.state.location.pathname;

  const overlayRef = useRef<HTMLDivElement>(null);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSED_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const handleNavigate = useCallback(
    (path: string) => {
      void router.navigate({ to: path });
      onMobileClose?.();
    },
    [router, onMobileClose],
  );

  const handleLogout = useCallback(() => {
    logout.mutate(undefined, {
      onSettled: () => {
        void router.navigate({ to: '/auth/login', search: { redirect: undefined } });
      },
    });
  }, [logout, router]);

  // Close mobile sidebar on Escape
  useEffect(() => {
    if (!mobileOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onMobileClose?.();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, onMobileClose]);

  const sidebarContent = (
    <div
      className={cn(
        'flex h-full flex-col bg-surface-container-low transition-all duration-normal',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Logo + collapse toggle */}
      <div
        className={cn(
          'flex h-14 shrink-0 items-center border-b border-border/30 px-md',
          collapsed ? 'justify-center' : 'justify-between',
        )}
      >
        {!collapsed && (
          <span className="text-heading-3 font-bold text-brand-primary">TaskForge</span>
        )}
        {/* Mobile close */}
        <button
          type="button"
          onClick={onMobileClose}
          className="flex items-center justify-center rounded-radius-md p-xs text-muted hover:bg-surface-container-lowest/50 lg:hidden"
          aria-label="Close sidebar"
        >
          <X className="size-5" />
        </button>
        {/* Desktop collapse */}
        <button
          type="button"
          onClick={toggleCollapsed}
          className="hidden items-center justify-center rounded-radius-md p-xs text-muted hover:bg-surface-container-lowest/50 lg:flex"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </button>
      </div>

      {/* New Project button */}
      <div className={cn('px-sm pt-md', collapsed && 'px-xs')}>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger>
              <button
                type="button"
                onClick={() => handleNavigate('/projects/new')}
                aria-label="New project"
                className="flex w-full items-center justify-center rounded-radius-lg p-sm text-white bg-gradient-to-br from-brand-primary to-brand-primary-container shadow-1 hover:shadow-2 hover:scale-[1.02] active:scale-[0.98] transition-all duration-normal"
              >
                <Plus className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="left-full ml-2 top-1/2 -translate-y-1/2">
              New project
            </TooltipContent>
          </Tooltip>
        ) : (
          <Button
            variant="primary"
            size="sm"
            className="w-full"
            onClick={() => handleNavigate('/projects/new')}
          >
            <Plus className="size-4" />
            New project
          </Button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-sm py-md" aria-label="Main navigation">
        <ul className="flex flex-col gap-xs">
          {NAV_ITEMS.map((item) => (
            <li key={item.path}>
              <SidebarNavItem
                item={item}
                collapsed={collapsed}
                active={currentPath === item.path || currentPath.startsWith(`${item.path}/`)}
                onClick={() => handleNavigate(item.path)}
              />
            </li>
          ))}
        </ul>
      </nav>

      {/* User section */}
      <div className={cn('shrink-0 border-t border-border/30 p-sm', collapsed && 'p-xs')}>
        <div
          className={cn(
            'flex items-center gap-sm rounded-radius-lg px-sm py-xs',
            collapsed && 'justify-center px-0',
          )}
        >
          <Avatar name={user?.displayName} userId={user?.id} size="sm" className="shrink-0" />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-small font-medium text-foreground">{user?.displayName}</p>
              <p className="truncate text-label text-muted">{user?.email}</p>
            </div>
          )}
          {!collapsed && (
            <Tooltip>
              <TooltipTrigger>
                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label="Sign out"
                  className="flex items-center justify-center rounded-radius-md p-xs text-muted hover:bg-surface-container-lowest/50 hover:text-danger transition-colors"
                >
                  <LogOut className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="bottom-full mb-1 right-0">Sign out</TooltipContent>
            </Tooltip>
          )}
        </div>
        {collapsed && (
          <Tooltip>
            <TooltipTrigger>
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Sign out"
                className="mt-xs flex w-full items-center justify-center rounded-radius-md p-xs text-muted hover:bg-surface-container-lowest/50 hover:text-danger transition-colors"
              >
                <LogOut className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="left-full ml-2 top-1/2 -translate-y-1/2">
              Sign out
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden h-screen lg:flex">{sidebarContent}</aside>

      {/* Mobile off-canvas */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Overlay */}
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop dismissal handled by Escape key listener above */}
          <div
            ref={overlayRef}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          {/* Drawer */}
          <aside className="absolute inset-y-0 left-0 flex w-60 shadow-4">{sidebarContent}</aside>
        </div>
      )}
    </>
  );
}
