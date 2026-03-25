import {
  addTaskLabelSchema,
  assignTaskSchema,
  createTaskSchema,
  updateTaskPositionSchema,
  updateTaskSchema,
} from '@taskforge/shared';
import type {
  AddTaskLabelInput,
  AssignTaskInput,
  CreateTaskInput,
  UpdateTaskInput,
  UpdateTaskPositionInput,
} from '@taskforge/shared';
import type { FastifyInstance } from 'fastify';
import { authorize } from '../../hooks/authorize.hook.js';
import {
  addTaskLabelHandler,
  addWatcherHandler,
  assignTaskHandler,
  createTaskHandler,
  deleteTaskHandler,
  getTaskHandler,
  getTaskLabelsHandler,
  listTasksHandler,
  removeTaskLabelHandler,
  removeWatcherHandler,
  updateTaskHandler,
  updateTaskPositionHandler,
} from './tasks.handlers.js';

const getTaskIdFromParams = (req: import('fastify').FastifyRequest) =>
  (req.params as { id: string }).id;

export async function taskRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  // --- Task CRUD ---

  fastify.post<{ Params: { projectId: string }; Body: CreateTaskInput }>(
    '/api/v1/projects/:projectId/tasks',
    {
      preHandler: [
        authorize({
          resource: 'task',
          action: 'create',
          getProjectId: (req) => (req.params as { projectId: string }).projectId,
        }),
        async (request) => {
          request.body = createTaskSchema.parse(request.body);
        },
      ],
    },
    createTaskHandler,
  );

  fastify.get<{
    Params: { projectId: string };
    Querystring: {
      status?: string | string[];
      priority?: string | string[];
      assigneeId?: string;
      labelId?: string | string[];
      dueDateFrom?: string;
      dueDateTo?: string;
      search?: string;
      sort?: string;
      order?: string;
    };
  }>(
    '/api/v1/projects/:projectId/tasks',
    {
      preHandler: authorize({
        resource: 'task',
        action: 'read',
        getProjectId: (req) => (req.params as { projectId: string }).projectId,
      }),
    },
    listTasksHandler,
  );

  fastify.get<{ Params: { id: string } }>(
    '/api/v1/tasks/:id',
    {
      preHandler: authorize({
        resource: 'task',
        action: 'read',
        getTaskId: getTaskIdFromParams,
      }),
    },
    getTaskHandler,
  );

  fastify.patch<{ Params: { id: string }; Body: UpdateTaskInput }>(
    '/api/v1/tasks/:id',
    {
      preHandler: [
        authorize({
          resource: 'task',
          action: 'update',
          getTaskId: getTaskIdFromParams,
        }),
        async (request) => {
          request.body = updateTaskSchema.parse(request.body);
        },
      ],
    },
    updateTaskHandler,
  );

  fastify.delete<{ Params: { id: string } }>(
    '/api/v1/tasks/:id',
    {
      preHandler: authorize({
        resource: 'task',
        action: 'delete',
        getTaskId: getTaskIdFromParams,
      }),
    },
    deleteTaskHandler,
  );

  // --- Assignment ---

  fastify.post<{ Params: { id: string }; Body: AssignTaskInput }>(
    '/api/v1/tasks/:id/assign',
    {
      preHandler: [
        authorize({
          resource: 'task',
          action: 'update',
          getTaskId: getTaskIdFromParams,
        }),
        async (request) => {
          request.body = assignTaskSchema.parse(request.body);
        },
      ],
    },
    assignTaskHandler,
  );

  // --- Watchers ---

  fastify.post<{ Params: { id: string } }>(
    '/api/v1/tasks/:id/watch',
    {
      preHandler: authorize({
        resource: 'task',
        action: 'read',
        getTaskId: getTaskIdFromParams,
      }),
    },
    addWatcherHandler,
  );

  fastify.delete<{ Params: { id: string } }>(
    '/api/v1/tasks/:id/watch',
    {
      preHandler: authorize({
        resource: 'task',
        action: 'read',
        getTaskId: getTaskIdFromParams,
      }),
    },
    removeWatcherHandler,
  );

  // --- Labels ---

  fastify.get<{ Params: { id: string } }>(
    '/api/v1/tasks/:id/labels',
    {
      preHandler: authorize({
        resource: 'task',
        action: 'read',
        getTaskId: getTaskIdFromParams,
      }),
    },
    getTaskLabelsHandler,
  );

  fastify.post<{ Params: { id: string }; Body: AddTaskLabelInput }>(
    '/api/v1/tasks/:id/labels',
    {
      preHandler: [
        authorize({
          resource: 'task',
          action: 'update',
          getTaskId: getTaskIdFromParams,
        }),
        async (request) => {
          request.body = addTaskLabelSchema.parse(request.body);
        },
      ],
    },
    addTaskLabelHandler,
  );

  fastify.delete<{ Params: { id: string; labelId: string } }>(
    '/api/v1/tasks/:id/labels/:labelId',
    {
      preHandler: authorize({
        resource: 'task',
        action: 'update',
        getTaskId: getTaskIdFromParams,
      }),
    },
    removeTaskLabelHandler,
  );

  // --- Position ---

  fastify.patch<{ Params: { id: string }; Body: UpdateTaskPositionInput }>(
    '/api/v1/tasks/:id/position',
    {
      preHandler: [
        authorize({
          resource: 'task',
          action: 'update',
          getTaskId: getTaskIdFromParams,
        }),
        async (request) => {
          request.body = updateTaskPositionSchema.parse(request.body);
        },
      ],
    },
    updateTaskPositionHandler,
  );
}
