import type { FastifyInstance } from 'fastify';
import { authorize } from '../../hooks/authorize.hook.js';
import {
  acceptInvitationExistingHandler,
  acceptInvitationPasswordHandler,
  createInvitationHandler,
  getInvitationHandler,
  initiateInvitationOAuthHandler,
  listInvitationsHandler,
  resendInvitationHandler,
  revokeInvitationHandler,
  validateInvitationTokenHandler,
} from './invitations.handlers.js';
import {
  type AcceptInvitationPasswordBody,
  type CreateInvitationBody,
  acceptInvitationPasswordSchema,
  createInvitationSchema,
} from './invitations.schemas.js';

export async function invitationRoutes(fastify: FastifyInstance) {
  // Public invite token endpoints
  fastify.get<{ Params: { token: string } }>(
    '/api/v1/invitations/tokens/:token',
    { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } },
    validateInvitationTokenHandler,
  );

  fastify.post<{ Params: { token: string }; Body: AcceptInvitationPasswordBody }>(
    '/api/v1/invitations/tokens/:token/accept-password',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      preHandler: async (request) => {
        request.body = acceptInvitationPasswordSchema.parse(request.body);
      },
    },
    acceptInvitationPasswordHandler,
  );

  fastify.post<{ Params: { token: string } }>(
    '/api/v1/invitations/tokens/:token/accept-existing',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      preHandler: fastify.authenticate,
    },
    acceptInvitationExistingHandler,
  );

  fastify.get<{ Params: { token: string; provider: string } }>(
    '/api/v1/invitations/tokens/:token/oauth/:provider',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    initiateInvitationOAuthHandler,
  );

  // Authenticated org-scoped invite management endpoints
  fastify.register(async (orgScoped) => {
    orgScoped.addHook('preHandler', orgScoped.authenticate);

    orgScoped.post<{ Params: { orgId: string }; Body: CreateInvitationBody }>(
      '/api/v1/organizations/:orgId/invitations',
      {
        preHandler: [
          authorize({ resource: 'invitation', action: 'create' }),
          async (request) => {
            request.body = createInvitationSchema.parse(request.body);
          },
        ],
      },
      createInvitationHandler,
    );

    orgScoped.get<{ Params: { orgId: string } }>(
      '/api/v1/organizations/:orgId/invitations',
      { preHandler: authorize({ resource: 'invitation', action: 'read' }) },
      listInvitationsHandler,
    );

    orgScoped.get<{ Params: { orgId: string; id: string } }>(
      '/api/v1/organizations/:orgId/invitations/:id',
      { preHandler: authorize({ resource: 'invitation', action: 'read' }) },
      getInvitationHandler,
    );

    orgScoped.post<{ Params: { orgId: string; id: string } }>(
      '/api/v1/organizations/:orgId/invitations/:id/resend',
      { preHandler: authorize({ resource: 'invitation', action: 'update' }) },
      resendInvitationHandler,
    );

    orgScoped.post<{ Params: { orgId: string; id: string } }>(
      '/api/v1/organizations/:orgId/invitations/:id/revoke',
      { preHandler: authorize({ resource: 'invitation', action: 'delete' }) },
      revokeInvitationHandler,
    );
  });
}
