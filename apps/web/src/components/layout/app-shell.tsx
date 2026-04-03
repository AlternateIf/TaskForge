import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { useCommandPalette } from '@/components/shortcuts/use-command-palette';
import { Outlet } from '@tanstack/react-router';
import { useCallback, useState } from 'react';

export function AppShell() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { open, onOpenChange, recentPages, addRecentPage } = useCommandPalette();

  const openMobileSidebar = useCallback(() => setMobileSidebarOpen(true), []);
  const closeMobileSidebar = useCallback(() => setMobileSidebarOpen(false), []);

  return (
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
  );
}
