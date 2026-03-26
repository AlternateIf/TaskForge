import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// --- Mock @taskforge/db ---
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockUpdate = vi.fn();
const mockSet = vi.fn();
const mockDeleteFn = vi.fn();

function resetChain() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: mockSelect,
    from: mockFrom,
    where: mockWhere,
    limit: mockLimit,
    insert: mockInsert,
    values: mockValues,
    update: mockUpdate,
    set: mockSet,
    delete: mockDeleteFn,
  };
  for (const fn of Object.values(chain)) {
    fn.mockReset().mockReturnValue(chain);
  }
  return chain;
}

resetChain();

vi.mock('@taskforge/db', () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDeleteFn,
  },
  savedFilters: {
    id: 'savedFilters.id',
    userId: 'savedFilters.userId',
    organizationId: 'savedFilters.organizationId',
  },
}));

const { createSavedFilter, listSavedFilters, updateSavedFilter, deleteSavedFilter } = await import(
  '../saved-filter.service.js'
);

const userId = '00000000-0000-0000-0000-000000000001';
const orgId = '00000000-0000-0000-0000-000000000099';
const filterId = '00000000-0000-0000-0000-000000000010';
const now = new Date('2025-01-01T00:00:00.000Z');

const makeFilter = (overrides: Record<string, unknown> = {}) => ({
  id: filterId,
  userId,
  organizationId: orgId,
  name: 'My filter',
  entityType: 'task',
  filters: { status: ['open'] },
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

describe('saved-filter.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    resetChain();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createSavedFilter', () => {
    it('should insert and return a saved filter', async () => {
      mockValues.mockResolvedValue(undefined);
      mockLimit.mockResolvedValue([
        makeFilter({ name: 'My overdue tasks', filters: { assigneeId: 'me' } }),
      ]);

      const result = await createSavedFilter(userId, orgId, {
        name: 'My overdue tasks',
        entityType: 'task',
        filters: { assigneeId: 'me' },
      });

      expect(mockInsert).toHaveBeenCalled();
      expect(result.name).toBe('My overdue tasks');
      expect(result.userId).toBe(userId);
      expect(result.organizationId).toBe(orgId);
    });
  });

  describe('listSavedFilters', () => {
    it('should return filters scoped to user and org', async () => {
      mockWhere.mockResolvedValue([makeFilter({ name: 'Filter 1' })]);

      const result = await listSavedFilters(userId, orgId);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Filter 1');
    });

    it('should return empty array when no filters exist', async () => {
      mockWhere.mockResolvedValue([]);

      const result = await listSavedFilters(userId, orgId);
      expect(result).toEqual([]);
    });
  });

  describe('updateSavedFilter', () => {
    it('should update name and filters', async () => {
      let limitCallCount = 0;
      mockLimit.mockImplementation(() => {
        limitCallCount++;
        if (limitCallCount === 1) return [makeFilter()];
        return [makeFilter({ name: 'New name', filters: { status: ['done'] } })];
      });
      mockSet.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });

      const result = await updateSavedFilter(filterId, userId, {
        name: 'New name',
        filters: { status: ['done'] },
      });

      expect(result.name).toBe('New name');
    });

    it('should reject update by non-owner', async () => {
      mockLimit.mockResolvedValue([makeFilter({ userId: 'other-user' })]);

      await expect(updateSavedFilter(filterId, userId, { name: 'Hacked' })).rejects.toThrow(
        'Only the owner can update a saved filter',
      );
    });

    it('should throw if filter not found', async () => {
      mockLimit.mockResolvedValue([]);

      await expect(updateSavedFilter(filterId, userId, { name: 'X' })).rejects.toThrow(
        'Saved filter not found',
      );
    });
  });

  describe('deleteSavedFilter', () => {
    it('should delete filter owned by user', async () => {
      mockLimit.mockResolvedValue([makeFilter()]);
      // db.delete().where() is the second where call — first is from select chain
      // Since mockWhere returns the chain (which has limit), the select works.
      // The delete().where() call just needs to resolve.

      await deleteSavedFilter(filterId, userId);

      expect(mockDeleteFn).toHaveBeenCalled();
    });

    it('should reject deletion by non-owner', async () => {
      mockLimit.mockResolvedValue([makeFilter({ userId: 'other-user' })]);

      await expect(deleteSavedFilter(filterId, userId)).rejects.toThrow(
        'Only the owner can delete a saved filter',
      );
    });

    it('should throw if filter not found', async () => {
      mockLimit.mockResolvedValue([]);

      await expect(deleteSavedFilter(filterId, userId)).rejects.toThrow('Saved filter not found');
    });
  });
});
