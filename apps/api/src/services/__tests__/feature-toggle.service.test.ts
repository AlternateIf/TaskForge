import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSelect, mockUpdate, mockHasOrgPermission } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockUpdate: vi.fn(),
  mockHasOrgPermission: vi.fn().mockResolvedValue(true),
}));

vi.mock('@taskforge/db', () => ({
  db: {
    select: mockSelect,
    update: mockUpdate,
  },
  organizations: {
    id: 'organizations.id',
    settings: 'organizations.settings',
    updatedAt: 'organizations.updatedAt',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a, b) => ({ _type: 'eq', left: a, right: b })),
}));

vi.mock('../permission.service.js', () => ({
  hasOrgPermission: mockHasOrgPermission,
}));

import type { FeatureMap } from '../feature-toggle.service.js';
import {
  FEATURE_KEYS,
  getFeatures,
  isFeatureEnabled,
  updateFeatures,
} from '../feature-toggle.service.js';

function setupSelectChain(resolvedRows: unknown[]) {
  // db.select().from().where().limit() → resolvedRows
  const selectChain = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
  };
  mockSelect.mockReturnValueOnce(selectChain);
  selectChain.from.mockReturnValue(selectChain);
  selectChain.where.mockReturnValue(selectChain);
  selectChain.limit.mockResolvedValueOnce(resolvedRows);
}

function setupUpdateChain() {
  // db.update().set().where() → void
  const updateChain = {
    set: vi.fn(),
    where: vi.fn(),
  };
  mockUpdate.mockReturnValueOnce(updateChain);
  updateChain.set.mockReturnValue(updateChain);
  updateChain.where.mockResolvedValueOnce(undefined);
}

describe('feature-toggle.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasOrgPermission.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getFeatures', () => {
    it('should return default features when org has no settings', async () => {
      setupSelectChain([{ settings: null }]);

      const result = await getFeatures('org-1', 'user-1');

      expect(mockSelect).toHaveBeenCalled();
      expect(result).toEqual({
        notifications: true,
        file_uploads: true,
        search: true,
        comments: true,
        subtasks: true,
        dependencies: true,
        mfa: true,
      });
    });

    it('should return default features when settings has no features key', async () => {
      setupSelectChain([{ settings: { someOtherKey: 'value' } }]);

      const result = await getFeatures('org-1', 'user-1');

      expect(result.notifications).toBe(true);
      expect(result.file_uploads).toBe(true);
    });

    it('should merge stored features with defaults', async () => {
      setupSelectChain([{ settings: { features: { comments: false, search: false } } }]);

      const result = await getFeatures('org-1', 'user-1');

      expect(result.comments).toBe(false);
      expect(result.search).toBe(false);
      expect(result.notifications).toBe(true);
      expect(result.file_uploads).toBe(true);
    });

    it('should ignore unknown feature keys in stored settings', async () => {
      setupSelectChain([{ settings: { features: { unknown_feature: false, comments: false } } }]);

      const result = await getFeatures('org-1', 'user-1');

      expect(result.comments).toBe(false);
      expect('unknown_feature' in result).toBe(false);
    });

    it('should ignore non-boolean values in stored settings', async () => {
      setupSelectChain([{ settings: { features: { comments: 'yes', search: 42 } } }]);

      const result = await getFeatures('org-1', 'user-1');

      expect(result.comments).toBe(true);
      expect(result.search).toBe(true);
    });

    it('should throw 404 when organization not found', async () => {
      setupSelectChain([]);

      await expect(getFeatures('nonexistent', 'user-1')).rejects.toThrow('Organization not found');
    });

    it('should throw 403 FORBIDDEN when user lacks organization.read permission', async () => {
      mockHasOrgPermission.mockResolvedValueOnce(false);

      await expect(getFeatures('org-1', 'user-1')).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
        message: 'Insufficient permissions to view features for this organization',
      });
    });

    it('should succeed when user has organization.read permission', async () => {
      mockHasOrgPermission.mockResolvedValueOnce(true);
      setupSelectChain([{ settings: null }]);

      const result = await getFeatures('org-1', 'user-1');

      expect(result).toBeDefined();
    });
  });

  describe('updateFeatures', () => {
    it('should update specified features and return merged result', async () => {
      setupSelectChain([{ settings: { features: { comments: true } } }]);
      setupUpdateChain();

      const result = await updateFeatures('org-1', 'user-1', { comments: false, search: false });

      expect(result.comments).toBe(false);
      expect(result.search).toBe(false);
      expect(result.notifications).toBe(true);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should only accept known keys with boolean values', async () => {
      setupSelectChain([{ settings: {} }]);
      setupUpdateChain();

      const updates = { comments: false, unknown_key: true } as Partial<FeatureMap>;
      const result = await updateFeatures('org-1', 'user-1', updates);

      expect(result.comments).toBe(false);
      expect('unknown_key' in result).toBe(false);
    });

    it('should throw 404 when organization not found', async () => {
      setupSelectChain([]);

      await expect(updateFeatures('nonexistent', 'user-1', { comments: false })).rejects.toThrow(
        'Organization not found',
      );
    });

    it('should create features object when settings has none', async () => {
      setupSelectChain([{ settings: null }]);
      setupUpdateChain();

      const result = await updateFeatures('org-1', 'user-1', { mfa: false });

      expect(result.mfa).toBe(false);
      expect(result.notifications).toBe(true);
    });

    it('should throw 403 FORBIDDEN when user lacks organization.update permission', async () => {
      mockHasOrgPermission.mockResolvedValueOnce(false);

      await expect(updateFeatures('org-1', 'user-1', { comments: false })).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
        message: 'Insufficient permissions to update features for this organization',
      });
    });

    it('should succeed when user has organization.update permission', async () => {
      mockHasOrgPermission.mockResolvedValueOnce(true);
      setupSelectChain([{ settings: {} }]);
      setupUpdateChain();

      const result = await updateFeatures('org-1', 'user-1', { comments: false });

      expect(result.comments).toBe(false);
    });
  });

  describe('isFeatureEnabled', () => {
    it('should return true for an enabled feature', async () => {
      setupSelectChain([{ settings: { features: { comments: true } } }]);

      const result = await isFeatureEnabled('org-1', 'comments');

      expect(result).toBe(true);
    });

    it('should return false for a disabled feature', async () => {
      setupSelectChain([{ settings: { features: { comments: false } } }]);

      const result = await isFeatureEnabled('org-1', 'comments');

      expect(result).toBe(false);
    });

    it('should return true (default) when feature not explicitly set', async () => {
      setupSelectChain([{ settings: {} }]);

      const result = await isFeatureEnabled('org-1', 'subtasks');

      expect(result).toBe(true);
    });
  });

  describe('FEATURE_KEYS', () => {
    it('should contain all expected feature keys', () => {
      expect(FEATURE_KEYS).toContain('notifications');
      expect(FEATURE_KEYS).toContain('file_uploads');
      expect(FEATURE_KEYS).toContain('search');
      expect(FEATURE_KEYS).toContain('comments');
      expect(FEATURE_KEYS).toContain('subtasks');
      expect(FEATURE_KEYS).toContain('dependencies');
      expect(FEATURE_KEYS).toContain('mfa');
      expect(FEATURE_KEYS).toHaveLength(7);
    });
  });
});
