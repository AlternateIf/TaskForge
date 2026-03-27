import { relations } from 'drizzle-orm';
import { datetime, index, mysqlTable, text, varchar } from 'drizzle-orm/mysql-core';
import { users } from './users.js';

export const comments = mysqlTable(
  'comments',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    entityId: varchar('entity_id', { length: 36 }).notNull(),
    authorId: varchar('author_id', { length: 36 })
      .notNull()
      .references(() => users.id),
    body: text('body').notNull(),
    visibility: varchar('visibility', { length: 10 }).notNull().default('public'),
    parentCommentId: varchar('parent_comment_id', { length: 36 }),
    createdAt: datetime('created_at').notNull().default(new Date()),
    updatedAt: datetime('updated_at').notNull().default(new Date()),
    deletedAt: datetime('deleted_at'),
  },
  (table) => [
    index('comments_entity_idx').on(table.entityType, table.entityId),
    index('comments_author_idx').on(table.authorId),
    index('comments_parent_idx').on(table.parentCommentId),
  ],
);

export const commentMentions = mysqlTable(
  'comment_mentions',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    commentId: varchar('comment_id', { length: 36 })
      .notNull()
      .references(() => comments.id),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id),
    createdAt: datetime('created_at').notNull().default(new Date()),
  },
  (table) => [
    index('comment_mentions_comment_idx').on(table.commentId),
    index('comment_mentions_user_idx').on(table.userId),
  ],
);

export const commentsRelations = relations(comments, ({ one, many }) => ({
  author: one(users, { fields: [comments.authorId], references: [users.id] }),
  parent: one(comments, {
    fields: [comments.parentCommentId],
    references: [comments.id],
    relationName: 'replies',
  }),
  replies: many(comments, { relationName: 'replies' }),
  mentions: many(commentMentions),
}));

export const commentMentionsRelations = relations(commentMentions, ({ one }) => ({
  comment: one(comments, { fields: [commentMentions.commentId], references: [comments.id] }),
  user: one(users, { fields: [commentMentions.userId], references: [users.id] }),
}));
