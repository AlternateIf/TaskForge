import {
  createChecklistItemSchema,
  createChecklistSchema,
  updateChecklistItemSchema,
  updateChecklistSchema,
} from '@taskforge/shared';
import type {
  CreateChecklistInput,
  CreateChecklistItemInput,
  UpdateChecklistInput,
  UpdateChecklistItemInput,
} from '@taskforge/shared';
import type { FastifyInstance } from 'fastify';
import { authorize } from '../../hooks/authorize.hook.js';
import {
  getTaskIdForChecklist,
  getTaskIdForChecklistItem,
} from '../../services/checklist.service.js';
import {
  createChecklistHandler,
  createChecklistItemHandler,
  deleteChecklistHandler,
  deleteChecklistItemHandler,
  listChecklistsHandler,
  updateChecklistHandler,
  updateChecklistItemHandler,
} from './checklists.handlers.js';

export async function checklistRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  // --- Checklist CRUD (task-scoped) ---

  // POST /api/v1/tasks/:taskId/checklists
  fastify.post<{ Params: { taskId: string }; Body: CreateChecklistInput }>(
    '/api/v1/tasks/:taskId/checklists',
    {
      preHandler: [
        authorize({
          resource: 'task',
          action: 'update',
          getTaskId: (req) => (req.params as { taskId: string }).taskId,
        }),
        async (request) => {
          request.body = createChecklistSchema.parse(request.body);
        },
      ],
    },
    createChecklistHandler,
  );

  // GET /api/v1/tasks/:taskId/checklists
  fastify.get<{ Params: { taskId: string } }>(
    '/api/v1/tasks/:taskId/checklists',
    {
      preHandler: authorize({
        resource: 'task',
        action: 'read',
        getTaskId: (req) => (req.params as { taskId: string }).taskId,
      }),
    },
    listChecklistsHandler,
  );

  // PATCH /api/v1/checklists/:id
  fastify.patch<{ Params: { id: string }; Body: UpdateChecklistInput }>(
    '/api/v1/checklists/:id',
    {
      preHandler: [
        authorize({
          resource: 'task',
          action: 'update',
          getTaskId: async (req) => {
            const checklistId = (req.params as { id: string }).id;
            return getTaskIdForChecklist(checklistId);
          },
        }),
        async (request) => {
          request.body = updateChecklistSchema.parse(request.body);
        },
      ],
    },
    updateChecklistHandler,
  );

  // DELETE /api/v1/checklists/:id
  fastify.delete<{ Params: { id: string } }>(
    '/api/v1/checklists/:id',
    {
      preHandler: authorize({
        resource: 'task',
        action: 'delete',
        getTaskId: async (req) => {
          const checklistId = (req.params as { id: string }).id;
          return getTaskIdForChecklist(checklistId);
        },
      }),
    },
    deleteChecklistHandler,
  );

  // --- Checklist Items ---

  // POST /api/v1/checklists/:id/items
  fastify.post<{ Params: { id: string }; Body: CreateChecklistItemInput }>(
    '/api/v1/checklists/:id/items',
    {
      preHandler: [
        authorize({
          resource: 'task',
          action: 'update',
          getTaskId: async (req) => {
            const checklistId = (req.params as { id: string }).id;
            return getTaskIdForChecklist(checklistId);
          },
        }),
        async (request) => {
          request.body = createChecklistItemSchema.parse(request.body);
        },
      ],
    },
    createChecklistItemHandler,
  );

  // PATCH /api/v1/checklist-items/:id
  fastify.patch<{ Params: { id: string }; Body: UpdateChecklistItemInput }>(
    '/api/v1/checklist-items/:id',
    {
      preHandler: [
        authorize({
          resource: 'task',
          action: 'update',
          getTaskId: async (req) => {
            const itemId = (req.params as { id: string }).id;
            return getTaskIdForChecklistItem(itemId);
          },
        }),
        async (request) => {
          request.body = updateChecklistItemSchema.parse(request.body);
        },
      ],
    },
    updateChecklistItemHandler,
  );

  // DELETE /api/v1/checklist-items/:id
  fastify.delete<{ Params: { id: string } }>(
    '/api/v1/checklist-items/:id',
    {
      preHandler: authorize({
        resource: 'task',
        action: 'delete',
        getTaskId: async (req) => {
          const itemId = (req.params as { id: string }).id;
          return getTaskIdForChecklistItem(itemId);
        },
      }),
    },
    deleteChecklistItemHandler,
  );
}
