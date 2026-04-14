import { describe, expect, it } from 'vitest';
import {
  addTaskLabelSchema,
  assignTaskSchema,
  bulkActionSchema,
  createChecklistItemSchema,
  createChecklistSchema,
  createDependencySchema,
  createSubtaskSchema,
  createTaskSchema,
  undoSchema,
  updateChecklistItemSchema,
  updateChecklistSchema,
  updateTaskPositionSchema,
  updateTaskSchema,
} from '../schemas/task.schema.js';

const validUuid = '550e8400-e29b-41d4-a716-446655440000';

describe('task schemas', () => {
  describe('createTaskSchema', () => {
    it('should accept a minimal task (title only)', () => {
      const result = createTaskSchema.parse({ title: 'Fix bug' });
      expect(result.title).toBe('Fix bug');
    });

    it('should accept all optional fields', () => {
      const result = createTaskSchema.parse({
        title: 'Fix bug',
        description: 'The login form crashes',
        statusId: validUuid,
        priority: 'high',
        assigneeId: validUuid,
        dueDate: '2026-04-01T00:00:00.000Z',
        startDate: '2026-03-25T00:00:00.000Z',
        estimatedHours: 4,
        parentTaskId: validUuid,
        labelIds: [validUuid],
      });
      expect(result.priority).toBe('high');
      expect(result.estimatedHours).toBe(4);
      expect(result.labelIds).toHaveLength(1);
    });

    it('should reject empty title', () => {
      expect(() => createTaskSchema.parse({ title: '' })).toThrow();
    });

    it('should reject missing title', () => {
      expect(() => createTaskSchema.parse({})).toThrow();
    });

    it('should reject title longer than 500 characters', () => {
      expect(() => createTaskSchema.parse({ title: 'x'.repeat(501) })).toThrow();
    });

    it('should reject invalid priority', () => {
      expect(() => createTaskSchema.parse({ title: 'Test', priority: 'urgent' })).toThrow();
    });

    it('should accept all valid priorities', () => {
      for (const priority of ['none', 'low', 'medium', 'high', 'critical']) {
        const result = createTaskSchema.parse({ title: 'Test', priority });
        expect(result.priority).toBe(priority);
      }
    });

    it('should reject invalid UUID for assigneeId', () => {
      expect(() => createTaskSchema.parse({ title: 'Test', assigneeId: 'not-uuid' })).toThrow();
    });

    it('should accept null assigneeId', () => {
      const result = createTaskSchema.parse({ title: 'Test', assigneeId: null });
      expect(result.assigneeId).toBeNull();
    });

    it('should reject invalid date format', () => {
      expect(() => createTaskSchema.parse({ title: 'Test', dueDate: '2026-04-01' })).toThrow();
    });

    it('should reject negative estimatedHours', () => {
      expect(() => createTaskSchema.parse({ title: 'Test', estimatedHours: -1 })).toThrow();
    });

    it('should reject invalid UUID in labelIds', () => {
      expect(() => createTaskSchema.parse({ title: 'Test', labelIds: ['not-uuid'] })).toThrow();
    });
  });

  describe('updateTaskSchema', () => {
    it('should accept empty object', () => {
      const result = updateTaskSchema.parse({});
      expect(result).toEqual({});
    });

    it('should accept partial updates', () => {
      const result = updateTaskSchema.parse({ title: 'Updated title', priority: 'low' });
      expect(result.title).toBe('Updated title');
      expect(result.priority).toBe('low');
    });

    it('should accept null for nullable fields', () => {
      const result = updateTaskSchema.parse({
        description: null,
        assigneeId: null,
        dueDate: null,
        startDate: null,
        estimatedHours: null,
        parentTaskId: null,
      });
      expect(result.description).toBeNull();
      expect(result.assigneeId).toBeNull();
    });

    it('should reject empty title', () => {
      expect(() => updateTaskSchema.parse({ title: '' })).toThrow();
    });
  });

  describe('assignTaskSchema', () => {
    it('should accept a valid assigneeId', () => {
      const result = assignTaskSchema.parse({ assigneeId: validUuid });
      expect(result.assigneeId).toBe(validUuid);
    });

    it('should accept null to unassign', () => {
      const result = assignTaskSchema.parse({ assigneeId: null });
      expect(result.assigneeId).toBeNull();
    });

    it('should reject invalid UUID', () => {
      expect(() => assignTaskSchema.parse({ assigneeId: 'not-uuid' })).toThrow();
    });

    it('should reject missing assigneeId', () => {
      expect(() => assignTaskSchema.parse({})).toThrow();
    });
  });

  describe('updateTaskPositionSchema', () => {
    it('should accept valid position', () => {
      const result = updateTaskPositionSchema.parse({ position: 1000 });
      expect('position' in result && result.position).toBe(1000);
    });

    it('should accept position with statusId', () => {
      const result = updateTaskPositionSchema.parse({ position: 0, statusId: validUuid });
      expect('position' in result && result.position).toBe(0);
      expect(result.statusId).toBe(validUuid);
    });

    it('should accept anchor move with status only', () => {
      const result = updateTaskPositionSchema.parse({ statusId: validUuid });
      expect(result.statusId).toBe(validUuid);
    });

    it('should accept anchor move with before/after task IDs', () => {
      const result = updateTaskPositionSchema.parse({
        beforeTaskId: validUuid,
        afterTaskId: validUuid,
      });
      expect('beforeTaskId' in result && result.beforeTaskId).toBe(validUuid);
      expect('afterTaskId' in result && result.afterTaskId).toBe(validUuid);
    });

    it('should reject negative position', () => {
      expect(() => updateTaskPositionSchema.parse({ position: -1 })).toThrow();
    });

    it('should reject non-integer position', () => {
      expect(() => updateTaskPositionSchema.parse({ position: 1.5 })).toThrow();
    });

    it('should reject missing position and missing anchors', () => {
      expect(() => updateTaskPositionSchema.parse({})).toThrow();
    });
  });

  describe('addTaskLabelSchema', () => {
    it('should accept a valid labelId', () => {
      const result = addTaskLabelSchema.parse({ labelId: validUuid });
      expect(result.labelId).toBe(validUuid);
    });

    it('should reject invalid UUID', () => {
      expect(() => addTaskLabelSchema.parse({ labelId: 'not-uuid' })).toThrow();
    });

    it('should reject missing labelId', () => {
      expect(() => addTaskLabelSchema.parse({})).toThrow();
    });
  });

  // --- Subtask schemas ---

  describe('createSubtaskSchema', () => {
    it('should accept minimal subtask (title only)', () => {
      const result = createSubtaskSchema.parse({ title: 'Subtask' });
      expect(result.title).toBe('Subtask');
    });

    it('should accept all optional fields', () => {
      const result = createSubtaskSchema.parse({
        title: 'Subtask',
        description: 'Details',
        statusId: validUuid,
        priority: 'high',
        assigneeId: validUuid,
        dueDate: '2026-04-01T00:00:00.000Z',
        startDate: '2026-03-25T00:00:00.000Z',
        estimatedHours: 2,
        labelIds: [validUuid],
      });
      expect(result.priority).toBe('high');
      expect(result.labelIds).toHaveLength(1);
    });

    it('should reject empty title', () => {
      expect(() => createSubtaskSchema.parse({ title: '' })).toThrow();
    });

    it('should reject missing title', () => {
      expect(() => createSubtaskSchema.parse({})).toThrow();
    });

    it('should reject invalid priority', () => {
      expect(() => createSubtaskSchema.parse({ title: 'Sub', priority: 'urgent' })).toThrow();
    });
  });

  // --- Checklist schemas ---

  describe('createChecklistSchema', () => {
    it('should accept a valid title', () => {
      const result = createChecklistSchema.parse({ title: 'QA Checklist' });
      expect(result.title).toBe('QA Checklist');
    });

    it('should reject empty title', () => {
      expect(() => createChecklistSchema.parse({ title: '' })).toThrow();
    });

    it('should reject missing title', () => {
      expect(() => createChecklistSchema.parse({})).toThrow();
    });

    it('should reject title longer than 255 characters', () => {
      expect(() => createChecklistSchema.parse({ title: 'x'.repeat(256) })).toThrow();
    });
  });

  describe('updateChecklistSchema', () => {
    it('should accept empty object', () => {
      const result = updateChecklistSchema.parse({});
      expect(result).toEqual({});
    });

    it('should accept title update', () => {
      const result = updateChecklistSchema.parse({ title: 'Renamed' });
      expect(result.title).toBe('Renamed');
    });

    it('should accept position update', () => {
      const result = updateChecklistSchema.parse({ position: 2 });
      expect(result.position).toBe(2);
    });

    it('should reject negative position', () => {
      expect(() => updateChecklistSchema.parse({ position: -1 })).toThrow();
    });

    it('should reject non-integer position', () => {
      expect(() => updateChecklistSchema.parse({ position: 1.5 })).toThrow();
    });
  });

  describe('createChecklistItemSchema', () => {
    it('should accept a valid title', () => {
      const result = createChecklistItemSchema.parse({ title: 'Write tests' });
      expect(result.title).toBe('Write tests');
    });

    it('should reject empty title', () => {
      expect(() => createChecklistItemSchema.parse({ title: '' })).toThrow();
    });

    it('should reject missing title', () => {
      expect(() => createChecklistItemSchema.parse({})).toThrow();
    });

    it('should reject title longer than 500 characters', () => {
      expect(() => createChecklistItemSchema.parse({ title: 'x'.repeat(501) })).toThrow();
    });
  });

  describe('updateChecklistItemSchema', () => {
    it('should accept empty object', () => {
      const result = updateChecklistItemSchema.parse({});
      expect(result).toEqual({});
    });

    it('should accept title update', () => {
      const result = updateChecklistItemSchema.parse({ title: 'Updated' });
      expect(result.title).toBe('Updated');
    });

    it('should accept isCompleted toggle', () => {
      const result = updateChecklistItemSchema.parse({ isCompleted: true });
      expect(result.isCompleted).toBe(true);
    });

    it('should accept position update', () => {
      const result = updateChecklistItemSchema.parse({ position: 0 });
      expect(result.position).toBe(0);
    });

    it('should reject negative position', () => {
      expect(() => updateChecklistItemSchema.parse({ position: -1 })).toThrow();
    });

    it('should reject non-boolean isCompleted', () => {
      expect(() => updateChecklistItemSchema.parse({ isCompleted: 'yes' })).toThrow();
    });
  });

  // --- Dependency schemas ---

  describe('createDependencySchema', () => {
    it('should accept a valid dependency', () => {
      const result = createDependencySchema.parse({
        dependsOnTaskId: validUuid,
        type: 'blocked_by',
      });
      expect(result.dependsOnTaskId).toBe(validUuid);
      expect(result.type).toBe('blocked_by');
    });

    it('should reject invalid UUID for dependsOnTaskId', () => {
      expect(() =>
        createDependencySchema.parse({ dependsOnTaskId: 'not-uuid', type: 'blocked_by' }),
      ).toThrow();
    });

    it('should reject missing dependsOnTaskId', () => {
      expect(() => createDependencySchema.parse({ type: 'blocked_by' })).toThrow();
    });

    it('should reject missing type', () => {
      expect(() => createDependencySchema.parse({ dependsOnTaskId: validUuid })).toThrow();
    });

    it('should reject invalid type', () => {
      expect(() =>
        createDependencySchema.parse({ dependsOnTaskId: validUuid, type: 'blocks' }),
      ).toThrow();
    });
  });

  // --- Bulk action schemas ---

  describe('bulkActionSchema', () => {
    it('should accept a valid bulk updateStatus', () => {
      const result = bulkActionSchema.parse({
        action: 'updateStatus',
        ids: [validUuid],
        data: { statusId: validUuid },
      });
      expect(result.action).toBe('updateStatus');
      expect(result.ids).toHaveLength(1);
    });

    it('should accept a valid bulk assign', () => {
      const result = bulkActionSchema.parse({
        action: 'assign',
        ids: [validUuid],
        data: { assigneeId: validUuid },
      });
      expect(result.action).toBe('assign');
    });

    it('should accept bulk delete without data', () => {
      const result = bulkActionSchema.parse({
        action: 'delete',
        ids: [validUuid],
      });
      expect(result.action).toBe('delete');
    });

    it('should reject empty ids array', () => {
      expect(() => bulkActionSchema.parse({ action: 'delete', ids: [] })).toThrow();
    });

    it('should reject more than 100 ids', () => {
      const ids = Array.from({ length: 101 }, () => validUuid);
      expect(() => bulkActionSchema.parse({ action: 'delete', ids })).toThrow();
    });

    it('should reject invalid action', () => {
      expect(() => bulkActionSchema.parse({ action: 'archive', ids: [validUuid] })).toThrow();
    });

    it('should reject invalid UUID in ids', () => {
      expect(() => bulkActionSchema.parse({ action: 'delete', ids: ['not-uuid'] })).toThrow();
    });

    it('should accept all valid actions', () => {
      for (const action of [
        'updateStatus',
        'assign',
        'updatePriority',
        'addLabel',
        'delete',
        'moveToProject',
      ]) {
        const result = bulkActionSchema.parse({ action, ids: [validUuid] });
        expect(result.action).toBe(action);
      }
    });
  });

  describe('undoSchema', () => {
    it('should accept a valid undo token', () => {
      const result = undoSchema.parse({ undoToken: 'abc-123' });
      expect(result.undoToken).toBe('abc-123');
    });

    it('should reject empty undo token', () => {
      expect(() => undoSchema.parse({ undoToken: '' })).toThrow();
    });

    it('should reject missing undo token', () => {
      expect(() => undoSchema.parse({})).toThrow();
    });
  });
});
