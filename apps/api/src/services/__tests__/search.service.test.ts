import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- Mock Meilisearch ---
const mockSearch = vi.fn();
const mockAddDocuments = vi.fn();
const mockDeleteDocument = vi.fn();
const mockUpdateSettings = vi.fn();

const mockIndex = vi.fn().mockReturnValue({
  search: mockSearch,
  addDocuments: mockAddDocuments,
  deleteDocument: mockDeleteDocument,
  updateSettings: mockUpdateSettings,
});

vi.mock('meilisearch', () => ({
  MeiliSearch: class {
    index = mockIndex;
  },
}));

// --- Mock @taskforge/db ---
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockInnerJoin = vi.fn();
const mockLeftJoin = vi.fn();

function resetChain() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: mockSelect,
    from: mockFrom,
    where: mockWhere,
    limit: mockLimit,
    innerJoin: mockInnerJoin,
    leftJoin: mockLeftJoin,
  };
  for (const fn of Object.values(chain)) {
    fn.mockReset().mockReturnValue(chain);
  }
  return chain;
}

resetChain();

vi.mock('@taskforge/db', () => ({
  db: { select: mockSelect },
  tasks: { id: 'tasks.id', projectId: 'tasks.projectId', deletedAt: 'tasks.deletedAt' },
  projects: { id: 'projects.id', name: 'projects.name', deletedAt: 'projects.deletedAt' },
  comments: { id: 'comments.id', deletedAt: 'comments.deletedAt' },
  users: { id: 'users.id', displayName: 'users.displayName' },
  workflowStatuses: { id: 'workflowStatuses.id', name: 'workflowStatuses.name' },
  labels: { name: 'labels.name' },
  taskLabels: { taskId: 'taskLabels.taskId', labelId: 'taskLabels.labelId' },
  organizationMembers: {
    organizationId: 'organizationMembers.organizationId',
    userId: 'organizationMembers.userId',
  },
}));

const {
  initIndexes,
  globalSearch,
  resolveDynamicFilters,
  indexTask,
  removeTask,
  indexProject,
  removeProject,
  indexComment,
  removeComment,
} = await import('../search.service.js');

describe('search.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetChain();
    mockUpdateSettings.mockResolvedValue({ taskUid: 1 });
    mockAddDocuments.mockResolvedValue({ taskUid: 1 });
    mockDeleteDocument.mockResolvedValue({ taskUid: 1 });
  });

  describe('initIndexes', () => {
    it('should configure all three indexes', async () => {
      await initIndexes();

      expect(mockIndex).toHaveBeenCalledWith('tasks');
      expect(mockIndex).toHaveBeenCalledWith('projects');
      expect(mockIndex).toHaveBeenCalledWith('comments');
      expect(mockUpdateSettings).toHaveBeenCalledTimes(3);
    });

    it('should set searchable and filterable attributes on tasks index', async () => {
      await initIndexes();

      expect(mockUpdateSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          searchableAttributes: ['title', 'description', 'projectName'],
          filterableAttributes: expect.arrayContaining([
            'status',
            'priority',
            'assigneeId',
            'labels',
            'projectId',
            'dueDate',
          ]),
          sortableAttributes: expect.arrayContaining(['dueDate', 'priority', 'createdAt']),
        }),
      );
    });
  });

  describe('globalSearch', () => {
    it('should search across task and project types by default', async () => {
      // Mock project membership
      mockWhere.mockResolvedValueOnce([{ projectId: 'p1' }, { projectId: 'p2' }]);

      mockSearch.mockResolvedValue({ hits: [], estimatedTotalHits: 0 });

      const result = await globalSearch({
        query: 'test',
        userId: 'user1',
      });

      expect(result.tasks).toBeDefined();
      expect(result.projects).toBeDefined();
      expect(result.comments).toBeDefined();
      expect(mockSearch).toHaveBeenCalledTimes(2);
    });

    it('should return empty results if user has no project access', async () => {
      mockWhere.mockResolvedValueOnce([]);

      const result = await globalSearch({
        query: 'test',
        userId: 'user1',
      });

      expect(result.tasks.hits).toEqual([]);
      expect(result.projects.hits).toEqual([]);
      expect(result.comments.hits).toEqual([]);
      expect(mockSearch).not.toHaveBeenCalled();
    });

    it('should filter by specific types when provided', async () => {
      mockWhere.mockResolvedValueOnce([{ projectId: 'p1' }]);
      mockSearch.mockResolvedValue({ hits: [{ id: 't1' }], estimatedTotalHits: 1 });

      const result = await globalSearch({
        query: 'bug',
        types: ['task'],
        userId: 'user1',
      });

      expect(result.tasks.totalHits).toBe(1);
      expect(mockSearch).toHaveBeenCalledTimes(1);
    });

    it('should filter by projectId when provided', async () => {
      const validProjectId = '00000000-0000-0000-0000-000000000001';
      mockWhere.mockResolvedValueOnce([{ projectId: validProjectId }]);
      mockSearch.mockResolvedValue({ hits: [], estimatedTotalHits: 0 });

      await globalSearch({
        query: 'test',
        types: ['task'],
        projectId: validProjectId,
        userId: 'user1',
      });

      expect(mockSearch).toHaveBeenCalledWith('test', {
        filter: `projectId = "${validProjectId}"`,
        limit: 100,
      });
    });

    it('should return empty results for non-accessible projectId', async () => {
      mockWhere.mockResolvedValueOnce([{ projectId: 'p1' }]);

      const result = await globalSearch({
        query: 'test',
        types: ['task'],
        projectId: '00000000-0000-0000-0000-000000000999',
        userId: 'user1',
      });

      // projectId not in accessible list → empty results
      expect(result.tasks.hits).toEqual([]);
      expect(mockSearch).not.toHaveBeenCalled();
    });
  });

  describe('indexTask', () => {
    it('should remove from index if task is deleted/not found', async () => {
      mockLimit.mockResolvedValueOnce([]);

      await indexTask('task1');

      expect(mockDeleteDocument).toHaveBeenCalledWith('task1');
    });

    it('should add document to index when task exists', async () => {
      // Task query — chain ends at .limit()
      mockLimit.mockResolvedValueOnce([
        {
          id: 't1',
          title: 'Fix bug',
          description: 'desc',
          statusId: 's1',
          statusName: 'Open',
          priority: 'high',
          assigneeId: 'u1',
          assigneeName: 'Jane',
          projectId: 'p1',
          projectName: 'Project',
          dueDate: new Date('2025-06-01'),
          createdAt: new Date('2025-01-01'),
        },
      ]);
      // Labels query — chain ends at .where() (no .limit())
      // Need two where behaviors: 1st returns chain (task query), 2nd resolves (labels query)
      const chain = {
        select: mockSelect,
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
        innerJoin: mockInnerJoin,
        leftJoin: mockLeftJoin,
      };
      mockWhere.mockReturnValueOnce(chain).mockResolvedValueOnce([{ name: 'bug' }]);

      await indexTask('t1');

      expect(mockAddDocuments).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            id: 't1',
            title: 'Fix bug',
            labels: ['bug'],
          }),
        ],
        { primaryKey: 'id' },
      );
    });
  });

  describe('removeTask', () => {
    it('should delete document from index', async () => {
      await removeTask('t1');
      expect(mockDeleteDocument).toHaveBeenCalledWith('t1');
    });
  });

  describe('indexProject', () => {
    it('should add project to index', async () => {
      mockLimit.mockResolvedValueOnce([
        { id: 'p1', name: 'My Project', description: 'desc', status: 'active' },
      ]);

      await indexProject('p1');

      expect(mockAddDocuments).toHaveBeenCalledWith(
        [expect.objectContaining({ id: 'p1', name: 'My Project' })],
        { primaryKey: 'id' },
      );
    });

    it('should remove from index if project not found', async () => {
      mockLimit.mockResolvedValueOnce([]);

      await indexProject('p1');

      expect(mockDeleteDocument).toHaveBeenCalledWith('p1');
    });
  });

  describe('removeProject', () => {
    it('should delete document from index', async () => {
      await removeProject('p1');
      expect(mockDeleteDocument).toHaveBeenCalledWith('p1');
    });
  });

  describe('indexComment', () => {
    it('should add comment to index and resolve projectId', async () => {
      // Comment query
      mockLimit.mockResolvedValueOnce([
        {
          id: 'c1',
          body: 'Hello',
          authorId: 'u1',
          authorName: 'Jane',
          entityType: 'task',
          entityId: 't1',
          createdAt: new Date('2025-01-01'),
        },
      ]);
      // Task projectId query
      mockLimit.mockResolvedValueOnce([{ projectId: 'p1' }]);

      await indexComment('c1');

      expect(mockAddDocuments).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            id: 'c1',
            body: 'Hello',
            taskId: 't1',
            projectId: 'p1',
          }),
        ],
        { primaryKey: 'id' },
      );
    });

    it('should remove from index if comment not found', async () => {
      mockLimit.mockResolvedValueOnce([]);

      await indexComment('c1');

      expect(mockDeleteDocument).toHaveBeenCalledWith('c1');
    });
  });

  describe('removeComment', () => {
    it('should delete document from index', async () => {
      await removeComment('c1');
      expect(mockDeleteDocument).toHaveBeenCalledWith('c1');
    });
  });

  describe('resolveDynamicFilters', () => {
    it('should resolve "me" to userId', () => {
      const result = resolveDynamicFilters({ assigneeId: 'me' }, 'user123');
      expect(result.assigneeId).toBe('user123');
    });

    it('should resolve "today" to current date string', () => {
      const result = resolveDynamicFilters({ dueDateTo: 'today' }, 'user1');
      const expected = new Date().toISOString().split('T')[0];
      expect(result.dueDateTo).toBe(expected);
    });

    it('should resolve dynamic values inside arrays', () => {
      const result = resolveDynamicFilters({ assigneeId: ['me', 'other-id'] }, 'user123');
      expect(result.assigneeId).toEqual(['user123', 'other-id']);
    });

    it('should pass through non-dynamic values unchanged', () => {
      const result = resolveDynamicFilters(
        { status: ['open', 'in_progress'], priority: 'high' },
        'user1',
      );
      expect(result.status).toEqual(['open', 'in_progress']);
      expect(result.priority).toBe('high');
    });
  });
});
