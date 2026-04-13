import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// --- Mock @taskforge/db ---

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockOrderBy = vi.fn();
const mockInsert = vi.fn();
const mockValues = vi.fn();

function resetChain() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: mockSelect,
    from: mockFrom,
    where: mockWhere,
    limit: mockLimit,
    orderBy: mockOrderBy,
    insert: mockInsert,
    values: mockValues,
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
  },
  activityLog: {
    id: 'activityLog.id',
    organizationId: 'activityLog.organizationId',
    actorId: 'activityLog.actorId',
    actorDisplay: 'activityLog.actorDisplay',
    entityType: 'activityLog.entityType',
    entityId: 'activityLog.entityId',
    action: 'activityLog.action',
    changes: 'activityLog.changes',
    createdAt: 'activityLog.createdAt',
  },
  users: {
    id: 'users.id',
    displayName: 'users.displayName',
  },
}));

const { log, listActivity } = await import('../activity.service.js');

const uuid1 = '00000000-0000-0000-0000-000000000001';
const uuid2 = '00000000-0000-0000-0000-000000000002';
const orgId = '00000000-0000-0000-0000-000000000099';
const now = new Date('2025-01-01T00:00:00.000Z');

describe('activity.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    resetChain();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('log', () => {
    it('should resolve actor display name and insert activity record', async () => {
      mockLimit.mockResolvedValue([{ displayName: 'Jane Doe' }]);
      mockValues.mockResolvedValue(undefined);

      await log({
        organizationId: orgId,
        actorId: uuid1,
        entityType: 'task',
        entityId: uuid2,
        action: 'created',
      });

      expect(mockInsert).toHaveBeenCalled();
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          actorId: uuid1,
          actorDisplay: 'Jane Doe',
          entityType: 'task',
          entityId: uuid2,
          action: 'created',
          changes: null,
          createdAt: now,
        }),
      );
    });

    it('should use "Unknown User" when actor is not found', async () => {
      mockLimit.mockResolvedValue([]);
      mockValues.mockResolvedValue(undefined);

      await log({
        organizationId: orgId,
        actorId: uuid1,
        entityType: 'task',
        entityId: uuid2,
        action: 'updated',
      });

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({ actorDisplay: 'Unknown User' }),
      );
    });

    it('should store before/after changes', async () => {
      mockLimit.mockResolvedValue([{ displayName: 'Jane Doe' }]);
      mockValues.mockResolvedValue(undefined);

      const changes = { status: { before: 'To Do', after: 'In Progress' } };
      await log({
        organizationId: orgId,
        actorId: uuid1,
        entityType: 'task',
        entityId: uuid2,
        action: 'status_changed',
        changes,
      });

      expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({ changes }));
    });
  });

  describe('listActivity', () => {
    it('should return paginated results by entity', async () => {
      const rows = [
        {
          id: uuid1,
          organizationId: orgId,
          actorId: uuid2,
          actorDisplay: 'Jane',
          entityType: 'task',
          entityId: uuid2,
          action: 'created',
          changes: null,
          createdAt: now,
        },
      ];

      mockLimit.mockResolvedValue(rows);

      const result = await listActivity({ entityType: 'task', entityId: uuid2 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].action).toBe('created');
      expect(result.items[0].createdAt).toBe(now.toISOString());
      expect(result.hasMore).toBe(false);
      expect(result.cursor).toBeNull();
    });

    it('should return hasMore=true and cursor when more results exist', async () => {
      // Default limit is 25, so we need 26 rows to indicate hasMore
      const rows = Array.from({ length: 26 }, (_, i) => ({
        id: `id-${i}`,
        organizationId: orgId,
        actorId: uuid1,
        actorDisplay: 'Jane',
        entityType: 'task',
        entityId: uuid2,
        action: 'updated',
        changes: null,
        createdAt: new Date(now.getTime() - i * 1000),
      }));

      mockLimit.mockResolvedValue(rows);

      const result = await listActivity({ entityType: 'task', entityId: uuid2 });

      expect(result.items).toHaveLength(25);
      expect(result.hasMore).toBe(true);
      expect(result.cursor).toBeTruthy();
    });

    it('should respect custom limit', async () => {
      const rows = Array.from({ length: 6 }, (_, i) => ({
        id: `id-${i}`,
        organizationId: orgId,
        actorId: uuid1,
        actorDisplay: 'Jane',
        entityType: 'task',
        entityId: uuid2,
        action: 'updated',
        changes: null,
        createdAt: new Date(now.getTime() - i * 1000),
      }));

      mockLimit.mockResolvedValue(rows);

      const result = await listActivity({ entityType: 'task', entityId: uuid2, limit: 5 });

      expect(result.items).toHaveLength(5);
      expect(result.hasMore).toBe(true);
    });

    it('should cap limit at 100', async () => {
      mockLimit.mockResolvedValue([]);

      await listActivity({ entityType: 'task', entityId: uuid2, limit: 200 });

      // The service should request limit+1 = 101 from DB
      expect(mockLimit).toHaveBeenCalledWith(101);
    });

    it('should decode cursor as base64url ISO date', async () => {
      const cursorDate = '2025-01-01T00:00:00.000Z';
      const cursor = Buffer.from(cursorDate).toString('base64url');

      mockLimit.mockResolvedValue([]);

      await listActivity({ entityType: 'task', entityId: uuid2, cursor });

      // Should have added a lt condition — verified by where being called
      expect(mockWhere).toHaveBeenCalled();
    });
  });
});
