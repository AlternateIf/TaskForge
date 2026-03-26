import type {
  AddTaskLabelInput,
  AssignTaskInput,
  CreateTaskInput,
  UpdateTaskInput,
  UpdateTaskPositionInput,
} from '@taskforge/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import * as taskService from '../../services/task.service.js';
import { AppError, ErrorCode } from '../../utils/errors.js';
import { success } from '../../utils/response.js';

function requireAuth(request: FastifyRequest): string {
  if (!request.authUser) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Not authenticated');
  }
  return request.authUser.userId;
}

// --- Task CRUD ---

export async function createTaskHandler(
  request: FastifyRequest<{ Params: { projectId: string }; Body: CreateTaskInput }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  const task = await taskService.createTask(request.params.projectId, userId, request.body);
  return reply.status(201).send(success(task));
}

export async function listTasksHandler(
  request: FastifyRequest<{
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
  }>,
  reply: FastifyReply,
) {
  requireAuth(request);
  const q = request.query;
  const tasks = await taskService.listTasks(request.params.projectId, {
    status: q.status ? (Array.isArray(q.status) ? q.status : [q.status]) : undefined,
    priority: q.priority ? (Array.isArray(q.priority) ? q.priority : [q.priority]) : undefined,
    assigneeId: q.assigneeId,
    labelId: q.labelId ? (Array.isArray(q.labelId) ? q.labelId : [q.labelId]) : undefined,
    dueDateFrom: q.dueDateFrom,
    dueDateTo: q.dueDateTo,
    search: q.search,
    sort: q.sort,
    order: q.order,
  });
  return reply.status(200).send(success(tasks));
}

export async function getTaskHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  requireAuth(request);
  const task = await taskService.getTask(request.params.id);
  return reply.status(200).send(success(task));
}

export async function updateTaskHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateTaskInput }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  const projectId = await taskService.getProjectIdForTask(request.params.id);
  const task = await taskService.updateTask(request.params.id, projectId, request.body, userId);
  return reply.status(200).send(success(task));
}

export async function deleteTaskHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  await taskService.deleteTask(request.params.id, userId);
  return reply.status(204).send();
}

// --- Assignment ---

export async function assignTaskHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: AssignTaskInput }>,
  reply: FastifyReply,
) {
  requireAuth(request);
  const projectId = await taskService.getProjectIdForTask(request.params.id);
  const task = await taskService.assignTask(request.params.id, projectId, request.body.assigneeId);
  return reply.status(200).send(success(task));
}

// --- Watchers ---

export async function addWatcherHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  await taskService.addWatcher(request.params.id, userId);
  return reply.status(204).send();
}

export async function removeWatcherHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  await taskService.removeWatcher(request.params.id, userId);
  return reply.status(204).send();
}

// --- Labels ---

export async function getTaskLabelsHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  requireAuth(request);
  const labels = await taskService.getTaskLabels(request.params.id);
  return reply.status(200).send(success(labels));
}

export async function addTaskLabelHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: AddTaskLabelInput }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  const projectId = await taskService.getProjectIdForTask(request.params.id);
  await taskService.addTaskLabel(request.params.id, request.body.labelId, projectId, userId);
  return reply
    .status(201)
    .send(success({ taskId: request.params.id, labelId: request.body.labelId }));
}

export async function removeTaskLabelHandler(
  request: FastifyRequest<{ Params: { id: string; labelId: string } }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  await taskService.removeTaskLabel(request.params.id, request.params.labelId, userId);
  return reply.status(204).send();
}

// --- Position ---

export async function updateTaskPositionHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateTaskPositionInput }>,
  reply: FastifyReply,
) {
  requireAuth(request);
  const projectId = await taskService.getProjectIdForTask(request.params.id);
  const task = await taskService.updateTaskPosition(
    request.params.id,
    projectId,
    request.body.position,
    request.body.statusId,
  );
  return reply.status(200).send(success(task));
}
