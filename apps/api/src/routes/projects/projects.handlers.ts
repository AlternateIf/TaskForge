import type {
  AddProjectMemberInput,
  CreateLabelInput,
  CreateProjectInput,
  CreateWorkflowStatusInput,
  UpdateLabelInput,
  UpdateProjectInput,
  UpdateProjectMemberInput,
  UpdateWorkflowStatusInput,
} from '@taskforge/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import * as projectService from '../../services/project.service.js';
import { AppError, ErrorCode } from '../../utils/errors.js';
import { success } from '../../utils/response.js';

function requireAuth(request: FastifyRequest): string {
  if (!request.authUser) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Not authenticated');
  }
  return request.authUser.userId;
}

// --- Project CRUD ---

export async function createProjectHandler(
  request: FastifyRequest<{ Params: { orgId: string }; Body: CreateProjectInput }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  const project = await projectService.createProject(request.params.orgId, userId, request.body);
  return reply.status(201).send(success(project));
}

export async function listProjectsHandler(
  request: FastifyRequest<{
    Params: { orgId: string };
    Querystring: { status?: string; search?: string };
  }>,
  reply: FastifyReply,
) {
  requireAuth(request);
  const query = request.query as { status?: string; search?: string };
  const projects = await projectService.listProjects(request.params.orgId, {
    status: query.status,
    search: query.search,
  });
  return reply.status(200).send(success(projects));
}

export async function getProjectHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  requireAuth(request);
  const id = request.params.id;
  const [project, workflows, members, labels] = await Promise.all([
    projectService.getProject(id),
    projectService.getProjectWorkflows(id),
    projectService.listProjectMembers(id),
    projectService.listLabels(id),
  ]);
  const defaultWorkflow = workflows.find((w) => w.isDefault) ?? workflows[0];
  return reply.status(200).send(
    success({
      ...project,
      statuses: defaultWorkflow?.statuses ?? [],
      members,
      labels,
    }),
  );
}

export async function updateProjectHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateProjectInput }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  const project = await projectService.updateProject(request.params.id, request.body, userId);
  return reply.status(200).send(success(project));
}

export async function archiveProjectHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  const project = await projectService.archiveProject(request.params.id, userId);
  return reply.status(200).send(success(project));
}

export async function deleteProjectHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  await projectService.deleteProject(request.params.id, userId);
  return reply.status(204).send();
}

// --- Members ---

export async function listProjectMembersHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  requireAuth(request);
  const members = await projectService.listProjectMembers(request.params.id);
  return reply.status(200).send(success(members));
}

export async function addProjectMemberHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: AddProjectMemberInput }>,
  reply: FastifyReply,
) {
  const actorUserId = requireAuth(request);
  const member = await projectService.addProjectMember(
    request.params.id,
    request.body.userId,
    request.body.roleId,
    actorUserId,
  );
  return reply.status(201).send(success(member));
}

export async function updateProjectMemberHandler(
  request: FastifyRequest<{
    Params: { id: string; memberId: string };
    Body: UpdateProjectMemberInput;
  }>,
  reply: FastifyReply,
) {
  const actorUserId = requireAuth(request);
  const member = await projectService.updateProjectMember(
    request.params.id,
    request.params.memberId,
    request.body.roleId,
    actorUserId,
  );
  return reply.status(200).send(success(member));
}

export async function removeProjectMemberHandler(
  request: FastifyRequest<{ Params: { id: string; memberId: string } }>,
  reply: FastifyReply,
) {
  requireAuth(request);
  await projectService.removeProjectMember(request.params.id, request.params.memberId);
  return reply.status(204).send();
}

// --- Workflows ---

export async function getWorkflowsHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  requireAuth(request);
  const workflows = await projectService.getProjectWorkflows(request.params.id);
  return reply.status(200).send(success(workflows));
}

export async function createWorkflowHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: { name: string } }>,
  reply: FastifyReply,
) {
  requireAuth(request);
  const workflow = await projectService.createWorkflow(request.params.id, request.body.name);
  return reply.status(201).send(success(workflow));
}

export async function addWorkflowStatusHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: CreateWorkflowStatusInput }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  const status = await projectService.addWorkflowStatus(request.params.id, request.body, userId);
  return reply.status(201).send(success(status));
}

export async function updateWorkflowStatusHandler(
  request: FastifyRequest<{
    Params: { id: string; statusId: string };
    Body: UpdateWorkflowStatusInput;
  }>,
  reply: FastifyReply,
) {
  requireAuth(request);
  const status = await projectService.updateWorkflowStatus(request.params.statusId, request.body);
  return reply.status(200).send(success(status));
}

export async function updateWorkflowHandler(
  request: FastifyRequest<{
    Params: { id: string };
    Body: {
      statuses: Array<{
        id: string;
        name: string;
        color?: string | null;
        position: number;
        isInitial?: boolean;
        isFinal?: boolean;
      }>;
    };
  }>,
  reply: FastifyReply,
) {
  requireAuth(request);
  const id = request.params.id;
  await projectService.bulkUpsertWorkflowStatuses(id, request.body.statuses ?? []);
  const [project, workflows, members, labels] = await Promise.all([
    projectService.getProject(id),
    projectService.getProjectWorkflows(id),
    projectService.listProjectMembers(id),
    projectService.listLabels(id),
  ]);
  const defaultWorkflow = workflows.find((w) => w.isDefault) ?? workflows[0];
  return reply
    .status(200)
    .send(success({ ...project, statuses: defaultWorkflow?.statuses ?? [], members, labels }));
}

export async function updateLabelsHandler(
  request: FastifyRequest<{
    Params: { id: string };
    Body: { labels: Array<{ id: string; name: string; color?: string | null }> };
  }>,
  reply: FastifyReply,
) {
  requireAuth(request);
  const id = request.params.id;
  await projectService.bulkUpsertLabels(id, request.body.labels ?? []);
  const [project, workflows, members, labels] = await Promise.all([
    projectService.getProject(id),
    projectService.getProjectWorkflows(id),
    projectService.listProjectMembers(id),
    projectService.listLabels(id),
  ]);
  const defaultWorkflow = workflows.find((w) => w.isDefault) ?? workflows[0];
  return reply
    .status(200)
    .send(success({ ...project, statuses: defaultWorkflow?.statuses ?? [], members, labels }));
}

export async function deleteWorkflowStatusHandler(
  request: FastifyRequest<{ Params: { id: string; statusId: string } }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  await projectService.deleteWorkflowStatus(request.params.id, request.params.statusId, userId);
  return reply.status(204).send();
}

// --- Labels ---

export async function listLabelsHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  requireAuth(request);
  const labels = await projectService.listLabels(request.params.id);
  return reply.status(200).send(success(labels));
}

export async function createLabelHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: CreateLabelInput }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  const label = await projectService.createLabel(request.params.id, request.body, userId);
  return reply.status(201).send(success(label));
}

export async function updateLabelHandler(
  request: FastifyRequest<{ Params: { id: string; labelId: string }; Body: UpdateLabelInput }>,
  reply: FastifyReply,
) {
  requireAuth(request);
  const label = await projectService.updateLabel(request.params.labelId, request.body);
  return reply.status(200).send(success(label));
}

export async function deleteLabelHandler(
  request: FastifyRequest<{ Params: { id: string; labelId: string } }>,
  reply: FastifyReply,
) {
  const userId = requireAuth(request);
  await projectService.deleteLabel(request.params.labelId, userId);
  return reply.status(204).send();
}
