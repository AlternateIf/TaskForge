import type { FastifyReply, FastifyRequest } from 'fastify';
import type { JwtPayload } from '../../services/auth.service.js';
import * as invitationService from '../../services/invitation.service.js';
import * as oauthService from '../../services/oauth.service.js';
import { getUserById } from '../../services/user.service.js';
import { AppError, ErrorCode } from '../../utils/errors.js';
import { success } from '../../utils/response.js';
import type { AcceptInvitationPasswordBody, CreateInvitationBody } from './invitations.schemas.js';

const REFRESH_COOKIE = 'taskforge_refresh';
const IS_PROD = process.env.NODE_ENV === 'production';
const INVITE_TOKEN_PATTERN = /^[a-f0-9]{64}$/i;
const OAUTH_PROVIDER_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/i;

function setRefreshCookie(reply: FastifyReply, token: string) {
  reply.setCookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/api/v1/auth',
    maxAge: 7 * 24 * 60 * 60,
  });
}

function requireAuthUserId(request: FastifyRequest): string {
  if (!request.authUser) {
    throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Not authenticated');
  }
  return request.authUser.userId;
}

function assertValidInviteToken(token: string): void {
  if (!INVITE_TOKEN_PATTERN.test(token)) {
    throw new AppError(400, ErrorCode.BAD_REQUEST, 'Malformed invitation token');
  }
}

function assertValidOAuthProvider(provider: string): void {
  if (!OAUTH_PROVIDER_PATTERN.test(provider)) {
    throw new AppError(400, ErrorCode.BAD_REQUEST, 'Unsupported OAuth provider parameter');
  }
}

export async function createInvitationHandler(
  request: FastifyRequest<{ Params: { orgId: string }; Body: CreateInvitationBody }>,
  reply: FastifyReply,
) {
  const userId = requireAuthUserId(request);
  const result = await invitationService.createInvitation(
    request.params.orgId,
    userId,
    request.body,
  );
  return reply.status(201).send(success(result));
}

export async function listInvitationsHandler(
  request: FastifyRequest<{ Params: { orgId: string } }>,
  reply: FastifyReply,
) {
  const userId = requireAuthUserId(request);
  const rows = await invitationService.listSentInvitations(request.params.orgId, userId);
  return reply.status(200).send(success(rows));
}

export async function getInvitationHandler(
  request: FastifyRequest<{ Params: { orgId: string; id: string } }>,
  reply: FastifyReply,
) {
  const userId = requireAuthUserId(request);
  const row = await invitationService.getInvitationById(
    request.params.orgId,
    request.params.id,
    userId,
  );
  return reply.status(200).send(success(row));
}

export async function resendInvitationHandler(
  request: FastifyRequest<{ Params: { orgId: string; id: string } }>,
  reply: FastifyReply,
) {
  const userId = requireAuthUserId(request);
  const row = await invitationService.resendInvitation(
    request.params.orgId,
    request.params.id,
    userId,
  );
  return reply.status(200).send(success(row));
}

export async function revokeInvitationHandler(
  request: FastifyRequest<{ Params: { orgId: string; id: string } }>,
  reply: FastifyReply,
) {
  const userId = requireAuthUserId(request);
  await invitationService.revokeInvitation(request.params.orgId, request.params.id, userId);
  return reply.status(204).send();
}

export async function validateInvitationTokenHandler(
  request: FastifyRequest<{ Params: { token: string } }>,
  reply: FastifyReply,
) {
  assertValidInviteToken(request.params.token);
  const result = await invitationService.validateInvitationToken(request.params.token);
  return reply.status(200).send(success(result));
}

export async function acceptInvitationPasswordHandler(
  request: FastifyRequest<{
    Params: { token: string };
    Body: AcceptInvitationPasswordBody;
  }>,
  reply: FastifyReply,
) {
  assertValidInviteToken(request.params.token);
  const jwtSign = (payload: JwtPayload, opts: { expiresIn: number }) =>
    request.server.jwtSign({ ...payload }, opts.expiresIn);

  const { user, tokens } = await invitationService.acceptInvitationWithPassword(
    request.params.token,
    request.body.password,
    jwtSign,
    request.ip,
    request.headers['user-agent'],
  );

  const userOutput = await getUserById(user.id);
  setRefreshCookie(reply, tokens.refreshTokenRaw);

  return reply.status(200).send(
    success({
      user: userOutput,
      accessToken: tokens.accessToken,
    }),
  );
}

export async function acceptInvitationExistingHandler(
  request: FastifyRequest<{ Params: { token: string } }>,
  reply: FastifyReply,
) {
  assertValidInviteToken(request.params.token);
  const userId = requireAuthUserId(request);
  const user = await invitationService.acceptInvitationForExistingUser(
    request.params.token,
    userId,
  );
  const userOutput = await getUserById(user.id);
  return reply.status(200).send(
    success({
      user: userOutput,
    }),
  );
}

export async function initiateInvitationOAuthHandler(
  request: FastifyRequest<{ Params: { token: string; provider: string } }>,
  reply: FastifyReply,
) {
  const { token, provider } = request.params;
  assertValidInviteToken(token);
  assertValidOAuthProvider(provider);
  const supportedProviders = oauthService.getAvailableProviders().map((entry) => entry.id);
  if (!supportedProviders.includes(provider)) {
    throw new AppError(400, ErrorCode.BAD_REQUEST, 'Unsupported OAuth provider parameter');
  }
  const inviteTokenHash = await invitationService.assertInvitationOAuthAllowed(token, provider);

  const apiBaseUrl = process.env.API_BASE_URL;
  const callbackUrl = apiBaseUrl
    ? `${apiBaseUrl}/api/v1/auth/oauth/${provider}/callback`
    : `${IS_PROD ? 'https' : request.protocol}://${request.hostname}/api/v1/auth/oauth/${provider}/callback`;

  const { authorizationUrl } = await oauthService.initiateOAuth(provider, callbackUrl, {
    inviteTokenHash,
    inviteProvider: provider,
  });

  return reply.redirect(authorizationUrl);
}
