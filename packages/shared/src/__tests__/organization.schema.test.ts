import { describe, expect, it } from 'vitest';
import {
  addMemberSchema,
  createOrganizationSchema,
  updateMemberRoleSchema,
  updateOrganizationSchema,
} from '../schemas/organization.schema.js';

describe('organization schemas', () => {
  describe('createOrganizationSchema', () => {
    it('should accept a valid name', () => {
      const result = createOrganizationSchema.parse({ name: 'My Org' });
      expect(result.name).toBe('My Org');
    });

    it('should reject a name shorter than 2 characters', () => {
      expect(() => createOrganizationSchema.parse({ name: 'A' })).toThrow();
    });

    it('should reject a name longer than 100 characters', () => {
      expect(() => createOrganizationSchema.parse({ name: 'x'.repeat(101) })).toThrow();
    });

    it('should reject missing name', () => {
      expect(() => createOrganizationSchema.parse({})).toThrow();
    });
  });

  describe('updateOrganizationSchema', () => {
    it('should accept partial updates', () => {
      const result = updateOrganizationSchema.parse({ name: 'New Name' });
      expect(result.name).toBe('New Name');
    });

    it('should accept empty object (no changes)', () => {
      const result = updateOrganizationSchema.parse({});
      expect(result).toEqual({});
    });

    it('should accept nullable logoUrl', () => {
      const result = updateOrganizationSchema.parse({ logoUrl: null });
      expect(result.logoUrl).toBeNull();
    });

    it('should reject invalid logoUrl', () => {
      expect(() => updateOrganizationSchema.parse({ logoUrl: 'not-a-url' })).toThrow();
    });

    it('should accept settings object', () => {
      const result = updateOrganizationSchema.parse({ settings: { timezone: 'UTC' } });
      expect(result.settings).toEqual({ timezone: 'UTC' });
    });
  });

  describe('addMemberSchema', () => {
    it('should accept valid email and roleId', () => {
      const result = addMemberSchema.parse({
        email: 'user@example.com',
        roleId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.email).toBe('user@example.com');
    });

    it('should reject invalid email', () => {
      expect(() =>
        addMemberSchema.parse({
          email: 'not-email',
          roleId: '550e8400-e29b-41d4-a716-446655440000',
        }),
      ).toThrow();
    });

    it('should reject invalid roleId', () => {
      expect(() =>
        addMemberSchema.parse({
          email: 'user@example.com',
          roleId: 'not-a-uuid',
        }),
      ).toThrow();
    });
  });

  describe('updateMemberRoleSchema', () => {
    it('should accept a valid roleId', () => {
      const result = updateMemberRoleSchema.parse({
        roleId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.roleId).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should reject invalid roleId', () => {
      expect(() => updateMemberRoleSchema.parse({ roleId: 'bad' })).toThrow();
    });
  });
});
