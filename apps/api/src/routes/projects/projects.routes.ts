import {
  addProjectMemberSchema,
  createLabelSchema,
  createProjectSchema,
  createWorkflowStatusSchema,
  updateLabelSchema,
  updateProjectMemberSchema,
  updateProjectSchema,
  updateWorkflowStatusSchema,
} from '@taskforge/shared';
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
import type { FastifyInstance } from 'fastify';
import { authorize } from '../../hooks/authorize.hook.js';
import {
  addProjectMemberHandler,
  addWorkflowStatusHandler,
  archiveProjectHandler,
  createLabelHandler,
  createProjectHandler,
  createWorkflowHandler,
  deleteLabelHandler,
  deleteProjectHandler,
  deleteWorkflowStatusHandler,
  finishProjectHandler,
  getProjectHandler,
  getWorkflowsHandler,
  listLabelsHandler,
  listProjectMembersHandler,
  listProjectsHandler,
  removeProjectMemberHandler,
  updateLabelHandler,
  updateLabelsHandler,
  updateProjectHandler,
  updateProjectMemberHandler,
  updateWorkflowHandler,
  updateWorkflowStatusHandler,
} from './projects.handlers.js';

type UpdateWorkflowInput = {
  statuses: Array<{
    id: string;
    name: string;
    color?: string | null;
    position: number;
    isInitial?: boolean;
    isFinal?: boolean;
  }>;
};

type UpdateLabelsInput = {
  labels: Array<{
    id: string;
    name: string;
    color?: string | null;
  }>;
};

export async function projectRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  // --- Project CRUD ---

  fastify.post<{ Params: { orgId: string }; Body: CreateProjectInput }>(
    '/api/v1/organizations/:orgId/projects',
    {
      preHandler: [
        authorize({
          resource: 'project',
          action: 'create',
          getOrgId: (req) => (req.params as { orgId: string }).orgId,
        }),
        async (request) => {
          request.body = createProjectSchema.parse(request.body);
        },
      ],
    },
    createProjectHandler,
  );

  fastify.get<{ Params: { orgId: string }; Querystring: { status?: string; search?: string } }>(
    '/api/v1/organizations/:orgId/projects',
    {
      preHandler: authorize({
        resource: 'project',
        action: 'read',
        getOrgId: (req) => (req.params as { orgId: string }).orgId,
      }),
    },
    listProjectsHandler,
  );

  fastify.get<{ Params: { id: string } }>(
    '/api/v1/projects/:id',
    {
      preHandler: authorize({
        resource: 'project',
        action: 'read',
        getProjectId: (req) => (req.params as { id: string }).id,
      }),
    },
    getProjectHandler,
  );

  fastify.patch<{ Params: { id: string }; Body: UpdateProjectInput }>(
    '/api/v1/projects/:id',
    {
      preHandler: [
        authorize({
          resource: 'project',
          action: 'update',
          getProjectId: (req) => (req.params as { id: string }).id,
        }),
        async (request) => {
          request.body = updateProjectSchema.parse(request.body);
        },
      ],
    },
    updateProjectHandler,
  );

  fastify.post<{ Params: { id: string } }>(
    '/api/v1/projects/:id/archive',
    {
      preHandler: authorize({
        resource: 'project',
        action: 'update',
        getProjectId: (req) => (req.params as { id: string }).id,
      }),
    },
    archiveProjectHandler,
  );

  fastify.post<{ Params: { id: string } }>(
    '/api/v1/projects/:id/finish',
    {
      preHandler: authorize({
        resource: 'project',
        action: 'update',
        getProjectId: (req) => (req.params as { id: string }).id,
      }),
    },
    finishProjectHandler,
  );

  fastify.delete<{ Params: { id: string } }>(
    '/api/v1/projects/:id',
    {
      preHandler: authorize({
        resource: 'project',
        action: 'delete',
        getProjectId: (req) => (req.params as { id: string }).id,
      }),
    },
    deleteProjectHandler,
  );

  // --- Members ---

  fastify.get<{ Params: { id: string } }>(
    '/api/v1/projects/:id/members',
    {
      preHandler: authorize({
        resource: 'project',
        action: 'read',
        getProjectId: (req) => (req.params as { id: string }).id,
      }),
    },
    listProjectMembersHandler,
  );

  fastify.post<{ Params: { id: string }; Body: AddProjectMemberInput }>(
    '/api/v1/projects/:id/members',
    {
      preHandler: [
        authorize({
          resource: 'project',
          action: 'update',
          getProjectId: (req) => (req.params as { id: string }).id,
        }),
        async (request) => {
          request.body = addProjectMemberSchema.parse(request.body);
        },
      ],
    },
    addProjectMemberHandler,
  );

  fastify.patch<{ Params: { id: string; memberId: string }; Body: UpdateProjectMemberInput }>(
    '/api/v1/projects/:id/members/:memberId',
    {
      preHandler: [
        authorize({
          resource: 'project',
          action: 'update',
          getProjectId: (req) => (req.params as { id: string }).id,
        }),
        async (request) => {
          request.body = updateProjectMemberSchema.parse(request.body);
        },
      ],
    },
    updateProjectMemberHandler,
  );

  fastify.delete<{ Params: { id: string; memberId: string } }>(
    '/api/v1/projects/:id/members/:memberId',
    {
      preHandler: authorize({
        resource: 'project',
        action: 'update',
        getProjectId: (req) => (req.params as { id: string }).id,
      }),
    },
    removeProjectMemberHandler,
  );

  // --- Workflows ---

  fastify.get<{ Params: { id: string } }>(
    '/api/v1/projects/:id/workflows',
    {
      preHandler: authorize({
        resource: 'project',
        action: 'read',
        getProjectId: (req) => (req.params as { id: string }).id,
      }),
    },
    getWorkflowsHandler,
  );

  fastify.post<{ Params: { id: string }; Body: { name: string } }>(
    '/api/v1/projects/:id/workflows',
    {
      preHandler: authorize({
        resource: 'project',
        action: 'update',
        getProjectId: (req) => (req.params as { id: string }).id,
      }),
    },
    createWorkflowHandler,
  );

  fastify.post<{ Params: { id: string }; Body: CreateWorkflowStatusInput }>(
    '/api/v1/projects/:id/workflow-statuses',
    {
      preHandler: [
        authorize({
          resource: 'project',
          action: 'update',
          getProjectId: (req) => (req.params as { id: string }).id,
        }),
        async (request) => {
          request.body = createWorkflowStatusSchema.parse(request.body);
        },
      ],
    },
    addWorkflowStatusHandler,
  );

  fastify.patch<{ Params: { id: string; statusId: string }; Body: UpdateWorkflowStatusInput }>(
    '/api/v1/projects/:id/workflow-statuses/:statusId',
    {
      preHandler: [
        authorize({
          resource: 'project',
          action: 'update',
          getProjectId: (req) => (req.params as { id: string }).id,
        }),
        async (request) => {
          request.body = updateWorkflowStatusSchema.parse(request.body);
        },
      ],
    },
    updateWorkflowStatusHandler,
  );

  fastify.delete<{ Params: { id: string; statusId: string } }>(
    '/api/v1/projects/:id/workflow-statuses/:statusId',
    {
      preHandler: authorize({
        resource: 'project',
        action: 'update',
        getProjectId: (req) => (req.params as { id: string }).id,
      }),
    },
    deleteWorkflowStatusHandler,
  );

  fastify.patch<{ Params: { id: string }; Body: UpdateWorkflowInput }>(
    '/api/v1/projects/:id/workflow',
    {
      preHandler: authorize({
        resource: 'project',
        action: 'update',
        getProjectId: (req) => (req.params as { id: string }).id,
      }),
    },
    updateWorkflowHandler,
  );

  // --- Labels ---

  fastify.get<{ Params: { id: string } }>(
    '/api/v1/projects/:id/labels',
    {
      preHandler: authorize({
        resource: 'project',
        action: 'read',
        getProjectId: (req) => (req.params as { id: string }).id,
      }),
    },
    listLabelsHandler,
  );

  fastify.post<{ Params: { id: string }; Body: CreateLabelInput }>(
    '/api/v1/projects/:id/labels',
    {
      preHandler: [
        authorize({
          resource: 'project',
          action: 'update',
          getProjectId: (req) => (req.params as { id: string }).id,
        }),
        async (request) => {
          request.body = createLabelSchema.parse(request.body);
        },
      ],
    },
    createLabelHandler,
  );

  fastify.patch<{ Params: { id: string; labelId: string }; Body: UpdateLabelInput }>(
    '/api/v1/projects/:id/labels/:labelId',
    {
      preHandler: [
        authorize({
          resource: 'project',
          action: 'update',
          getProjectId: (req) => (req.params as { id: string }).id,
        }),
        async (request) => {
          request.body = updateLabelSchema.parse(request.body);
        },
      ],
    },
    updateLabelHandler,
  );

  fastify.delete<{ Params: { id: string; labelId: string } }>(
    '/api/v1/projects/:id/labels/:labelId',
    {
      preHandler: authorize({
        resource: 'project',
        action: 'update',
        getProjectId: (req) => (req.params as { id: string }).id,
      }),
    },
    deleteLabelHandler,
  );

  fastify.patch<{ Params: { id: string }; Body: UpdateLabelsInput }>(
    '/api/v1/projects/:id/labels',
    {
      preHandler: authorize({
        resource: 'project',
        action: 'update',
        getProjectId: (req) => (req.params as { id: string }).id,
      }),
    },
    updateLabelsHandler,
  );
}
