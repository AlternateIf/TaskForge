import type { FastifyInstance } from 'fastify';
import {
  addMemberHandler,
  createOrganizationHandler,
  deleteOrganizationHandler,
  getOrganizationHandler,
  listMembersHandler,
  listOrganizationsHandler,
  removeMemberHandler,
  updateMemberRoleHandler,
  updateOrganizationHandler,
} from './organizations.handlers.js';
import {
  addMemberSchema,
  createOrganizationSchema,
  updateMemberRoleSchema,
  updateOrganizationSchema,
} from '@taskforge/shared';

export async function organizationRoutes(fastify: FastifyInstance) {
  // All org routes require authentication
  fastify.addHook('preHandler', fastify.authenticate);

  // Organization CRUD
  fastify.post(
    '/api/v1/organizations',
    {
      preHandler: async (request) => {
        request.body = createOrganizationSchema.parse(request.body);
      },
    },
    createOrganizationHandler,
  );

  fastify.get('/api/v1/organizations', {}, listOrganizationsHandler);

  fastify.get('/api/v1/organizations/:id', {}, getOrganizationHandler);

  fastify.patch(
    '/api/v1/organizations/:id',
    {
      preHandler: async (request) => {
        request.body = updateOrganizationSchema.parse(request.body);
      },
    },
    updateOrganizationHandler,
  );

  fastify.delete('/api/v1/organizations/:id', {}, deleteOrganizationHandler);

  // Members
  fastify.get('/api/v1/organizations/:id/members', {}, listMembersHandler);

  fastify.post(
    '/api/v1/organizations/:id/members',
    {
      preHandler: async (request) => {
        request.body = addMemberSchema.parse(request.body);
      },
    },
    addMemberHandler,
  );

  fastify.patch(
    '/api/v1/organizations/:id/members/:memberId',
    {
      preHandler: async (request) => {
        request.body = updateMemberRoleSchema.parse(request.body);
      },
    },
    updateMemberRoleHandler,
  );

  fastify.delete('/api/v1/organizations/:id/members/:memberId', {}, removeMemberHandler);
}
