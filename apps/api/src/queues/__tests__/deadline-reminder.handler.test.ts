import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// --- Mock @taskforge/db ---
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();

function resetChain() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: mockSelect,
    from: mockFrom,
    where: mockWhere,
    limit: mockLimit,
  };
  for (const fn of Object.values(chain)) {
    fn.mockReset().mockReturnValue(chain);
  }
  return chain;
}

resetChain();

vi.mock('@taskforge/db', () => ({
  db: { select: mockSelect },
  tasks: {
    id: 'tasks.id',
    title: 'tasks.title',
    dueDate: 'tasks.dueDate',
    assigneeId: 'tasks.assigneeId',
    projectId: 'tasks.projectId',
    deletedAt: 'tasks.deletedAt',
  },
  users: { id: 'users.id', email: 'users.email', displayName: 'users.displayName' },
  notifications: {
    id: 'notifications.id',
    userId: 'notifications.userId',
    type: 'notifications.type',
    entityType: 'notifications.entityType',
    entityId: 'notifications.entityId',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => ['eq', ...args]),
  and: vi.fn((...args: unknown[]) => ['and', ...args]),
  isNull: vi.fn((col: unknown) => ['isNull', col]),
  isNotNull: vi.fn((col: unknown) => ['isNotNull', col]),
  between: vi.fn((...args: unknown[]) => ['between', ...args]),
  not: vi.fn((col: unknown) => ['not', col]),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
}));

const mockPublish = vi.fn();
vi.mock('../publisher.js', () => ({
  publish: (...args: unknown[]) => mockPublish(...args),
}));

const { checkDeadlineReminders } = await import('../handlers/deadline-reminder.handler.js');

const now = new Date('2025-06-15T10:00:00.000Z');

describe('checkDeadlineReminders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    resetChain();
    mockPublish.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should publish notification for tasks due within 24 hours', async () => {
    const chain = { select: mockSelect, from: mockFrom, where: mockWhere, limit: mockLimit };
    // Tasks query: select().from().where() resolves to array
    mockWhere
      .mockResolvedValueOnce([
        {
          taskId: 't1',
          taskTitle: 'Review PR',
          dueDate: new Date('2025-06-16T08:00:00.000Z'),
          assigneeId: 'u1',
          projectId: 'p1',
        },
      ])
      // Check existing notification: select().from().where() returns chain for .limit()
      .mockReturnValueOnce(chain)
      // Fetch assignee: select().from().where() returns chain for .limit()
      .mockReturnValueOnce(chain);
    // Check existing — none found
    mockLimit.mockResolvedValueOnce([]);
    // Fetch assignee
    mockLimit.mockResolvedValueOnce([{ email: 'jane@example.com', displayName: 'Jane' }]);

    await checkDeadlineReminders();

    expect(mockPublish).toHaveBeenCalledWith(
      'notification.task_deadline_approaching',
      expect.objectContaining({
        eventType: 'task_deadline_approaching',
        recipientId: 'u1',
        recipientEmail: 'jane@example.com',
        title: 'Deadline approaching: Review PR',
      }),
    );
  });

  it('should skip tasks already notified', async () => {
    const chain = { select: mockSelect, from: mockFrom, where: mockWhere, limit: mockLimit };
    // Tasks query resolves to array
    mockWhere
      .mockResolvedValueOnce([
        {
          taskId: 't1',
          taskTitle: 'Review PR',
          dueDate: new Date('2025-06-16T08:00:00.000Z'),
          assigneeId: 'u1',
          projectId: 'p1',
        },
      ])
      // Check existing notification: returns chain for .limit()
      .mockReturnValueOnce(chain);
    // Check existing — found one
    mockLimit.mockResolvedValueOnce([{ id: 'n-existing' }]);

    await checkDeadlineReminders();

    expect(mockPublish).not.toHaveBeenCalled();
  });

  it('should handle no tasks due soon', async () => {
    mockWhere.mockResolvedValueOnce([]);

    await checkDeadlineReminders();

    expect(mockPublish).not.toHaveBeenCalled();
  });
});
