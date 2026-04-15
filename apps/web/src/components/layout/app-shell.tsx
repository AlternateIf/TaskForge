import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { ShortcutProvider, useRegisterShortcut } from '@/components/shortcuts/shortcut-provider';
import { useCommandPalette } from '@/components/shortcuts/use-command-palette';
import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { useCallback, useState } from 'react';

function ShortcutBindings({
  commandPaletteOpen,
  onCommandPaletteOpenChange,
  onCreateTaskShortcut,
  onCreateProjectShortcut,
  onCloseMobileSidebar,
  mobileSidebarOpen,
}: {
  commandPaletteOpen: boolean;
  onCommandPaletteOpenChange: (open: boolean) => void;
  onCreateTaskShortcut: () => void;
  onCreateProjectShortcut: () => void;
  onCloseMobileSidebar: () => void;
  mobileSidebarOpen: boolean;
}) {
  const navigate = useNavigate();

  const focusCommandPaletteSearch = useCallback(() => {
    const tryFocusSearchInput = () => {
      const input = document.getElementById('command-palette-search-input');
      if (input instanceof HTMLElement) {
        input.focus();
        return true;
      }
      return false;
    };

    if (tryFocusSearchInput()) {
      return;
    }

    onCommandPaletteOpenChange(true);

    let attempts = 0;
    const maxAttempts = 8;
    const retryDelayMs = 25;

    const focusWithRetry = () => {
      if (tryFocusSearchInput()) {
        return;
      }

      attempts += 1;
      if (attempts >= maxAttempts) {
        const headerSearchTrigger = document.querySelector<HTMLElement>(
          '[data-shortcut-search-trigger="true"]',
        );
        headerSearchTrigger?.focus();
        return;
      }

      window.setTimeout(focusWithRetry, retryDelayMs);
    };

    window.setTimeout(focusWithRetry, 0);
  }, [onCommandPaletteOpenChange]);

  useRegisterShortcut({
    id: 'app-shell.focus-command-palette-search',
    scope: 'global',
    key: '/',
    preventDefault: true,
    handler: focusCommandPaletteSearch,
  });

  useRegisterShortcut({
    id: 'app-shell.go-dashboard',
    scope: 'global',
    chord: ['g', 'd'],
    preventDefault: true,
    handler: () => {
      void navigate({ to: '/dashboard' });
    },
  });

  useRegisterShortcut({
    id: 'app-shell.go-projects',
    scope: 'global',
    chord: ['g', 'p'],
    preventDefault: true,
    handler: () => {
      void navigate({ to: '/projects' });
    },
  });

  useRegisterShortcut({
    id: 'app-shell.new-project',
    scope: 'global',
    key: 'p',
    preventDefault: true,
    handler: onCreateProjectShortcut,
  });

  useRegisterShortcut({
    id: 'app-shell.board-new-task',
    scope: 'board',
    key: 'n',
    preventDefault: true,
    handler: onCreateTaskShortcut,
  });

  useRegisterShortcut({
    id: 'app-shell.list-new-task',
    scope: 'list',
    key: 'n',
    preventDefault: true,
    handler: onCreateTaskShortcut,
  });

  useRegisterShortcut({
    id: 'app-shell.escape',
    scope: 'global',
    key: 'escape',
    allowInInput: true,
    preventDefault: false,
    handler: () => {
      if (commandPaletteOpen) {
        onCommandPaletteOpenChange(false);
        return;
      }

      if (mobileSidebarOpen) {
        onCloseMobileSidebar();
      }
    },
  });

  return null;
}

export function AppShell() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { open, onOpenChange, recentPages, addRecentPage } = useCommandPalette();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  const openMobileSidebar = useCallback(() => setMobileSidebarOpen(true), []);
  const closeMobileSidebar = useCallback(() => setMobileSidebarOpen(false), []);
  const handleCreateTaskShortcut = useCallback(() => {
    document.dispatchEvent(new CustomEvent('taskforge:shortcut:create-task'));
  }, []);
  const handleCreateProjectShortcut = useCallback(() => {
    document.dispatchEvent(new CustomEvent('taskforge:shortcut:create-project'));
  }, []);

  return (
    <ShortcutProvider pathname={pathname}>
      <ShortcutBindings
        commandPaletteOpen={open}
        onCommandPaletteOpenChange={onOpenChange}
        onCreateTaskShortcut={handleCreateTaskShortcut}
        onCreateProjectShortcut={handleCreateProjectShortcut}
        onCloseMobileSidebar={closeMobileSidebar}
        mobileSidebarOpen={mobileSidebarOpen}
      />
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        <Sidebar mobileOpen={mobileSidebarOpen} onMobileClose={closeMobileSidebar} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header
            onMenuClick={openMobileSidebar}
            commandPaletteOpen={open}
            onCommandPaletteOpenChange={onOpenChange}
            recentPages={recentPages}
            addRecentPage={addRecentPage}
          />
          <main id="main-content" className="flex-1 overflow-y-auto p-lg">
            <Outlet />
          </main>
        </div>
      </div>
    </ShortcutProvider>
  );
}
