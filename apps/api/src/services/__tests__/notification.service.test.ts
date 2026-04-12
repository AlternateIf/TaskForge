import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- Mock @taskforge/db ---
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockUpdate = vi.fn();
const mockSet = vi.fn();
const mockOrderBy = vi.fn();

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
    orderBy: mockOrderBy,
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
  },
  notifications: {
    id: 'notifications.id',
    userId: 'notifications.userId',
    type: 'notifications.type',
    title: 'notifications.title',
    body: 'notifications.body',
    entityType: 'notifications.entityType',
    entityId: 'notifications.entityId',
    readAt: 'notifications.readAt',
    createdAt: 'notifications.createdAt',
  },
  notificationPreferences: {
    id: 'notificationPreferences.id',
    userId: 'notificationPreferences.userId',
    eventType: 'notificationPreferences.eventType',
    channel: 'notificationPreferences.channel',
    enabled: 'notificationPreferences.enabled',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => ['eq', ...args]),
  and: vi.fn((...args: unknown[]) => ['and', ...args]),
  desc: vi.fn((col: unknown) => ['desc', col]),
  isNull: vi.fn((col: unknown) => ['isNull', col]),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
}));

const mockHasOrgPermission = vi.fn().mockResolvedValue(true);

vi.mock('../permission.service.js', () => ({
  hasOrgPermission: (...args: unknown[]) => mockHasOrgPermission(...args),
}));

const {
  createNotification,
  listNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  getPreferences,
  updatePreferences,
  isChannelEnabled,
} = await import('../notification.service.js');

describe('notification.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetChain();
  });

  describe('createNotification', () => {
    it('should insert a notification', async () => {
      mockValues.mockResolvedValue(undefined);

      await createNotification({
        userId: 'u1',
        type: 'task_assigned',
        title: 'You were assigned',
        body: 'Task: Fix bug',
        entityType: 'task',
        entityId: 't1',
      });

      expect(mockInsert).toHaveBeenCalled();
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
          type: 'task_assigned',
          title: 'You were assigned',
        }),
      );
    });
  });

  describe('listNotifications', () => {
    it('should return paginated notifications', async () => {
      const items = [
        { id: 'n1', userId: 'u1', createdAt: new Date('2025-01-02') },
        { id: 'n2', userId: 'u1', createdAt: new Date('2025-01-01') },
      ];
      mockLimit.mockResolvedValue(items);

      const result = await listNotifications('u1', undefined, 25);

      expect(result.items).toHaveLength(2);
      expect(result.hasMore).toBe(false);
      expect(result.cursor).toBeNull();
    });

    it('should indicate hasMore when more items exist', async () => {
      const items = Array.from({ length: 26 }, (_, i) => ({
        id: `n${i}`,
        userId: 'u1',
        createdAt: new Date(`2025-01-${String(26 - i).padStart(2, '0')}`),
      }));
      mockLimit.mockResolvedValue(items);

      const result = await listNotifications('u1', undefined, 25);

      expect(result.items).toHaveLength(25);
      expect(result.hasMore).toBe(true);
      expect(result.cursor).toBeDefined();
    });
  });

  describe('markAsRead', () => {
    it('should update readAt', async () => {
      mockWhere.mockResolvedValue(undefined);

      await markAsRead('n1', 'u1');

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ readAt: expect.any(Date) }));
    });
  });

  describe('markAllAsRead', () => {
    it('should update all unread notifications', async () => {
      mockWhere.mockResolvedValue(undefined);

      await markAllAsRead('u1');

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ readAt: expect.any(Date) }));
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      mockWhere.mockResolvedValue([{ count: 5 }]);

      const count = await getUnreadCount('u1');

      expect(count).toBe(5);
    });

    it('should return 0 when no unread', async () => {
      mockWhere.mockResolvedValue([{ count: 0 }]);

      const count = await getUnreadCount('u1');

      expect(count).toBe(0);
    });
  });

  describe('getPreferences', () => {
    it('should return defaults when no overrides exist', async () => {
      mockWhere.mockResolvedValue([]);

      const prefs = await getPreferences('u1');

      expect(prefs.task_assigned).toEqual({ in_app: true, email: true });
      expect(prefs.task_status_changed).toEqual({ in_app: true, email: false });
      expect(prefs.comment_mentioned).toEqual({ in_app: true, email: true });
    });

    it('should apply user overrides on top of defaults', async () => {
      mockWhere.mockResolvedValue([
        { eventType: 'task_assigned', channel: 'email', enabled: false },
      ]);

      const prefs = await getPreferences('u1');

      expect(prefs.task_assigned).toEqual({ in_app: true, email: false });
    });
  });

  describe('updatePreferences', () => {
    it('should insert new preference when none exists', async () => {
      const chain = {
        select: mockSelect,
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
        insert: mockInsert,
        values: mockValues,
        update: mockUpdate,
        set: mockSet,
        orderBy: mockOrderBy,
      };
      // select().from().where() must return chain so .limit() works
      // Then limit resolves to empty (no existing pref)
      mockWhere.mockReturnValueOnce(chain);
      mockLimit.mockResolvedValueOnce([]);
      // insert().values() resolves
      mockValues.mockResolvedValueOnce(undefined);
      // getPreferences: select().from().where() resolves to empty
      mockWhere.mockResolvedValueOnce([]);

      const prefs = await updatePreferences('u1', { task_assigned: { email: false } });

      expect(mockInsert).toHaveBeenCalled();
      expect(prefs.task_assigned).toBeDefined();
    });

    it('should update existing preference', async () => {
      const chain = {
        select: mockSelect,
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
        insert: mockInsert,
        values: mockValues,
        update: mockUpdate,
        set: mockSet,
        orderBy: mockOrderBy,
      };
      // select().from().where() must return chain so .limit() works
      mockWhere.mockReturnValueOnce(chain);
      mockLimit.mockResolvedValueOnce([{ id: 'pref1', enabled: true }]);
      // update().set().where() resolves
      mockWhere.mockResolvedValueOnce(undefined);
      // getPreferences: select().from().where() resolves
      mockWhere.mockResolvedValueOnce([
        { eventType: 'task_assigned', channel: 'email', enabled: false },
      ]);

      const prefs = await updatePreferences('u1', { task_assigned: { email: false } });

      expect(mockUpdate).toHaveBeenCalled();
      expect(prefs.task_assigned.email).toBe(false);
    });
  });

  describe('isChannelEnabled', () => {
    it('should return user override when it exists', async () => {
      mockLimit.mockResolvedValue([{ enabled: false }]);

      const enabled = await isChannelEnabled('u1', 'task_assigned', 'email');

      expect(enabled).toBe(false);
    });

    it('should return default when no override exists', async () => {
      mockLimit.mockResolvedValue([]);

      const enabled = await isChannelEnabled('u1', 'task_status_changed', 'email');

      expect(enabled).toBe(false); // Default for status_changed email is false
    });

    it('should return true for in_app by default', async () => {
      mockLimit.mockResolvedValue([]);

      const enabled = await isChannelEnabled('u1', 'task_assigned', 'in_app');

      expect(enabled).toBe(true);
    });
  });
});
