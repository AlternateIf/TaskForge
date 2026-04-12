import { describe, expect, it } from 'vitest';
import {
  GOVERNANCE_PREFIXES,
  NOTIFICATION_CREATE_PERMISSION,
  NOTIFICATION_DELETE_PERMISSION,
  NOTIFICATION_READ_PERMISSION,
  NOTIFICATION_UPDATE_PERMISSION,
  ORGANIZATION_CREATE_PERMISSION,
  ORGANIZATION_DELETE_PERMISSION,
  ORGANIZATION_READ_PERMISSION,
  ORGANIZATION_UPDATE_PERMISSION,
  PERMISSION_KEYS,
  PERMISSION_READ_PERMISSION,
  PERMISSION_SET,
  PERMISSION_UPDATE_PERMISSION,
  PROJECT_CREATE_PERMISSION,
  PROJECT_DELETE_PERMISSION,
  PROJECT_READ_PERMISSION,
  PROJECT_UPDATE_PERMISSION,
  TASK_CREATE_PERMISSION,
  TASK_DELETE_PERMISSION,
  TASK_READ_PERMISSION,
  TASK_UPDATE_PERMISSION,
  hasAnyGovernancePermission,
  toPermissionKey,
  toPermissionTuple,
} from '../constants/permission.js';

const PERMISSION_PATTERN = /^[^.]+\.[^.]+\.(org|project|global)$/;

describe('PERMISSION_KEYS', () => {
  it('should contain exactly 29 keys', () => {
    expect(PERMISSION_KEYS).toHaveLength(29);
  });

  it('should have all unique keys', () => {
    const unique = new Set(PERMISSION_KEYS);
    expect(unique.size).toBe(PERMISSION_KEYS.length);
  });

  it('should have all keys match the resource.action.scope pattern', () => {
    for (const key of PERMISSION_KEYS) {
      expect(key).toMatch(PERMISSION_PATTERN);
    }
  });

  it('should have keys with valid scope tokens (org, project)', () => {
    for (const key of PERMISSION_KEYS) {
      const parts = key.split('.');
      const scope = parts[parts.length - 1];
      expect(['org', 'project', 'global']).toContain(scope);
    }
  });

  it('should contain expected organization permissions', () => {
    expect(PERMISSION_KEYS).toContain('organization.create.org');
    expect(PERMISSION_KEYS).toContain('organization.read.org');
    expect(PERMISSION_KEYS).toContain('organization.update.org');
    expect(PERMISSION_KEYS).toContain('organization.delete.org');
  });

  it('should contain expected invitation permissions', () => {
    expect(PERMISSION_KEYS).toContain('invitation.create.org');
    expect(PERMISSION_KEYS).toContain('invitation.read.org');
    expect(PERMISSION_KEYS).toContain('invitation.update.org');
    expect(PERMISSION_KEYS).toContain('invitation.delete.org');
  });

  it('should contain expected membership permissions', () => {
    expect(PERMISSION_KEYS).toContain('membership.read.org');
    expect(PERMISSION_KEYS).toContain('membership.update.org');
    expect(PERMISSION_KEYS).toContain('membership.delete.org');
  });

  it('should contain expected role permissions', () => {
    expect(PERMISSION_KEYS).toContain('role.create.org');
    expect(PERMISSION_KEYS).toContain('role.read.org');
    expect(PERMISSION_KEYS).toContain('role.update.org');
    expect(PERMISSION_KEYS).toContain('role.delete.org');
  });

  it('should contain expected permission (meta) permissions', () => {
    expect(PERMISSION_KEYS).toContain('permission.read.org');
    expect(PERMISSION_KEYS).toContain('permission.update.org');
  });

  it('should contain expected project permissions', () => {
    expect(PERMISSION_KEYS).toContain('project.create.org');
    expect(PERMISSION_KEYS).toContain('project.read.org');
    expect(PERMISSION_KEYS).toContain('project.update.org');
    expect(PERMISSION_KEYS).toContain('project.delete.org');
  });

  it('should contain expected notification permissions', () => {
    expect(PERMISSION_KEYS).toContain('notification.create.org');
    expect(PERMISSION_KEYS).toContain('notification.read.org');
    expect(PERMISSION_KEYS).toContain('notification.update.org');
    expect(PERMISSION_KEYS).toContain('notification.delete.org');
  });

  it('should contain expected task permissions with project scope', () => {
    expect(PERMISSION_KEYS).toContain('task.create.project');
    expect(PERMISSION_KEYS).toContain('task.read.project');
    expect(PERMISSION_KEYS).toContain('task.update.project');
    expect(PERMISSION_KEYS).toContain('task.delete.project');
  });
});

describe('PERMISSION_SET', () => {
  it('should have same size as PERMISSION_KEYS', () => {
    expect(PERMISSION_SET.size).toBe(PERMISSION_KEYS.length);
  });

  it('should contain all permission keys', () => {
    for (const key of PERMISSION_KEYS) {
      expect(PERMISSION_SET.has(key)).toBe(true);
    }
  });

  it('should not contain arbitrary keys', () => {
    expect(PERMISSION_SET.has('invalid.key.org')).toBe(false);
    expect(PERMISSION_SET.has('')).toBe(false);
  });
});

describe('named permission constants', () => {
  it('ORGANIZATION_*_PERMISSION constants should match corresponding keys', () => {
    expect(ORGANIZATION_CREATE_PERMISSION).toBe('organization.create.org');
    expect(ORGANIZATION_READ_PERMISSION).toBe('organization.read.org');
    expect(ORGANIZATION_UPDATE_PERMISSION).toBe('organization.update.org');
    expect(ORGANIZATION_DELETE_PERMISSION).toBe('organization.delete.org');
  });

  it('PROJECT_*_PERMISSION constants should match corresponding keys', () => {
    expect(PROJECT_CREATE_PERMISSION).toBe('project.create.org');
    expect(PROJECT_READ_PERMISSION).toBe('project.read.org');
    expect(PROJECT_UPDATE_PERMISSION).toBe('project.update.org');
    expect(PROJECT_DELETE_PERMISSION).toBe('project.delete.org');
  });

  it('TASK_*_PERMISSION constants should match corresponding keys', () => {
    expect(TASK_CREATE_PERMISSION).toBe('task.create.project');
    expect(TASK_READ_PERMISSION).toBe('task.read.project');
    expect(TASK_UPDATE_PERMISSION).toBe('task.update.project');
    expect(TASK_DELETE_PERMISSION).toBe('task.delete.project');
  });

  it('PERMISSION_*_PERMISSION constants should match corresponding keys', () => {
    expect(PERMISSION_READ_PERMISSION).toBe('permission.read.org');
    expect(PERMISSION_UPDATE_PERMISSION).toBe('permission.update.org');
  });

  it('NOTIFICATION_*_PERMISSION constants should match corresponding keys', () => {
    expect(NOTIFICATION_CREATE_PERMISSION).toBe('notification.create.org');
    expect(NOTIFICATION_READ_PERMISSION).toBe('notification.read.org');
    expect(NOTIFICATION_UPDATE_PERMISSION).toBe('notification.update.org');
    expect(NOTIFICATION_DELETE_PERMISSION).toBe('notification.delete.org');
  });
});

describe('toPermissionTuple', () => {
  it('should parse organization permission correctly', () => {
    expect(toPermissionTuple('organization.create.org')).toEqual({
      resource: 'organization',
      action: 'create',
      scope: 'organization',
    });
  });

  it('should parse task permission correctly', () => {
    expect(toPermissionTuple('task.read.project')).toEqual({
      resource: 'task',
      action: 'read',
      scope: 'project',
    });
  });

  it('should throw on invalid format', () => {
    expect(() => toPermissionTuple('invalid')).toThrow();
    expect(() => toPermissionTuple('only.two')).toThrow();
  });
});

describe('toPermissionKey', () => {
  it('should build organization permission key', () => {
    expect(toPermissionKey('organization', 'create', 'organization')).toBe(
      'organization.create.org',
    );
  });

  it('should build task permission key', () => {
    expect(toPermissionKey('task', 'read', 'project')).toBe('task.read.project');
  });

  it('should normalize organization scope to org token', () => {
    expect(toPermissionKey('organization', 'update', 'organization')).toBe(
      'organization.update.org',
    );
  });
});

describe('hasAnyGovernancePermission', () => {
  it('should return true for governance permissions', () => {
    expect(hasAnyGovernancePermission(['organization.read.org'])).toBe(true);
    expect(hasAnyGovernancePermission(['membership.update.org'])).toBe(true);
    expect(hasAnyGovernancePermission(['role.create.org'])).toBe(true);
    expect(hasAnyGovernancePermission(['invitation.delete.org'])).toBe(true);
    expect(hasAnyGovernancePermission(['permission.read.org'])).toBe(true);
  });

  it('should return false for non-governance permissions', () => {
    expect(hasAnyGovernancePermission(['project.create.org'])).toBe(false);
    expect(hasAnyGovernancePermission(['task.read.project'])).toBe(false);
  });

  it('should return false for empty array', () => {
    expect(hasAnyGovernancePermission([])).toBe(false);
  });
});

describe('GOVERNANCE_PREFIXES', () => {
  it('should contain governance resource prefixes', () => {
    expect(GOVERNANCE_PREFIXES).toContain('organization.');
    expect(GOVERNANCE_PREFIXES).toContain('membership.');
    expect(GOVERNANCE_PREFIXES).toContain('invitation.');
    expect(GOVERNANCE_PREFIXES).toContain('role.');
    expect(GOVERNANCE_PREFIXES).toContain('permission.');
  });
});
