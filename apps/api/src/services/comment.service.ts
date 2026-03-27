import crypto from 'node:crypto';
import {
  commentMentions,
  comments,
  db,
  organizationMembers,
  projects,
  roles,
  tasks,
  users,
} from '@taskforge/db';
import type { CreateCommentInput, UpdateCommentInput } from '@taskforge/shared';
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import sanitizeHtml from 'sanitize-html';
import { AppError, ErrorCode } from '../utils/errors.js';
import * as activityService from './activity.service.js';

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p',
    'br',
    'strong',
    'em',
    'u',
    's',
    'a',
    'ul',
    'ol',
    'li',
    'blockquote',
    'code',
    'pre',
    'h1',
    'h2',
    'h3',
    'span',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    span: ['class'],
    code: ['class'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
};

export type CommentVisibility = 'public' | 'internal';

/** Roles that cannot see or create internal comments. */
const RESTRICTED_ROLES = new Set(['Guest']);

export interface CommentOutput {
  id: string;
  entityType: string;
  entityId: string;
  authorId: string;
  authorDisplayName: string;
  body: string;
  visibility: CommentVisibility;
  parentCommentId: string | null;
  mentions: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface CommentWithAuthor {
  comment: typeof comments.$inferSelect;
  authorDisplayName: string | null;
}

function toOutput(row: CommentWithAuthor, mentionUserIds: string[] = []): CommentOutput {
  return {
    id: row.comment.id,
    entityType: row.comment.entityType,
    entityId: row.comment.entityId,
    authorId: row.comment.authorId,
    authorDisplayName: row.authorDisplayName ?? 'Unknown User',
    body: row.comment.deletedAt ? '' : row.comment.body,
    visibility: (row.comment.visibility as CommentVisibility) ?? 'public',
    parentCommentId: row.comment.parentCommentId,
    mentions: mentionUserIds,
    createdAt: row.comment.createdAt.toISOString(),
    updatedAt: row.comment.updatedAt.toISOString(),
    deletedAt: row.comment.deletedAt?.toISOString() ?? null,
  };
}

export function isRestrictedRole(roleName: string | undefined): boolean {
  return RESTRICTED_ROLES.has(roleName ?? '');
}

function parseMentions(body: string): string[] {
  const matches = body.match(/@(\w+)/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.slice(1)))];
}

async function resolveUsernames(
  usernames: string[],
  organizationId: string,
): Promise<Map<string, string>> {
  if (usernames.length === 0) return new Map();

  const result = await db
    .select({ userId: users.id, displayName: users.displayName })
    .from(users)
    .innerJoin(organizationMembers, eq(organizationMembers.userId, users.id))
    .where(eq(organizationMembers.organizationId, organizationId));

  const map = new Map<string, string>();
  for (const row of result) {
    // Match against display name (case-insensitive, spaces removed for matching)
    const normalizedName = row.displayName.replace(/\s+/g, '').toLowerCase();
    for (const username of usernames) {
      if (normalizedName === username.toLowerCase()) {
        map.set(username, row.userId);
      }
    }
  }
  return map;
}

async function getRestrictedUserIds(organizationId: string): Promise<Set<string>> {
  const rows = await db
    .select({ userId: organizationMembers.userId })
    .from(organizationMembers)
    .innerJoin(roles, eq(roles.id, organizationMembers.roleId))
    .where(and(eq(organizationMembers.organizationId, organizationId), eq(roles.name, 'Guest')));
  return new Set(rows.map((r) => r.userId));
}

async function getOrganizationIdForTask(taskId: string): Promise<string> {
  const result = await db
    .select({ orgId: projects.organizationId })
    .from(tasks)
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt)))
    .limit(1);

  if (result.length === 0) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Task not found');
  }
  return result[0].orgId;
}

export async function createComment(
  userId: string,
  taskId: string,
  input: CreateCommentInput,
  callerRole?: string,
): Promise<CommentOutput> {
  const visibility: CommentVisibility = (input.visibility as CommentVisibility) ?? 'public';

  // Only Team Member+ can create internal comments
  if (visibility === 'internal' && isRestrictedRole(callerRole)) {
    throw new AppError(403, ErrorCode.FORBIDDEN, 'Guests cannot create internal comments');
  }
  // Validate task exists
  const taskResult = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt)))
    .limit(1);

  if (taskResult.length === 0) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Task not found');
  }

  // Validate parent comment if provided
  if (input.parentCommentId) {
    const parent = await db
      .select({ id: comments.id, parentCommentId: comments.parentCommentId })
      .from(comments)
      .where(and(eq(comments.id, input.parentCommentId), isNull(comments.deletedAt)))
      .limit(1);

    if (parent.length === 0) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Parent comment not found');
    }

    // Only 1 level of threading allowed
    if (parent[0].parentCommentId) {
      throw new AppError(
        422,
        ErrorCode.UNPROCESSABLE_ENTITY,
        'Replies to replies are not supported (1-level threading only)',
      );
    }
  }

  // Sanitize HTML body
  const sanitizedBody = sanitizeHtml(input.body, SANITIZE_OPTIONS);

  // Parse @mentions
  const mentionedUsernames = parseMentions(sanitizedBody);
  const organizationId = await getOrganizationIdForTask(taskId);
  const resolvedMentions = await resolveUsernames(mentionedUsernames, organizationId);

  // Create comment
  const id = crypto.randomUUID();
  const now = new Date();

  await db.insert(comments).values({
    id,
    entityType: 'task',
    entityId: taskId,
    authorId: userId,
    body: sanitizedBody,
    visibility,
    parentCommentId: input.parentCommentId ?? null,
    createdAt: now,
    updatedAt: now,
  });

  // Create mention records — for internal comments, exclude Guest users
  const restrictedUsers =
    visibility === 'internal' ? await getRestrictedUserIds(organizationId) : new Set<string>();
  const mentionUserIds: string[] = [];
  for (const [, mentionedUserId] of resolvedMentions) {
    if (restrictedUsers.has(mentionedUserId)) continue;
    mentionUserIds.push(mentionedUserId);
    await db.insert(commentMentions).values({
      id: crypto.randomUUID(),
      commentId: id,
      userId: mentionedUserId,
      createdAt: now,
    });
  }

  // Get author display name
  const authorResult = await db
    .select({ displayName: users.displayName })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  // Log activity (tag with visibility so activity listing can filter for restricted roles)
  await activityService.log({
    organizationId,
    actorId: userId,
    entityType: 'task',
    entityId: taskId,
    action: 'comment_added',
    changes:
      visibility === 'internal'
        ? { commentVisibility: { before: null, after: 'internal' } }
        : undefined,
  });

  return {
    id,
    entityType: 'task',
    entityId: taskId,
    authorId: userId,
    authorDisplayName: authorResult[0]?.displayName ?? 'Unknown User',
    body: sanitizedBody,
    visibility,
    parentCommentId: input.parentCommentId ?? null,
    mentions: mentionUserIds,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    deletedAt: null,
  };
}

export async function listComments(taskId: string, callerRole?: string): Promise<CommentOutput[]> {
  const conditions = [eq(comments.entityType, 'task'), eq(comments.entityId, taskId)];

  // Restricted roles only see public comments
  if (isRestrictedRole(callerRole)) {
    conditions.push(eq(comments.visibility, 'public'));
  }

  const rows = await db
    .select({
      comment: comments,
      authorDisplayName: users.displayName,
    })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.authorId))
    .where(and(...conditions))
    .orderBy(desc(comments.createdAt));

  // Fetch mentions for all comments
  const commentIds = rows.map((r) => r.comment.id);
  const allMentions =
    commentIds.length > 0
      ? await db
          .select()
          .from(commentMentions)
          .where(inArray(commentMentions.commentId, commentIds))
      : [];

  const mentionsByComment = new Map<string, string[]>();
  for (const mention of allMentions) {
    const existing = mentionsByComment.get(mention.commentId) ?? [];
    existing.push(mention.userId);
    mentionsByComment.set(mention.commentId, existing);
  }

  // Build threaded structure: top-level first, then replies grouped under parent
  const topLevel: CommentOutput[] = [];
  const replies: Map<string, CommentOutput[]> = new Map();

  for (const row of rows) {
    const output = toOutput(row, mentionsByComment.get(row.comment.id) ?? []);
    if (row.comment.parentCommentId) {
      const parentReplies = replies.get(row.comment.parentCommentId) ?? [];
      parentReplies.push(output);
      replies.set(row.comment.parentCommentId, parentReplies);
    } else {
      topLevel.push(output);
    }
  }

  // Interleave replies after their parent
  const threaded: CommentOutput[] = [];
  for (const parent of topLevel) {
    threaded.push(parent);
    const childReplies = replies.get(parent.id);
    if (childReplies) {
      // Replies in chronological order (reverse the desc sort)
      threaded.push(...childReplies.reverse());
    }
  }

  return threaded;
}

export async function updateComment(
  commentId: string,
  userId: string,
  input: UpdateCommentInput,
): Promise<CommentOutput> {
  const result = await db
    .select({
      comment: comments,
      authorDisplayName: users.displayName,
    })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.authorId))
    .where(and(eq(comments.id, commentId), isNull(comments.deletedAt)))
    .limit(1);

  if (result.length === 0) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Comment not found');
  }

  if (result[0].comment.authorId !== userId) {
    throw new AppError(403, ErrorCode.FORBIDDEN, 'Only the author can edit a comment');
  }

  const sanitizedBody = sanitizeHtml(input.body, SANITIZE_OPTIONS);
  const now = new Date();

  await db
    .update(comments)
    .set({ body: sanitizedBody, updatedAt: now })
    .where(eq(comments.id, commentId));

  // Re-parse mentions and update
  const organizationId = await getOrganizationIdForTask(result[0].comment.entityId);
  const mentionedUsernames = parseMentions(sanitizedBody);
  const resolvedMentions = await resolveUsernames(mentionedUsernames, organizationId);

  // Delete old mentions and insert new ones
  await db.delete(commentMentions).where(eq(commentMentions.commentId, commentId));
  const mentionUserIds: string[] = [];
  for (const [, mentionUserId] of resolvedMentions) {
    mentionUserIds.push(mentionUserId);
    await db.insert(commentMentions).values({
      id: crypto.randomUUID(),
      commentId,
      userId: mentionUserId,
      createdAt: now,
    });
  }

  // Log activity
  const editVisibility = (result[0].comment.visibility as CommentVisibility) ?? 'public';
  await activityService.log({
    organizationId,
    actorId: userId,
    entityType: 'task',
    entityId: result[0].comment.entityId,
    action: 'comment_edited',
    changes:
      editVisibility === 'internal'
        ? { commentVisibility: { before: 'internal', after: 'internal' } }
        : undefined,
  });

  return {
    ...toOutput(result[0]),
    body: sanitizedBody,
    mentions: mentionUserIds,
    updatedAt: now.toISOString(),
  };
}

export async function deleteComment(
  commentId: string,
  userId: string,
  isAdmin: boolean,
): Promise<void> {
  const result = await db
    .select({
      id: comments.id,
      authorId: comments.authorId,
      entityType: comments.entityType,
      entityId: comments.entityId,
      visibility: comments.visibility,
    })
    .from(comments)
    .where(and(eq(comments.id, commentId), isNull(comments.deletedAt)))
    .limit(1);

  if (result.length === 0) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Comment not found');
  }

  if (result[0].authorId !== userId && !isAdmin) {
    throw new AppError(
      403,
      ErrorCode.FORBIDDEN,
      'Only the author or an admin can delete a comment',
    );
  }

  const now = new Date();
  await db.update(comments).set({ deletedAt: now }).where(eq(comments.id, commentId));

  if (result[0].entityType === 'task') {
    const deleteVisibility = (result[0].visibility as CommentVisibility) ?? 'public';
    const organizationId = await getOrganizationIdForTask(result[0].entityId);
    await activityService.log({
      organizationId,
      actorId: userId,
      entityType: 'task',
      entityId: result[0].entityId,
      action: 'comment_deleted',
      changes:
        deleteVisibility === 'internal'
          ? { commentVisibility: { before: 'internal', after: null } }
          : undefined,
    });
  }
}

/**
 * Get the task ID for a comment (for authorization).
 */
export async function getTaskIdForComment(commentId: string): Promise<string> {
  const result = await db
    .select({ entityType: comments.entityType, entityId: comments.entityId })
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1);

  if (result.length === 0) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Comment not found');
  }

  if (result[0].entityType !== 'task') {
    throw new AppError(422, ErrorCode.UNPROCESSABLE_ENTITY, 'Only task comments are supported');
  }

  return result[0].entityId;
}
