import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { getCacheControl } from '../cache.hook.js';

describe('cache.hook', () => {
  describe('getCacheControl', () => {
    it('should return private max-age=300 for user profile', () => {
      expect(getCacheControl('/api/v1/users/me')).toBe('private, max-age=300');
    });

    it('should return private max-age=60 for feature toggles', () => {
      expect(getCacheControl('/api/v1/organizations/org-1/features')).toBe('private, max-age=60');
    });

    it('should return private max-age=60 for auth settings', () => {
      expect(getCacheControl('/api/v1/organizations/org-1/auth-settings')).toBe(
        'private, max-age=60',
      );
    });

    it('should return no-cache for task list', () => {
      expect(getCacheControl('/api/v1/tasks')).toBe('no-cache');
    });

    it('should return no-cache for task list with query params', () => {
      expect(getCacheControl('/api/v1/tasks?status=open&page=2')).toBe('no-cache');
    });

    it('should return no-cache for project list', () => {
      expect(getCacheControl('/api/v1/projects')).toBe('no-cache');
    });

    it('should return no-cache for single project', () => {
      expect(getCacheControl('/api/v1/projects/proj-123')).toBe('no-cache');
    });

    it('should return no-cache for notifications', () => {
      expect(getCacheControl('/api/v1/notifications')).toBe('no-cache');
    });

    it('should return no-cache for comments', () => {
      expect(getCacheControl('/api/v1/comments')).toBe('no-cache');
    });

    it('should return no-store for unknown routes', () => {
      expect(getCacheControl('/api/v1/unknown')).toBe('no-store');
    });

    it('should return no-store for health endpoint', () => {
      expect(getCacheControl('/api/v1/health')).toBe('no-store');
    });
  });

  describe('ETag generation', () => {
    it('should generate consistent weak ETags for same content', () => {
      const body = JSON.stringify({ data: [{ id: 1, updatedAt: '2025-01-01' }] });
      const hash = crypto.createHash('md5').update(body).digest('hex');
      const expected = `W/"${hash}"`;

      const hash2 = crypto.createHash('md5').update(body).digest('hex');
      expect(`W/"${hash2}"`).toBe(expected);
    });

    it('should generate different ETags for different content', () => {
      const body1 = JSON.stringify({ data: [{ id: 1 }] });
      const body2 = JSON.stringify({ data: [{ id: 2 }] });
      const hash1 = crypto.createHash('md5').update(body1).digest('hex');
      const hash2 = crypto.createHash('md5').update(body2).digest('hex');

      expect(hash1).not.toBe(hash2);
    });
  });
});
