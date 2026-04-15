import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { useFocusedTask } from './use-focused-task';

function FocusedTaskHarness({ initialTaskIds }: { initialTaskIds: string[] }) {
  const [taskIds, setTaskIds] = useState(initialTaskIds);
  const { focusedTaskId, focusNextTask, focusPreviousTask } = useFocusedTask(taskIds);

  return (
    <div>
      <p data-testid="focused-task-id">{focusedTaskId ?? 'none'}</p>
      <button type="button" onClick={focusNextTask}>
        Next
      </button>
      <button type="button" onClick={focusPreviousTask}>
        Previous
      </button>
      <button type="button" onClick={() => setTaskIds(['task-2', 'task-3'])}>
        Remove first task
      </button>
    </div>
  );
}

describe('useFocusedTask', () => {
  it('initializes with the first visible task id', () => {
    render(<FocusedTaskHarness initialTaskIds={['task-1', 'task-2', 'task-3']} />);
    expect(screen.getByTestId('focused-task-id')).toHaveTextContent('task-1');
  });

  it('cycles focus using next/previous helpers', () => {
    render(<FocusedTaskHarness initialTaskIds={['task-1', 'task-2', 'task-3']} />);

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByTestId('focused-task-id')).toHaveTextContent('task-2');

    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(screen.getByTestId('focused-task-id')).toHaveTextContent('task-1');

    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(screen.getByTestId('focused-task-id')).toHaveTextContent('task-3');
  });

  it('resets focus predictably when focused task is removed', () => {
    render(<FocusedTaskHarness initialTaskIds={['task-1', 'task-2', 'task-3']} />);

    fireEvent.click(screen.getByRole('button', { name: 'Remove first task' }));
    expect(screen.getByTestId('focused-task-id')).toHaveTextContent('task-2');
  });
});
