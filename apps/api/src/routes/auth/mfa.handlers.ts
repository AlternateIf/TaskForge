import { db, users } from '@taskforge/db';
import { eq } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { JwtPayload } from '../../services/auth.service.js';
import { createSession } from '../../services/auth.service.js';
import * as mfaService from '../../services/mfa.service.js';
import { getUserOrg, toUserOutput } from '../../services/user.service.js';
import { AppError, ErrorCode } from '../../utils/errors.js';
import { success } from '../../utils/response.js';

const REFRESH_COOKIE = 'taskforge_refresh';
const IS_PROD = process.env.NODE_ENV === 'production';

function setRefreshCookie(reply: FastifyReply, token: string) {
  reply.setCookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/api/v1/auth',
    maxAge: 7 * 24 * 60 * 60,
  });
}

export async function mfaSetupHandler(request: FastifyRequest, reply: FastifyReply) {
  if (!request.authUser) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Not authenticated');
  }

  const { secret, uri } = await mfaService.setupMfa(request.authUser.userId);

  return reply.status(200).send(success({ secret, uri }));
}

export async function mfaVerifySetupHandler(
  request: FastifyRequest<{ Body: { code: string } }>,
  reply: FastifyReply,
) {
  if (!request.authUser) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Not authenticated');
  }

  await mfaService.verifySetup(request.authUser.userId, request.body.code);

  return reply.status(200).send(success({ message: 'MFA enabled successfully' }));
}

export async function mfaVerifyLoginHandler(
  request: FastifyRequest<{ Body: { mfaToken: string; code: string } }>,
  reply: FastifyReply,
) {
  const { userId } = await mfaService.verifyMfaLogin(request.body.mfaToken, request.body.code);

  const user = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
  if (!user) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'User not found');
  }

  const jwtSign = (payload: JwtPayload, opts: { expiresIn: number }) =>
    request.server.jwtSign({ ...payload }, opts.expiresIn);

  const tokens = await createSession(user, jwtSign, request.ip, request.headers['user-agent']);

  setRefreshCookie(reply, tokens.refreshTokenRaw);
  const org = await getUserOrg(user.id);

  return reply.status(200).send(
    success({
      user: toUserOutput(user, org),
      accessToken: tokens.accessToken,
    }),
  );
}

export async function mfaDisableHandler(
  request: FastifyRequest<{ Body: { code: string } }>,
  reply: FastifyReply,
) {
  if (!request.authUser) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Not authenticated');
  }

  await mfaService.disableMfa(request.authUser.userId, request.body.code);

  return reply.status(200).send(success({ message: 'MFA disabled' }));
}
