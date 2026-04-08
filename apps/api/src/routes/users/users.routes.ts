import type { FastifyInstance } from 'fastify';
import {
  changePasswordHandler,
  deleteMeHandler,
  getAvatarHandler,
  getMeHandler,
  getSecurityOverviewHandler,
  listSessionsHandler,
  removeAvatarHandler,
  requestEmailChangeHandler,
  revokeOtherSessionsHandler,
  revokeSessionHandler,
  updateMeHandler,
  uploadAvatarHandler,
} from './users.handlers.js';
import { changePasswordSchema, updateProfileSchema } from './users.schemas.js';

export async function userRoutes(fastify: FastifyInstance) {
  // All routes in this plugin require authentication
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/api/v1/users/me', {}, getMeHandler);
  fastify.get('/api/v1/users/me/security', {}, getSecurityOverviewHandler);
  fastify.get('/api/v1/users/me/sessions', {}, listSessionsHandler);
  fastify.delete('/api/v1/users/me/sessions', {}, revokeOtherSessionsHandler);
  fastify.delete<{ Params: { sessionId: string } }>(
    '/api/v1/users/me/sessions/:sessionId',
    {},
    revokeSessionHandler,
  );

  fastify.patch(
    '/api/v1/users/me',
    {
      preHandler: async (request) => {
        request.body = updateProfileSchema.parse(request.body);
      },
    },
    updateMeHandler,
  );

  fastify.delete('/api/v1/users/me', {}, deleteMeHandler);

  fastify.post('/api/v1/users/me/email', {}, requestEmailChangeHandler);

  fastify.patch(
    '/api/v1/users/me/password',
    {
      preHandler: async (request) => {
        request.body = changePasswordSchema.parse(request.body);
      },
    },
    changePasswordHandler,
  );

  // Avatar upload & remove (authenticated, multipart for upload)
  fastify.post('/api/v1/users/me/avatar', {}, uploadAvatarHandler);
  fastify.delete('/api/v1/users/me/avatar', {}, removeAvatarHandler);
}

/** Public routes — no authentication required (avatar images are served publicly by userId). */
export async function userPublicRoutes(fastify: FastifyInstance) {
  fastify.get<{ Params: { userId: string } }>(
    '/api/v1/users/avatars/:userId',
    {},
    getAvatarHandler,
  );
}
