import { fireEvent, render, screen } from '@testing-library/react';
import { TaskDetailPanel } from './task-detail-panel';

vi.mock('@/components/data/task-detail-content', () => ({
  TaskDetailContent: ({ taskId }: { taskId: string }) => <div>Task detail content {taskId}</div>,
}));

describe('TaskDetailPanel', () => {
  it('renders with backdrop blur and closes on backdrop click', () => {
    const onClose = vi.fn();

    render(
      <TaskDetailPanel
        projectId="project-1"
        taskId="task-1"
        onClose={onClose}
        onOpenFullPage={vi.fn()}
      />,
    );

    const backdrop = screen.getByRole('button', { name: 'Close task details' });
    expect(backdrop).toHaveClass('backdrop-blur-[2px]');

    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when Escape is pressed', () => {
    const onClose = vi.fn();

    render(
      <TaskDetailPanel
        projectId="project-1"
        taskId="task-1"
        onClose={onClose}
        onOpenFullPage={vi.fn()}
      />,
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
