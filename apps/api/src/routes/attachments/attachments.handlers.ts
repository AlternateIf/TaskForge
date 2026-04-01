import fs from 'node:fs';
import type { FastifyReply, FastifyRequest } from 'fastify';
import * as attachmentService from '../../services/attachment.service.js';
import {
  checkPermission,
  getProjectIdFromTask,
  loadPermissionContext,
} from '../../services/permission.service.js';
import { AppError, ErrorCode } from '../../utils/errors.js';
import { success } from '../../utils/response.js';

function requireAuth(request: FastifyRequest): string {
  if (!request.authUser) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Not authenticated');
  }
  return request.authUser.userId;
}

export async function uploadAttachmentHandler(request: FastifyRequest, reply: FastifyReply) {
  const userId = requireAuth(request);

  const data = await request.file();
  if (!data) {
    throw new AppError(400, ErrorCode.BAD_REQUEST, 'No file uploaded');
  }

  const entityType = (data.fields.entityType as { value?: string } | undefined)?.value;
  const entityId = (data.fields.entityId as { value?: string } | undefined)?.value;

  if (!entityType || !entityId) {
    throw new AppError(400, ErrorCode.BAD_REQUEST, 'entityType and entityId are required');
  }

  // Verify caller has access to the target task/entity
  if (entityType === 'task') {
    const resolved = await getProjectIdFromTask(entityId);
    if (!resolved) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Task not found');
    }
    const ctx = await loadPermissionContext(userId, resolved.orgId);
    if (!ctx) {
      throw new AppError(403, ErrorCode.FORBIDDEN, 'You are not a member of this organization');
    }
    const allowed = await checkPermission(ctx, userId, 'attachment', 'create', resolved.projectId);
    if (!allowed) {
      throw new AppError(
        403,
        ErrorCode.FORBIDDEN,
        'Insufficient permissions to upload to this task',
      );
    }
  }

  const fileBuffer = await data.toBuffer();

  if (data.file.truncated) {
    throw new AppError(413, ErrorCode.FILE_TOO_LARGE, 'File exceeds maximum allowed size');
  }

  const attachment = await attachmentService.uploadAttachment(
    userId,
    entityType,
    entityId,
    data.filename,
    data.mimetype,
    fileBuffer,
  );

  return reply.status(201).send(success(attachment));
}

export async function getAttachmentHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  requireAuth(request);
  const attachment = await attachmentService.getAttachment(request.params.id);
  return reply.status(200).send(success(attachment));
}

export async function downloadAttachmentHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  requireAuth(request);
  const { storagePath, filename, mimeType } = await attachmentService.getAttachmentStoragePath(
    request.params.id,
  );

  let fileBuffer: Buffer;
  try {
    fileBuffer = await fs.promises.readFile(storagePath);
  } catch (error) {
    const fsError = error as NodeJS.ErrnoException;
    if (fsError.code === 'ENOENT') {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Attachment file not found');
    }
    throw error;
  }

  return reply
    .header('Content-Type', mimeType)
    .header('Content-Disposition', `attachment; filename="${filename}"`)
    .send(fileBuffer);
}

export async function deleteAttachmentHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  await attachmentService.deleteAttachment(request.params.id, userId);
  return reply.status(204).send();
}

export async function listTaskAttachmentsHandler(
  request: FastifyRequest<{ Params: { taskId: string } }>,
  reply: FastifyReply,
) {
  requireAuth(request);
  const attachments = await attachmentService.listAttachments('task', request.params.taskId);
  return reply.status(200).send(success(attachments));
}
