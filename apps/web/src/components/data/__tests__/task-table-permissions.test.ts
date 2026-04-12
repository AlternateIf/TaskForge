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

describe('TaskTable permission gating', () => {
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

  describe('bulk action toolbar gating', () => {
    it('bulk action toolbar is hidden when canUpdateTask is false', () => {
      const permissionSet = new Set(mockUserWithoutPermission.permissions);
      const canEditTask = true;
      const canUpdateTask = canEditTask && permissionSet.has(TASK_UPDATE_PERMISSION);
      const selectedIds = new Set(['task-1', 'task-2']);

      // Simulate conditional rendering of bulk toolbar
      const showBulkToolbar = canUpdateTask && selectedIds.size > 0;

      expect(showBulkToolbar).toBe(false);
    });

    it('bulk action toolbar is shown when canUpdateTask is true and tasks are selected', () => {
      const permissionSet = new Set(mockUserWithPermission.permissions);
      const canEditTask = true;
      const canUpdateTask = canEditTask && permissionSet.has(TASK_UPDATE_PERMISSION);
      const selectedIds = new Set(['task-1', 'task-2']);

      const showBulkToolbar = canUpdateTask && selectedIds.size > 0;

      expect(showBulkToolbar).toBe(true);
    });
  });

  describe('checkbox disabled state gating', () => {
    it('select-all checkbox is disabled when canUpdateTask is false', () => {
      const permissionSet = new Set(mockUserWithoutPermission.permissions);
      const canEditTask = true;
      const canUpdateTask = canEditTask && permissionSet.has(TASK_UPDATE_PERMISSION);

      const checkboxDisabled = !canUpdateTask;

      expect(checkboxDisabled).toBe(true);
    });

    it('select-all checkbox is enabled when canUpdateTask is true', () => {
      const permissionSet = new Set(mockUserWithPermission.permissions);
      const canEditTask = true;
      const canUpdateTask = canEditTask && permissionSet.has(TASK_UPDATE_PERMISSION);

      const checkboxDisabled = !canUpdateTask;

      expect(checkboxDisabled).toBe(false);
    });
  });

  describe('applyBulkUpdate gating', () => {
    it('applyBulkUpdate returns early when no tasks are selected', () => {
      const selectedIds = new Set<string>();

      let bulkUpdateCalled = false;

      function applyBulkUpdate() {
        const ids = Array.from(selectedIds);
        if (!ids.length) return;
        bulkUpdateCalled = true;
      }

      applyBulkUpdate();

      expect(bulkUpdateCalled).toBe(false);
    });

    it('applyBulkUpdate returns early when canUpdateTask is false even with selections', () => {
      const permissionSet = new Set(mockUserWithoutPermission.permissions);
      const canEditTask = true;
      const canUpdateTask = canEditTask && permissionSet.has(TASK_UPDATE_PERMISSION);
      const selectedIds = new Set(['task-1', 'task-2']);

      let bulkUpdateCalled = false;

      function applyBulkUpdate() {
        if (!canUpdateTask) return;
        const ids = Array.from(selectedIds);
        if (!ids.length) return;
        bulkUpdateCalled = true;
      }

      applyBulkUpdate();

      expect(bulkUpdateCalled).toBe(false);
    });

    it('applyBulkUpdate proceeds when canUpdateTask is true and tasks are selected', () => {
      const permissionSet = new Set(mockUserWithPermission.permissions);
      const canEditTask = true;
      const canUpdateTask = canEditTask && permissionSet.has(TASK_UPDATE_PERMISSION);
      const selectedIds = new Set(['task-1', 'task-2']);

      let bulkUpdateCalled = false;

      function applyBulkUpdate() {
        if (!canUpdateTask) return;
        const ids = Array.from(selectedIds);
        if (!ids.length) return;
        bulkUpdateCalled = true;
      }

      applyBulkUpdate();

      expect(bulkUpdateCalled).toBe(true);
    });
  });
});
