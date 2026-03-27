import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSelect, mockUpdate, mockInsert, mockDelete } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockUpdate: vi.fn(),
  mockInsert: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock('@taskforge/db', () => ({
  db: {
    select: mockSelect,
    update: mockUpdate,
    insert: mockInsert,
    delete: mockDelete,
  },
  users: {
    id: 'users.id',
    email: 'users.email',
    passwordHash: 'users.passwordHash',
    updatedAt: 'users.updatedAt',
    deletedAt: 'users.deletedAt',
  },
  sessions: {
    id: 'sessions.id',
    userId: 'sessions.userId',
    tokenHash: 'sessions.tokenHash',
  },
  verificationTokens: {
    id: 'verificationTokens.id',
    userId: 'verificationTokens.userId',
    type: 'verificationTokens.type',
    tokenHash: 'verificationTokens.tokenHash',
    usedAt: 'verificationTokens.usedAt',
    expiresAt: 'verificationTokens.expiresAt',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a, b) => ({ _type: 'eq', left: a, right: b })),
  ne: vi.fn((a, b) => ({ _type: 'ne', left: a, right: b })),
  and: vi.fn((...args: unknown[]) => ({ _type: 'and', conditions: args })),
  gt: vi.fn((a, b) => ({ _type: 'gt', left: a, right: b })),
  isNull: vi.fn((a) => ({ _type: 'isNull', field: a })),
}));

vi.mock('bcrypt', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn().mockResolvedValue('new-hash'),
  },
}));

const bcrypt = (await import('bcrypt')).default;

const { changePassword, resetPassword } = await import('../auth.service.js');
const { and, eq, ne } = await import('drizzle-orm');

const userId = '00000000-0000-0000-0000-000000000001';
const currentSessionId = 'session-current';

function setupSelectChain(resolvedRows: unknown[]) {
  const chain = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
  };
  mockSelect.mockReturnValueOnce(chain);
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.limit.mockResolvedValueOnce(resolvedRows);
}

function setupUpdateChain() {
  const chain = {
    set: vi.fn(),
    where: vi.fn(),
  };
  mockUpdate.mockReturnValueOnce(chain);
  chain.set.mockReturnValue(chain);
  chain.where.mockResolvedValueOnce(undefined);
}

function setupDeleteChain() {
  const chain = {
    where: vi.fn(),
  };
  mockDelete.mockReturnValueOnce(chain);
  chain.where.mockResolvedValueOnce(undefined);
}

describe('Session invalidation on password change', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('changePassword', () => {
    it('should delete all sessions except current after password change', async () => {
      // User lookup
      setupSelectChain([{ id: userId, passwordHash: 'old-hash' }]);
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);
      // Update password
      setupUpdateChain();
      // Delete other sessions
      setupDeleteChain();

      await changePassword(userId, currentSessionId, 'old-pass', 'new-pass');

      expect(mockDelete).toHaveBeenCalled();
      expect(and).toHaveBeenCalledWith(
        expect.objectContaining({ _type: 'eq', left: 'sessions.userId', right: userId }),
        expect.objectContaining({ _type: 'ne', left: 'sessions.id', right: currentSessionId }),
      );
    });

    it('should return a message about session invalidation', async () => {
      setupSelectChain([{ id: userId, passwordHash: 'old-hash' }]);
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);
      setupUpdateChain();
      setupDeleteChain();

      const result = await changePassword(userId, currentSessionId, 'old-pass', 'new-pass');

      expect(result.message).toBe('Password changed. All other sessions have been signed out.');
    });

    it('should preserve the current session', async () => {
      setupSelectChain([{ id: userId, passwordHash: 'old-hash' }]);
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);
      setupUpdateChain();
      setupDeleteChain();

      await changePassword(userId, currentSessionId, 'old-pass', 'new-pass');

      // ne() should be called with current session ID to exclude it
      expect(ne).toHaveBeenCalledWith('sessions.id', currentSessionId);
    });

    it('should reject incorrect current password', async () => {
      setupSelectChain([{ id: userId, passwordHash: 'old-hash' }]);
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(false as never);

      await expect(
        changePassword(userId, currentSessionId, 'wrong-pass', 'new-pass'),
      ).rejects.toThrow('Current password is incorrect');

      // No sessions should be deleted
      expect(mockDelete).not.toHaveBeenCalled();
    });

    it('should throw 404 for non-existent user', async () => {
      setupSelectChain([]);

      await expect(
        changePassword('bad-id', currentSessionId, 'old-pass', 'new-pass'),
      ).rejects.toThrow('User not found');
    });

    it('should update password hash before invalidating sessions', async () => {
      const callOrder: string[] = [];
      setupSelectChain([{ id: userId, passwordHash: 'old-hash' }]);
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);

      mockUpdate.mockImplementationOnce(() => {
        callOrder.push('update');
        const chain = { set: vi.fn(), where: vi.fn() };
        chain.set.mockReturnValue(chain);
        chain.where.mockResolvedValueOnce(undefined);
        return chain;
      });

      mockDelete.mockImplementationOnce(() => {
        callOrder.push('delete');
        const chain = { where: vi.fn() };
        chain.where.mockResolvedValueOnce(undefined);
        return chain;
      });

      await changePassword(userId, currentSessionId, 'old-pass', 'new-pass');

      expect(callOrder).toEqual(['update', 'delete']);
    });
  });

  describe('resetPassword (forgot-password flow)', () => {
    it('should invalidate ALL sessions when resetting via forgot-password', async () => {
      // Token lookup
      setupSelectChain([
        {
          id: 'token-1',
          userId,
          type: 'password_reset',
          tokenHash: 'hash',
          usedAt: null,
          expiresAt: new Date(Date.now() + 3600000),
        },
      ]);
      // Update password
      setupUpdateChain();
      // Mark token as used
      setupUpdateChain();
      // Delete ALL sessions
      setupDeleteChain();

      await resetPassword('some-reset-token', 'new-pass');

      expect(mockDelete).toHaveBeenCalled();
      // Should delete by userId only — no session exclusion
      expect(eq).toHaveBeenCalledWith('sessions.userId', userId);
      // ne should NOT be called (all sessions deleted, not excluding any)
      expect(ne).not.toHaveBeenCalled();
    });

    it('should reject invalid or expired reset token', async () => {
      setupSelectChain([]);

      await expect(resetPassword('bad-token', 'new-pass')).rejects.toThrow(
        'Invalid or expired reset token',
      );

      expect(mockDelete).not.toHaveBeenCalled();
    });
  });
});
