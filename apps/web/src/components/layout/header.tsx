import { useLogout } from '@/api/auth';
import { apiClient } from '@/api/client';
import {
  type NotificationItem,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from '@/api/notifications';
import { useProject, useProjects } from '@/api/projects';
import { searchGlobal } from '@/api/search';
import { CreateProjectDialog } from '@/components/forms/create-project-dialog';
import { CreateTaskDialog } from '@/components/forms/create-task-dialog';
import { CommandPalette } from '@/components/shortcuts/command-palette';
import type { RecentPage } from '@/components/shortcuts/command-palette';
import type { SearchResults } from '@/components/shortcuts/command-palette';
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
import { showErrorToast } from '@/lib/error-toast';
import { useAuthStore } from '@/stores/auth.store';
import { useRouter } from '@tanstack/react-router';
import { NOTIFICATION_READ_PERMISSION } from '@taskforge/shared';
import { PROJECT_READ_PERMISSION, TASK_CREATE_PERMISSION } from '@taskforge/shared';
import { Bell, Menu, Moon, Search, Settings, Sun } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

interface ApiEnvelope<T> {
  data: T;
}

function stripHtml(content: string): string {
  return content
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatNotificationDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

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
  const { user, activeOrganizationId } = useAuthStore();
  const logout = useLogout();
  const { data: notifications = [] } = useNotifications(8);
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const markNotificationRead = useMarkNotificationRead();
  const router = useRouter();
  const { resolvedTheme: theme, setTheme } = useTheme();
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [createTaskProjectId, setCreateTaskProjectId] = useState<string | null>(null);
  const open = commandPaletteOpen;
  const onOpenChange = onCommandPaletteOpenChange;
  const permissionSet = useMemo(() => new Set(user?.permissions ?? []), [user?.permissions]);
  const canReadProjects = permissionSet.has(PROJECT_READ_PERMISSION);
  const canCreateTasks = permissionSet.has(TASK_CREATE_PERMISSION);
  const canReadNotifications = permissionSet.has(NOTIFICATION_READ_PERMISSION);
  const currentProjectId = useMemo(() => {
    const match = router.state.location.pathname.match(/^\/projects\/([^/]+)/);
    return match?.[1];
  }, [router.state.location.pathname]);
  const { data: projects = [] } = useProjects({ enabled: canReadProjects });
  const resolvedCreateTaskProjectId =
    createTaskProjectId ?? currentProjectId ?? (canReadProjects ? projects[0]?.id : null) ?? null;
  const { data: createTaskProject } = useProject(
    canReadProjects ? (resolvedCreateTaskProjectId ?? '') : '',
  );
  const activeOrganizationName = useMemo(() => {
    if (!user) {
      return undefined;
    }

    const organizations =
      user.organizations && user.organizations.length > 0
        ? user.organizations
        : user.organizationId && user.organizationName
          ? [{ id: user.organizationId, name: user.organizationName }]
          : [];

    if (organizations.length === 0) {
      return undefined;
    }

    const activeOrg =
      organizations.find((organization) => organization.id === activeOrganizationId) ??
      organizations[0];

    return activeOrg?.name;
  }, [activeOrganizationId, user]);
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

  const handleSearch = useCallback(
    async (query: string): Promise<SearchResults> => {
      const results = await searchGlobal(
        query,
        currentProjectId,
        activeOrganizationId ?? undefined,
      );

      const taskResults = results.tasks.hits.map((item) => ({
        id: item.id,
        title: item.title,
        subtitle: item.projectName ?? item.statusName ?? undefined,
        path: `/projects/${item.projectId}/tasks/${item.id}`,
        type: 'task' as const,
      }));

      return {
        tasks: taskResults.slice(0, 100),
        projects: results.projects.hits.map((item) => ({
          id: item.id,
          title: item.name,
          subtitle: item.description ?? undefined,
          path: `/projects/${item.id}`,
          type: 'project' as const,
        })),
        people: [],
      };
    },
    [activeOrganizationId, currentProjectId],
  );

  const handlePaletteAction = useCallback(
    (actionId: string) => {
      if (actionId === 'create-project') {
        setCreateProjectOpen(true);
        return;
      }

      if (actionId === 'create-task') {
        if (!canCreateTasks) {
          return;
        }

        const projectId = canReadProjects
          ? (currentProjectId ?? projects[0]?.id)
          : (currentProjectId ?? null);
        if (!projectId) {
          void router.navigate({ to: '/projects' });
          return;
        }
        setCreateTaskProjectId(projectId);
        return;
      }

      if (actionId === 'go-dashboard') {
        void handleNavigate('/dashboard');
        return;
      }

      if (actionId === 'go-settings') {
        void handleNavigate('/settings');
      }
    },
    [canCreateTasks, canReadProjects, currentProjectId, handleNavigate, projects, router],
  );

  const handleNotificationClick = useCallback(
    async (notification: NotificationItem) => {
      if (!notification.readAt) {
        markNotificationRead.mutate(notification.id);
      }

      if (notification.entityType === 'task' && notification.entityId) {
        try {
          const task = await apiClient
            .get<ApiEnvelope<{ projectId: string }>>(`/tasks/${notification.entityId}`)
            .then((res) => res.data);

          await router.navigate({
            to: '/projects/$projectId/tasks/$taskId',
            params: {
              projectId: task.projectId,
              taskId: notification.entityId,
            },
          });
          return;
        } catch (error) {
          showErrorToast(error, 'Unable to open notification. Redirecting to dashboard.', {
            id: 'notification-open-error',
          });
          await router.navigate({ to: '/dashboard' });
          return;
        }
      }

      if (notification.entityType === 'project' && notification.entityId) {
        await router.navigate({
          to: '/projects/$projectId',
          params: { projectId: notification.entityId },
        });
        return;
      }

      await router.navigate({ to: '/dashboard' });
    },
    [markNotificationRead, router],
  );

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
          className="flex h-9 flex-1 items-center gap-sm rounded-radius-md border border-border/50 bg-surface-container-low px-sm text-muted transition-colors hover:border-border hover:bg-surface-container-lowest lg:grow-0 lg:shrink-0 lg:basis-[25%]"
        >
          <Search className="size-4 shrink-0" />
          <span className="flex-1 text-left text-small">Search&hellip;</span>
          <kbd className="hidden items-center gap-xs rounded px-xs py-px text-label font-mono bg-surface-container-high text-muted lg:flex">
            <span>⌘</span>
            <span>K</span>
          </kbd>
        </button>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-xs">
          {/* Notifications */}
          {canReadNotifications ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Notifications"
                className="relative flex items-center justify-center rounded-radius-md p-sm text-muted transition-colors hover:bg-surface-container-low"
              >
                <Bell className="size-6" />
                {unreadCount > 0 ? (
                  <span
                    className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-danger px-0.75 text-[9px] font-bold text-white"
                    aria-label={`${unreadCount} unread notifications`}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                ) : null}
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length === 0 ? (
                  <p className="px-sm py-md text-small text-muted">No notifications</p>
                ) : (
                  notifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      onClick={() => void handleNotificationClick(notification)}
                      className="flex-col items-start gap-1 py-sm"
                    >
                      <p
                        className={
                          notification.readAt
                            ? 'line-clamp-1 text-small font-medium text-foreground'
                            : 'line-clamp-1 text-small font-semibold text-foreground'
                        }
                      >
                        {notification.title}
                      </p>
                      {notification.body ? (
                        <p className="line-clamp-2 text-label text-secondary">
                          {stripHtml(notification.body)}
                        </p>
                      ) : null}
                      <p className="text-label text-muted">
                        {formatNotificationDate(notification.createdAt)}
                      </p>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

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
        onSearch={handleSearch}
        scopeLabel={activeOrganizationName}
        onAction={handlePaletteAction}
        onNavigate={(path, title) => {
          handleNavigate(path);
          addRecentPage({ path, title: title?.trim() || path });
        }}
        recentPages={recentPages}
      />

      <CreateProjectDialog
        open={createProjectOpen}
        onOpenChange={setCreateProjectOpen}
        onSuccess={(projectId) => {
          setCreateProjectOpen(false);
          const path = `/projects/${projectId}/board`;
          addRecentPage({ path, title: 'New project' });
          void router.navigate({
            to: '/projects/$projectId/board',
            params: { projectId },
            search: { task: undefined },
          });
        }}
      />

      {canCreateTasks && resolvedCreateTaskProjectId ? (
        <CreateTaskDialog
          open={Boolean(createTaskProjectId)}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              setCreateTaskProjectId(null);
            }
          }}
          projectId={resolvedCreateTaskProjectId}
          statuses={createTaskProject?.statuses ?? []}
          members={createTaskProject?.members ?? []}
          labels={createTaskProject?.labels ?? []}
          onSuccess={(taskId) => {
            const targetProjectId = resolvedCreateTaskProjectId;
            setCreateTaskProjectId(null);
            const path = `/projects/${targetProjectId}/tasks/${taskId}`;
            addRecentPage({ path, title: 'New task' });
            void router.navigate({
              to: '/projects/$projectId/tasks/$taskId',
              params: { projectId: targetProjectId, taskId },
            });
          }}
        />
      ) : null}
    </>
  );
}
