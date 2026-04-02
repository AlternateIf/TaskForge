import { useLogout } from '@/api/auth';
import { useProject } from '@/api/projects';
import { CreateProjectDialog } from '@/components/forms/create-project-dialog';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useRouter, useRouterState } from '@tanstack/react-router';
import {
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Keyboard,
  LayoutDashboard,
  LogOut,
  Plus,
  Settings,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────

const COLLAPSED_KEY = 'tf:sidebar-collapsed';
const RECENT_PROJECTS_KEY = 'tf:recent-projects';

// ─── Recent projects helpers ──────────────────────────────────────────────────

interface RecentProject {
  id: string;
  name: string;
  color?: string | null;
}

function getRecentProjects(): RecentProject[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_PROJECTS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function recordRecentProject(project: RecentProject) {
  try {
    const existing = getRecentProjects();
    const updated = [project, ...existing.filter((p) => p.id !== project.id)].slice(0, 3);
    localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

interface NavItem {
  label: string;
  path: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Personal Dashboard', path: '/dashboard', Icon: LayoutDashboard },
  { label: 'Projects', path: '/projects', Icon: FolderOpen },
  { label: 'Settings', path: '/settings', Icon: Settings },
];

// ─── TF Logo ──────────────────────────────────────────────────────────────────

function TFLogo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-radius-lg bg-white shadow-1 dark:bg-brand-primary',
        className,
      )}
    >
      <span className="text-sm font-bold text-brand-primary dark:text-white">TF</span>
    </div>
  );
}

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
          ? 'bg-brand-primary/10 text-brand-primary dark:bg-brand-primary/20 dark:text-brand-primary font-medium'
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
  onOpenCommandPalette?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose, onOpenCommandPalette }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>(getRecentProjects);

  const { user, activeOrganizationId, setActiveOrganizationId } = useAuthStore();
  const logout = useLogout();
  const router = useRouter();
  // useRouterState is reactive — re-renders on navigation (fixes highlight bug)
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  // Track recently visited projects
  const currentProjectId = currentPath.match(/^\/projects\/([^/]+)/)?.[1];
  const { data: currentProject } = useProject(currentProjectId ?? '');
  useEffect(() => {
    if (!currentProject) return;
    recordRecentProject({
      id: currentProject.id,
      name: currentProject.name,
      color: currentProject.color,
    });
    setRecentProjects(getRecentProjects());
  }, [currentProject]);

  const overlayRef = useRef<HTMLDivElement>(null);
  const organizations =
    user?.organizations && user.organizations.length > 0
      ? user.organizations
      : user?.organizationId && user.organizationName
        ? [{ id: user.organizationId, name: user.organizationName }]
        : [];
  const activeOrg =
    organizations.find((organization) => organization.id === activeOrganizationId) ??
    organizations[0];

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
      {/* Logo header + collapse toggle */}
      <div
        className={cn(
          'flex h-16 shrink-0 items-center border-b border-border/30 px-md',
          collapsed ? 'justify-center' : 'justify-between',
        )}
      >
        {!collapsed && (
          <>
            <TFLogo className="size-7 shrink-0" />
            {organizations.length <= 1 ? (
              <span className="truncate text-body font-semibold text-foreground">
                {activeOrg?.name ?? 'TaskForge'}
              </span>
            ) : (
              <select
                value={activeOrg?.id ?? ''}
                onChange={(event) => setActiveOrganizationId(event.target.value)}
                className="h-8 min-w-0 flex-1 truncate rounded-radius-md border border-border/30 bg-surface-container-lowest px-xs text-body font-semibold text-foreground outline-none focus-visible:border-border"
                aria-label="Switch organization"
              >
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>
            )}
          </>
        )}
        {/* Mobile close */}
        <button
          type="button"
          onClick={onMobileClose}
          className={cn(
            'flex items-center justify-center rounded-radius-md p-xs text-muted hover:bg-surface-container-lowest/50 lg:hidden',
            collapsed && 'hidden',
          )}
          aria-label="Close sidebar"
        >
          <X className="size-5" />
        </button>
        {/* Desktop collapse */}
        <button
          type="button"
          onClick={toggleCollapsed}
          className={cn(
            'hidden items-center justify-center rounded-radius-md p-xs text-muted hover:bg-surface-container-lowest/50 lg:flex',
            collapsed && 'mt-0',
          )}
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
                onClick={() => setCreateProjectOpen(true)}
                aria-label="New project"
                className="flex w-full items-center justify-center rounded-radius-lg p-sm text-white bg-linear-to-br from-brand-primary to-brand-primary-container shadow-1 hover:shadow-2 hover:scale-[1.02] active:scale-[0.98] transition-all duration-normal"
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
            className="w-full text-white"
            onClick={() => setCreateProjectOpen(true)}
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
              {/* Recent projects — shown indented under "Projects" */}
              {item.path === '/projects' && recentProjects.length > 0 && (
                <ul
                  className={cn('mt-xs flex flex-col gap-xs', collapsed ? 'items-center' : 'pl-md')}
                >
                  {recentProjects.map((p) => {
                    const isActive = currentPath.startsWith(`/projects/${p.id}`);
                    const button = (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleNavigate(`/projects/${p.id}/board`)}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(
                          'flex w-full items-center gap-xs rounded-radius-md px-sm py-xs text-body transition-colors',
                          isActive
                            ? 'bg-brand-primary/10 text-brand-primary font-medium dark:bg-brand-primary/20'
                            : 'text-secondary hover:bg-surface-container-lowest/50 hover:text-foreground',
                          collapsed && 'justify-center px-0',
                        )}
                      >
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: p.color ?? '#6B7280' }}
                          aria-hidden
                        />
                        {!collapsed && <span className="truncate text-label">{p.name}</span>}
                      </button>
                    );
                    if (collapsed) {
                      return (
                        <li key={p.id}>
                          <Tooltip>
                            <TooltipTrigger>{button}</TooltipTrigger>
                            <TooltipContent className="left-full ml-2 top-1/2 -translate-y-1/2">
                              {p.name}
                            </TooltipContent>
                          </Tooltip>
                        </li>
                      );
                    }
                    return <li key={p.id}>{button}</li>;
                  })}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom: shortcuts hint + sign-out */}
      <div className={cn('shrink-0 border-t border-border/30 p-sm', collapsed && 'p-xs')}>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger>
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Sign out"
                className="flex w-full items-center justify-center rounded-radius-md p-xs text-foreground hover:bg-surface-container-lowest/50 hover:text-danger transition-colors"
              >
                <LogOut className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="left-full ml-2 top-1/2 -translate-y-1/2">
              Sign out
            </TooltipContent>
          </Tooltip>
        ) : (
          <div className="flex items-center justify-between gap-sm">
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className="flex items-center gap-xs text-foreground hover:text-brand-primary transition-colors"
            >
              <Keyboard className="size-3.5 shrink-0" />
              <span className="text-label">Quick Actions</span>
            </button>
            <Tooltip>
              <TooltipTrigger>
                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label="Sign out"
                  className="flex items-center justify-center rounded-radius-md p-xs text-foreground hover:bg-surface-container-lowest/50 hover:text-danger transition-colors"
                >
                  <LogOut className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="bottom-full mb-1 right-0">Sign out</TooltipContent>
            </Tooltip>
          </div>
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
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop dismissal handled by Escape key listener above */}
          <div
            ref={overlayRef}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 flex w-60 shadow-4">{sidebarContent}</aside>
        </div>
      )}

      {/* Create project dialog — triggered from sidebar button */}
      <CreateProjectDialog
        open={createProjectOpen}
        onOpenChange={setCreateProjectOpen}
        onSuccess={(projectId) => {
          setCreateProjectOpen(false);
          void router.navigate({
            to: '/projects/$projectId/board',
            params: { projectId },
            search: { task: undefined },
          });
        }}
      />
    </>
  );
}
