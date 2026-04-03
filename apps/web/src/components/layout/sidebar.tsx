import { useLogout } from '@/api/auth';
import { useProject, useProjects } from '@/api/projects';
import { CreateProjectDialog } from '@/components/forms/create-project-dialog';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useRouter, useRouterState } from '@tanstack/react-router';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
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
const RECENT_PROJECTS_KEY_PREFIX = 'tf:recent-projects';

// ─── Recent projects helpers ──────────────────────────────────────────────────

interface RecentProject {
  id: string;
  name: string;
  color?: string | null;
}

function recentProjectsKey(orgId: string): string {
  return `${RECENT_PROJECTS_KEY_PREFIX}:${orgId}`;
}

function parseRecentProjects(raw: string | null): RecentProject[] {
  try {
    return JSON.parse(raw ?? '[]');
  } catch {
    return [];
  }
}

function getRecentProjects(orgId: string | null): RecentProject[] {
  if (!orgId) return [];
  return parseRecentProjects(localStorage.getItem(recentProjectsKey(orgId)));
}

function recordRecentProject(orgId: string | null, project: RecentProject) {
  if (!orgId) return;

  try {
    const existing = getRecentProjects(orgId);
    const existingIndex = existing.findIndex((p) => p.id === project.id);

    // Keep order stable for already tracked projects; only refresh metadata if needed.
    if (existingIndex >= 0) {
      const current = existing[existingIndex];
      if (current.name !== project.name || current.color !== project.color) {
        const updated = [...existing];
        updated[existingIndex] = { ...current, ...project };
        localStorage.setItem(recentProjectsKey(orgId), JSON.stringify(updated));
      }
      return;
    }

    const updated = [...existing, project].slice(-3);
    localStorage.setItem(recentProjectsKey(orgId), JSON.stringify(updated));
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
        'flex w-full items-center gap-sm rounded-radius-lg px-2.5 py-sm text-body transition-colors',
        active
          ? 'bg-sidebar-row-active text-sidebar-row-accent font-semibold'
          : 'text-sidebar-row-text hover:bg-sidebar-row-active/70',
        collapsed && 'justify-center p-sm',
      )}
    >
      <Icon
        className={cn(
          'size-4 shrink-0',
          active ? 'text-sidebar-row-accent' : 'text-sidebar-row-muted',
        )}
      />
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
  const { user, activeOrganizationId, setActiveOrganizationId } = useAuthStore();

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>(() =>
    getRecentProjects(activeOrganizationId),
  );
  const logout = useLogout();
  const router = useRouter();
  const { data: currentOrgProjects = [], status: currentOrgProjectsStatus } = useProjects();
  // useRouterState is reactive — re-renders on navigation (fixes highlight bug)
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  // Track recently visited projects
  const currentProjectId = currentPath.match(/^\/projects\/([^/]+)/)?.[1];
  const isCurrentProjectInActiveOrg = currentOrgProjects.some(
    (project) => project.id === currentProjectId,
  );
  const { data: currentProject } = useProject(currentProjectId ?? '');

  useEffect(() => {
    setRecentProjects(getRecentProjects(activeOrganizationId));
  }, [activeOrganizationId]);

  useEffect(() => {
    if (!currentProject || !isCurrentProjectInActiveOrg) return;
    recordRecentProject(activeOrganizationId, {
      id: currentProject.id,
      name: currentProject.name,
      color: currentProject.color,
    });
    setRecentProjects(getRecentProjects(activeOrganizationId));
  }, [activeOrganizationId, currentProject, isCurrentProjectInActiveOrg]);

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

  useEffect(() => {
    if (!currentProjectId || currentOrgProjectsStatus !== 'success') return;
    if (isCurrentProjectInActiveOrg) return;

    void router.navigate({ to: '/projects', replace: true });
  }, [currentProjectId, currentOrgProjectsStatus, isCurrentProjectInActiveOrg, router]);

  const handleOrganizationChange = useCallback(
    (organizationId: string) => {
      setActiveOrganizationId(organizationId);
      onMobileClose?.();
    },
    [onMobileClose, setActiveOrganizationId],
  );

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

  const organizationCardShadow = {
    boxShadow: '0 1px 0 var(--sidebar-shadow-1), 0 4px 10px -2px var(--sidebar-shadow-2)',
  };

  const sidebarContent = (
    <div
      className={cn(
        'flex h-full flex-col border-r border-sidebar-shell-border bg-sidebar-shell transition-all duration-normal',
        collapsed ? 'w-sidebar-collapsed gap-sm px-[8px] py-2.5' : 'w-60 gap-1.5 p-md',
      )}
    >
      {!collapsed ? (
        <div className="flex shrink-0 flex-col gap-1.5 pt-0.5">
          <div className="flex items-center justify-between">
            <span className="px-0.5 text-label font-bold tracking-[0.02em] text-sidebar-row-muted">
              Organization
            </span>
            <div className="flex items-center gap-xs">
              <button
                type="button"
                onClick={onMobileClose}
                className="flex items-center justify-center rounded-radius-md p-xs text-sidebar-row-muted hover:bg-sidebar-row/80 lg:hidden"
                aria-label="Close sidebar"
              >
                <X className="size-4" />
              </button>
              <button
                type="button"
                onClick={toggleCollapsed}
                className="hidden items-center justify-center rounded-radius-md p-xs text-sidebar-row-text hover:bg-sidebar-row/80 lg:flex"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="size-4" />
              </button>
            </div>
          </div>
          {organizations.length <= 1 ? (
            <div
              className="flex items-center justify-between gap-sm rounded-radius-xl border border-sidebar-org-border bg-sidebar-org px-2.5 py-1.75"
              style={organizationCardShadow}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="truncate text-small font-semibold text-sidebar-row-text">
                  {activeOrg?.name ?? 'TaskForge'}
                </span>
              </div>
              <ChevronsUpDown className="size-4 shrink-0 text-sidebar-org-chevron" />
            </div>
          ) : (
            <div className="relative">
              <select
                value={activeOrg?.id ?? ''}
                onChange={(event) => handleOrganizationChange(event.target.value)}
                className="h-10 w-full appearance-none rounded-radius-xl border border-sidebar-org-border bg-sidebar-org pl-3 pr-9 text-small font-semibold text-sidebar-row-text outline-none scheme-light focus-visible:border-sidebar-row-accent dark:scheme-dark"
                style={organizationCardShadow}
                aria-label="Switch organization"
              >
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>
              <ChevronsUpDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-sidebar-org-chevron" />
            </div>
          )}
        </div>
      ) : (
        <div className="flex shrink-0 flex-col gap-sm">
          <div className="flex h-4 items-center justify-center">
            <button
              type="button"
              onClick={toggleCollapsed}
              className="hidden items-center justify-center rounded-radius-md p-xs text-sidebar-row-text hover:bg-sidebar-row/80 lg:flex"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="size-4" />
            </button>
            <button
              type="button"
              onClick={onMobileClose}
              className="flex items-center justify-center rounded-radius-md p-xs text-sidebar-row-muted hover:bg-sidebar-row/80 lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="size-4" />
            </button>
          </div>
          {organizations.length <= 1 ? (
            <div
              className="h-10 w-full rounded-radius-xl border border-sidebar-org-border bg-sidebar-org px-[8px] py-1.75"
              style={organizationCardShadow}
            />
          ) : (
            <div
              className="relative flex h-10 w-full items-center justify-center rounded-radius-xl border border-sidebar-org-border bg-sidebar-org"
              style={organizationCardShadow}
            >
              <select
                value={activeOrg?.id ?? ''}
                onChange={(event) => handleOrganizationChange(event.target.value)}
                className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-radius-xl border border-transparent bg-transparent text-transparent opacity-0 outline-none scheme-light focus:border-sidebar-org-border focus:bg-sidebar-org focus:px-[8px] focus:pr-[24px] focus:text-sidebar-row-text focus:opacity-100 focus-visible:border-sidebar-row-accent dark:scheme-dark"
                aria-label="Switch organization"
              >
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>
              <ChevronsUpDown className="pointer-events-none size-4 text-sidebar-org-chevron peer-focus:hidden" />
            </div>
          )}
        </div>
      )}

      {/* New Project button */}
      <div className={cn(collapsed ? 'pt-0' : 'pt-md')}>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger>
              <button
                type="button"
                onClick={() => setCreateProjectOpen(true)}
                aria-label="New project"
                className="flex h-8 w-full items-center justify-center rounded-radius-md bg-brand-primary text-white transition-colors hover:bg-brand-primary-hover"
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
            className="h-8 w-full rounded-radius-lg bg-brand-primary text-small font-semibold text-white shadow-none hover:scale-100 hover:bg-brand-primary-hover hover:shadow-none active:scale-100"
            onClick={() => setCreateProjectOpen(true)}
          >
            <Plus className="size-4" />
            New Project
          </Button>
        )}
      </div>

      {/* Nav */}
      <nav
        className={cn('flex-1 overflow-y-auto', collapsed ? 'py-0' : 'py-md')}
        aria-label="Main navigation"
      >
        <ul className="flex flex-col gap-1.5">
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
                  className={cn(
                    'mt-1.5 flex flex-col gap-1.5',
                    collapsed ? 'items-center' : 'pl-sm',
                  )}
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
                          'flex w-full items-center gap-sm rounded-radius-lg px-2.5 py-sm text-body transition-colors',
                          isActive
                            ? 'text-sidebar-row-accent'
                            : 'text-sidebar-row-muted hover:text-sidebar-row-text',
                          collapsed && 'justify-center p-sm',
                        )}
                      >
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: p.color ?? 'var(--sidebar-row-muted)' }}
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

      {/* Bottom: sign-out */}
      <div className={cn('shrink-0', collapsed ? 'pt-0' : 'pt-md')}>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger>
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Sign out"
                className="flex h-8 w-full items-center justify-center rounded-radius-md bg-sidebar-row p-sm text-sidebar-row-text transition-colors hover:bg-sidebar-row-active"
              >
                <LogOut className="size-3.5 text-sidebar-row-muted" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="left-full ml-2 top-1/2 -translate-y-1/2">
              Sign out
            </TooltipContent>
          </Tooltip>
        ) : (
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Sign out"
            className="flex w-full items-center justify-between rounded-radius-lg px-2.5 py-sm text-sidebar-row-text transition-colors hover:bg-sidebar-row-active"
          >
            <span className="flex items-center gap-sm">
              <LogOut className="size-4 text-sidebar-row-muted" />
              <span className="text-body">Logout</span>
            </span>
          </button>
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
          <aside
            className={cn(
              'absolute inset-y-0 left-0 flex shadow-4',
              collapsed ? 'w-sidebar-collapsed' : 'w-60',
            )}
          >
            {sidebarContent}
          </aside>
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
