import { describe, expect, it } from 'vitest';
import {
  addProjectMemberSchema,
  createLabelSchema,
  createProjectSchema,
  createWorkflowStatusSchema,
  updateLabelSchema,
  updateProjectMemberSchema,
  updateProjectSchema,
  updateWorkflowStatusSchema,
} from '../schemas/project.schema.js';

describe('project schemas', () => {
  describe('createProjectSchema', () => {
    it('should accept a valid project', () => {
      const result = createProjectSchema.parse({ name: 'My Project' });
      expect(result.name).toBe('My Project');
    });

    it('should accept all optional fields', () => {
      const result = createProjectSchema.parse({
        name: 'My Project',
        description: 'A description',
        color: '#ff0000',
        icon: 'rocket',
      });
      expect(result.description).toBe('A description');
      expect(result.color).toBe('#ff0000');
      expect(result.icon).toBe('rocket');
    });

    it('should reject a name shorter than 2 characters', () => {
      expect(() => createProjectSchema.parse({ name: 'A' })).toThrow();
    });

    it('should reject missing name', () => {
      expect(() => createProjectSchema.parse({})).toThrow();
    });

    it('should reject invalid hex color', () => {
      expect(() => createProjectSchema.parse({ name: 'Test', color: 'red' })).toThrow();
      expect(() => createProjectSchema.parse({ name: 'Test', color: '#gg0000' })).toThrow();
      expect(() => createProjectSchema.parse({ name: 'Test', color: '#fff' })).toThrow();
    });
  });

  describe('updateProjectSchema', () => {
    it('should accept partial updates', () => {
      const result = updateProjectSchema.parse({ name: 'New Name' });
      expect(result.name).toBe('New Name');
    });

    it('should accept empty object', () => {
      const result = updateProjectSchema.parse({});
      expect(result).toEqual({});
    });

    it('should accept null for nullable fields', () => {
      const result = updateProjectSchema.parse({ description: null, color: null, icon: null });
      expect(result.description).toBeNull();
      expect(result.color).toBeNull();
      expect(result.icon).toBeNull();
    });
  });

  describe('addProjectMemberSchema', () => {
    it('should accept a valid userId', () => {
      const result = addProjectMemberSchema.parse({
        userId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.userId).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should reject invalid UUID', () => {
      expect(() => addProjectMemberSchema.parse({ userId: 'not-a-uuid' })).toThrow();
    });

    it('should accept optional roleId', () => {
      const result = addProjectMemberSchema.parse({
        userId: '550e8400-e29b-41d4-a716-446655440000',
        roleId: '660e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.roleId).toBe('660e8400-e29b-41d4-a716-446655440000');
    });
  });

  describe('updateProjectMemberSchema', () => {
    it('should accept a valid roleId', () => {
      const result = updateProjectMemberSchema.parse({
        roleId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.roleId).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should accept null roleId', () => {
      const result = updateProjectMemberSchema.parse({ roleId: null });
      expect(result.roleId).toBeNull();
    });
  });

  describe('createWorkflowStatusSchema', () => {
    it('should accept a valid status', () => {
      const result = createWorkflowStatusSchema.parse({ name: 'To Do' });
      expect(result.name).toBe('To Do');
    });

    it('should reject empty name', () => {
      expect(() => createWorkflowStatusSchema.parse({ name: '' })).toThrow();
    });

    it('should accept optional boolean flags', () => {
      const result = createWorkflowStatusSchema.parse({
        name: 'Done',
        isInitial: false,
        isFinal: true,
        color: '#00ff00',
      });
      expect(result.isFinal).toBe(true);
      expect(result.isInitial).toBe(false);
    });
  });

  describe('updateWorkflowStatusSchema', () => {
    it('should accept partial updates', () => {
      const result = updateWorkflowStatusSchema.parse({ position: 3 });
      expect(result.position).toBe(3);
    });

    it('should reject negative position', () => {
      expect(() => updateWorkflowStatusSchema.parse({ position: -1 })).toThrow();
    });

    it('should reject non-integer position', () => {
      expect(() => updateWorkflowStatusSchema.parse({ position: 1.5 })).toThrow();
    });
  });

  describe('createLabelSchema', () => {
    it('should accept a valid label', () => {
      const result = createLabelSchema.parse({ name: 'Bug' });
      expect(result.name).toBe('Bug');
    });

    it('should reject empty name', () => {
      expect(() => createLabelSchema.parse({ name: '' })).toThrow();
    });

    it('should accept optional color', () => {
      const result = createLabelSchema.parse({ name: 'Bug', color: '#ff0000' });
      expect(result.color).toBe('#ff0000');
    });
  });

  describe('updateLabelSchema', () => {
    it('should accept partial updates', () => {
      const result = updateLabelSchema.parse({ name: 'Feature' });
      expect(result.name).toBe('Feature');
    });

    it('should accept null color', () => {
      const result = updateLabelSchema.parse({ color: null });
      expect(result.color).toBeNull();
    });
  });
});
