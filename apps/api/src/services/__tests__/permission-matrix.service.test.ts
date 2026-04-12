import { describe, expect, it, vi } from 'vitest';

// Mock the database module
const mockRolesSelect = vi.fn();

vi.mock('@taskforge/db', () => ({
  db: {
    select: mockRolesSelect,
  },
  roles: {
    id: 'roles.id',
    name: 'roles.name',
    organizationId: 'roles.organizationId',
  },
  permissions: {
    roleId: 'permissions.roleId',
    resource: 'permissions.resource',
    action: 'permissions.action',
    scope: 'permissions.scope',
  },
}));

// We import PERMISSION_KEYS to verify our test expectations
import { PERMISSION_KEYS } from '@taskforge/shared';

const { getPermissionMatrix } = await import('../permission-matrix.service.js');

describe('getPermissionMatrix', () => {
  it('returns categories grouped from PERMISSION_KEYS', async () => {
    // First call: roles query
    const rolesResult = [{ id: 'role-1', name: 'Admin', organizationId: 'org-1' }];
    // Second call: permissions query
    const permsResult = [
      { roleId: 'role-1', resource: 'organization', action: 'manage', scope: 'organization' },
    ];

    let callCount = 0;
    mockRolesSelect.mockImplementation(() => {
      callCount++;
      const promiseLike = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockImplementation(() => {
          if (callCount === 1) {
            return Promise.resolve(rolesResult);
          }
          return Promise.resolve(permsResult);
        }),
      };
      promiseLike.from.mockReturnValue(promiseLike);
      return promiseLike;
    });

    const result = await getPermissionMatrix('org-1');

    // Verify categories structure
    expect(result.categories).toBeDefined();
    expect(typeof result.categories).toBe('object');

    // Every key in categories should have at least one entry
    for (const [, entries] of Object.entries(result.categories)) {
      expect(Array.isArray(entries)).toBe(true);
      expect(entries.length).toBeGreaterThan(0);
      for (const entry of entries) {
        expect(entry.key).toBeTruthy();
        // Every key should be from PERMISSION_KEYS
        expect(PERMISSION_KEYS).toContain(entry.key);
      }
    }

    // Verify roles structure
    expect(result.roles).toHaveLength(1);
    expect(result.roles[0].id).toBe('role-1');
    expect(result.roles[0].name).toBe('Admin');
    expect(Array.isArray(result.roles[0].permissions)).toBe(true);
  });

  it('includes global roles alongside org-scoped roles', async () => {
    const rolesResult = [
      { id: 'global-role', name: 'Super Admin', organizationId: null },
      { id: 'org-role', name: 'Admin', organizationId: 'org-1' },
    ];
    const permsResult = [
      { roleId: 'global-role', resource: 'organization', action: 'manage', scope: 'organization' },
      { roleId: 'org-role', resource: 'task', action: 'create', scope: 'organization' },
    ];

    let callCount = 0;
    mockRolesSelect.mockImplementation(() => {
      callCount++;
      const promiseLike = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockImplementation(() => {
          if (callCount === 1) {
            return Promise.resolve(rolesResult);
          }
          return Promise.resolve(permsResult);
        }),
      };
      promiseLike.from.mockReturnValue(promiseLike);
      return promiseLike;
    });

    const result = await getPermissionMatrix('org-1');

    expect(result.roles).toHaveLength(2);
    const superAdmin = result.roles.find((r) => r.name === 'Super Admin');
    expect(superAdmin).toBeDefined();
    // Super Admin with organization.manage (stored in DB) expands to include organization.create.org
    expect(superAdmin?.permissions).toContain('organization.create.org');
  });

  it('expands manage action into individual CRUD actions', async () => {
    const rolesResult = [{ id: 'role-1', name: 'Org Admin', organizationId: 'org-1' }];
    const permsResult = [
      // manage = create, read, update, delete
      { roleId: 'role-1', resource: 'organization', action: 'manage', scope: 'organization' },
    ];

    let callCount = 0;
    mockRolesSelect.mockImplementation(() => {
      callCount++;
      const promiseLike = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockImplementation(() => {
          if (callCount === 1) {
            return Promise.resolve(rolesResult);
          }
          return Promise.resolve(permsResult);
        }),
      };
      promiseLike.from.mockReturnValue(promiseLike);
      return promiseLike;
    });

    const result = await getPermissionMatrix('org-1');

    const adminRole = result.roles.find((r) => r.name === 'Org Admin');
    expect(adminRole).toBeDefined();

    // manage on organization at organization scope should expand to:
    // organization.create.org, organization.read.org, organization.update.org, organization.delete.org
    expect(adminRole?.permissions).toContain('organization.create.org');
    expect(adminRole?.permissions).toContain('organization.read.org');
    expect(adminRole?.permissions).toContain('organization.update.org');
    expect(adminRole?.permissions).toContain('organization.delete.org');
  });

  it('normalizes organization scope to org in permission keys', async () => {
    const rolesResult = [{ id: 'role-1', name: 'Test Role', organizationId: 'org-1' }];
    const permsResult = [
      { roleId: 'role-1', resource: 'role', action: 'read', scope: 'organization' },
    ];

    let callCount = 0;
    mockRolesSelect.mockImplementation(() => {
      callCount++;
      const promiseLike = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockImplementation(() => {
          if (callCount === 1) {
            return Promise.resolve(rolesResult);
          }
          return Promise.resolve(permsResult);
        }),
      };
      promiseLike.from.mockReturnValue(promiseLike);
      return promiseLike;
    });

    const result = await getPermissionMatrix('org-1');

    const role = result.roles.find((r) => r.name === 'Test Role');
    expect(role).toBeDefined();
    // scope="organization" should become "org" in the key
    expect(role?.permissions).toContain('role.read.org');
  });

  it('returns empty permissions array for roles with no matching governance keys', async () => {
    const rolesResult = [{ id: 'role-1', name: 'Empty Role', organizationId: 'org-1' }];
    const permsResult = [
      // Some permission that doesn't map to any governance key
      { roleId: 'role-1', resource: 'nonexistent_resource', action: 'read', scope: 'organization' },
    ];

    let callCount = 0;
    mockRolesSelect.mockImplementation(() => {
      callCount++;
      const promiseLike = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockImplementation(() => {
          if (callCount === 1) {
            return Promise.resolve(rolesResult);
          }
          return Promise.resolve(permsResult);
        }),
      };
      promiseLike.from.mockReturnValue(promiseLike);
      return promiseLike;
    });

    const result = await getPermissionMatrix('org-1');

    const role = result.roles.find((r) => r.name === 'Empty Role');
    expect(role).toBeDefined();
    expect(role?.permissions).toEqual([]);
  });

  it('builds categories with correct category names', async () => {
    const rolesResult: unknown[] = [];
    const permsResult: unknown[] = [];

    let callCount = 0;
    mockRolesSelect.mockImplementation(() => {
      callCount++;
      const promiseLike = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockImplementation(() => {
          if (callCount === 1) {
            return Promise.resolve(rolesResult);
          }
          return Promise.resolve(permsResult);
        }),
      };
      promiseLike.from.mockReturnValue(promiseLike);
      return promiseLike;
    });

    const result = await getPermissionMatrix('org-1');

    // Verify some specific category names
    const categoryNames = Object.keys(result.categories);
    expect(categoryNames).toContain('Organization');
    expect(categoryNames).toContain('Invitation');
    expect(categoryNames).toContain('Membership');
    expect(categoryNames).toContain('Role');
    expect(categoryNames).toContain('Permission');
  });
});
