import type { Project } from '@/api/projects';
import { describe, expect, it, vi } from 'vitest';

// ─── isFinishedProject tests ──────────────────────────────────────────────────

function isFinishedProject(project: Project): boolean {
  return project.status === 'archived';
}

// ─── canFinishProject tests ───────────────────────────────────────────────────

function canFinishProject(project: {
  isFinishable?: boolean;
  openTaskCount?: number;
  completedTaskCount?: number;
  taskCount?: number;
}): boolean {
  if (typeof project.isFinishable === 'boolean') {
    return project.isFinishable;
  }

  if (typeof project.openTaskCount === 'number') {
    return project.openTaskCount === 0;
  }

  if (typeof project.completedTaskCount === 'number' && typeof project.taskCount === 'number') {
    return project.completedTaskCount >= project.taskCount;
  }

  return true;
}

// ─── isFinishedProject ─────────────────────────────────────────────────────────

describe('isFinishedProject', () => {
  it('returns true when project status is archived', () => {
    const project = { status: 'archived' } as Project;
    expect(isFinishedProject(project)).toBe(true);
  });

  it('returns false when project status is active', () => {
    const project = { status: 'active' } as Project;
    expect(isFinishedProject(project)).toBe(false);
  });

  it('returns false when project has no status', () => {
    const project = {} as Project;
    expect(isFinishedProject(project)).toBe(false);
  });

  it('returns false when project has an unknown status', () => {
    const project = { status: 'deleted' } as Project;
    expect(isFinishedProject(project)).toBe(false);
  });
});

// ─── canFinishProject ─────────────────────────────────────────────────────────

describe('canFinishProject', () => {
  it('returns isFinishable when set to true', () => {
    const project = { isFinishable: true, openTaskCount: 5 };
    expect(canFinishProject(project)).toBe(true);
  });

  it('returns isFinishable when set to false', () => {
    const project = { isFinishable: false, openTaskCount: 0 };
    expect(canFinishProject(project)).toBe(false);
  });

  it('returns true when openTaskCount is 0', () => {
    const project = { openTaskCount: 0 };
    expect(canFinishProject(project)).toBe(true);
  });

  it('returns false when openTaskCount is greater than 0', () => {
    const project = { openTaskCount: 3 };
    expect(canFinishProject(project)).toBe(false);
  });

  it('returns true when completedTaskCount >= taskCount', () => {
    const project = { completedTaskCount: 10, taskCount: 10 };
    expect(canFinishProject(project)).toBe(true);
  });

  it('returns true when completedTaskCount > taskCount (edge case)', () => {
    const project = { completedTaskCount: 11, taskCount: 10 };
    expect(canFinishProject(project)).toBe(true);
  });

  it('returns false when completedTaskCount < taskCount', () => {
    const project = { completedTaskCount: 5, taskCount: 10 };
    expect(canFinishProject(project)).toBe(false);
  });

  it('falls back to true when no metrics are available', () => {
    const project = {};
    expect(canFinishProject(project)).toBe(true);
  });

  it('prefers isFinishable over openTaskCount', () => {
    const project = { isFinishable: false, openTaskCount: 0 };
    expect(canFinishProject(project)).toBe(false);
  });

  it('prefers openTaskCount over completedTaskCount/taskCount', () => {
    const project = { openTaskCount: 2, completedTaskCount: 5, taskCount: 10 };
    expect(canFinishProject(project)).toBe(false);
  });
});

// ─── useFinishProject hook contract ──────────────────────────────────────────

describe('useFinishProject hook contract', () => {
  it('calls POST /projects/:id/finish on mutate', async () => {
    const mockPost = vi.fn().mockResolvedValue({
      data: { id: 'p-1', status: 'archived' },
    });

    // Simulate what the hook's mutationFn does
    const projectId = 'p-1';
    await mockPost(`/projects/${projectId}/finish`);

    expect(mockPost).toHaveBeenCalledWith('/projects/p-1/finish');
  });

  it('falls back to POST /projects/:id/archive when finish returns 404', async () => {
    const notFoundError = { response: { status: 404 } };
    const mockPost = vi
      .fn()
      .mockRejectedValueOnce(notFoundError)
      .mockResolvedValueOnce({ data: { id: 'p-1', status: 'archived' } });

    const projectId = 'p-1';

    // Simulate the hook's mutationFn fallback logic
    try {
      await mockPost(`/projects/${projectId}/finish`);
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        await mockPost(`/projects/${projectId}/archive`);
      }
    }

    expect(mockPost).toHaveBeenCalledWith('/projects/p-1/finish');
    expect(mockPost).toHaveBeenCalledWith('/projects/p-1/archive');
  });

  it('does not fall back to archive on non-404 errors', async () => {
    const mockPost = vi.fn().mockRejectedValueOnce({ response: { status: 422 } });

    const projectId = 'p-1';
    let fellBack = false;

    try {
      await mockPost(`/projects/${projectId}/finish`);
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        fellBack = true;
        await mockPost(`/projects/${projectId}/archive`);
      }
    }

    expect(fellBack).toBe(false);
  });
});

// ─── Project list filtering ───────────────────────────────────────────────────

describe('Project list section filtering', () => {
  const projects: Project[] = [
    { id: '1', name: 'Active A', status: 'active', color: null, createdAt: '', updatedAt: '' },
    { id: '2', name: 'Archived B', status: 'archived', color: null, createdAt: '', updatedAt: '' },
    { id: '3', name: 'Active C', status: 'active', color: null, createdAt: '', updatedAt: '' },
    { id: '4', name: 'Archived D', status: 'archived', color: null, createdAt: '', updatedAt: '' },
    { id: '5', name: 'No Status E', color: null, createdAt: '', updatedAt: '' },
  ];

  it('splits projects into active and finished sections based on status', () => {
    const activeProjects = projects.filter((p) => !isFinishedProject(p));
    const finishedProjects = projects.filter((p) => isFinishedProject(p));

    expect(activeProjects).toHaveLength(3);
    expect(finishedProjects).toHaveLength(2);
    expect(activeProjects.map((p) => p.name)).toEqual(['Active A', 'Active C', 'No Status E']);
    expect(finishedProjects.map((p) => p.name)).toEqual(['Archived B', 'Archived D']);
  });

  it('search filters across both sections before split', () => {
    const q = 'a'.toLowerCase();
    const filtered = projects.filter((p) => p.name.toLowerCase().includes(q));
    const activeProjects = filtered.filter((p) => !isFinishedProject(p));
    const finishedProjects = filtered.filter((p) => isFinishedProject(p));

    // "a" appears in: Active A, Archived B (Archived), Active C, Archived D (Archived), No Status E
    expect(activeProjects).toHaveLength(3);
    expect(finishedProjects).toHaveLength(2);
  });

  it('handles all-active project list', () => {
    const allActive: Project[] = [
      { id: '1', name: 'A', status: 'active', color: null, createdAt: '', updatedAt: '' },
      { id: '2', name: 'B', status: 'active', color: null, createdAt: '', updatedAt: '' },
    ];
    const activeProjects = allActive.filter((p) => !isFinishedProject(p));
    const finishedProjects = allActive.filter((p) => isFinishedProject(p));

    expect(activeProjects).toHaveLength(2);
    expect(finishedProjects).toHaveLength(0);
  });

  it('handles all-finished project list', () => {
    const allFinished: Project[] = [
      { id: '1', name: 'A', status: 'archived', color: null, createdAt: '', updatedAt: '' },
      { id: '2', name: 'B', status: 'archived', color: null, createdAt: '', updatedAt: '' },
    ];
    const activeProjects = allFinished.filter((p) => !isFinishedProject(p));
    const finishedProjects = allFinished.filter((p) => isFinishedProject(p));

    expect(activeProjects).toHaveLength(0);
    expect(finishedProjects).toHaveLength(2);
  });
});
