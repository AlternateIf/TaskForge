import { useCallback, useEffect, useState } from 'react';
import type { RecentPage } from './command-palette';

const STORAGE_KEY = 'tf:recent-pages';
const MAX_RECENT = 5;

function loadRecentPages(): RecentPage[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as RecentPage[]) : [];
  } catch {
    return [];
  }
}

function saveRecentPages(pages: RecentPage[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pages));
  } catch {
    // Storage unavailable — silently ignore
  }
}

export interface UseCommandPaletteReturn {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recentPages: RecentPage[];
  addRecentPage: (page: RecentPage) => void;
}

export function useCommandPalette(): UseCommandPaletteReturn {
  const [open, setOpen] = useState(false);
  const [recentPages, setRecentPages] = useState<RecentPage[]>(loadRecentPages);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const addRecentPage = useCallback((page: RecentPage) => {
    setRecentPages((prev) => {
      const filtered = prev.filter((p) => p.path !== page.path);
      const updated = [page, ...filtered].slice(0, MAX_RECENT);
      saveRecentPages(updated);
      return updated;
    });
  }, []);

  return { open, onOpenChange: setOpen, recentPages, addRecentPage };
}
