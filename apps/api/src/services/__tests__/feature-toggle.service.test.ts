import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSelect } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
}));

vi.mock('@taskforge/db', () => ({
  db: {
    select: mockSelect,
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

import { FEATURE_KEYS, isFeatureEnabled } from '../feature-toggle.service.js';

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

describe('feature-toggle.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
