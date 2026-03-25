import type {
  CreateChecklistInput,
  CreateChecklistItemInput,
  UpdateChecklistInput,
  UpdateChecklistItemInput,
} from '@taskforge/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import * as checklistService from '../../services/checklist.service.js';
import { AppError, ErrorCode } from '../../utils/errors.js';
import { success } from '../../utils/response.js';

function requireAuth(request: FastifyRequest): string {
  if (!request.authUser) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Not authenticated');
  }
  return request.authUser.userId;
}

// --- Checklists ---

export async function createChecklistHandler(
  request: FastifyRequest<{ Params: { taskId: string }; Body: CreateChecklistInput }>,
  reply: FastifyReply,
) {
  requireAuth(request);
  const checklist = await checklistService.createChecklist(request.params.taskId, request.body);
  return reply.status(201).send(success(checklist));
}

export async function listChecklistsHandler(
  request: FastifyRequest<{ Params: { taskId: string } }>,
  reply: FastifyReply,
) {
  requireAuth(request);
  const checklists = await checklistService.listChecklists(request.params.taskId);
  return reply.status(200).send(success(checklists));
}

export async function updateChecklistHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateChecklistInput }>,
  reply: FastifyReply,
) {
  requireAuth(request);
  const checklist = await checklistService.updateChecklist(request.params.id, request.body);
  return reply.status(200).send(success(checklist));
}

export async function deleteChecklistHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  requireAuth(request);
  await checklistService.deleteChecklist(request.params.id);
  return reply.status(204).send();
}

// --- Checklist Items ---

export async function createChecklistItemHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: CreateChecklistItemInput }>,
  reply: FastifyReply,
) {
  requireAuth(request);
  const item = await checklistService.createChecklistItem(request.params.id, request.body);
  return reply.status(201).send(success(item));
}

export async function updateChecklistItemHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateChecklistItemInput }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  const item = await checklistService.updateChecklistItem(request.params.id, userId, request.body);
  return reply.status(200).send(success(item));
}

export async function deleteChecklistItemHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  requireAuth(request);
  await checklistService.deleteChecklistItem(request.params.id);
  return reply.status(204).send();
}
