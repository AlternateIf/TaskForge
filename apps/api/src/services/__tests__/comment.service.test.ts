import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// --- Mock @taskforge/db ---

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockOrderBy = vi.fn();
const mockInnerJoin = vi.fn();
const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockUpdate = vi.fn();
const mockSet = vi.fn();
const mockDelete = vi.fn();

function chainBuilder(overrides: Record<string, unknown> = {}) {
  const chain: Record<string, unknown> = {
    select: mockSelect,
    from: mockFrom,
    where: mockWhere,
    limit: mockLimit,
    orderBy: mockOrderBy,
    innerJoin: mockInnerJoin,
    insert: mockInsert,
    values: mockValues,
    update: mockUpdate,
    set: mockSet,
    delete: mockDelete,
    ...overrides,
  };
  for (const fn of Object.values(chain)) {
    if (typeof fn === 'function' && 'mockReturnValue' in fn) {
      (fn as ReturnType<typeof vi.fn>).mockReturnValue(chain);
    }
  }
  return chain;
}

const dbChain = chainBuilder();

vi.mock('@taskforge/db', () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  },
  comments: {
    id: 'comments.id',
    entityType: 'comments.entityType',
    entityId: 'comments.entityId',
    authorId: 'comments.authorId',
    body: 'comments.body',
    parentCommentId: 'comments.parentCommentId',
    createdAt: 'comments.createdAt',
    updatedAt: 'comments.updatedAt',
    deletedAt: 'comments.deletedAt',
  },
  commentMentions: {
    id: 'commentMentions.id',
    commentId: 'commentMentions.commentId',
    userId: 'commentMentions.userId',
    createdAt: 'commentMentions.createdAt',
  },
  tasks: { id: 'tasks.id', projectId: 'tasks.projectId', deletedAt: 'tasks.deletedAt' },
  users: { id: 'users.id', displayName: 'users.displayName' },
  projects: { id: 'projects.id', organizationId: 'projects.organizationId' },
  organizationMembers: {
    userId: 'organizationMembers.userId',
    organizationId: 'organizationMembers.organizationId',
  },
}));

vi.mock('../activity.service.js', () => ({
  log: vi.fn().mockResolvedValue(undefined),
}));

// Import after mocking
const { createComment, updateComment, deleteComment, getTaskIdForComment } = await import(
  '../comment.service.js'
);
const activityService = await import('../activity.service.js');

const uuid1 = '00000000-0000-0000-0000-000000000001';
const uuid2 = '00000000-0000-0000-0000-000000000002';
const uuid3 = '00000000-0000-0000-0000-000000000003';
const orgId = '00000000-0000-0000-0000-000000000099';

const now = new Date('2025-01-01T00:00:00.000Z');

describe('comment.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createComment', () => {
    it('should create a top-level comment on a task', async () => {
      // Call sequence:
      // 1. Check task exists → found
      // 2. Get org ID for task (join tasks+projects) → orgId
      // 3. Insert comment
      // 4. Get author display name
      // 5. Activity log

      let callCount = 0;
      mockLimit.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return [{ id: uuid2 }]; // task exists
        if (callCount === 2) return [{ orgId }]; // org ID
        if (callCount === 3) return [{ displayName: 'Test User' }]; // author
        return [];
      });
      mockWhere.mockImplementation(() => {
        return dbChain;
      });
      // resolveUsernames returns no users (no mentions)
      mockOrderBy.mockResolvedValue([]);
      mockValues.mockResolvedValue(undefined);

      // Need to handle the resolveUsernames query which doesn't use limit
      // It goes through select→from→innerJoin→where
      // The where call for resolveUsernames returns [] (no org members match)

      const result = await createComment(uuid1, uuid2, { body: 'Hello world' });

      expect(result.entityType).toBe('task');
      expect(result.entityId).toBe(uuid2);
      expect(result.authorId).toBe(uuid1);
      expect(result.body).toBe('Hello world');
      expect(result.parentCommentId).toBeNull();
      expect(result.deletedAt).toBeNull();
      expect(result.mentions).toEqual([]);
    });

    it('should reject replies to replies (2-level nesting)', async () => {
      let callCount = 0;
      mockLimit.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return [{ id: uuid2 }]; // task exists
        // parent comment has a parentCommentId → it's already a reply
        if (callCount === 2) return [{ id: uuid3, parentCommentId: uuid1 }];
        return [];
      });

      await expect(
        createComment(uuid1, uuid2, { body: 'nested reply', parentCommentId: uuid3 }),
      ).rejects.toThrow('Replies to replies are not supported');
    });

    it('should reject comment on non-existent task', async () => {
      mockLimit.mockResolvedValue([]); // task not found

      await expect(createComment(uuid1, uuid2, { body: 'test' })).rejects.toThrow('Task not found');
    });

    it('should reject comment with non-existent parent', async () => {
      let callCount = 0;
      mockLimit.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return [{ id: uuid2 }]; // task exists
        if (callCount === 2) return []; // parent not found
        return [];
      });

      await expect(
        createComment(uuid1, uuid2, { body: 'reply', parentCommentId: uuid3 }),
      ).rejects.toThrow('Parent comment not found');
    });

    it('should sanitize HTML and strip dangerous tags', async () => {
      let callCount = 0;
      mockLimit.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return [{ id: uuid2 }]; // task exists
        if (callCount === 2) return [{ orgId }]; // org ID
        if (callCount === 3) return [{ displayName: 'Test User' }]; // author
        return [];
      });
      mockValues.mockResolvedValue(undefined);

      const result = await createComment(uuid1, uuid2, {
        body: '<p>Hello</p><script>alert("xss")</script><iframe src="evil"></iframe>',
      });

      expect(result.body).not.toContain('<script>');
      expect(result.body).not.toContain('<iframe');
      expect(result.body).toContain('<p>Hello</p>');
    });

    it('should allow valid threading (1 level)', async () => {
      let callCount = 0;
      mockLimit.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return [{ id: uuid2 }]; // task exists
        if (callCount === 2) return [{ id: uuid3, parentCommentId: null }]; // parent is top-level
        if (callCount === 3) return [{ orgId }]; // org ID
        if (callCount === 4) return [{ displayName: 'Test User' }]; // author
        return [];
      });
      mockValues.mockResolvedValue(undefined);

      const result = await createComment(uuid1, uuid2, {
        body: 'a reply',
        parentCommentId: uuid3,
      });

      expect(result.parentCommentId).toBe(uuid3);
    });

    it('should log activity after creating a comment', async () => {
      let callCount = 0;
      mockLimit.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return [{ id: uuid2 }]; // task exists
        if (callCount === 2) return [{ orgId }]; // org ID
        if (callCount === 3) return [{ displayName: 'Test User' }]; // author
        return [];
      });
      mockValues.mockResolvedValue(undefined);

      await createComment(uuid1, uuid2, { body: 'hello' });

      expect(activityService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          actorId: uuid1,
          entityType: 'task',
          entityId: uuid2,
          action: 'comment_added',
        }),
      );
    });
  });

  describe('updateComment', () => {
    it('should reject edits from non-authors', async () => {
      mockLimit.mockResolvedValue([
        {
          comment: {
            id: uuid1,
            authorId: uuid2,
            entityType: 'task',
            entityId: uuid3,
            body: 'original',
            parentCommentId: null,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          },
          authorDisplayName: 'Other User',
        },
      ]);

      await expect(updateComment(uuid1, 'different-user-id', { body: 'hacked' })).rejects.toThrow(
        'Only the author can edit a comment',
      );
    });

    it('should allow author to edit their comment', async () => {
      // First call: find comment (with join)
      mockLimit.mockImplementation(() => {
        return [
          {
            comment: {
              id: uuid1,
              authorId: uuid2,
              entityType: 'task',
              entityId: uuid3,
              body: 'original',
              parentCommentId: null,
              createdAt: now,
              updatedAt: now,
              deletedAt: null,
            },
            authorDisplayName: 'Test User',
          },
        ];
      });

      // getOrganizationIdForTask
      // This is tricky because the mock chain reuses the same mocks
      // The important thing is the function doesn't throw

      // For the org ID query in getOrganizationIdForTask, it goes through
      // select→from→innerJoin→where→limit
      // We need it to return orgId. Let's use a counter.
      let limitCount = 0;
      mockLimit.mockImplementation(() => {
        limitCount++;
        if (limitCount === 1) {
          // Find comment
          return [
            {
              comment: {
                id: uuid1,
                authorId: uuid2,
                entityType: 'task',
                entityId: uuid3,
                body: 'original',
                parentCommentId: null,
                createdAt: now,
                updatedAt: now,
                deletedAt: null,
              },
              authorDisplayName: 'Test User',
            },
          ];
        }
        if (limitCount === 2) {
          // getOrganizationIdForTask
          return [{ orgId }];
        }
        return [];
      });
      mockSet.mockReturnValue(dbChain);
      mockValues.mockResolvedValue(undefined);

      const result = await updateComment(uuid1, uuid2, { body: '<p>Updated</p>' });

      expect(result.body).toBe('<p>Updated</p>');
    });
  });

  describe('deleteComment', () => {
    it('should reject deletion by non-author non-admin', async () => {
      mockLimit.mockResolvedValue([
        {
          id: uuid1,
          authorId: uuid2,
          entityType: 'task',
          entityId: uuid3,
        },
      ]);

      await expect(deleteComment(uuid1, 'other-user', false)).rejects.toThrow(
        'Only the author or an admin can delete a comment',
      );
    });

    it('should allow author to delete their comment', async () => {
      let limitCount = 0;
      mockLimit.mockImplementation(() => {
        limitCount++;
        if (limitCount === 1) {
          return [{ id: uuid1, authorId: uuid2, entityType: 'task', entityId: uuid3 }];
        }
        if (limitCount === 2) {
          // getOrganizationIdForTask
          return [{ orgId }];
        }
        return [];
      });
      mockSet.mockReturnValue(dbChain);

      await deleteComment(uuid1, uuid2, false);

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ deletedAt: now }));
    });

    it('should allow admin to delete any comment', async () => {
      let limitCount = 0;
      mockLimit.mockImplementation(() => {
        limitCount++;
        if (limitCount === 1) {
          return [{ id: uuid1, authorId: uuid2, entityType: 'task', entityId: uuid3 }];
        }
        if (limitCount === 2) {
          return [{ orgId }];
        }
        return [];
      });
      mockSet.mockReturnValue(dbChain);

      await deleteComment(uuid1, 'admin-user', true);

      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should reject deletion of non-existent comment', async () => {
      mockLimit.mockResolvedValue([]);

      await expect(deleteComment(uuid1, uuid2, false)).rejects.toThrow('Comment not found');
    });

    it('should log activity after deleting a comment', async () => {
      let limitCount = 0;
      mockLimit.mockImplementation(() => {
        limitCount++;
        if (limitCount === 1) {
          return [{ id: uuid1, authorId: uuid2, entityType: 'task', entityId: uuid3 }];
        }
        if (limitCount === 2) {
          return [{ orgId }];
        }
        return [];
      });
      mockSet.mockReturnValue(dbChain);

      await deleteComment(uuid1, uuid2, false);

      expect(activityService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'comment_deleted',
          entityType: 'task',
          entityId: uuid3,
        }),
      );
    });
  });

  describe('getTaskIdForComment', () => {
    it('should return entityId for task comments', async () => {
      mockLimit.mockResolvedValue([{ entityType: 'task', entityId: uuid2 }]);

      const result = await getTaskIdForComment(uuid1);
      expect(result).toBe(uuid2);
    });

    it('should throw for non-existent comment', async () => {
      mockLimit.mockResolvedValue([]);

      await expect(getTaskIdForComment(uuid1)).rejects.toThrow('Comment not found');
    });

    it('should throw for non-task entity type', async () => {
      mockLimit.mockResolvedValue([{ entityType: 'project', entityId: uuid2 }]);

      await expect(getTaskIdForComment(uuid1)).rejects.toThrow('Only task comments are supported');
    });
  });
});
