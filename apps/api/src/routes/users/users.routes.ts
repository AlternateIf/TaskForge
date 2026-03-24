import type { FastifyInstance } from 'fastify';
import { changePasswordHandler, getMeHandler, updateMeHandler } from './users.handlers.js';
import { changePasswordSchema, updateProfileSchema } from './users.schemas.js';

export async function userRoutes(fastify: FastifyInstance) {
  // All user routes require authentication
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/api/v1/users/me', {}, getMeHandler);

  fastify.patch(
    '/api/v1/users/me',
    {
      preHandler: async (request) => {
        request.body = updateProfileSchema.parse(request.body);
      },
    },
    updateMeHandler,
  );

  fastify.patch(
    '/api/v1/users/me/password',
    {
      preHandler: async (request) => {
        request.body = changePasswordSchema.parse(request.body);
      },
    },
    changePasswordHandler,
  );
}
