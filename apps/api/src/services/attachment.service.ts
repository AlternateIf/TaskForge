import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { attachments, db, tasks } from '@taskforge/db';
import { and, eq, isNull } from 'drizzle-orm';
import { fileTypeFromBuffer } from 'file-type';
import { AppError, ErrorCode } from '../utils/errors.js';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './uploads';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/zip',
]);

const MIME_TO_EXTENSIONS: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/svg+xml': ['.svg'],
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
  'application/zip': ['.zip'],
};

// Extension → expected MIME for validation
const EXTENSION_TO_MIME: Record<string, string[]> = {};
for (const [mime, exts] of Object.entries(MIME_TO_EXTENSIONS)) {
  for (const ext of exts) {
    if (!EXTENSION_TO_MIME[ext]) EXTENSION_TO_MIME[ext] = [];
    EXTENSION_TO_MIME[ext].push(mime);
  }
}

export interface AttachmentOutput {
  id: string;
  entityType: string;
  entityId: string;
  uploadedBy: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  scanStatus: string;
  url: string;
  createdAt: string;
}

function toOutput(a: typeof attachments.$inferSelect): AttachmentOutput {
  return {
    id: a.id,
    entityType: a.entityType,
    entityId: a.entityId,
    uploadedBy: a.uploadedBy,
    filename: a.filename,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    scanStatus: a.scanStatus,
    url: `/api/v1/attachments/${a.id}/download`,
    createdAt: a.createdAt.toISOString(),
  };
}

export async function uploadAttachment(
  userId: string,
  entityType: string,
  entityId: string,
  filename: string,
  mimeType: string,
  fileBuffer: Buffer,
): Promise<AttachmentOutput> {
  // 1. Validate entity exists (task only for MVP)
  if (entityType !== 'task') {
    throw new AppError(422, ErrorCode.UNPROCESSABLE_ENTITY, 'Only task attachments are supported');
  }

  const task = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, entityId), isNull(tasks.deletedAt)))
    .limit(1);

  if (task.length === 0) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Task not found');
  }

  // 2. MIME whitelist check
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new AppError(
      415,
      ErrorCode.UNSUPPORTED_MEDIA_TYPE,
      `File type ${mimeType} is not allowed`,
    );
  }

  // 3. Extension-MIME match
  const ext = path.extname(filename).toLowerCase();
  const allowedMimesForExt = EXTENSION_TO_MIME[ext];
  if (!allowedMimesForExt || !allowedMimesForExt.includes(mimeType)) {
    throw new AppError(
      415,
      ErrorCode.UNSUPPORTED_MEDIA_TYPE,
      `File extension ${ext} does not match MIME type ${mimeType}`,
    );
  }

  // 4. Magic byte verification
  const detected = await fileTypeFromBuffer(fileBuffer);
  if (detected) {
    // For text-based types (txt, csv, svg), file-type may not detect anything — that's OK
    if (!ALLOWED_MIME_TYPES.has(detected.mime)) {
      throw new AppError(
        415,
        ErrorCode.UNSUPPORTED_MEDIA_TYPE,
        'File content does not match an allowed type',
      );
    }
  }

  // 5. Store file
  const id = crypto.randomUUID();
  const storedFilename = `${id}${ext}`;
  const dir = path.join(UPLOAD_DIR, entityType, entityId);
  await fs.promises.mkdir(dir, { recursive: true });
  const storagePath = path.join(dir, storedFilename);
  await fs.promises.writeFile(storagePath, fileBuffer);

  // 6. Create DB record
  const now = new Date();
  await db.insert(attachments).values({
    id,
    entityType,
    entityId,
    uploadedBy: userId,
    filename,
    mimeType,
    sizeBytes: fileBuffer.length,
    storagePath,
    scanStatus: 'skipped',
    createdAt: now,
  });

  return {
    id,
    entityType,
    entityId,
    uploadedBy: userId,
    filename,
    mimeType,
    sizeBytes: fileBuffer.length,
    scanStatus: 'skipped',
    url: `/api/v1/attachments/${id}/download`,
    createdAt: now.toISOString(),
  };
}

export async function getAttachment(attachmentId: string): Promise<AttachmentOutput> {
  const result = await db
    .select()
    .from(attachments)
    .where(eq(attachments.id, attachmentId))
    .limit(1);

  if (result.length === 0) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Attachment not found');
  }

  return toOutput(result[0]);
}

export async function getAttachmentStoragePath(
  attachmentId: string,
): Promise<{ storagePath: string; filename: string; mimeType: string }> {
  const result = await db
    .select({
      storagePath: attachments.storagePath,
      filename: attachments.filename,
      mimeType: attachments.mimeType,
    })
    .from(attachments)
    .where(eq(attachments.id, attachmentId))
    .limit(1);

  if (result.length === 0) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Attachment not found');
  }

  return result[0];
}

export async function listAttachments(
  entityType: string,
  entityId: string,
): Promise<AttachmentOutput[]> {
  const result = await db
    .select()
    .from(attachments)
    .where(and(eq(attachments.entityType, entityType), eq(attachments.entityId, entityId)));

  return result.map(toOutput);
}

export async function deleteAttachment(attachmentId: string): Promise<void> {
  const result = await db
    .select({ id: attachments.id, storagePath: attachments.storagePath })
    .from(attachments)
    .where(eq(attachments.id, attachmentId))
    .limit(1);

  if (result.length === 0) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Attachment not found');
  }

  // Delete file from disk
  try {
    await fs.promises.unlink(result[0].storagePath);
  } catch {
    // File may already be gone — continue with DB cleanup
  }

  await db.delete(attachments).where(eq(attachments.id, attachmentId));
}

/**
 * Get the task ID for an attachment (for authorization).
 */
export async function getTaskIdForAttachment(attachmentId: string): Promise<string> {
  const result = await db
    .select({ entityType: attachments.entityType, entityId: attachments.entityId })
    .from(attachments)
    .where(eq(attachments.id, attachmentId))
    .limit(1);

  if (result.length === 0) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Attachment not found');
  }

  if (result[0].entityType !== 'task') {
    throw new AppError(422, ErrorCode.UNPROCESSABLE_ENTITY, 'Only task attachments are supported');
  }

  return result[0].entityId;
}
