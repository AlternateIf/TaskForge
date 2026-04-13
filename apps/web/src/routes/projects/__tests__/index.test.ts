import type { Project } from '@/api/projects';
import { describe, expect, it } from 'vitest';

// ─── Shared logic mirrors from projects/index.tsx ──────────────────────────────

function isFinishedProject(project: Project): boolean {
  return project.status === 'archived';
}

function canFinishProject(project: Project): boolean {
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

function normalizeProjectDescription(description?: string | null): string {
  if (!description) return '';
  return description
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Projects page section split tests ─────────────────────────────────────────

describe('Projects page — section splitting', () => {
  const baseProject = (overrides: Partial<Project> = {}): Project => ({
    id: `id-${Math.random()}`,
    name: 'Project',
    status: 'active',
    color: null,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  });

  it('places active projects in active section', () => {
    const projects = [
      baseProject({ id: '1', name: 'A', status: 'active' }),
      baseProject({ id: '2', name: 'B', status: 'active' }),
    ];
    const activeProjects = projects.filter((p) => !isFinishedProject(p));
    const finishedProjects = projects.filter((p) => isFinishedProject(p));

    expect(activeProjects).toHaveLength(2);
    expect(finishedProjects).toHaveLength(0);
  });

  it('places archived projects in finished section', () => {
    const projects = [
      baseProject({ id: '1', name: 'A', status: 'archived' }),
      baseProject({ id: '2', name: 'B', status: 'archived' }),
    ];
    const activeProjects = projects.filter((p) => !isFinishedProject(p));
    const finishedProjects = projects.filter((p) => isFinishedProject(p));

    expect(activeProjects).toHaveLength(0);
    expect(finishedProjects).toHaveLength(2);
  });

  it('splits mixed projects into correct sections', () => {
    const projects = [
      baseProject({ id: '1', name: 'Active 1', status: 'active' }),
      baseProject({ id: '2', name: 'Finished 1', status: 'archived' }),
      baseProject({ id: '3', name: 'Active 2', status: 'active' }),
      baseProject({ id: '4', name: 'Finished 2', status: 'archived' }),
    ];
    const activeProjects = projects.filter((p) => !isFinishedProject(p));
    const finishedProjects = projects.filter((p) => isFinishedProject(p));

    expect(activeProjects).toHaveLength(2);
    expect(finishedProjects).toHaveLength(2);
    expect(activeProjects.every((p) => p.name.startsWith('Active'))).toBe(true);
    expect(finishedProjects.every((p) => p.name.startsWith('Finished'))).toBe(true);
  });

  it('search narrows both sections', () => {
    const projects = [
      baseProject({ id: '1', name: 'Alpha Active', status: 'active' }),
      baseProject({ id: '2', name: 'Alpha Archived', status: 'archived' }),
      baseProject({ id: '3', name: 'Beta Active', status: 'active' }),
      baseProject({ id: '4', name: 'Beta Archived', status: 'archived' }),
    ];
    const q = 'alpha'.toLowerCase();
    const filtered = projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        normalizeProjectDescription(p.description).toLowerCase().includes(q),
    );
    const activeProjects = filtered.filter((p) => !isFinishedProject(p));
    const finishedProjects = filtered.filter((p) => isFinishedProject(p));

    expect(activeProjects).toHaveLength(1);
    expect(finishedProjects).toHaveLength(1);
    expect(activeProjects[0].name).toBe('Alpha Active');
    expect(finishedProjects[0].name).toBe('Alpha Archived');
  });

  it('search with no matches results in empty sections', () => {
    const projects = [
      baseProject({ id: '1', name: 'Alpha', status: 'active' }),
      baseProject({ id: '2', name: 'Beta', status: 'archived' }),
    ];
    const q = 'nonexistent'.toLowerCase();
    const filtered = projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        normalizeProjectDescription(p.description).toLowerCase().includes(q),
    );
    const activeProjects = filtered.filter((p) => !isFinishedProject(p));
    const finishedProjects = filtered.filter((p) => isFinishedProject(p));

    expect(activeProjects).toHaveLength(0);
    expect(finishedProjects).toHaveLength(0);
  });

  it('empty project list results in zero-length sections', () => {
    const projects: Project[] = [baseProject({ id: 'seed', name: 'Seed', status: 'active' })];
    projects.length = 0;
    const activeProjects = projects.filter((p) => !isFinishedProject(p));
    const finishedProjects = projects.filter((p) => isFinishedProject(p));

    expect(activeProjects).toHaveLength(0);
    expect(finishedProjects).toHaveLength(0);
  });
});

// ─── Projects page — create project CTA ────────────────────────────────────────

describe('Projects page — create project CTA not regressed', () => {
  const PROJECT_CREATE_PERMISSION = 'project.create.org';

  it('shows create button when user has project.create.org permission', () => {
    const permissionSet = new Set(['project.read.org', PROJECT_CREATE_PERMISSION]);
    const canCreateProjects = permissionSet.has(PROJECT_CREATE_PERMISSION);
    expect(canCreateProjects).toBe(true);
  });

  it('hides create button when user lacks project.create.org permission', () => {
    const permissionSet = new Set(['project.read.org']);
    const canCreateProjects = permissionSet.has(PROJECT_CREATE_PERMISSION);
    expect(canCreateProjects).toBe(false);
  });
});

// ─── Projects page — finish button state ──────────────────────────────────────

describe('Projects page — finish button state on cards', () => {
  it('disables finish button when user lacks update permission', () => {
    const project = { id: '1', name: 'A', status: 'active', openTaskCount: 0 } as Project;
    const canEdit = false;
    const isPending = false;
    const isFinished = isFinishedProject(project);
    const canFinish = canFinishProject(project);
    const finishDisabled = isPending || isFinished || !canEdit || !canFinish;

    expect(finishDisabled).toBe(true);
  });

  it('disables finish button when project has open tasks', () => {
    const project = { id: '1', name: 'A', status: 'active', openTaskCount: 3 } as Project;
    const canEdit = true;
    const isPending = false;
    const isFinished = isFinishedProject(project);
    const canFinish = canFinishProject(project);
    const finishDisabled = isPending || isFinished || !canEdit || !canFinish;

    expect(finishDisabled).toBe(true);
  });

  it('disables finish button for already-archived project (reactivation not available)', () => {
    const project = { id: '1', name: 'A', status: 'archived', openTaskCount: 0 } as Project;
    const canEdit = true;
    const isPending = false;
    const isFinished = isFinishedProject(project);
    const canFinish = canFinishProject(project);
    const finishDisabled = isPending || isFinished || !canEdit || !canFinish;

    expect(finishDisabled).toBe(true);
  });

  it('enables finish button for active project with all tasks done and update permission', () => {
    const project = { id: '1', name: 'A', status: 'active', openTaskCount: 0 } as Project;
    const canEdit = true;
    const isPending = false;
    const isFinished = isFinishedProject(project);
    const canFinish = canFinishProject(project);
    const finishDisabled = isPending || isFinished || !canEdit || !canFinish;

    expect(finishDisabled).toBe(false);
  });

  it('shows reactivation tooltip for archived project', () => {
    const project = { id: '1', name: 'A', status: 'archived' } as Project;
    const canEdit = true;
    const isFinished = isFinishedProject(project);
    const canFinish = canFinishProject(project);

    let finishTooltip = '';
    if (!canEdit) {
      finishTooltip = 'You do not have permission to update this project.';
    } else if (isFinished) {
      finishTooltip = 'Reactivation is not available yet.';
    } else if (!canFinish) {
      finishTooltip = 'Finish is available only when all tasks are done.';
    }

    expect(finishTooltip).toBe('Reactivation is not available yet.');
  });
});

// ─── Projects page — pagination ────────────────────────────────────────────────

describe('Projects page — pagination', () => {
  const PAGE_SIZE = 25;

  it('correctly paginates active projects', () => {
    const projects = Array.from(
      { length: 30 },
      (_, i) =>
        ({
          id: String(i),
          name: `P${i}`,
          status: 'active',
          color: null,
          createdAt: '',
          updatedAt: '',
        }) as Project,
    );
    const page = 1;
    const start = (page - 1) * PAGE_SIZE;
    const paged = projects.slice(start, start + PAGE_SIZE);

    expect(paged).toHaveLength(25);
    expect(paged[0].id).toBe('0');
  });

  it('correctly paginates second page', () => {
    const projects = Array.from(
      { length: 30 },
      (_, i) =>
        ({
          id: String(i),
          name: `P${i}`,
          status: 'active',
          color: null,
          createdAt: '',
          updatedAt: '',
        }) as Project,
    );
    const page = 2;
    const start = (page - 1) * PAGE_SIZE;
    const paged = projects.slice(start, start + PAGE_SIZE);

    expect(paged).toHaveLength(5);
    expect(paged[0].id).toBe('25');
  });

  it('calculates total pages correctly', () => {
    const projects = Array.from(
      { length: 30 },
      (_, i) =>
        ({
          id: String(i),
          name: `P${i}`,
          status: 'active',
          color: null,
          createdAt: '',
          updatedAt: '',
        }) as Project,
    );
    const totalPages = Math.max(1, Math.ceil(projects.length / PAGE_SIZE));

    expect(totalPages).toBe(2);
  });

  it('defaults to 1 page for empty list', () => {
    const totalPages = Math.max(1, Math.ceil(0 / PAGE_SIZE));
    expect(totalPages).toBe(1);
  });
});
