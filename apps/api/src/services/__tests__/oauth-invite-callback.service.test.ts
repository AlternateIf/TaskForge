import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockRedisGet, mockRedisDel, mockAcceptInvitationWithOAuth, mockFetch } = vi.hoisted(() => ({
  mockRedisGet: vi.fn(),
  mockRedisDel: vi.fn(),
  mockAcceptInvitationWithOAuth: vi.fn(),
  mockFetch: vi.fn(),
}));

vi.mock('../../utils/redis.js', () => ({
  getRedis: () => ({
    get: mockRedisGet,
    del: mockRedisDel,
  }),
}));

vi.mock('../invitation.service.js', () => ({
  acceptInvitationWithOAuth: mockAcceptInvitationWithOAuth,
}));

import { handleOAuthCallback } from '../oauth.service.js';

describe('oauth.service invite callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('OAUTH_GOOGLE_CLIENT_ID', 'google-client-id');
    vi.stubEnv('OAUTH_GOOGLE_CLIENT_SECRET', 'google-client-secret');
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('accepts invite-bound oauth state and delegates to invitation acceptance', async () => {
    mockRedisGet.mockResolvedValue(
      JSON.stringify({
        provider: 'google',
        codeVerifier: 'pkce-verifier',
        callbackUrl: 'http://localhost:3000/api/v1/auth/oauth/google/callback',
        inviteTokenHash: 'invite-hash-1',
        inviteProvider: 'google',
      }),
    );
    mockRedisDel.mockResolvedValue(1);

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'provider-access-token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'google-user-123',
          email: 'invited@example.com',
          name: 'Invited User',
          picture: 'https://example.com/avatar.png',
        }),
      });

    const acceptedUser = {
      id: 'user-1',
      email: 'invited@example.com',
    };
    const acceptedTokens = {
      accessToken: 'access-token',
      refreshTokenRaw: 'refresh-token',
    };
    mockAcceptInvitationWithOAuth.mockResolvedValue({
      user: acceptedUser,
      tokens: acceptedTokens,
    });

    const jwtSign = vi.fn(() => 'signed-jwt');
    const result = await handleOAuthCallback(
      'oauth-code',
      'oauth-state',
      jwtSign,
      '127.0.0.1',
      'vitest-agent',
    );

    expect(result).toEqual({
      user: acceptedUser,
      tokens: acceptedTokens,
      isNewUser: false,
    });
    expect(mockRedisGet).toHaveBeenCalledWith('oauth:state:oauth-state');
    expect(mockRedisDel).toHaveBeenCalledWith('oauth:state:oauth-state');
    expect(mockAcceptInvitationWithOAuth).toHaveBeenCalledWith(
      'invite-hash-1',
      {
        provider: 'google',
        providerUserId: 'google-user-123',
        email: 'invited@example.com',
        displayName: 'Invited User',
        avatarUrl: 'https://example.com/avatar.png',
      },
      jwtSign,
      '127.0.0.1',
      'vitest-agent',
    );
  });

  it('fails when oauth state is missing or expired', async () => {
    mockRedisGet.mockResolvedValue(null);

    const jwtSign = vi.fn(() => 'signed-jwt');
    await expect(handleOAuthCallback('oauth-code', 'missing-state', jwtSign)).rejects.toThrow(
      'Invalid or expired OAuth state',
    );

    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockAcceptInvitationWithOAuth).not.toHaveBeenCalled();
  });

  it('fails when invite-bound provider does not match callback provider', async () => {
    mockRedisGet.mockResolvedValue(
      JSON.stringify({
        provider: 'google',
        codeVerifier: 'pkce-verifier',
        callbackUrl: 'http://localhost:3000/api/v1/auth/oauth/google/callback',
        inviteTokenHash: 'invite-hash-2',
        inviteProvider: 'github',
      }),
    );
    mockRedisDel.mockResolvedValue(1);

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'provider-access-token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'google-user-999',
          email: 'invited@example.com',
          name: 'Invited User',
        }),
      });

    const jwtSign = vi.fn(() => 'signed-jwt');
    await expect(handleOAuthCallback('oauth-code', 'oauth-state', jwtSign)).rejects.toThrow(
      'OAuth provider mismatch for invitation',
    );

    expect(mockAcceptInvitationWithOAuth).not.toHaveBeenCalled();
  });
});
