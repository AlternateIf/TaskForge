import type { FastifyInstance } from 'fastify';
import { authorize } from '../../hooks/authorize.hook.js';
import { requireFeature } from '../../hooks/require-feature.hook.js';
import { getTaskIdForComment } from '../../services/comment.service.js';
import {
  createCommentHandler,
  deleteCommentHandler,
  listCommentsHandler,
  updateCommentHandler,
} from './comments.handlers.js';
import { createCommentSchema, updateCommentSchema } from './comments.schemas.js';

export async function commentRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  // POST /api/v1/tasks/:taskId/comments
  fastify.post<{ Params: { taskId: string } }>(
    '/api/v1/tasks/:taskId/comments',
    {
      preHandler: [
        authorize({
          resource: 'comment',
          action: 'create',
          getTaskId: (req) => (req.params as { taskId: string }).taskId,
        }),
        requireFeature('comments'),
      ],
    },
    async (request, reply) => {
      request.body = createCommentSchema.parse(request.body);
      return createCommentHandler(request as Parameters<typeof createCommentHandler>[0], reply);
    },
  );

  // GET /api/v1/tasks/:taskId/comments
  fastify.get<{ Params: { taskId: string } }>(
    '/api/v1/tasks/:taskId/comments',
    {
      preHandler: [
        authorize({
          resource: 'comment',
          action: 'read',
          getTaskId: (req) => (req.params as { taskId: string }).taskId,
        }),
        requireFeature('comments'),
      ],
    },
    listCommentsHandler,
  );

  // PATCH /api/v1/comments/:id
  fastify.patch<{ Params: { id: string } }>(
    '/api/v1/comments/:id',
    {
      preHandler: [
        authorize({
          resource: 'comment',
          action: 'update',
          getTaskId: async (req) => {
            const id = (req.params as { id: string }).id;
            return getTaskIdForComment(id);
          },
        }),
        requireFeature('comments'),
      ],
    },
    async (request, reply) => {
      request.body = updateCommentSchema.parse(request.body);
      return updateCommentHandler(request as Parameters<typeof updateCommentHandler>[0], reply);
    },
  );

  // DELETE /api/v1/comments/:id
  fastify.delete<{ Params: { id: string } }>(
    '/api/v1/comments/:id',
    {
      preHandler: [
        authorize({
          resource: 'comment',
          action: 'delete',
          getTaskId: async (req) => {
            const id = (req.params as { id: string }).id;
            return getTaskIdForComment(id);
          },
        }),
        requireFeature('comments'),
      ],
    },
    deleteCommentHandler,
  );
}
