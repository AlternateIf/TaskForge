import type { FastifyReply, FastifyRequest } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockValidateInvitationToken,
  mockAcceptInvitationWithPassword,
  mockAcceptInvitationForExistingUser,
  mockAssertInvitationOAuthAllowed,
  mockGetUserById,
  mockInitiateOAuth,
  mockGetAvailableProviders,
} = vi.hoisted(() => ({
  mockValidateInvitationToken: vi.fn(),
  mockAcceptInvitationWithPassword: vi.fn(),
  mockAcceptInvitationForExistingUser: vi.fn(),
  mockAssertInvitationOAuthAllowed: vi.fn(),
  mockGetUserById: vi.fn(),
  mockInitiateOAuth: vi.fn(),
  mockGetAvailableProviders: vi.fn(),
}));

vi.mock('../../../services/invitation.service.js', () => ({
  validateInvitationToken: mockValidateInvitationToken,
  acceptInvitationWithPassword: mockAcceptInvitationWithPassword,
  acceptInvitationForExistingUser: mockAcceptInvitationForExistingUser,
  assertInvitationOAuthAllowed: mockAssertInvitationOAuthAllowed,
}));

vi.mock('../../../services/user.service.js', () => ({
  getUserById: mockGetUserById,
}));

vi.mock('../../../services/oauth.service.js', () => ({
  initiateOAuth: mockInitiateOAuth,
  getAvailableProviders: mockGetAvailableProviders,
}));

import {
  acceptInvitationPasswordHandler,
  initiateInvitationOAuthHandler,
  validateInvitationTokenHandler,
} from '../invitations.handlers.js';

function makeReply() {
  const reply = {
    status: vi.fn(),
    send: vi.fn(),
    redirect: vi.fn(),
    setCookie: vi.fn(),
  };
  reply.status.mockReturnValue(reply);
  reply.send.mockReturnValue(reply);
  reply.redirect.mockReturnValue(reply);
  reply.setCookie.mockReturnValue(reply);
  return reply as unknown as FastifyReply & {
    status: ReturnType<typeof vi.fn>;
    send: ReturnType<typeof vi.fn>;
    redirect: ReturnType<typeof vi.fn>;
    setCookie: ReturnType<typeof vi.fn>;
  };
}

describe('invitations.handlers error-contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 BAD_REQUEST for malformed invite token on validation endpoint', async () => {
    const request = {
      params: { token: 'malformed' },
    } as unknown as FastifyRequest<{ Params: { token: string } }>;
    const reply = makeReply();

    await expect(validateInvitationTokenHandler(request, reply)).rejects.toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
      message: 'Malformed invitation token',
    });
    expect(mockValidateInvitationToken).not.toHaveBeenCalled();
  });

  it('returns 400 BAD_REQUEST for malformed invite token on accept-password endpoint', async () => {
    const request = {
      params: { token: 'bad' },
      body: { password: 'StrongPass123!' },
      server: { jwtSign: vi.fn() },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'vitest' },
    } as unknown as FastifyRequest<{ Params: { token: string }; Body: { password: string } }>;
    const reply = makeReply();

    await expect(acceptInvitationPasswordHandler(request, reply)).rejects.toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
      message: 'Malformed invitation token',
    });
    expect(mockAcceptInvitationWithPassword).not.toHaveBeenCalled();
  });

  it('returns 400 BAD_REQUEST for unsupported oauth provider parameter', async () => {
    mockGetAvailableProviders.mockReturnValue([{ id: 'google', name: 'Google' }]);

    const request = {
      params: { token: 'a'.repeat(64), provider: 'not-supported' },
      protocol: 'http',
      hostname: 'localhost',
    } as unknown as FastifyRequest<{ Params: { token: string; provider: string } }>;
    const reply = makeReply();

    await expect(initiateInvitationOAuthHandler(request, reply)).rejects.toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
      message: 'Unsupported OAuth provider parameter',
    });
    expect(mockAssertInvitationOAuthAllowed).not.toHaveBeenCalled();
    expect(mockInitiateOAuth).not.toHaveBeenCalled();
  });
});
