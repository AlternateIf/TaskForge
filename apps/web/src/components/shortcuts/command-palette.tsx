import { cn } from '@/lib/utils';
import {
  CheckSquare,
  Clock,
  FolderOpen,
  FolderPlus,
  LayoutDashboard,
  Plus,
  Search,
  Settings,
  User,
} from 'lucide-react';
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

// ─── Public types ────────────────────────────────────────────────────────────

export interface RecentPage {
  path: string;
  title: string;
}

export interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  path: string;
  type: 'task' | 'project' | 'person';
}

export interface SearchResults {
  tasks: SearchResult[];
  projects: SearchResult[];
  people: SearchResult[];
}

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate?: (path: string) => void;
  onSearch?: (query: string) => Promise<SearchResults>;
  recentPages?: RecentPage[];
}

// ─── Internal types ───────────────────────────────────────────────────────────

interface ActionDef {
  id: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  path: string;
  hint?: string;
}

type ItemGroup = 'recent' | 'actions' | 'tasks' | 'projects' | 'people';

interface FlatItem {
  flatIndex: number;
  group: ItemGroup;
  key: string;
  label: string;
  subtitle?: string;
  Icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  path: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_ACTIONS: ActionDef[] = [
  { id: 'create-task', label: 'Create task', Icon: Plus, path: '/tasks/new', hint: 'N' },
  { id: 'create-project', label: 'Create project', Icon: FolderPlus, path: '/projects/new' },
  { id: 'go-dashboard', label: 'Go to dashboard', Icon: LayoutDashboard, path: '/' },
  { id: 'go-settings', label: 'Go to settings', Icon: Settings, path: '/settings' },
];

const EMPTY_RESULTS: SearchResults = { tasks: [], projects: [], people: [] };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildFlatItems(
  query: string,
  recentPages: RecentPage[],
  results: SearchResults,
): FlatItem[] {
  const items: FlatItem[] = [];
  let idx = 0;

  if (!query) {
    for (const page of recentPages.slice(0, 5)) {
      items.push({
        flatIndex: idx++,
        group: 'recent',
        key: `recent-${page.path}`,
        label: page.title,
        Icon: Clock,
        path: page.path,
      });
    }
  }

  for (const action of DEFAULT_ACTIONS) {
    items.push({
      flatIndex: idx++,
      group: 'actions',
      key: `action-${action.id}`,
      label: action.label,
      Icon: action.Icon,
      hint: action.hint,
      path: action.path,
    });
  }

  if (query) {
    for (const task of results.tasks) {
      items.push({
        flatIndex: idx++,
        group: 'tasks',
        key: `task-${task.id}`,
        label: task.title,
        subtitle: task.subtitle,
        Icon: CheckSquare,
        path: task.path,
      });
    }
    for (const project of results.projects) {
      items.push({
        flatIndex: idx++,
        group: 'projects',
        key: `project-${project.id}`,
        label: project.title,
        subtitle: project.subtitle,
        Icon: FolderOpen,
        path: project.path,
      });
    }
    for (const person of results.people) {
      items.push({
        flatIndex: idx++,
        group: 'people',
        key: `person-${person.id}`,
        label: person.title,
        subtitle: person.subtitle,
        Icon: User,
        path: person.path,
      });
    }
  }

  return items;
}

const GROUP_LABELS: Record<ItemGroup, string> = {
  recent: 'Recent',
  actions: 'Actions',
  tasks: 'Tasks',
  projects: 'Projects',
  people: 'People',
};

// ─── CommandItem ──────────────────────────────────────────────────────────────

interface CommandItemProps {
  item: FlatItem;
  active: boolean;
  onSelect: (item: FlatItem) => void;
}

function CommandItem({ item, active, onSelect }: CommandItemProps) {
  const { Icon } = item;
  return (
    <button
      id={`cmd-item-${item.flatIndex}`}
      type="button"
      role="option"
      aria-selected={active}
      data-active={active || undefined}
      onClick={() => onSelect(item)}
      className={cn(
        'flex w-full items-center gap-sm rounded-radius-md px-sm py-xs text-left transition-colors',
        active
          ? 'bg-brand-primary/10 text-foreground'
          : 'text-foreground hover:bg-surface-container-low',
      )}
    >
      <Icon className="size-4 shrink-0 text-muted" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-body">{item.label}</div>
        {item.subtitle && (
          <div className="truncate text-label text-secondary">{item.subtitle}</div>
        )}
      </div>
      {item.hint && (
        <span className="shrink-0 font-mono text-label text-muted">{item.hint}</span>
      )}
    </button>
  );
}

// ─── CommandPalette ───────────────────────────────────────────────────────────

export function CommandPalette({
  open,
  onOpenChange,
  onNavigate,
  onSearch,
  recentPages = [],
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Focus management
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      // Defer to allow the element to render before focusing
      const id = setTimeout(() => inputRef.current?.focus(), 0);
      document.body.style.overflow = 'hidden';
      return () => clearTimeout(id);
    }

    previousFocusRef.current?.focus();
    setQuery('');
    setDebouncedQuery('');
    setSearchResults(EMPTY_RESULTS);
    setActiveIndex(0);
    document.body.style.overflow = '';
    return () => {};
  }, [open]);

  // Cleanup overflow on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Debounce query → debouncedQuery (200ms)
  useEffect(() => {
    if (!query) {
      setDebouncedQuery('');
      return;
    }
    const timer = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch search results when debounced query changes
  useEffect(() => {
    if (!debouncedQuery) {
      setSearchResults(EMPTY_RESULTS);
      return;
    }
    if (!onSearch) return;

    onSearch(debouncedQuery)
      .then(setSearchResults)
      .catch(() => setSearchResults(EMPTY_RESULTS));
  }, [debouncedQuery, onSearch]);

  // Build flat item list
  const flatItems = useMemo(
    () => buildFlatItems(debouncedQuery, recentPages, searchResults),
    [debouncedQuery, recentPages, searchResults],
  );

  // Reset active index when the item list changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally reset on list identity change
  useEffect(() => {
    setActiveIndex(0);
  }, [flatItems.length, debouncedQuery]);

  // Scroll active item into view
  useEffect(() => {
    const active = listRef.current?.querySelector('[data-active]');
    active?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const selectItem = useCallback(
    (item: FlatItem) => {
      onNavigate?.(item.path);
      onOpenChange(false);
    },
    [onNavigate, onOpenChange],
  );

  const handleKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter': {
          e.preventDefault();
          const item = flatItems[activeIndex];
          if (item) selectItem(item);
          break;
        }
        case 'Escape':
          e.preventDefault();
          onOpenChange(false);
          break;
      }
    },
    [flatItems, activeIndex, selectItem, onOpenChange],
  );

  if (!open) return null;

  // Build grouped view from flat items
  const groups: ItemGroup[] = ['recent', 'actions', 'tasks', 'projects', 'people'];
  const itemsByGroup = new Map<ItemGroup, FlatItem[]>();
  for (const item of flatItems) {
    const list = itemsByGroup.get(item.group) ?? [];
    list.push(item);
    itemsByGroup.set(item.group, list);
  }

  const hasResults = (itemsByGroup.get('tasks')?.length ?? 0) > 0
    || (itemsByGroup.get('projects')?.length ?? 0) > 0
    || (itemsByGroup.get('people')?.length ?? 0) > 0;

  const activeItemId = flatItems[activeIndex] ? `cmd-item-${activeIndex}` : undefined;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50"
        aria-hidden="true"
        onClick={() => onOpenChange(false)}
      />

      {/* Palette */}
      <div
        role="dialog"
        aria-label="Command palette"
        aria-modal="true"
        className="fixed left-1/2 top-[20%] z-50 w-full max-w-[560px] -translate-x-1/2 overflow-hidden rounded-radius-xl border border-outline-variant/15 bg-surface-container-lowest shadow-4 animate-in fade-in-0 duration-[200ms]"
      >
        {/* Search input */}
        <div className="flex items-center gap-sm border-b border-outline-variant/15 px-md" role="search">
          <Search className="size-4 shrink-0 text-muted" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-label="Search commands"
            aria-expanded={true}
            aria-controls="command-palette-results"
            aria-autocomplete="list"
            aria-activedescendant={activeItemId}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tasks, projects, people..."
            className="flex-1 bg-transparent py-md text-body text-foreground placeholder:text-muted outline-none"
          />
        </div>

        {/* Results */}
        <div
          ref={listRef}
          id="command-palette-results"
          role="listbox"
          aria-label="Command results"
          className="max-h-[340px] overflow-y-auto p-xs"
        >
          {groups.map((group) => {
            const items = itemsByGroup.get(group);
            if (!items || items.length === 0) return null;
            return (
              <div key={group} role="group" aria-labelledby={`cmd-group-${group}`}>
                <div
                  id={`cmd-group-${group}`}
                  className="px-sm py-xs text-label font-medium text-muted"
                  aria-hidden="true"
                >
                  {GROUP_LABELS[group]}
                </div>
                {items.map((item) => (
                  <CommandItem
                    key={item.key}
                    item={item}
                    active={item.flatIndex === activeIndex}
                    onSelect={selectItem}
                  />
                ))}
              </div>
            );
          })}

          {/* Empty state when query returns no results */}
          {debouncedQuery && !hasResults && (
            <p className="px-sm py-lg text-center text-body text-muted">
              No results for &ldquo;{debouncedQuery}&rdquo;
            </p>
          )}
        </div>

        {/* Screen reader result count announcements */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {flatItems.length > 0
            ? `${flatItems.length} result${flatItems.length === 1 ? '' : 's'} available`
            : debouncedQuery
              ? 'No results'
              : ''}
        </div>
      </div>
    </>
  );
}
