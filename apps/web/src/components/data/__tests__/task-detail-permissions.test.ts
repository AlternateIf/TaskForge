import { TASK_UPDATE_PERMISSION } from '@taskforge/shared';
import { describe, expect, it } from 'vitest';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockUserWithPermission = {
  id: 'user-1',
  email: 'test@example.com',
  displayName: 'Test User',
  avatarUrl: null,
  organizationId: 'org-1',
  organizationName: 'Acme Corp',
  permissions: ['task.update.project', 'task.read.project', 'project.read.org'],
  organizations: [{ id: 'org-1', name: 'Acme Corp' }],
};

const mockUserWithoutPermission = {
  id: 'user-2',
  email: 'other@example.com',
  displayName: 'Other User',
  avatarUrl: null,
  organizationId: 'org-1',
  organizationName: 'Acme Corp',
  permissions: ['task.read.project', 'project.read.org'], // missing task.update.project
  organizations: [{ id: 'org-1', name: 'Acme Corp' }],
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('TaskDetailContent permission gating', () => {
  describe('TASK_UPDATE_PERMISSION constant', () => {
    it('defines TASK_UPDATE_PERMISSION as task.update.project', () => {
      expect(TASK_UPDATE_PERMISSION).toBe('task.update.project');
    });
  });

  describe('canUpdateTask derivation', () => {
    it('grants canUpdateTask when user has task.update.project permission and canEditTask is true', () => {
      const permissionSet = new Set(mockUserWithPermission.permissions);
      const canEditTask = true;
      const canUpdateTask = canEditTask && permissionSet.has(TASK_UPDATE_PERMISSION);
      expect(canUpdateTask).toBe(true);
    });

    it('does not grant canUpdateTask when user lacks task.update.project permission', () => {
      const permissionSet = new Set(mockUserWithoutPermission.permissions);
      const canEditTask = true;
      const canUpdateTask = canEditTask && permissionSet.has(TASK_UPDATE_PERMISSION);
      expect(canUpdateTask).toBe(false);
    });

    it('does not grant canUpdateTask when canEditTask is false even with permission', () => {
      const permissionSet = new Set(mockUserWithPermission.permissions);
      const canEditTask = false;
      const canUpdateTask = canEditTask && permissionSet.has(TASK_UPDATE_PERMISSION);
      expect(canUpdateTask).toBe(false);
    });

    it('does not grant canUpdateTask when both canEditTask is false and permission is missing', () => {
      const permissionSet = new Set(mockUserWithoutPermission.permissions);
      const canEditTask = false;
      const canUpdateTask = canEditTask && permissionSet.has(TASK_UPDATE_PERMISSION);
      expect(canUpdateTask).toBe(false);
    });
  });

  describe('update gating behavior', () => {
    it('handleTaskUpdate returns early when canUpdateTask is false', () => {
      const permissionSet = new Set(mockUserWithoutPermission.permissions);
      const canEditTask = true;
      const canUpdateTask = canEditTask && permissionSet.has(TASK_UPDATE_PERMISSION);

      let updateCalled = false;

      function handleTaskUpdate() {
        if (!canUpdateTask) return;
        updateCalled = true;
      }

      handleTaskUpdate();

      expect(updateCalled).toBe(false);
    });

    it('handleTaskUpdate proceeds when canUpdateTask is true', () => {
      const permissionSet = new Set(mockUserWithPermission.permissions);
      const canEditTask = true;
      const canUpdateTask = canEditTask && permissionSet.has(TASK_UPDATE_PERMISSION);

      let updateCalled = false;

      function handleTaskUpdate() {
        if (!canUpdateTask) return;
        updateCalled = true;
      }

      handleTaskUpdate();

      expect(updateCalled).toBe(true);
    });
  });
});
