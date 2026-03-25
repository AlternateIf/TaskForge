import { describe, expect, it } from 'vitest';
import {
  ACTIONS,
  BUILT_IN_PERMISSIONS,
  MANAGE_ACTIONS,
  RESOURCES,
  SCOPES,
} from '../constants/permissions.js';
import { ROLE_NAMES } from '../constants/roles.js';

describe('permission constants', () => {
  describe('RESOURCES', () => {
    it('should contain all expected resources', () => {
      expect(Object.values(RESOURCES)).toEqual(
        expect.arrayContaining([
          'organization',
          'project',
          'task',
          'comment',
          'attachment',
          'notification',
        ]),
      );
    });
  });

  describe('ACTIONS', () => {
    it('should contain all expected actions', () => {
      expect(Object.values(ACTIONS)).toEqual(
        expect.arrayContaining(['create', 'read', 'update', 'delete', 'manage']),
      );
    });
  });

  describe('MANAGE_ACTIONS', () => {
    it('should expand to create, read, update, delete', () => {
      expect(MANAGE_ACTIONS).toEqual(['create', 'read', 'update', 'delete']);
    });
  });

  describe('BUILT_IN_PERMISSIONS', () => {
    it('should define permissions for all 5 built-in roles', () => {
      const roleNames = Object.keys(BUILT_IN_PERMISSIONS);
      expect(roleNames).toHaveLength(5);
      expect(roleNames).toContain('Super Admin');
      expect(roleNames).toContain('Admin');
      expect(roleNames).toContain('Project Manager');
      expect(roleNames).toContain('Team Member');
      expect(roleNames).toContain('Guest');
    });

    it('Super Admin should have manage on all resources', () => {
      const perms = BUILT_IN_PERMISSIONS['Super Admin'];
      for (const resource of Object.values(RESOURCES)) {
        expect(perms).toContainEqual(expect.objectContaining({ resource, action: 'manage' }));
      }
    });

    it('Guest should only have read actions', () => {
      const perms = BUILT_IN_PERMISSIONS.Guest;
      for (const p of perms) {
        expect(p.action).toBe('read');
      }
    });

    it('Team Member should not have delete on tasks', () => {
      const perms = BUILT_IN_PERMISSIONS['Team Member'];
      const taskPerms = perms.filter((p) => p.resource === 'task');
      const actions = taskPerms.map((p) => p.action);
      expect(actions).not.toContain('delete');
      expect(actions).not.toContain('manage');
      expect(actions).toContain('create');
      expect(actions).toContain('read');
      expect(actions).toContain('update');
    });

    it('Admin should not be able to delete organizations', () => {
      const perms = BUILT_IN_PERMISSIONS.Admin;
      const orgPerms = perms.filter((p) => p.resource === 'organization');
      const actions = orgPerms.map((p) => p.action);
      expect(actions).not.toContain('delete');
      expect(actions).not.toContain('manage');
      expect(actions).toContain('read');
      expect(actions).toContain('update');
    });

    it('all permissions should use valid resource, action, and scope values', () => {
      const validResources = Object.values(RESOURCES);
      const validActions = Object.values(ACTIONS);
      const validScopes = Object.values(SCOPES);

      for (const [, perms] of Object.entries(BUILT_IN_PERMISSIONS)) {
        for (const p of perms) {
          expect(validResources).toContain(p.resource);
          expect(validActions).toContain(p.action);
          expect(validScopes).toContain(p.scope);
        }
      }
    });
  });
});

describe('role constants', () => {
  it('should define all 5 role names', () => {
    expect(Object.values(ROLE_NAMES)).toEqual([
      'Super Admin',
      'Admin',
      'Project Manager',
      'Team Member',
      'Guest',
    ]);
  });
});
