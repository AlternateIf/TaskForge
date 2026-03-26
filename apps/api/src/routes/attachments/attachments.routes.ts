import type { FastifyInstance } from 'fastify';
import { authorize } from '../../hooks/authorize.hook.js';
import { requireFeature } from '../../hooks/require-feature.hook.js';
import { getTaskIdForAttachment } from '../../services/attachment.service.js';
import {
  deleteAttachmentHandler,
  downloadAttachmentHandler,
  getAttachmentHandler,
  listTaskAttachmentsHandler,
  uploadAttachmentHandler,
} from './attachments.handlers.js';

export async function attachmentRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  // POST /api/v1/attachments (multipart upload)
  fastify.post(
    '/api/v1/attachments',
    {
      preHandler: [requireFeature('file_uploads')],
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    },
    uploadAttachmentHandler,
  );

  // GET /api/v1/attachments/:id
  fastify.get<{ Params: { id: string } }>(
    '/api/v1/attachments/:id',
    {
      preHandler: [
        authorize({
          resource: 'attachment',
          action: 'read',
          getTaskId: async (req) => {
            const id = (req.params as { id: string }).id;
            return getTaskIdForAttachment(id);
          },
        }),
        requireFeature('file_uploads'),
      ],
    },
    getAttachmentHandler,
  );

  // GET /api/v1/attachments/:id/download
  fastify.get<{ Params: { id: string } }>(
    '/api/v1/attachments/:id/download',
    {
      preHandler: [
        authorize({
          resource: 'attachment',
          action: 'read',
          getTaskId: async (req) => {
            const id = (req.params as { id: string }).id;
            return getTaskIdForAttachment(id);
          },
        }),
        requireFeature('file_uploads'),
      ],
    },
    downloadAttachmentHandler,
  );

  // DELETE /api/v1/attachments/:id
  fastify.delete<{ Params: { id: string } }>(
    '/api/v1/attachments/:id',
    {
      preHandler: [
        authorize({
          resource: 'attachment',
          action: 'delete',
          getTaskId: async (req) => {
            const id = (req.params as { id: string }).id;
            return getTaskIdForAttachment(id);
          },
        }),
        requireFeature('file_uploads'),
      ],
    },
    deleteAttachmentHandler,
  );

  // GET /api/v1/tasks/:taskId/attachments
  fastify.get<{ Params: { taskId: string } }>(
    '/api/v1/tasks/:taskId/attachments',
    {
      preHandler: [
        authorize({
          resource: 'attachment',
          action: 'read',
          getTaskId: (req) => (req.params as { taskId: string }).taskId,
        }),
        requireFeature('file_uploads'),
      ],
    },
    listTaskAttachmentsHandler,
  );
}
