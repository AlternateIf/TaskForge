import { describe, expect, it } from 'vitest';
import {
  addTaskLabelSchema,
  assignTaskSchema,
  createTaskSchema,
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
      expect(result.position).toBe(1000);
    });

    it('should accept position with statusId', () => {
      const result = updateTaskPositionSchema.parse({ position: 0, statusId: validUuid });
      expect(result.position).toBe(0);
      expect(result.statusId).toBe(validUuid);
    });

    it('should reject negative position', () => {
      expect(() => updateTaskPositionSchema.parse({ position: -1 })).toThrow();
    });

    it('should reject non-integer position', () => {
      expect(() => updateTaskPositionSchema.parse({ position: 1.5 })).toThrow();
    });

    it('should reject missing position', () => {
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
});
