import type { ChangePasswordInput, UpdateProfileInput } from '@taskforge/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { changePassword } from '../../services/auth.service.js';
import { getUserById, updateProfile } from '../../services/user.service.js';
import { AppError, ErrorCode } from '../../utils/errors.js';
import { success } from '../../utils/response.js';

export async function getMeHandler(request: FastifyRequest, reply: FastifyReply) {
  if (!request.authUser) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Not authenticated');
  }
  const user = await getUserById(request.authUser.userId);
  return reply.status(200).send(success(user));
}

export async function updateMeHandler(
  request: FastifyRequest<{ Body: UpdateProfileInput }>,
  reply: FastifyReply,
) {
  if (!request.authUser) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Not authenticated');
  }
  const user = await updateProfile(request.authUser.userId, request.body);
  return reply.status(200).send(success(user));
}

export async function changePasswordHandler(
  request: FastifyRequest<{ Body: ChangePasswordInput }>,
  reply: FastifyReply,
) {
  if (!request.authUser) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Not authenticated');
  }

  const result = await changePassword(
    request.authUser.userId,
    request.authUser.sessionId ?? '',
    request.body.currentPassword,
    request.body.newPassword,
  );

  return reply.status(200).send(success(result));
}
