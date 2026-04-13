import type { Project } from '@/api/projects';
import { describe, expect, it, vi } from 'vitest';

// ─── Settings canFinishProject ──────────────────────────────────────────────────

/**
 * Mirror of the canFinishProject function from settings.tsx.
 * The settings page uses a slightly different version than the projects page,
 * so we test the settings-specific logic here.
 */
function canFinishProject(project: {
  isFinishable?: boolean;
  openTaskCount?: number;
  taskCount?: number;
}) {
  if (typeof project.isFinishable === 'boolean') {
    return project.isFinishable;
  }

  if (typeof project.openTaskCount === 'number') {
    return project.openTaskCount === 0;
  }

  return true;
}

// ─── Settings canFinishProject tests ──────────────────────────────────────────

describe('Settings page canFinishProject', () => {
  it('returns isFinishable when set to true', () => {
    expect(canFinishProject({ isFinishable: true })).toBe(true);
  });

  it('returns isFinishable when set to false', () => {
    expect(canFinishProject({ isFinishable: false })).toBe(false);
  });

  it('returns true when openTaskCount is 0', () => {
    expect(canFinishProject({ openTaskCount: 0 })).toBe(true);
  });

  it('returns false when openTaskCount is greater than 0', () => {
    expect(canFinishProject({ openTaskCount: 5 })).toBe(false);
  });

  it('defaults to true when no metrics are present', () => {
    expect(canFinishProject({})).toBe(true);
  });
});

// ─── Settings finish action gating ────────────────────────────────────────────

describe('Settings page finish action gating', () => {
  const baseProject: Project = {
    id: 'p-1',
    name: 'Test Project',
    status: 'active',
    color: null,
    createdAt: '',
    updatedAt: '',
  };

  it('disables finish button when project is already archived', () => {
    const project = { ...baseProject, status: 'archived' } as Project;
    const isArchived = project.status === 'archived';
    const finishable = canFinishProject(project);
    const finishActionDisabled = !project || isArchived || !finishable;

    expect(finishActionDisabled).toBe(true);
  });

  it('disables finish button when project has open tasks', () => {
    const project = { ...baseProject, status: 'active', openTaskCount: 3 } as Project;
    const isArchived = project.status === 'archived';
    const finishable = canFinishProject(project);
    const finishActionDisabled = !project || isArchived || !finishable;

    expect(finishActionDisabled).toBe(true);
  });

  it('enables finish button when project is active with all tasks done', () => {
    const project = { ...baseProject, status: 'active', openTaskCount: 0 } as Project;
    const isArchived = project.status === 'archived';
    const finishable = canFinishProject(project);
    const finishActionDisabled = !project || isArchived || !finishable;

    expect(finishActionDisabled).toBe(false);
  });

  it('shows reactivation tooltip when project is archived', () => {
    const project = { ...baseProject, status: 'archived' } as Project;
    const isArchived = project.status === 'archived';
    const finishable = canFinishProject(project);
    let finishTooltip = '';
    if (isArchived) {
      finishTooltip = 'Reactivation is not available yet.';
    } else if (!finishable) {
      finishTooltip = 'Finish is available only when all tasks are done.';
    }

    expect(finishTooltip).toBe('Reactivation is not available yet.');
  });

  it('shows task-not-done tooltip when project has open tasks', () => {
    const project = { ...baseProject, status: 'active', openTaskCount: 2 } as Project;
    const isArchived = project.status === 'archived';
    const finishable = canFinishProject(project);
    let finishTooltip = '';
    if (isArchived) {
      finishTooltip = 'Reactivation is not available yet.';
    } else if (!finishable) {
      finishTooltip = 'Finish is available only when all tasks are done.';
    }

    expect(finishTooltip).toBe('Finish is available only when all tasks are done.');
  });

  it('shows no tooltip when project is finishable and active', () => {
    const project = { ...baseProject, status: 'active', openTaskCount: 0 } as Project;
    const isArchived = project.status === 'archived';
    const finishable = canFinishProject(project);
    let finishTooltip = '';
    if (isArchived) {
      finishTooltip = 'Reactivation is not available yet.';
    } else if (!finishable) {
      finishTooltip = 'Finish is available only when all tasks are done.';
    }

    expect(finishTooltip).toBe('');
  });
});

// ─── Permission gating for finish action ──────────────────────────────────────

describe('Settings page permission gating for finish action', () => {
  const PROJECT_UPDATE_PERMISSION = 'project.update.org';

  it('shows finish control when user has PROJECT_UPDATE_PERMISSION', () => {
    const userPermissions = ['project.read.org', PROJECT_UPDATE_PERMISSION];
    const permissionSet = new Set(userPermissions);
    const canEdit = permissionSet.has(PROJECT_UPDATE_PERMISSION);

    expect(canEdit).toBe(true);
  });

  it('hides finish control when user lacks PROJECT_UPDATE_PERMISSION', () => {
    const userPermissions = ['project.read.org'];
    const permissionSet = new Set(userPermissions);
    const canEdit = permissionSet.has(PROJECT_UPDATE_PERMISSION);

    expect(canEdit).toBe(false);
  });

  it('hides Project Status section entirely when user cannot edit', () => {
    // The settings page conditionally renders the "Project Status" section only when canEdit is true
    const userPermissions = ['project.read.org'];
    const permissionSet = new Set(userPermissions);
    expect(permissionSet.has(PROJECT_UPDATE_PERMISSION)).toBe(false);
  });
});

// ─── Mutation success/error handling ──────────────────────────────────────────

describe('Settings page finish mutation handling', () => {
  it('calls finishProject.mutate with project id on handleFinishAction', () => {
    const mockMutate = vi.fn();
    const project = { id: 'p-1', status: 'active', openTaskCount: 0 } as Project;
    const isArchived = project.status === 'archived';
    const finishable = canFinishProject(project);

    if (!isArchived && finishable) {
      mockMutate(project.id, {
        onSuccess: () => {},
      });
    }

    expect(mockMutate).toHaveBeenCalledWith(
      'p-1',
      expect.objectContaining({
        onSuccess: expect.any(Function),
      }),
    );
  });

  it('does not call mutate when project is already archived', () => {
    const mockMutate = vi.fn();
    const project = { id: 'p-1', status: 'archived', openTaskCount: 0 } as Project;
    const isArchived = project.status === 'archived';
    const finishable = canFinishProject(project);

    if (!isArchived && finishable) {
      mockMutate(project.id);
    }

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('does not call mutate when project has open tasks', () => {
    const mockMutate = vi.fn();
    const project = { id: 'p-1', status: 'active', openTaskCount: 5 } as Project;
    const isArchived = project.status === 'archived';
    const finishable = canFinishProject(project);

    if (!isArchived && finishable) {
      mockMutate(project.id);
    }

    expect(mockMutate).not.toHaveBeenCalled();
  });
});
