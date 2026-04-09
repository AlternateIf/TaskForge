import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@taskforge/db', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  },
  users: {
    id: 'users.id',
    email: 'users.email',
    mfaEnabled: 'users.mfaEnabled',
    mfaSecret: 'users.mfaSecret',
    passwordHash: 'users.passwordHash',
    updatedAt: 'users.updatedAt',
    deletedAt: 'users.deletedAt',
    lastLoginAt: 'users.lastLoginAt',
  },
  organizationMembers: {
    organizationId: 'organizationMembers.organizationId',
    userId: 'organizationMembers.userId',
  },
  organizationAuthSettings: {
    organizationId: 'organizationAuthSettings.organizationId',
    mfaEnforced: 'organizationAuthSettings.mfaEnforced',
    mfaEnforcedAt: 'organizationAuthSettings.mfaEnforcedAt',
    mfaGracePeriodDays: 'organizationAuthSettings.mfaGracePeriodDays',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a, b) => ({ _type: 'eq', left: a, right: b })),
  and: vi.fn((...args: unknown[]) => ({ _type: 'and', conditions: args })),
  isNull: vi.fn((a) => ({ _type: 'isNull', field: a })),
  isNotNull: vi.fn((a) => ({ _type: 'isNotNull', field: a })),
}));

vi.mock('../../../services/mfa.service.js', () => ({
  resetPendingMfa: vi.fn(),
}));

vi.mock('../../../utils/redis.js', () => ({
  getRedis: vi.fn(),
}));

import Fastify from 'fastify';
import { registerErrorHandler } from '../../../hooks/on-error.hook.js';
import authPlugin from '../../../plugins/auth.plugin.js';
import * as mfaService from '../../../services/mfa.service.js';
import { AppError, ErrorCode } from '../../../utils/errors.js';
import { mfaRoutes } from '../mfa.routes.js';

const mockResetPendingMfa = mfaService.resetPendingMfa as ReturnType<typeof vi.fn>;

async function buildApp() {
  const app = Fastify();
  registerErrorHandler(app);
  await app.register(authPlugin);
  mfaRoutes(app);
  await app.ready();
  return app;
}

describe('POST /api/v1/auth/mfa/reset-pending', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    app = await buildApp();
    vi.resetAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('200 - authenticated user with valid password and pending MFA', () => {
    it('returns 200 and success message when password is valid and MFA is pending', async () => {
      mockResetPendingMfa.mockResolvedValueOnce(undefined);

      const token = app.jwtSign({ sub: 'user-1', email: 'test@example.com' }, 300);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/mfa/reset-pending',
        headers: { authorization: `Bearer ${token}` },
        payload: { password: 'correct-password' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.message).toBe('Pending MFA setup reset successfully');
      expect(mockResetPendingMfa).toHaveBeenCalledWith('user-1', 'correct-password');
    });
  });

  describe('401 - unauthenticated request', () => {
    it('returns 401 when no authorization header is provided', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/mfa/reset-pending',
        payload: { password: 'any-password' },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 401 with invalid Bearer token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/mfa/reset-pending',
        headers: { authorization: 'Bearer invalid-token' },
        payload: { password: 'any-password' },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('400 - authenticated user with invalid password', () => {
    it('returns 400 when password is incorrect', async () => {
      mockResetPendingMfa.mockRejectedValueOnce(
        new AppError(400, ErrorCode.BAD_REQUEST, 'Invalid password'),
      );

      const token = app.jwtSign({ sub: 'user-1', email: 'test@example.com' }, 300);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/mfa/reset-pending',
        headers: { authorization: `Bearer ${token}` },
        payload: { password: 'wrong-password' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('BAD_REQUEST');
      expect(body.error.message).toBe('Invalid password');
    });
  });

  describe('400 - authenticated user without pending MFA', () => {
    it('returns 400 when there is no pending MFA setup to reset', async () => {
      mockResetPendingMfa.mockRejectedValueOnce(
        new AppError(400, ErrorCode.BAD_REQUEST, 'No pending MFA setup to reset'),
      );

      const token = app.jwtSign({ sub: 'user-1', email: 'test@example.com' }, 300);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/mfa/reset-pending',
        headers: { authorization: `Bearer ${token}` },
        payload: { password: 'correct-password' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('BAD_REQUEST');
      expect(body.error.message).toBe('No pending MFA setup to reset');
    });
  });
});
