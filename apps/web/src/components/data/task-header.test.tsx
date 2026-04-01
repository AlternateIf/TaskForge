import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskHeader } from './task-header';

const STATUSES = [
  { id: 'todo', name: 'To Do', color: '#6b7280', position: 1, isDefault: true },
  { id: 'in-progress', name: 'In Progress', color: '#3b82f6', position: 2, isDefault: false },
];

describe('TaskHeader', () => {
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
});
