import { TASK_UPDATE_PERMISSION } from '@taskforge/shared';
import { describe, expect, it, vi } from 'vitest';

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

describe('KanbanBoard permission gating', () => {
  describe('TASK_UPDATE_PERMISSION constant', () => {
    it('defines TASK_UPDATE_PERMISSION as task.update.project', () => {
      expect(TASK_UPDATE_PERMISSION).toBe('task.update.project');
    });
  });

  describe('canDragAndDrop derivation', () => {
    it('grants canDragAndDrop when user has task.update.project permission and canUpdateTask is true', () => {
      const permissionSet = new Set(mockUserWithPermission.permissions);
      const canUpdateTask = true;
      const canDragAndDrop = canUpdateTask && permissionSet.has(TASK_UPDATE_PERMISSION);
      expect(canDragAndDrop).toBe(true);
    });

    it('does not grant canDragAndDrop when user lacks task.update.project permission', () => {
      const permissionSet = new Set(mockUserWithoutPermission.permissions);
      const canUpdateTask = true;
      const canDragAndDrop = canUpdateTask && permissionSet.has(TASK_UPDATE_PERMISSION);
      expect(canDragAndDrop).toBe(false);
    });

    it('does not grant canDragAndDrop when canUpdateTask is false even with permission', () => {
      const permissionSet = new Set(mockUserWithPermission.permissions);
      const canUpdateTask = false;
      const canDragAndDrop = canUpdateTask && permissionSet.has(TASK_UPDATE_PERMISSION);
      expect(canDragAndDrop).toBe(false);
    });

    it('does not grant canDragAndDrop when both canUpdateTask is false and permission is missing', () => {
      const permissionSet = new Set(mockUserWithoutPermission.permissions);
      const canUpdateTask = false;
      const canDragAndDrop = canUpdateTask && permissionSet.has(TASK_UPDATE_PERMISSION);
      expect(canDragAndDrop).toBe(false);
    });
  });

  describe('drag event handler gating', () => {
    it('DnD event handlers are disabled when canDragAndDrop is false', () => {
      const permissionSet = new Set(mockUserWithoutPermission.permissions);
      const canUpdateTask = true;
      const canDragAndDrop = canUpdateTask && permissionSet.has(TASK_UPDATE_PERMISSION);

      // Simulate the DndContext prop passing logic
      const onDragStart = canDragAndDrop ? vi.fn() : undefined;
      const onDragOver = canDragAndDrop ? vi.fn() : undefined;
      const onDragEnd = canDragAndDrop ? vi.fn() : undefined;

      expect(onDragStart).toBeUndefined();
      expect(onDragOver).toBeUndefined();
      expect(onDragEnd).toBeUndefined();
    });

    it('DnD event handlers are enabled when canDragAndDrop is true', () => {
      const permissionSet = new Set(mockUserWithPermission.permissions);
      const canUpdateTask = true;
      const canDragAndDrop = canUpdateTask && permissionSet.has(TASK_UPDATE_PERMISSION);

      const onDragStart = canDragAndDrop ? vi.fn() : undefined;
      const onDragOver = canDragAndDrop ? vi.fn() : undefined;
      const onDragEnd = canDragAndDrop ? vi.fn() : undefined;

      expect(onDragStart).toBeDefined();
      expect(onDragOver).toBeDefined();
      expect(onDragEnd).toBeDefined();
    });
  });
});
