import { type TaskWithRelations, isStatusTransitionBlocked } from '@/api/tasks';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { TaskHeader } from './task-header';

vi.mock('sonner', () => ({
  toast: { info: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

const STATUSES = [
  { id: 'todo', name: 'To Do', color: '#6b7280', position: 1, isDefault: true },
  { id: 'in-progress', name: 'In Progress', color: '#3b82f6', position: 2, isDefault: false },
];

const STATUSES_WITH_FINAL = [
  { id: 'todo', name: 'To Do', color: '#6b7280', position: 1, isDefault: true },
  { id: 'in-progress', name: 'In Progress', color: '#3b82f6', position: 2, isDefault: false },
  { id: 'done', name: 'Done', color: '#22c55e', position: 3, isDefault: false, isFinal: true },
];

const STATUSES_WITH_VALIDATED = [
  { id: 'todo', name: 'To Do', color: '#6b7280', position: 1, isDefault: true },
  { id: 'in-progress', name: 'In Progress', color: '#3b82f6', position: 2, isDefault: false },
  {
    id: 'released',
    name: 'Released',
    color: '#a855f7',
    position: 3,
    isDefault: false,
    isValidated: true,
  },
];

const makeTaskWithBlockers = (overrides: Partial<TaskWithRelations> = {}): TaskWithRelations => ({
  id: 'task-1',
  title: 'Test task',
  description: null,
  statusId: 'in-progress',
  priority: 'medium',
  position: 1000,
  projectId: 'proj-1',
  labels: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  blockers: [{ isResolved: false }, { isResolved: true }],
  ...overrides,
});

describe('TaskHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves inline title edits on Enter', async () => {
    const user = userEvent.setup();
    const onTitleSave = vi.fn();

    render(
      <TaskHeader
        taskId="task-1"
        title="Original title"
        statusId="todo"
        statuses={STATUSES}
        onTitleSave={onTitleSave}
        onStatusChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Original title' }));
    const input = screen.getByLabelText('Task title');

    await user.clear(input);
    await user.type(input, '  Updated title  {Enter}');

    expect(onTitleSave).toHaveBeenCalledWith('Updated title');
  });

  it('cancels title editing on Escape without saving', async () => {
    const user = userEvent.setup();
    const onTitleSave = vi.fn();

    render(
      <TaskHeader
        taskId="task-1"
        title="Original title"
        statusId="todo"
        statuses={STATUSES}
        onTitleSave={onTitleSave}
        onStatusChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Original title' }));
    const input = screen.getByLabelText('Task title');

    await user.clear(input);
    await user.type(input, 'Unsaved title{Escape}');

    expect(onTitleSave).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Original title' })).toBeInTheDocument();
  });

  it('changes status from the status dropdown', async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn();

    render(
      <TaskHeader
        taskId="task-1"
        title="Original title"
        statusId="todo"
        statuses={STATUSES}
        onTitleSave={vi.fn()}
        onStatusChange={onStatusChange}
      />,
    );

    await user.click(screen.getByLabelText('Task status'));
    await user.click(screen.getByRole('menuitem', { name: 'In Progress' }));

    expect(onStatusChange).toHaveBeenCalledWith('in-progress');
  });

  // ─── Task state transition validation scenarios ──────────────────────────────────

  describe('status transition validation', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('renders disabled status option for isFinal status when blockers present', async () => {
      const user = userEvent.setup();
      const taskWithBlockers = makeTaskWithBlockers();
      const doneStatus = STATUSES_WITH_FINAL.find((s) => s.id === 'done');
      if (!doneStatus) throw new Error('done status not found in fixture');
      const eligibility = isStatusTransitionBlocked(taskWithBlockers, doneStatus);
      expect(eligibility.blocked).toBe(true);

      render(
        <TaskHeader
          taskId="task-1"
          title="Blocked task"
          statusId="in-progress"
          statuses={STATUSES_WITH_FINAL}
          taskForValidation={taskWithBlockers}
          onTitleSave={vi.fn()}
          onStatusChange={vi.fn()}
        />,
      );

      await user.click(screen.getByLabelText('Task status'));
      const doneItem = screen.getByRole('menuitem', { name: 'Done' });
      expect(doneItem).toHaveAttribute('aria-disabled', 'true');
    });

    it('renders disabled status option for isValidated status when checklist incomplete', async () => {
      const user = userEvent.setup();
      const taskWithIncompleteChecklist: TaskWithRelations = {
        id: 'task-1',
        title: 'Test task',
        description: null,
        statusId: 'in-progress',
        priority: 'medium',
        position: 1000,
        projectId: 'proj-1',
        labels: [],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        progress: {
          subtaskCount: 2,
          subtaskCompletedCount: 1,
          checklistTotal: 3,
          checklistCompleted: 1,
        },
      };
      const releasedStatus = STATUSES_WITH_VALIDATED.find((s) => s.id === 'released');
      if (!releasedStatus) throw new Error('released status not found in fixture');
      const eligibility = isStatusTransitionBlocked(taskWithIncompleteChecklist, releasedStatus);
      expect(eligibility.blocked).toBe(true);

      render(
        <TaskHeader
          taskId="task-1"
          title="Checklist task"
          statusId="in-progress"
          statuses={STATUSES_WITH_VALIDATED}
          taskForValidation={taskWithIncompleteChecklist}
          onTitleSave={vi.fn()}
          onStatusChange={vi.fn()}
        />,
      );

      await user.click(screen.getByLabelText('Task status'));
      const releasedItem = screen.getByRole('menuitem', { name: 'Released' });
      expect(releasedItem).toHaveAttribute('aria-disabled', 'true');
    });

    it('shows INFO toast when clicking a blocked (disabled) status option (mouse)', async () => {
      const user = userEvent.setup();
      const taskWithBlockers = makeTaskWithBlockers();
      const onStatusChange = vi.fn();

      render(
        <TaskHeader
          taskId="task-1"
          title="Blocked task"
          statusId="in-progress"
          statuses={STATUSES_WITH_FINAL}
          taskForValidation={taskWithBlockers}
          onTitleSave={vi.fn()}
          onStatusChange={onStatusChange}
        />,
      );

      await user.click(screen.getByLabelText('Task status'));
      await user.click(screen.getByRole('menuitem', { name: 'Done' }));

      expect(toast.info).toHaveBeenCalledWith(
        'Cannot move to Done: 1 unresolved blocker(s), 0 incomplete checklist item(s)',
      );
      expect(onStatusChange).not.toHaveBeenCalled();
    });

    it('shows INFO toast when keyboard-selecting a blocked (disabled) status option', async () => {
      const user = userEvent.setup();
      const taskWithBlockers = makeTaskWithBlockers();
      const onStatusChange = vi.fn();

      render(
        <TaskHeader
          taskId="task-1"
          title="Blocked task"
          statusId="in-progress"
          statuses={STATUSES_WITH_FINAL}
          taskForValidation={taskWithBlockers}
          onTitleSave={vi.fn()}
          onStatusChange={onStatusChange}
        />,
      );

      // Open the dropdown
      await user.click(screen.getByLabelText('Task status'));

      // Focus the blocked item and press Enter to select it
      const doneItem = screen.getByRole('menuitem', { name: 'Done' });
      doneItem.focus();
      await user.keyboard('{Enter}');

      expect(toast.info).toHaveBeenCalledWith(
        'Cannot move to Done: 1 unresolved blocker(s), 0 incomplete checklist item(s)',
      );
      expect(onStatusChange).not.toHaveBeenCalled();
    });

    it('allows selecting an enabled (non-blocked) status and calls onStatusChange', async () => {
      const user = userEvent.setup();
      // Task with no blockers — should be allowed to move to Done
      const clearTask: TaskWithRelations = makeTaskWithBlockers({
        blockers: [],
        progress: {
          subtaskCount: 0,
          subtaskCompletedCount: 0,
          checklistTotal: 0,
          checklistCompleted: 0,
        },
      });
      const onStatusChange = vi.fn();

      render(
        <TaskHeader
          taskId="task-1"
          title="Clear task"
          statusId="in-progress"
          statuses={STATUSES_WITH_FINAL}
          taskForValidation={clearTask}
          onTitleSave={vi.fn()}
          onStatusChange={onStatusChange}
        />,
      );

      await user.click(screen.getByLabelText('Task status'));
      const doneItem = screen.getByRole('menuitem', { name: 'Done' });
      // Not disabled since task has no blockers / incomplete items
      expect(doneItem).not.toHaveAttribute('aria-disabled', 'true');

      await user.click(doneItem);
      expect(onStatusChange).toHaveBeenCalledWith('done');
      expect(toast.info).not.toHaveBeenCalled();
    });
  });
});
