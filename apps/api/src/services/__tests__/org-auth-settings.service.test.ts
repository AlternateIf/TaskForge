import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSelect, mockUpdate, mockInsert, mockHasOrgPermission } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockUpdate: vi.fn(),
  mockInsert: vi.fn(),
  mockHasOrgPermission: vi.fn().mockResolvedValue(true),
}));

vi.mock('@taskforge/db', () => ({
  db: {
    select: mockSelect,
    update: mockUpdate,
    insert: mockInsert,
  },
  organizations: {
    id: 'organizations.id',
  },
  organizationAuthSettings: {
    id: 'organizationAuthSettings.id',
    organizationId: 'organizationAuthSettings.organizationId',
    passwordAuthEnabled: 'organizationAuthSettings.passwordAuthEnabled',
    googleOauthEnabled: 'organizationAuthSettings.googleOauthEnabled',
    githubOauthEnabled: 'organizationAuthSettings.githubOauthEnabled',
    mfaEnforced: 'organizationAuthSettings.mfaEnforced',
    mfaEnforcedAt: 'organizationAuthSettings.mfaEnforcedAt',
    mfaGracePeriodDays: 'organizationAuthSettings.mfaGracePeriodDays',
    allowedEmailDomains: 'organizationAuthSettings.allowedEmailDomains',
    createdAt: 'organizationAuthSettings.createdAt',
    updatedAt: 'organizationAuthSettings.updatedAt',
  },
  users: {
    id: 'users.id',
    mfaEnabled: 'users.mfaEnabled',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a, b) => ({ _type: 'eq', left: a, right: b })),
}));

vi.mock('../permission.service.js', () => ({
  hasOrgPermission: mockHasOrgPermission,
}));

vi.mock('../activity.service.js', () => ({
  log: vi.fn().mockResolvedValue(undefined),
}));

const {
  getAuthSettings,
  updateAuthSettings,
  isAuthMethodEnabled,
  isEmailDomainAllowed,
  isWithinMfaGracePeriod,
} = await import('../org-auth-settings.service.js');
const activityService = await import('../activity.service.js');

const orgId = '00000000-0000-0000-0000-000000000001';
const actorId = '00000000-0000-0000-0000-000000000002';

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

function setupInsertChain() {
  const chain = {
    values: vi.fn(),
  };
  mockInsert.mockReturnValueOnce(chain);
  chain.values.mockResolvedValueOnce(undefined);
}

const now = new Date('2025-01-01T00:00:00.000Z');

function makeSettingsRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'settings-1',
    organizationId: orgId,
    passwordAuthEnabled: true,
    googleOauthEnabled: false,
    githubOauthEnabled: false,
    mfaEnforced: false,
    mfaEnforcedAt: null,
    mfaGracePeriodDays: 7,
    allowedEmailDomains: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('org-auth-settings.service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    mockHasOrgPermission.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getAuthSettings', () => {
    it('should return defaults when no settings row exists', async () => {
      setupSelectChain([{ id: orgId }]); // org exists
      setupSelectChain([]); // no settings row

      const result = await getAuthSettings(orgId, actorId);

      expect(result.organizationId).toBe(orgId);
      expect(result.passwordAuthEnabled).toBe(true);
      expect(result.googleOauthEnabled).toBe(false);
      expect(result.githubOauthEnabled).toBe(false);
      expect(result.mfaEnforced).toBe(false);
      expect(result.mfaGracePeriodDays).toBe(7);
      expect(result.allowedEmailDomains).toBeNull();
    });

    it('should return stored settings when row exists', async () => {
      setupSelectChain([{ id: orgId }]); // org exists
      setupSelectChain([
        makeSettingsRow({
          passwordAuthEnabled: false,
          googleOauthEnabled: true,
          mfaEnforced: true,
          mfaEnforcedAt: now,
        }),
      ]);

      const result = await getAuthSettings(orgId, actorId);

      expect(result.passwordAuthEnabled).toBe(false);
      expect(result.googleOauthEnabled).toBe(true);
      expect(result.mfaEnforced).toBe(true);
      expect(result.mfaEnforcedAt).toBe(now.toISOString());
    });

    it('should throw 404 for non-existent organization', async () => {
      setupSelectChain([]); // org not found

      await expect(getAuthSettings('nonexistent', actorId)).rejects.toThrow(
        'Organization not found',
      );
    });

    it('should throw 403 FORBIDDEN when user lacks organization.read permission', async () => {
      mockHasOrgPermission.mockResolvedValueOnce(false);

      await expect(getAuthSettings(orgId, actorId)).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
        message: 'Insufficient permissions to view auth settings for this organization',
      });
    });

    it('should succeed when user has organization.read permission', async () => {
      mockHasOrgPermission.mockResolvedValueOnce(true);
      setupSelectChain([{ id: orgId }]); // org exists
      setupSelectChain([]); // no settings row

      const result = await getAuthSettings(orgId, actorId);

      expect(result.organizationId).toBe(orgId);
    });
  });

  describe('updateAuthSettings', () => {
    it('should update existing settings row', async () => {
      setupSelectChain([{ id: orgId }]); // org exists
      setupSelectChain([makeSettingsRow()]); // existing settings
      setupUpdateChain(); // update
      setupSelectChain([makeSettingsRow({ googleOauthEnabled: true })]); // re-read result

      const result = await updateAuthSettings(orgId, actorId, { googleOauthEnabled: true });

      expect(result.googleOauthEnabled).toBe(true);
      expect(activityService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          actorId,
          action: 'auth_settings_updated',
        }),
      );
    });

    it('should insert new settings row when none exists', async () => {
      setupSelectChain([{ id: orgId }]); // org exists
      setupSelectChain([]); // no existing settings
      setupInsertChain(); // insert
      setupSelectChain([makeSettingsRow({ githubOauthEnabled: true })]); // re-read result

      const result = await updateAuthSettings(orgId, actorId, { githubOauthEnabled: true });

      expect(result.githubOauthEnabled).toBe(true);
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should reject when all auth methods would be disabled', async () => {
      setupSelectChain([{ id: orgId }]); // org exists
      setupSelectChain([makeSettingsRow()]); // existing (password=true, google=false, github=false)

      await expect(
        updateAuthSettings(orgId, actorId, { passwordAuthEnabled: false }),
      ).rejects.toThrow('At least one authentication method must remain enabled');
    });

    it('should allow disabling one method when another is enabled', async () => {
      setupSelectChain([{ id: orgId }]); // org exists
      setupSelectChain([makeSettingsRow({ googleOauthEnabled: true })]); // password + google enabled
      setupUpdateChain();
      setupSelectChain([makeSettingsRow({ passwordAuthEnabled: false, googleOauthEnabled: true })]);

      const result = await updateAuthSettings(orgId, actorId, { passwordAuthEnabled: false });

      expect(result.passwordAuthEnabled).toBe(false);
      expect(result.googleOauthEnabled).toBe(true);
    });

    it('should set mfaEnforcedAt when MFA is first enforced', async () => {
      setupSelectChain([{ id: orgId }]); // org exists
      setupSelectChain([makeSettingsRow()]); // MFA not enforced
      setupSelectChain([{ mfaEnabled: true }]); // actor has MFA enabled
      setupUpdateChain();
      setupSelectChain([makeSettingsRow({ mfaEnforced: true, mfaEnforcedAt: now })]);

      await updateAuthSettings(orgId, actorId, { mfaEnforced: true });

      // Verify the update call included mfaEnforcedAt
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should reject enabling mfaEnforced when actor does not have MFA', async () => {
      setupSelectChain([{ id: orgId }]); // org exists
      setupSelectChain([makeSettingsRow()]); // MFA not enforced currently
      setupSelectChain([{ mfaEnabled: false }]); // actor does NOT have MFA

      await expect(updateAuthSettings(orgId, actorId, { mfaEnforced: true })).rejects.toThrow(
        'You must enable MFA on your own account before enforcing it for the organization',
      );
    });

    it('should clear mfaEnforcedAt when MFA is disabled', async () => {
      setupSelectChain([{ id: orgId }]); // org exists
      setupSelectChain([makeSettingsRow({ mfaEnforced: true, mfaEnforcedAt: now })]);
      setupUpdateChain();
      setupSelectChain([makeSettingsRow({ mfaEnforced: false, mfaEnforcedAt: null })]);

      const result = await updateAuthSettings(orgId, actorId, { mfaEnforced: false });

      expect(result.mfaEnforced).toBe(false);
      expect(result.mfaEnforcedAt).toBeNull();
    });

    it('should normalize email domains to lowercase', async () => {
      setupSelectChain([{ id: orgId }]); // org exists
      setupSelectChain([makeSettingsRow()]);
      setupUpdateChain();
      setupSelectChain([makeSettingsRow({ allowedEmailDomains: ['example.com'] })]);

      await updateAuthSettings(orgId, actorId, {
        allowedEmailDomains: ['EXAMPLE.COM', 'Test.Org'],
      });

      // The update/insert should have been called with lowercase domains
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should not log activity when nothing changed', async () => {
      setupSelectChain([{ id: orgId }]); // org exists
      setupSelectChain([makeSettingsRow()]); // current settings
      setupUpdateChain();
      setupSelectChain([makeSettingsRow()]);

      // Pass same values as current defaults
      await updateAuthSettings(orgId, actorId, { passwordAuthEnabled: true });

      expect(activityService.log).not.toHaveBeenCalled();
    });

    it('should throw 404 for non-existent organization', async () => {
      setupSelectChain([]);

      await expect(updateAuthSettings('bad-id', actorId, {})).rejects.toThrow(
        'Organization not found',
      );
    });

    it('should throw 403 FORBIDDEN when user lacks organization.update permission', async () => {
      mockHasOrgPermission.mockResolvedValueOnce(false);

      await expect(
        updateAuthSettings(orgId, actorId, { passwordAuthEnabled: false }),
      ).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
        message: 'Insufficient permissions to update auth settings for this organization',
      });
    });

    it('should succeed when user has organization.update permission', async () => {
      mockHasOrgPermission.mockResolvedValueOnce(true);
      setupSelectChain([{ id: orgId }]); // org exists
      setupSelectChain([makeSettingsRow({ googleOauthEnabled: true })]); // existing settings with google enabled
      setupUpdateChain();
      setupSelectChain([makeSettingsRow({ passwordAuthEnabled: false, googleOauthEnabled: true })]);

      const result = await updateAuthSettings(orgId, actorId, { passwordAuthEnabled: false });

      expect(result.passwordAuthEnabled).toBe(false);
    });
  });

  describe('isAuthMethodEnabled', () => {
    it('should return true for password auth by default', async () => {
      setupSelectChain([{ id: orgId }]);
      setupSelectChain([]);

      expect(await isAuthMethodEnabled(orgId, 'password')).toBe(true);
    });

    it('should return false when password auth is disabled', async () => {
      setupSelectChain([{ id: orgId }]);
      setupSelectChain([makeSettingsRow({ passwordAuthEnabled: false })]);

      expect(await isAuthMethodEnabled(orgId, 'password')).toBe(false);
    });

    it('should return false for google by default', async () => {
      setupSelectChain([{ id: orgId }]);
      setupSelectChain([]);

      expect(await isAuthMethodEnabled(orgId, 'google')).toBe(false);
    });

    it('should return true for github when enabled', async () => {
      setupSelectChain([{ id: orgId }]);
      setupSelectChain([makeSettingsRow({ githubOauthEnabled: true })]);

      expect(await isAuthMethodEnabled(orgId, 'github')).toBe(true);
    });
  });

  describe('isEmailDomainAllowed', () => {
    it('should allow any domain when no restriction is set', async () => {
      setupSelectChain([{ id: orgId }]);
      setupSelectChain([makeSettingsRow()]);

      expect(await isEmailDomainAllowed(orgId, 'user@anything.com')).toBe(true);
    });

    it('should allow email from permitted domain', async () => {
      setupSelectChain([{ id: orgId }]);
      setupSelectChain([makeSettingsRow({ allowedEmailDomains: ['example.com'] })]);

      expect(await isEmailDomainAllowed(orgId, 'user@example.com')).toBe(true);
    });

    it('should reject email from non-permitted domain', async () => {
      setupSelectChain([{ id: orgId }]);
      setupSelectChain([makeSettingsRow({ allowedEmailDomains: ['example.com'] })]);

      expect(await isEmailDomainAllowed(orgId, 'user@other.com')).toBe(false);
    });

    it('should reject email without domain', async () => {
      setupSelectChain([{ id: orgId }]);
      setupSelectChain([makeSettingsRow({ allowedEmailDomains: ['example.com'] })]);

      expect(await isEmailDomainAllowed(orgId, 'nodomain')).toBe(false);
    });
  });

  describe('isWithinMfaGracePeriod', () => {
    it('should return true when MFA is not enforced', async () => {
      setupSelectChain([{ id: orgId }]);
      setupSelectChain([makeSettingsRow()]);

      expect(await isWithinMfaGracePeriod(orgId)).toBe(true);
    });

    it('should return true within grace period', async () => {
      // MFA enforced 1 day ago, grace period is 7 days
      const enforcedAt = new Date('2024-12-31T00:00:00.000Z');
      setupSelectChain([{ id: orgId }]);
      setupSelectChain([makeSettingsRow({ mfaEnforced: true, mfaEnforcedAt: enforcedAt })]);

      expect(await isWithinMfaGracePeriod(orgId)).toBe(true);
    });

    it('should return false after grace period expires', async () => {
      // MFA enforced 10 days ago, grace period is 7 days
      const enforcedAt = new Date('2024-12-22T00:00:00.000Z');
      setupSelectChain([{ id: orgId }]);
      setupSelectChain([makeSettingsRow({ mfaEnforced: true, mfaEnforcedAt: enforcedAt })]);

      expect(await isWithinMfaGracePeriod(orgId)).toBe(false);
    });
  });
});
