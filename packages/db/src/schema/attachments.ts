import { relations } from 'drizzle-orm';
import {
  bigint,
  datetime,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  varchar,
} from 'drizzle-orm/mysql-core';
import { users } from './users.js';

export const attachments = mysqlTable(
  'attachments',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    entityId: varchar('entity_id', { length: 36 }).notNull(),
    uploadedBy: varchar('uploaded_by', { length: 36 })
      .notNull()
      .references(() => users.id),
    filename: varchar('filename', { length: 500 }).notNull(),
    mimeType: varchar('mime_type', { length: 255 }).notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    storagePath: varchar('storage_path', { length: 1000 }).notNull(),
    version: int('version').notNull().default(1),
    scanStatus: mysqlEnum('scan_status', ['pending', 'clean', 'infected', 'skipped'])
      .notNull()
      .default('pending'),
    createdAt: datetime('created_at').notNull().default(new Date()),
  },
  (table) => [
    index('attachments_entity_idx').on(table.entityType, table.entityId),
    index('attachments_uploader_idx').on(table.uploadedBy),
  ],
);

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  uploader: one(users, {
    fields: [attachments.uploadedBy],
    references: [users.id],
  }),
}));
