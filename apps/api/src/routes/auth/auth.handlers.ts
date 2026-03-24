import type { LoginInput, RegisterInput } from '@taskforge/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import * as authService from '../../services/auth.service.js';
import { toUserOutput } from '../../services/user.service.js';
import { success } from '../../utils/response.js';

const REFRESH_COOKIE = 'taskforge_refresh';
const IS_PROD = process.env.NODE_ENV === 'production';

function setRefreshCookie(reply: FastifyReply, token: string) {
  reply.setCookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/api/v1/auth',
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  });
}

function clearRefreshCookie(reply: FastifyReply) {
  reply.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/api/v1/auth',
  });
}

export async function registerHandler(
  request: FastifyRequest<{ Body: RegisterInput }>,
  reply: FastifyReply,
) {
  const jwtSign = (payload: authService.JwtPayload, opts: { expiresIn: number }) =>
    request.server.jwtSign({ ...payload }, opts.expiresIn);

  const { user, tokens } = await authService.registerUser(
    request.body,
    jwtSign,
    request.ip,
    request.headers['user-agent'],
  );

  setRefreshCookie(reply, tokens.refreshTokenRaw);

  return reply.status(201).send(
    success({
      user: toUserOutput(user),
      accessToken: tokens.accessToken,
    }),
  );
}

export async function loginHandler(
  request: FastifyRequest<{ Body: LoginInput }>,
  reply: FastifyReply,
) {
  const jwtSign = (payload: authService.JwtPayload, opts: { expiresIn: number }) =>
    request.server.jwtSign({ ...payload }, opts.expiresIn);

  const result = await authService.loginUser(
    request.body.email,
    request.body.password,
    jwtSign,
    request.ip,
    request.headers['user-agent'],
  );

  if (result.mfaRequired) {
    return reply.status(200).send(
      success({
        mfaRequired: true,
        mfaToken: result.mfaToken,
      }),
    );
  }

  setRefreshCookie(reply, result.tokens.refreshTokenRaw);

  return reply.status(200).send(
    success({
      user: toUserOutput(result.user),
      accessToken: result.tokens.accessToken,
    }),
  );
}

export async function refreshHandler(request: FastifyRequest, reply: FastifyReply) {
  const refreshToken = request.cookies[REFRESH_COOKIE];
  if (!refreshToken) {
    return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No refresh token' } });
  }

  const jwtSign = (payload: authService.JwtPayload, opts: { expiresIn: number }) =>
    request.server.jwtSign({ ...payload }, opts.expiresIn);

  const { accessToken } = await authService.refreshSession(refreshToken, jwtSign);

  return reply.status(200).send(success({ accessToken }));
}

export async function logoutHandler(request: FastifyRequest, reply: FastifyReply) {
  const refreshToken = request.cookies[REFRESH_COOKIE];
  if (refreshToken) {
    await authService.logoutSession(refreshToken);
  }

  clearRefreshCookie(reply);
  return reply.status(204).send();
}

export async function forgotPasswordHandler(
  request: FastifyRequest<{ Body: { email: string } }>,
  reply: FastifyReply,
) {
  await authService.forgotPassword(request.body.email);
  // Always return success to prevent email enumeration
  return reply
    .status(200)
    .send(success({ message: 'If the email exists, a reset link has been sent' }));
}

export async function resetPasswordHandler(
  request: FastifyRequest<{ Body: { token: string; password: string } }>,
  reply: FastifyReply,
) {
  await authService.resetPassword(request.body.token, request.body.password);
  return reply.status(200).send(success({ message: 'Password has been reset' }));
}

export async function verifyEmailHandler(
  request: FastifyRequest<{ Body: { token: string } }>,
  reply: FastifyReply,
) {
  await authService.verifyEmail(request.body.token);
  return reply.status(200).send(success({ message: 'Email verified' }));
}
