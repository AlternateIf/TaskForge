import * as OTPAuth from 'otpauth';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockBcrypt = vi.hoisted(() => ({
  compare: vi.fn(),
}));

vi.mock('bcrypt', () => ({
  default: mockBcrypt,
}));

const { mockSelect, mockUpdate } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock('@taskforge/db', () => ({
  db: {
    select: mockSelect,
    update: mockUpdate,
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

vi.mock('../utils/redis.js', () => ({
  getRedis: vi.fn(),
}));

import {
  decryptSecret,
  encryptSecret,
  evaluateMfaEnforcement,
  generateTotpSecret,
  getMfaEnforcementInfo,
  isMfaEnforcedByAnyOrg,
  resetPendingMfa,
  setupMfa,
  verifyTotpCode,
} from '../mfa.service.js';

function setupSelectChain(resolvedRows: unknown[]) {
  const chain = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    innerJoin: vi.fn(),
  };
  mockSelect.mockReturnValueOnce(chain);
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.innerJoin.mockReturnValue(chain);
  chain.limit.mockResolvedValueOnce(resolvedRows);
  return chain;
}

function setupSelectWhereChain(resolvedRows: unknown[]) {
  const chain = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn(),
  };
  mockSelect.mockReturnValueOnce(chain);
  chain.from.mockReturnValue(chain);
  chain.innerJoin.mockReturnValue(chain);
  chain.where.mockResolvedValueOnce(resolvedRows);
  return chain;
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

const now = new Date('2025-01-15T00:00:00.000Z');

describe('mfa.service', () => {
  describe('encryptSecret / decryptSecret', () => {
    it('should round-trip a secret', () => {
      const original = 'JBSWY3DPEHPK3PXP';
      const encrypted = encryptSecret(original);
      expect(encrypted).not.toBe(original);
      expect(decryptSecret(encrypted)).toBe(original);
    });

    it('should produce different ciphertexts for the same plaintext (random IV)', () => {
      const original = 'JBSWY3DPEHPK3PXP';
      const a = encryptSecret(original);
      const b = encryptSecret(original);
      expect(a).not.toBe(b);
      // Both decrypt back to the same value
      expect(decryptSecret(a)).toBe(original);
      expect(decryptSecret(b)).toBe(original);
    });

    it('should throw on invalid format', () => {
      expect(() => decryptSecret('not-valid')).toThrow('Invalid encrypted secret format');
    });

    it('should throw on tampered ciphertext', () => {
      const encrypted = encryptSecret('test-secret');
      const parts = encrypted.split(':');
      // Tamper with the ciphertext portion
      parts[2] = Buffer.from('tampered').toString('base64');
      expect(() => decryptSecret(parts.join(':'))).toThrow();
    });
  });

  describe('generateTotpSecret', () => {
    it('should return a base32 secret and otpauth URI', () => {
      const { secret, uri } = generateTotpSecret();
      expect(secret).toMatch(/^[A-Z2-7]+=*$/);
      expect(uri).toContain('otpauth://totp/');
      expect(uri).toContain('TaskForge');
    });

    it('should generate unique secrets each time', () => {
      const a = generateTotpSecret();
      const b = generateTotpSecret();
      expect(a.secret).not.toBe(b.secret);
    });
  });

  describe('verifyTotpCode', () => {
    it('should accept a valid current code', () => {
      const { secret } = generateTotpSecret();
      const totp = new OTPAuth.TOTP({
        issuer: 'TaskForge',
        label: 'TaskForge',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret),
      });
      const code = totp.generate();
      expect(verifyTotpCode(secret, code)).toBe(true);
    });

    it('should reject an invalid code', () => {
      const { secret } = generateTotpSecret();
      expect(verifyTotpCode(secret, '000000')).toBe(false);
    });

    it('should reject a code with wrong length', () => {
      const { secret } = generateTotpSecret();
      expect(verifyTotpCode(secret, '12345')).toBe(false);
    });
  });

  describe('setupMfa', () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it('should reject when MFA setup is already pending (secret exists but not enabled)', async () => {
      setupSelectChain([
        {
          id: 'user-1',
          email: 'test@example.com',
          mfaEnabled: false,
          mfaSecret: 'already-encrypted-secret',
        },
      ]);

      await expect(setupMfa('user-1')).rejects.toThrow('MFA setup is already pending');
    });

    it('should reject when MFA is already enabled', async () => {
      setupSelectChain([
        {
          id: 'user-1',
          email: 'test@example.com',
          mfaEnabled: true,
          mfaSecret: 'already-encrypted-secret',
        },
      ]);

      await expect(setupMfa('user-1')).rejects.toThrow('MFA is already enabled');
    });

    it('should reject when user is not found', async () => {
      setupSelectChain([]);

      await expect(setupMfa('nonexistent')).rejects.toThrow('User not found');
    });

    it('should initiate MFA setup when no pending secret exists', async () => {
      setupSelectChain([
        {
          id: 'user-1',
          email: 'test@example.com',
          mfaEnabled: false,
          mfaSecret: null,
        },
      ]);
      setupUpdateChain();

      const result = await setupMfa('user-1');

      expect(result.secret).toBeDefined();
      expect(result.uri).toContain('otpauth://totp/');
      expect(result.uri).toContain('test%40example.com');
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe('resetPendingMfa', () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it('should reset pending MFA when password is valid', async () => {
      setupSelectChain([
        {
          id: 'user-1',
          email: 'test@example.com',
          mfaEnabled: false,
          mfaSecret: 'encrypted-secret',
          passwordHash: 'hashed-password',
        },
      ]);
      setupUpdateChain();
      mockBcrypt.compare.mockResolvedValueOnce(true);

      await expect(resetPendingMfa('user-1', 'correct-password')).resolves.toBeUndefined();
      expect(mockBcrypt.compare).toHaveBeenCalledWith('correct-password', 'hashed-password');
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should reject when user not found (404)', async () => {
      setupSelectChain([]);

      await expect(resetPendingMfa('nonexistent', 'any-password')).rejects.toThrow(
        'User not found',
      );
    });

    it('should reject when password hash is missing (OAuth-only user) - 400 BAD_REQUEST', async () => {
      setupSelectChain([
        {
          id: 'user-1',
          email: 'test@example.com',
          mfaEnabled: false,
          mfaSecret: 'encrypted-secret',
          passwordHash: null,
        },
      ]);

      await expect(resetPendingMfa('user-1', 'any-password')).rejects.toThrow(
        'Self-service MFA reset is not available for OAuth-only users',
      );
    });

    it('should reject when password is incorrect - 400 BAD_REQUEST', async () => {
      setupSelectChain([
        {
          id: 'user-1',
          email: 'test@example.com',
          mfaEnabled: false,
          mfaSecret: 'encrypted-secret',
          passwordHash: 'hashed-password',
        },
      ]);
      mockBcrypt.compare.mockResolvedValueOnce(false);

      await expect(resetPendingMfa('user-1', 'wrong-password')).rejects.toThrow('Invalid password');
    });

    it('should reject when no pending mfaSecret exists (nothing to reset) - 400 BAD_REQUEST', async () => {
      setupSelectChain([
        {
          id: 'user-1',
          email: 'test@example.com',
          mfaEnabled: false,
          mfaSecret: null,
          passwordHash: 'hashed-password',
        },
      ]);
      mockBcrypt.compare.mockResolvedValueOnce(true);

      await expect(resetPendingMfa('user-1', 'correct-password')).rejects.toThrow(
        'No pending MFA setup to reset',
      );
    });

    it('should reject when MFA is already enabled - 400 BAD_REQUEST', async () => {
      setupSelectChain([
        {
          id: 'user-1',
          email: 'test@example.com',
          mfaEnabled: true,
          mfaSecret: 'encrypted-secret',
          passwordHash: 'hashed-password',
        },
      ]);
      mockBcrypt.compare.mockResolvedValueOnce(true);

      await expect(resetPendingMfa('user-1', 'correct-password')).rejects.toThrow(
        'MFA is already enabled — use the disable flow instead',
      );
    });
  });

  describe('evaluateMfaEnforcement', () => {
    beforeEach(() => {
      vi.resetAllMocks();
      vi.useFakeTimers();
      vi.setSystemTime(now);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return "none" when user belongs to no enforcing orgs', async () => {
      setupSelectWhereChain([]); // no enforcing orgs

      const result = await evaluateMfaEnforcement('user-1');

      expect(result).toEqual({ status: 'none' });
    });

    it('should return "grace" when all enforcing orgs are within grace period', async () => {
      const enforcedAt = new Date('2025-01-10T00:00:00.000Z'); // 5 days ago
      setupSelectWhereChain([
        {
          organizationId: 'org-1',
          mfaEnforcedAt: enforcedAt,
          mfaGracePeriodDays: 7,
        },
      ]);

      const result = await evaluateMfaEnforcement('user-1');

      expect(result.status).toBe('grace');
      if (result.status === 'grace') {
        expect(result.graceEndsAt).toBeInstanceOf(Date);
      }
    });

    it('should return "enforced" when grace period has expired', async () => {
      const enforcedAt = new Date('2025-01-01T00:00:00.000Z'); // 14 days ago
      setupSelectWhereChain([
        {
          organizationId: 'org-1',
          mfaEnforcedAt: enforcedAt,
          mfaGracePeriodDays: 7,
        },
      ]);

      const result = await evaluateMfaEnforcement('user-1');

      expect(result.status).toBe('enforced');
    });

    it('should return "enforced" when any org has an expired grace period', async () => {
      const recentEnforced = new Date('2025-01-10T00:00:00.000Z');
      const expiredEnforced = new Date('2025-01-01T00:00:00.000Z');
      setupSelectWhereChain([
        {
          organizationId: 'org-1',
          mfaEnforcedAt: recentEnforced,
          mfaGracePeriodDays: 7,
        },
        {
          organizationId: 'org-2',
          mfaEnforcedAt: expiredEnforced,
          mfaGracePeriodDays: 7,
        },
      ]);

      const result = await evaluateMfaEnforcement('user-1');

      expect(result.status).toBe('enforced');
    });

    it('should return the earliest grace end date across orgs', async () => {
      const enforcedAt1 = new Date('2025-01-08T00:00:00.000Z'); // 7 days ago, grace=7 days → expires in 0 days
      const enforcedAt2 = new Date('2025-01-13T00:00:00.000Z'); // 2 days ago, grace=7 days → expires in 5 days
      setupSelectWhereChain([
        {
          organizationId: 'org-1',
          mfaEnforcedAt: enforcedAt1,
          mfaGracePeriodDays: 7,
        },
        {
          organizationId: 'org-2',
          mfaEnforcedAt: enforcedAt2,
          mfaGracePeriodDays: 7,
        },
      ]);

      const result = await evaluateMfaEnforcement('user-1');

      // org-1 has expired grace period
      expect(result.status).toBe('enforced');
    });
  });

  describe('getMfaEnforcementInfo', () => {
    beforeEach(() => {
      vi.resetAllMocks();
      vi.useFakeTimers();
      vi.setSystemTime(now);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return not enforced when no orgs enforce MFA', async () => {
      setupSelectWhereChain([]); // no enforcing orgs

      const info = await getMfaEnforcementInfo('user-1');

      expect(info.enforcedByOrg).toBe(false);
      expect(info.gracePeriodEndsAt).toBeNull();
    });

    it('should return enforced with grace period end date when in grace period', async () => {
      const enforcedAt = new Date('2025-01-10T00:00:00.000Z'); // 5 days ago
      setupSelectWhereChain([
        {
          organizationId: 'org-1',
          mfaEnforcedAt: enforcedAt,
          mfaGracePeriodDays: 7,
        },
      ]);

      const info = await getMfaEnforcementInfo('user-1');

      expect(info.enforcedByOrg).toBe(true);
      expect(info.gracePeriodEndsAt).toBe(new Date('2025-01-17T00:00:00.000Z').toISOString());
    });

    it('should return enforced with expired grace period end date when grace expired', async () => {
      const enforcedAt = new Date('2025-01-01T00:00:00.000Z'); // 14 days ago, grace=7 → expired Jan 8
      setupSelectWhereChain([
        {
          organizationId: 'org-1',
          mfaEnforcedAt: enforcedAt,
          mfaGracePeriodDays: 7,
        },
      ]);

      const info = await getMfaEnforcementInfo('user-1');

      expect(info.enforcedByOrg).toBe(true);
      // Grace period end date is still provided even when expired
      expect(info.gracePeriodEndsAt).toBe('2025-01-08T00:00:00.000Z');
    });
  });

  describe('isMfaEnforcedByAnyOrg', () => {
    beforeEach(() => {
      vi.resetAllMocks();
      vi.useFakeTimers();
      vi.setSystemTime(now);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return false when no orgs enforce MFA', async () => {
      setupSelectWhereChain([]);

      const result = await isMfaEnforcedByAnyOrg('user-1');

      expect(result).toBe(false);
    });

    it('should return true when org has expired grace period (enforced)', async () => {
      const enforcedAt = new Date('2025-01-01T00:00:00.000Z'); // 14 days ago, grace=7 → expired
      setupSelectWhereChain([
        {
          organizationId: 'org-1',
          mfaEnforcedAt: enforcedAt,
          mfaGracePeriodDays: 7,
        },
      ]);

      const result = await isMfaEnforcedByAnyOrg('user-1');

      expect(result).toBe(true);
    });

    it('should return true when org is within grace period', async () => {
      const enforcedAt = new Date('2025-01-10T00:00:00.000Z'); // 5 days ago, grace=7 → still in grace
      setupSelectWhereChain([
        {
          organizationId: 'org-1',
          mfaEnforcedAt: enforcedAt,
          mfaGracePeriodDays: 7,
        },
      ]);

      const result = await isMfaEnforcedByAnyOrg('user-1');

      // Must return true even during grace period — org enforces MFA
      expect(result).toBe(true);
    });
  });
});
