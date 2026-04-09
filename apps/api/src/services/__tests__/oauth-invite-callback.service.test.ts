import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockRedisGet,
  mockRedisDel,
  mockAcceptInvitationWithOAuth,
  mockFetch,
  mockEvaluateMfaEnforcement,
  mockCreateMfaToken,
} = vi.hoisted(() => ({
  mockRedisGet: vi.fn(),
  mockRedisDel: vi.fn(),
  mockAcceptInvitationWithOAuth: vi.fn(),
  mockFetch: vi.fn(),
  mockEvaluateMfaEnforcement: vi.fn(),
  mockCreateMfaToken: vi.fn(),
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

vi.mock('../mfa.service.js', () => ({
  evaluateMfaEnforcement: mockEvaluateMfaEnforcement,
  createMfaToken: mockCreateMfaToken,
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
      mfaEnabled: false,
    };
    const acceptedTokens = {
      accessToken: 'access-token',
      refreshTokenRaw: 'refresh-token',
    };
    mockAcceptInvitationWithOAuth.mockResolvedValue({
      user: acceptedUser,
      tokens: acceptedTokens,
    });

    // MFA not enforced — user gets tokens directly
    mockEvaluateMfaEnforcement.mockResolvedValue({ status: 'none' });

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

  it('redirects to MFA setup when invited user belongs to an org that enforces MFA (expired grace)', async () => {
    mockRedisGet.mockResolvedValue(
      JSON.stringify({
        provider: 'google',
        codeVerifier: 'pkce-verifier',
        callbackUrl: 'http://localhost:3000/api/v1/auth/oauth/google/callback',
        inviteTokenHash: 'invite-hash-mfa',
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
          id: 'google-user-mfa',
          email: 'mfa-invited@example.com',
          name: 'MFA Invited User',
          picture: null,
        }),
      });

    const acceptedUser = {
      id: 'user-mfa',
      email: 'mfa-invited@example.com',
      mfaEnabled: false,
    };
    const acceptedTokens = {
      accessToken: 'access-token-mfa',
      refreshTokenRaw: 'refresh-token-mfa',
    };
    mockAcceptInvitationWithOAuth.mockResolvedValue({
      user: acceptedUser,
      tokens: acceptedTokens,
    });

    mockEvaluateMfaEnforcement.mockResolvedValue({
      status: 'enforced',
      graceEndsAt: new Date('2025-01-01T00:00:00.000Z'),
    });
    mockCreateMfaToken.mockResolvedValue('mfa-token-abc');

    const jwtSign = vi.fn(() => 'signed-jwt');
    const result = await handleOAuthCallback(
      'oauth-code',
      'oauth-state-mfa',
      jwtSign,
      '127.0.0.1',
      'vitest-agent',
    );

    expect(result).toEqual({
      mfaSetupRequired: true,
      mfaToken: 'mfa-token-abc',
      isNewUser: false,
    });
    expect(mockEvaluateMfaEnforcement).toHaveBeenCalledWith('user-mfa');
    expect(mockCreateMfaToken).toHaveBeenCalledWith('user-mfa');
  });

  it('returns tokens for invited user when MFA not enforced', async () => {
    mockRedisGet.mockResolvedValue(
      JSON.stringify({
        provider: 'google',
        codeVerifier: 'pkce-verifier',
        callbackUrl: 'http://localhost:3000/api/v1/auth/oauth/google/callback',
        inviteTokenHash: 'invite-hash-no-mfa',
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
          id: 'google-user-no-mfa',
          email: 'no-mfa@example.com',
          name: 'No MFA User',
          picture: null,
        }),
      });

    const acceptedUser = {
      id: 'user-no-mfa',
      email: 'no-mfa@example.com',
      mfaEnabled: false,
    };
    const acceptedTokens = {
      accessToken: 'access-token-no-mfa',
      refreshTokenRaw: 'refresh-token-no-mfa',
    };
    mockAcceptInvitationWithOAuth.mockResolvedValue({
      user: acceptedUser,
      tokens: acceptedTokens,
    });

    mockEvaluateMfaEnforcement.mockResolvedValue({ status: 'none' });

    const jwtSign = vi.fn(() => 'signed-jwt');
    const result = await handleOAuthCallback(
      'oauth-code',
      'oauth-state-no-mfa',
      jwtSign,
      '127.0.0.1',
      'vitest-agent',
    );

    expect(result).toEqual({
      user: acceptedUser,
      tokens: acceptedTokens,
      isNewUser: false,
    });
    expect(mockEvaluateMfaEnforcement).toHaveBeenCalledWith('user-no-mfa');
  });

  it('returns tokens for invited user when MFA already enabled', async () => {
    mockRedisGet.mockResolvedValue(
      JSON.stringify({
        provider: 'google',
        codeVerifier: 'pkce-verifier',
        callbackUrl: 'http://localhost:3000/api/v1/auth/oauth/google/callback',
        inviteTokenHash: 'invite-hash-mfa-on',
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
          id: 'google-user-mfa-on',
          email: 'mfa-on@example.com',
          name: 'MFA On User',
          picture: null,
        }),
      });

    const acceptedUser = {
      id: 'user-mfa-on',
      email: 'mfa-on@example.com',
      mfaEnabled: true, // MFA already enabled
    };
    const acceptedTokens = {
      accessToken: 'access-token-mfa-on',
      refreshTokenRaw: 'refresh-token-mfa-on',
    };
    mockAcceptInvitationWithOAuth.mockResolvedValue({
      user: acceptedUser,
      tokens: acceptedTokens,
    });

    const jwtSign = vi.fn(() => 'signed-jwt');
    const result = await handleOAuthCallback(
      'oauth-code',
      'oauth-state-mfa-on',
      jwtSign,
      '127.0.0.1',
      'vitest-agent',
    );

    // When MFA is already enabled, no enforcement check is needed
    expect(result).toEqual({
      user: acceptedUser,
      tokens: acceptedTokens,
      isNewUser: false,
    });
    expect(mockEvaluateMfaEnforcement).not.toHaveBeenCalled();
  });
});
