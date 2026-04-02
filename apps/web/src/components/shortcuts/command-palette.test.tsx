import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommandPalette } from './command-palette';
import type { SearchResults } from './command-palette';

// jsdom doesn't implement scrollIntoView
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RECENT_PAGES = [
  { path: '/projects/alpha', title: 'Project Alpha' },
  { path: '/tasks/42', title: 'Fix login bug' },
];

const MOCK_SEARCH_RESULTS: SearchResults = {
  tasks: [
    { id: 't1', title: 'Update API docs', subtitle: 'Backend', path: '/tasks/t1', type: 'task' },
    {
      id: 't2',
      title: 'Fix navbar overflow',
      subtitle: 'Frontend',
      path: '/tasks/t2',
      type: 'task',
    },
  ],
  projects: [
    { id: 'p1', title: 'TaskForge Web', subtitle: 'Active', path: '/projects/p1', type: 'project' },
  ],
  people: [
    {
      id: 'u1',
      title: 'Marcus Dev',
      subtitle: 'marcus@example.com',
      path: '/people/u1',
      type: 'person',
    },
  ],
};

function renderPalette(props: Partial<React.ComponentProps<typeof CommandPalette>> = {}) {
  const onOpenChange = vi.fn();
  const onNavigate = vi.fn();
  const onAction = vi.fn();
  render(
    <CommandPalette
      open={true}
      onOpenChange={onOpenChange}
      onNavigate={onNavigate}
      onAction={onAction}
      {...props}
    />,
  );
  return { onOpenChange, onNavigate, onAction };
}

// ─── Rendering ────────────────────────────────────────────────────────────────

describe('CommandPalette rendering', () => {
  it('renders nothing when closed', () => {
    render(<CommandPalette open={false} onOpenChange={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the dialog and search input when open', () => {
    renderPalette();
    expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Search commands' })).toBeInTheDocument();
  });

  it('renders the Actions group by default', () => {
    renderPalette();
    expect(screen.getByRole('listbox', { name: 'Command results' })).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
    expect(screen.getByText('Create task')).toBeInTheDocument();
    expect(screen.getByText('Create project')).toBeInTheDocument();
    expect(screen.getByText('Go to dashboard')).toBeInTheDocument();
    expect(screen.getByText('Go to settings')).toBeInTheDocument();
  });

  it('renders the Recent group when recentPages are provided', () => {
    renderPalette({ recentPages: RECENT_PAGES });
    expect(screen.getByText('Recent')).toBeInTheDocument();
    expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    expect(screen.getByText('Fix login bug')).toBeInTheDocument();
  });

  it('does not render the Recent group when recentPages is empty', () => {
    renderPalette({ recentPages: [] });
    expect(screen.queryByText('Recent')).not.toBeInTheDocument();
  });

  it('does not show an unbound keyboard hint for create task', () => {
    renderPalette();
    expect(screen.queryByText('N')).not.toBeInTheDocument();
  });
});

// ─── Keyboard Navigation ──────────────────────────────────────────────────────

describe('CommandPalette keyboard navigation', () => {
  it('first item is active by default (aria-selected)', () => {
    renderPalette({ recentPages: RECENT_PAGES });
    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(options[1]).toHaveAttribute('aria-selected', 'false');
  });

  it('ArrowDown moves active item to next', async () => {
    const user = userEvent.setup();
    renderPalette({ recentPages: RECENT_PAGES });
    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.keyboard('{ArrowDown}');
    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-selected', 'false');
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('ArrowUp moves active item to previous', async () => {
    const user = userEvent.setup();
    renderPalette({ recentPages: RECENT_PAGES });
    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{ArrowUp}');
    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('ArrowUp does not go below index 0 (clamped)', async () => {
    const user = userEvent.setup();
    renderPalette({ recentPages: RECENT_PAGES });
    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.keyboard('{ArrowUp}');
    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('ArrowDown does not go past the last item (clamped)', async () => {
    const user = userEvent.setup();
    // Default has 4 actions (no recent)
    renderPalette();
    const input = screen.getByRole('combobox');
    await user.click(input);
    // Press down many times
    for (let i = 0; i < 10; i++) {
      await user.keyboard('{ArrowDown}');
    }
    const options = screen.getAllByRole('option');
    // Last option should be selected
    expect(options[options.length - 1]).toHaveAttribute('aria-selected', 'true');
  });

  it('ArrowDown navigates across group boundaries', async () => {
    const user = userEvent.setup();
    renderPalette({ recentPages: RECENT_PAGES });
    const input = screen.getByRole('combobox');
    await user.click(input);
    // Move past all recent pages (2) into the first action
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{ArrowDown}');
    const options = screen.getAllByRole('option');
    // Index 2 = first action ("Create task")
    expect(options[2]).toHaveAttribute('aria-selected', 'true');
  });

  it('aria-activedescendant on input reflects the active item id', async () => {
    const user = userEvent.setup();
    renderPalette({ recentPages: RECENT_PAGES });
    const input = screen.getByRole('combobox');
    expect(input).toHaveAttribute('aria-activedescendant', 'cmd-item-0');
    await user.click(input);
    await user.keyboard('{ArrowDown}');
    expect(input).toHaveAttribute('aria-activedescendant', 'cmd-item-1');
  });
});

// ─── Escape / Close ───────────────────────────────────────────────────────────

describe('CommandPalette close behavior', () => {
  it('calls onOpenChange(false) when Escape is pressed', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderPalette();
    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('calls onOpenChange(false) when backdrop is clicked', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderPalette();
    // The backdrop is a sibling div behind the dialog
    const backdrop = document.querySelector('.fixed.inset-0.z-50');
    if (backdrop) await user.click(backdrop as HTMLElement);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

// ─── Action Execution ─────────────────────────────────────────────────────────

describe('CommandPalette action execution', () => {
  it('clicking an action calls onNavigate with the action path and closes the palette', async () => {
    const user = userEvent.setup();
    const { onAction, onOpenChange } = renderPalette();
    await user.click(screen.getByText('Create task'));
    expect(onAction).toHaveBeenCalledWith('create-task', 'Create task');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('pressing Enter on the active action executes it', async () => {
    const user = userEvent.setup();
    // Default: first item is "Create task" (no recent pages)
    const { onAction, onOpenChange } = renderPalette();
    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.keyboard('{Enter}');
    expect(onAction).toHaveBeenCalledWith('create-task', 'Create task');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('pressing Enter on a recent page navigates to its path', async () => {
    const user = userEvent.setup();
    const { onNavigate } = renderPalette({ recentPages: RECENT_PAGES });
    const input = screen.getByRole('combobox');
    await user.click(input);
    // First item is the first recent page
    await user.keyboard('{Enter}');
    expect(onNavigate).toHaveBeenCalledWith('/projects/alpha', 'Project Alpha');
  });

  it('ArrowDown then Enter executes the second item', async () => {
    const user = userEvent.setup();
    const { onNavigate } = renderPalette({ recentPages: RECENT_PAGES });
    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');
    expect(onNavigate).toHaveBeenCalledWith('/tasks/42', 'Fix login bug');
  });

  it('clicking a recent page navigates to its path', async () => {
    const user = userEvent.setup();
    const { onNavigate } = renderPalette({ recentPages: RECENT_PAGES });
    await user.click(screen.getByText('Project Alpha'));
    expect(onNavigate).toHaveBeenCalledWith('/projects/alpha', 'Project Alpha');
  });
});

// ─── Search Debounce ──────────────────────────────────────────────────────────

describe('CommandPalette search debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function typeIntoInput(input: HTMLElement, value: string) {
    // Use fireEvent to avoid userEvent's internal timer usage with fake timers
    act(() => {
      fireEvent.change(input, { target: { value } });
    });
  }

  async function flushAsyncState() {
    await act(async () => {
      await Promise.resolve();
    });
  }

  it('does not call onSearch immediately on input change', () => {
    const onSearch = vi.fn().mockResolvedValue(MOCK_SEARCH_RESULTS);
    renderPalette({ onSearch });
    const input = screen.getByRole('combobox');
    typeIntoInput(input, 'fix');
    act(() => vi.advanceTimersByTime(50));
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('calls onSearch after 200ms debounce', async () => {
    const onSearch = vi.fn().mockResolvedValue(MOCK_SEARCH_RESULTS);
    renderPalette({ onSearch });
    const input = screen.getByRole('combobox');
    typeIntoInput(input, 'fix');
    act(() => vi.advanceTimersByTime(200));
    await flushAsyncState();
    expect(onSearch).toHaveBeenCalledWith('fix');
    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  it('rapid typing only triggers one search call for the final value', async () => {
    const onSearch = vi.fn().mockResolvedValue(MOCK_SEARCH_RESULTS);
    renderPalette({ onSearch });
    const input = screen.getByRole('combobox');
    // Each change resets the 200ms timer
    typeIntoInput(input, 'u');
    act(() => vi.advanceTimersByTime(100));
    typeIntoInput(input, 'up');
    act(() => vi.advanceTimersByTime(100));
    typeIntoInput(input, 'update api');
    act(() => vi.advanceTimersByTime(200));
    await flushAsyncState();
    // Only 1 call with the final value
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith('update api');
  });

  it('does not call onSearch when query is cleared', async () => {
    const onSearch = vi.fn().mockResolvedValue(MOCK_SEARCH_RESULTS);
    renderPalette({ onSearch });
    const input = screen.getByRole('combobox');
    typeIntoInput(input, 'fix');
    act(() => vi.advanceTimersByTime(200));
    await flushAsyncState();
    expect(onSearch).toHaveBeenCalledTimes(1);
    onSearch.mockClear();
    typeIntoInput(input, '');
    act(() => vi.advanceTimersByTime(200));
    expect(onSearch).not.toHaveBeenCalled();
  });
});

// ─── Search Results Rendering ─────────────────────────────────────────────────

describe('CommandPalette search results', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function triggerSearch(input: HTMLElement, query: string) {
    act(() => {
      fireEvent.change(input, { target: { value: query } });
    });
    act(() => vi.advanceTimersByTime(200));
    // Flush the resolved promise from onSearch
    await act(async () => {});
  }

  it('shows search result groups after debounce resolves', async () => {
    const onSearch = vi.fn().mockResolvedValue(MOCK_SEARCH_RESULTS);
    renderPalette({ onSearch });
    const input = screen.getByRole('combobox');
    await triggerSearch(input, 'api');
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Update API docs')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('TaskForge Web')).toBeInTheDocument();
    expect(screen.getByText('People')).toBeInTheDocument();
    expect(screen.getByText('Marcus Dev')).toBeInTheDocument();
  });

  it('hides Recent group when query is active', async () => {
    const onSearch = vi.fn().mockResolvedValue(MOCK_SEARCH_RESULTS);
    renderPalette({ onSearch, recentPages: RECENT_PAGES });
    expect(screen.getByText('Recent')).toBeInTheDocument();
    const input = screen.getByRole('combobox');
    await triggerSearch(input, 'api');
    expect(screen.queryByText('Recent')).not.toBeInTheDocument();
  });

  it('renders subtitle for search results', async () => {
    const onSearch = vi.fn().mockResolvedValue(MOCK_SEARCH_RESULTS);
    renderPalette({ onSearch });
    const input = screen.getByRole('combobox');
    await triggerSearch(input, 'api');
    expect(screen.getByText('Backend')).toBeInTheDocument();
    expect(screen.getByText('marcus@example.com')).toBeInTheDocument();
  });

  it('shows empty state message when search returns no results', async () => {
    const onSearch = vi.fn().mockResolvedValue({ tasks: [], projects: [], people: [] });
    renderPalette({ onSearch });
    const input = screen.getByRole('combobox');
    await triggerSearch(input, 'zzz');
    expect(screen.getByText(/No results for/)).toBeInTheDocument();
  });

  it('keeps Actions visible when search is active', async () => {
    const onSearch = vi.fn().mockResolvedValue(MOCK_SEARCH_RESULTS);
    renderPalette({ onSearch });
    const input = screen.getByRole('combobox');
    await triggerSearch(input, 'api');
    expect(screen.getByText('Actions')).toBeInTheDocument();
    expect(screen.getByText('Create task')).toBeInTheDocument();
  });

  it('navigates to a task result path on click', async () => {
    const onSearch = vi.fn().mockResolvedValue(MOCK_SEARCH_RESULTS);
    const { onNavigate } = renderPalette({ onSearch });
    const input = screen.getByRole('combobox');
    await triggerSearch(input, 'api');
    act(() => {
      fireEvent.click(screen.getByText('Update API docs'));
    });
    expect(onNavigate).toHaveBeenCalledWith('/tasks/t1', 'Update API docs');
  });
});

// ─── Accessibility ────────────────────────────────────────────────────────────

describe('CommandPalette accessibility', () => {
  it('dialog has aria-modal="true"', () => {
    renderPalette();
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('input has aria-expanded="true" when palette is open', () => {
    renderPalette();
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'true');
  });

  it('input has aria-controls pointing to the listbox id', () => {
    renderPalette();
    const input = screen.getByRole('combobox');
    const listboxId = input.getAttribute('aria-controls');
    expect(listboxId).toBeTruthy();
    expect(document.getElementById(listboxId ?? '')).toHaveAttribute('role', 'listbox');
  });

  it('all options have role="option"', () => {
    renderPalette({ recentPages: RECENT_PAGES });
    const options = screen.getAllByRole('option');
    // 2 recent + 4 actions = 6
    expect(options.length).toBe(6);
  });

  it('has aria-live region for screen reader announcements', () => {
    renderPalette();
    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
  });

  it('groups have aria-labelledby referencing their visible headers', () => {
    renderPalette({ recentPages: RECENT_PAGES });
    const listbox = screen.getByRole('listbox');
    const groups = within(listbox).getAllByRole('group');
    expect(groups.length).toBeGreaterThan(0);
    for (const group of groups) {
      const labelledBy = group.getAttribute('aria-labelledby');
      expect(labelledBy).toBeTruthy();
      expect(document.getElementById(labelledBy ?? '')).toBeInTheDocument();
    }
  });
});

// ─── useCommandPalette hook ───────────────────────────────────────────────────

describe('useCommandPalette global keyboard shortcut', () => {
  it('Ctrl+K opens the palette', async () => {
    const { useCommandPalette } = await import('./use-command-palette');

    function TestComponent() {
      const { open, onOpenChange, recentPages } = useCommandPalette();
      return <CommandPalette open={open} onOpenChange={onOpenChange} recentPages={recentPages} />;
    }

    render(<TestComponent />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }),
      );
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('Ctrl+K toggles: second press closes the palette', async () => {
    const { useCommandPalette } = await import('./use-command-palette');

    function TestComponent() {
      const { open, onOpenChange, recentPages } = useCommandPalette();
      return <CommandPalette open={open} onOpenChange={onOpenChange} recentPages={recentPages} />;
    }

    render(<TestComponent />);

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }),
      );
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }),
      );
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
