import { describe, expect, it } from 'vitest';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginInputSchema,
  registerInputSchema,
  resetPasswordSchema,
  updateProfileSchema,
  verifyEmailSchema,
} from '../schemas/user.schema.js';

describe('user schemas', () => {
  describe('registerInputSchema', () => {
    const valid = { email: 'user@example.com', password: 'Test1234', displayName: 'Test User' };

    it('accepts valid input', () => {
      expect(registerInputSchema.parse(valid)).toEqual(valid);
    });

    it('rejects invalid email', () => {
      const result = registerInputSchema.safeParse({ ...valid, email: 'not-email' });
      expect(result.success).toBe(false);
    });

    it('rejects password shorter than 8 chars', () => {
      const result = registerInputSchema.safeParse({ ...valid, password: 'Te1' });
      expect(result.success).toBe(false);
    });

    it('rejects password without uppercase', () => {
      const result = registerInputSchema.safeParse({ ...valid, password: 'test1234' });
      expect(result.success).toBe(false);
    });

    it('rejects password without lowercase', () => {
      const result = registerInputSchema.safeParse({ ...valid, password: 'TEST1234' });
      expect(result.success).toBe(false);
    });

    it('rejects password without number', () => {
      const result = registerInputSchema.safeParse({ ...valid, password: 'Testtest' });
      expect(result.success).toBe(false);
    });

    it('rejects display name shorter than 2 chars', () => {
      const result = registerInputSchema.safeParse({ ...valid, displayName: 'A' });
      expect(result.success).toBe(false);
    });

    it('rejects display name longer than 100 chars', () => {
      const result = registerInputSchema.safeParse({ ...valid, displayName: 'A'.repeat(101) });
      expect(result.success).toBe(false);
    });

    it('accepts display name at boundary (2 chars)', () => {
      expect(registerInputSchema.parse({ ...valid, displayName: 'AB' })).toBeTruthy();
    });

    it('accepts display name at boundary (100 chars)', () => {
      expect(registerInputSchema.parse({ ...valid, displayName: 'A'.repeat(100) })).toBeTruthy();
    });
  });

  describe('loginInputSchema', () => {
    it('accepts valid input', () => {
      const input = { email: 'user@example.com', password: 'anything' };
      expect(loginInputSchema.parse(input)).toEqual(input);
    });

    it('rejects invalid email', () => {
      const result = loginInputSchema.safeParse({ email: 'bad', password: 'x' });
      expect(result.success).toBe(false);
    });

    it('rejects empty password', () => {
      const result = loginInputSchema.safeParse({ email: 'a@b.com', password: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('forgotPasswordSchema', () => {
    it('accepts valid email', () => {
      expect(forgotPasswordSchema.parse({ email: 'a@b.com' })).toEqual({ email: 'a@b.com' });
    });

    it('rejects invalid email', () => {
      expect(forgotPasswordSchema.safeParse({ email: 'nope' }).success).toBe(false);
    });
  });

  describe('resetPasswordSchema', () => {
    it('accepts valid input', () => {
      const input = { token: 'abc123', password: 'NewPass1' };
      expect(resetPasswordSchema.parse(input)).toEqual(input);
    });

    it('rejects empty token', () => {
      expect(resetPasswordSchema.safeParse({ token: '', password: 'NewPass1' }).success).toBe(
        false,
      );
    });

    it('rejects weak password', () => {
      expect(resetPasswordSchema.safeParse({ token: 'abc', password: 'weak' }).success).toBe(false);
    });
  });

  describe('verifyEmailSchema', () => {
    it('accepts valid token', () => {
      expect(verifyEmailSchema.parse({ token: 'abc' })).toEqual({ token: 'abc' });
    });

    it('rejects empty token', () => {
      expect(verifyEmailSchema.safeParse({ token: '' }).success).toBe(false);
    });
  });

  describe('updateProfileSchema', () => {
    it('accepts empty object (all optional)', () => {
      expect(updateProfileSchema.parse({})).toEqual({});
    });

    it('accepts displayName only', () => {
      expect(updateProfileSchema.parse({ displayName: 'New Name' })).toEqual({
        displayName: 'New Name',
      });
    });

    it('accepts avatarUrl as valid URL', () => {
      expect(
        updateProfileSchema.parse({ avatarUrl: 'https://img.example.com/a.png' }),
      ).toBeTruthy();
    });

    it('accepts avatarUrl as null', () => {
      expect(updateProfileSchema.parse({ avatarUrl: null })).toEqual({ avatarUrl: null });
    });

    it('rejects avatarUrl as invalid URL', () => {
      expect(updateProfileSchema.safeParse({ avatarUrl: 'not-a-url' }).success).toBe(false);
    });

    it('rejects displayName shorter than 2 chars', () => {
      expect(updateProfileSchema.safeParse({ displayName: 'A' }).success).toBe(false);
    });
  });

  describe('changePasswordSchema', () => {
    it('accepts valid input', () => {
      const input = { currentPassword: 'old', newPassword: 'NewPass1' };
      expect(changePasswordSchema.parse(input)).toEqual(input);
    });

    it('rejects empty currentPassword', () => {
      expect(
        changePasswordSchema.safeParse({ currentPassword: '', newPassword: 'NewPass1' }).success,
      ).toBe(false);
    });

    it('rejects weak newPassword', () => {
      expect(
        changePasswordSchema.safeParse({ currentPassword: 'old', newPassword: 'weak' }).success,
      ).toBe(false);
    });
  });
});
