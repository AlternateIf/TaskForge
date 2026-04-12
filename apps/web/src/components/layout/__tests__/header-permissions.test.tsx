import { TASK_CREATE_PERMISSION } from '@taskforge/shared';
import { describe, expect, it } from 'vitest';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockUserWithPermission = {
  id: 'user-1',
  email: 'test@example.com',
  displayName: 'Test User',
  avatarUrl: null,
  organizationId: 'org-1',
  organizationName: 'Acme Corp',
  permissions: ['task.create.project', 'task.read.project', 'project.read.org'],
  organizations: [{ id: 'org-1', name: 'Acme Corp' }],
};

const mockUserWithoutPermission = {
  id: 'user-2',
  email: 'other@example.com',
  displayName: 'Other User',
  avatarUrl: null,
  organizationId: 'org-1',
  organizationName: 'Acme Corp',
  permissions: ['task.read.project', 'project.read.org'], // missing task.create.project
  organizations: [{ id: 'org-1', name: 'Acme Corp' }],
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Header permission gating', () => {
  describe('TASK_CREATE_PERMISSION constant', () => {
    it('defines TASK_CREATE_PERMISSION as task.create.project', () => {
      expect(TASK_CREATE_PERMISSION).toBe('task.create.project');
    });
  });

  describe('canCreateTasks derivation', () => {
    it('grants canCreateTasks when user has task.create.project permission', () => {
      const permissionSet = new Set(mockUserWithPermission.permissions);
      const canCreateTasks = permissionSet.has(TASK_CREATE_PERMISSION);
      expect(canCreateTasks).toBe(true);
    });

    it('does not grant canCreateTasks when user lacks task.create.project permission', () => {
      const permissionSet = new Set(mockUserWithoutPermission.permissions);
      const canCreateTasks = permissionSet.has(TASK_CREATE_PERMISSION);
      expect(canCreateTasks).toBe(false);
    });
  });

  describe('handlePaletteAction create-task gating', () => {
    it('returns early for create-task when canCreateTasks is false', () => {
      const permissionSet = new Set(mockUserWithoutPermission.permissions);
      const canCreateTasks = permissionSet.has(TASK_CREATE_PERMISSION);

      // Simulate the handlePaletteAction logic for create-task
      let createTaskProjectId: string | null = null;
      let createTaskCalled = false;

      if (canCreateTasks) {
        createTaskCalled = true;
        createTaskProjectId = 'project-1';
      }

      expect(createTaskCalled).toBe(false);
      expect(createTaskProjectId).toBeNull();
    });

    it('proceeds for create-task when canCreateTasks is true', () => {
      const permissionSet = new Set(mockUserWithPermission.permissions);
      const canCreateTasks = permissionSet.has(TASK_CREATE_PERMISSION);

      let createTaskProjectId: string | null = null;
      let createTaskCalled = false;

      if (canCreateTasks) {
        createTaskCalled = true;
        createTaskProjectId = 'project-1';
      }

      expect(createTaskCalled).toBe(true);
      expect(createTaskProjectId).toBe('project-1');
    });
  });
});
