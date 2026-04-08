import fs from 'node:fs';
import type { ChangePasswordInput, UpdateProfileInput } from '@taskforge/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { changePassword, requestEmailChange } from '../../services/auth.service.js';
import {
  deleteAccount,
  getAvatarFilePath,
  getSecurityOverview,
  getUserById,
  listSessions,
  removeAvatar,
  revokeOtherSessions,
  revokeSession,
  updateProfile,
  uploadAvatar,
} from '../../services/user.service.js';
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

export async function deleteMeHandler(request: FastifyRequest, reply: FastifyReply) {
  if (!request.authUser) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Not authenticated');
  }
  const result = await deleteAccount(request.authUser.userId);
  return reply.status(200).send(success(result));
}

export async function listSessionsHandler(request: FastifyRequest, reply: FastifyReply) {
  if (!request.authUser) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Not authenticated');
  }
  const data = await listSessions(request.authUser.userId, request.authUser.sessionId ?? '');
  return reply.status(200).send(success(data));
}

export async function revokeSessionHandler(
  request: FastifyRequest<{ Params: { sessionId: string } }>,
  reply: FastifyReply,
) {
  if (!request.authUser) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Not authenticated');
  }
  await revokeSession(request.authUser.userId, request.params.sessionId);
  return reply.status(200).send(success({ revoked: 1 }));
}

export async function revokeOtherSessionsHandler(request: FastifyRequest, reply: FastifyReply) {
  if (!request.authUser) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Not authenticated');
  }
  const result = await revokeOtherSessions(
    request.authUser.userId,
    request.authUser.sessionId ?? '',
  );
  return reply.status(200).send(success(result));
}

export async function getSecurityOverviewHandler(request: FastifyRequest, reply: FastifyReply) {
  if (!request.authUser) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Not authenticated');
  }
  const overview = await getSecurityOverview(request.authUser.userId);
  return reply.status(200).send(success(overview));
}

export async function uploadAvatarHandler(request: FastifyRequest, reply: FastifyReply) {
  if (!request.authUser) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Not authenticated');
  }

  const data = await request.file();
  if (!data) {
    throw new AppError(400, ErrorCode.BAD_REQUEST, 'No file uploaded');
  }

  const fileBuffer = await data.toBuffer();
  if (data.file.truncated) {
    throw new AppError(413, ErrorCode.FILE_TOO_LARGE, 'File exceeds the 5 MB limit');
  }

  const user = await uploadAvatar(request.authUser.userId, fileBuffer, data.mimetype);
  return reply.status(200).send(success(user));
}

export async function removeAvatarHandler(request: FastifyRequest, reply: FastifyReply) {
  if (!request.authUser) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Not authenticated');
  }
  const user = await removeAvatar(request.authUser.userId);
  return reply.status(200).send(success(user));
}

export async function getAvatarHandler(
  request: FastifyRequest<{ Params: { userId: string } }>,
  reply: FastifyReply,
) {
  const result = await getAvatarFilePath(request.params.userId);
  if (!result) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Avatar not found');
  }

  let fileBuffer: Buffer;
  try {
    fileBuffer = await fs.promises.readFile(result.filePath);
  } catch {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Avatar file not found');
  }

  return reply
    .header('Content-Type', result.mimeType)
    .header('Cache-Control', 'public, max-age=3600')
    .send(fileBuffer);
}

export async function requestEmailChangeHandler(
  request: FastifyRequest<{ Body: { newEmail: string; currentPassword: string } }>,
  reply: FastifyReply,
) {
  if (!request.authUser) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Not authenticated');
  }
  await requestEmailChange(
    request.authUser.userId,
    request.body.newEmail,
    request.body.currentPassword,
  );
  return reply
    .status(200)
    .send(success({ message: 'Confirmation email sent to your new address.' }));
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
