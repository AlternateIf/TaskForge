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
        expect.arrayContaining(['organization', 'project', 'task', 'comment', 'notification']),
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
    it('should define permissions for all 14 built-in roles', () => {
      const roleNames = Object.keys(BUILT_IN_PERMISSIONS);
      expect(roleNames).toHaveLength(14);
      // Core role
      expect(roleNames).toContain('Super Admin');
      // Functional roles
      expect(roleNames).toContain('Backend Developer');
      expect(roleNames).toContain('Frontend Developer');
      expect(roleNames).toContain('Designer');
      expect(roleNames).toContain('QA Engineer');
      expect(roleNames).toContain('DevOps/SRE');
      expect(roleNames).toContain('Support Engineer');
      expect(roleNames).toContain('Product Manager');
      expect(roleNames).toContain('SEO Specialist');
      expect(roleNames).toContain('Auth Flow Manager');
      expect(roleNames).toContain('Customer Reporter');
      expect(roleNames).toContain('Customer Stakeholder');
      expect(roleNames).toContain('Org Owner');
      expect(roleNames).toContain('Project Admin');
    });

    it('Super Admin should have all 28 canonical permissions', () => {
      const perms = BUILT_IN_PERMISSIONS['Super Admin'];
      expect(perms).toHaveLength(28);

      // Organization (4, org scope)
      expect(perms).toContainEqual({
        resource: 'organization',
        action: 'create',
        scope: 'organization',
      });
      expect(perms).toContainEqual({
        resource: 'organization',
        action: 'read',
        scope: 'organization',
      });
      expect(perms).toContainEqual({
        resource: 'organization',
        action: 'update',
        scope: 'organization',
      });
      expect(perms).toContainEqual({
        resource: 'organization',
        action: 'delete',
        scope: 'organization',
      });

      // Invitation (4, org scope)
      expect(perms).toContainEqual({
        resource: 'invitation',
        action: 'create',
        scope: 'organization',
      });
      expect(perms).toContainEqual({
        resource: 'invitation',
        action: 'read',
        scope: 'organization',
      });
      expect(perms).toContainEqual({
        resource: 'invitation',
        action: 'update',
        scope: 'organization',
      });
      expect(perms).toContainEqual({
        resource: 'invitation',
        action: 'delete',
        scope: 'organization',
      });

      // Membership (3, org scope)
      expect(perms).toContainEqual({
        resource: 'membership',
        action: 'read',
        scope: 'organization',
      });
      expect(perms).toContainEqual({
        resource: 'membership',
        action: 'update',
        scope: 'organization',
      });
      expect(perms).toContainEqual({
        resource: 'membership',
        action: 'delete',
        scope: 'organization',
      });

      // Role (4, org scope)
      expect(perms).toContainEqual({ resource: 'role', action: 'create', scope: 'organization' });
      expect(perms).toContainEqual({ resource: 'role', action: 'read', scope: 'organization' });
      expect(perms).toContainEqual({ resource: 'role', action: 'update', scope: 'organization' });
      expect(perms).toContainEqual({ resource: 'role', action: 'delete', scope: 'organization' });

      // Permission (2, org scope)
      expect(perms).toContainEqual({
        resource: 'permission',
        action: 'read',
        scope: 'organization',
      });
      expect(perms).toContainEqual({
        resource: 'permission',
        action: 'update',
        scope: 'organization',
      });

      // Project (4, org scope)
      expect(perms).toContainEqual({
        resource: 'project',
        action: 'create',
        scope: 'organization',
      });
      expect(perms).toContainEqual({ resource: 'project', action: 'read', scope: 'organization' });
      expect(perms).toContainEqual({
        resource: 'project',
        action: 'update',
        scope: 'organization',
      });
      expect(perms).toContainEqual({
        resource: 'project',
        action: 'delete',
        scope: 'organization',
      });

      // Notification (3, org scope)
      expect(perms).toContainEqual({
        resource: 'notification',
        action: 'create',
        scope: 'organization',
      });
      expect(perms).toContainEqual({
        resource: 'notification',
        action: 'read',
        scope: 'organization',
      });
      expect(perms).toContainEqual({
        resource: 'notification',
        action: 'delete',
        scope: 'organization',
      });

      // Task (4, project scope)
      expect(perms).toContainEqual({ resource: 'task', action: 'create', scope: 'project' });
      expect(perms).toContainEqual({ resource: 'task', action: 'read', scope: 'project' });
      expect(perms).toContainEqual({ resource: 'task', action: 'update', scope: 'project' });
      expect(perms).toContainEqual({ resource: 'task', action: 'delete', scope: 'project' });
    });

    it('Backend Developer should have org read, project read, task create/read/update', () => {
      const perms = BUILT_IN_PERMISSIONS['Backend Developer'];
      expect(perms).toContainEqual({
        resource: 'organization',
        action: 'read',
        scope: 'organization',
      });
      expect(perms).toContainEqual({ resource: 'project', action: 'read', scope: 'organization' });
      expect(perms).toContainEqual({ resource: 'task', action: 'create', scope: 'project' });
      expect(perms).toContainEqual({ resource: 'task', action: 'read', scope: 'project' });
      expect(perms).toContainEqual({ resource: 'task', action: 'update', scope: 'project' });
      expect(perms).toHaveLength(5);
    });

    it('Frontend Developer should have org read, project read, task create/read/update', () => {
      const perms = BUILT_IN_PERMISSIONS['Frontend Developer'];
      expect(perms).toContainEqual({
        resource: 'organization',
        action: 'read',
        scope: 'organization',
      });
      expect(perms).toContainEqual({ resource: 'project', action: 'read', scope: 'organization' });
      expect(perms).toContainEqual({ resource: 'task', action: 'create', scope: 'project' });
      expect(perms).toContainEqual({ resource: 'task', action: 'read', scope: 'project' });
      expect(perms).toContainEqual({ resource: 'task', action: 'update', scope: 'project' });
      expect(perms).toHaveLength(5);
    });

    it('Designer should have org read, project read, task create/read/update', () => {
      const perms = BUILT_IN_PERMISSIONS.Designer;
      expect(perms).toContainEqual({
        resource: 'organization',
        action: 'read',
        scope: 'organization',
      });
      expect(perms).toContainEqual({ resource: 'project', action: 'read', scope: 'organization' });
      expect(perms).toContainEqual({ resource: 'task', action: 'create', scope: 'project' });
      expect(perms).toContainEqual({ resource: 'task', action: 'read', scope: 'project' });
      expect(perms).toContainEqual({ resource: 'task', action: 'update', scope: 'project' });
      expect(perms).toHaveLength(5);
    });

    it('QA Engineer should have org read, project read, task create/read/update/delete', () => {
      const perms = BUILT_IN_PERMISSIONS['QA Engineer'];
      expect(perms).toContainEqual({
        resource: 'organization',
        action: 'read',
        scope: 'organization',
      });
      expect(perms).toContainEqual({ resource: 'project', action: 'read', scope: 'organization' });
      expect(perms).toContainEqual({ resource: 'task', action: 'create', scope: 'project' });
      expect(perms).toContainEqual({ resource: 'task', action: 'read', scope: 'project' });
      expect(perms).toContainEqual({ resource: 'task', action: 'update', scope: 'project' });
      expect(perms).toContainEqual({ resource: 'task', action: 'delete', scope: 'project' });
      expect(perms).toHaveLength(6);
    });

    it('DevOps/SRE should have org read, project create/read/update, task create/read/update, notification read/delete', () => {
      const perms = BUILT_IN_PERMISSIONS['DevOps/SRE'];
      expect(perms).toContainEqual({
        resource: 'organization',
        action: 'read',
        scope: 'organization',
      });
      expect(perms).toContainEqual({
        resource: 'project',
        action: 'create',
        scope: 'organization',
      });
      expect(perms).toContainEqual({ resource: 'project', action: 'read', scope: 'organization' });
      expect(perms).toContainEqual({
        resource: 'project',
        action: 'update',
        scope: 'organization',
      });
      expect(perms).toContainEqual({ resource: 'task', action: 'create', scope: 'project' });
      expect(perms).toContainEqual({ resource: 'task', action: 'read', scope: 'project' });
      expect(perms).toContainEqual({ resource: 'task', action: 'update', scope: 'project' });
      expect(perms).toContainEqual({
        resource: 'notification',
        action: 'read',
        scope: 'organization',
      });
      expect(perms).toContainEqual({
        resource: 'notification',
        action: 'delete',
        scope: 'organization',
      });
      expect(perms).toHaveLength(9);
    });

    it('Support Engineer should have org read, project read, task read/update, membership read', () => {
      const perms = BUILT_IN_PERMISSIONS['Support Engineer'];
      expect(perms).toContainEqual({
        resource: 'organization',
        action: 'read',
        scope: 'organization',
      });
      expect(perms).toContainEqual({ resource: 'project', action: 'read', scope: 'organization' });
      expect(perms).toContainEqual({ resource: 'task', action: 'read', scope: 'project' });
      expect(perms).toContainEqual({ resource: 'task', action: 'update', scope: 'project' });
      expect(perms).toContainEqual({
        resource: 'membership',
        action: 'read',
        scope: 'organization',
      });
      expect(perms).toHaveLength(5);
    });

    it('Product Manager should have org read, project create/read/update, task create/read/update', () => {
      const perms = BUILT_IN_PERMISSIONS['Product Manager'];
      expect(perms).toContainEqual({
        resource: 'organization',
        action: 'read',
        scope: 'organization',
      });
      expect(perms).toContainEqual({
        resource: 'project',
        action: 'create',
        scope: 'organization',
      });
      expect(perms).toContainEqual({ resource: 'project', action: 'read', scope: 'organization' });
      expect(perms).toContainEqual({
        resource: 'project',
        action: 'update',
        scope: 'organization',
      });
      expect(perms).toContainEqual({ resource: 'task', action: 'create', scope: 'project' });
      expect(perms).toContainEqual({ resource: 'task', action: 'read', scope: 'project' });
      expect(perms).toContainEqual({ resource: 'task', action: 'update', scope: 'project' });
      expect(perms).toHaveLength(7);
    });

    it('SEO Specialist should have org read, project read, task create/read', () => {
      const perms = BUILT_IN_PERMISSIONS['SEO Specialist'];
      expect(perms).toContainEqual({
        resource: 'organization',
        action: 'read',
        scope: 'organization',
      });
      expect(perms).toContainEqual({ resource: 'project', action: 'read', scope: 'organization' });
      expect(perms).toContainEqual({ resource: 'task', action: 'create', scope: 'project' });
      expect(perms).toContainEqual({ resource: 'task', action: 'read', scope: 'project' });
      expect(perms).toHaveLength(4);
    });

    it('Auth Flow Manager should have org read, invitation create/read/update, membership read/update', () => {
      const perms = BUILT_IN_PERMISSIONS['Auth Flow Manager'];
      expect(perms).toContainEqual({
        resource: 'organization',
        action: 'read',
        scope: 'organization',
      });
      expect(perms).toContainEqual({
        resource: 'invitation',
        action: 'create',
        scope: 'organization',
      });
      expect(perms).toContainEqual({
        resource: 'invitation',
        action: 'read',
        scope: 'organization',
      });
      expect(perms).toContainEqual({
        resource: 'invitation',
        action: 'update',
        scope: 'organization',
      });
      expect(perms).toContainEqual({
        resource: 'membership',
        action: 'read',
        scope: 'organization',
      });
      expect(perms).toContainEqual({
        resource: 'membership',
        action: 'update',
        scope: 'organization',
      });
      expect(perms).toHaveLength(6);
    });

    it('Customer Reporter should only have task create/read at project scope', () => {
      const perms = BUILT_IN_PERMISSIONS['Customer Reporter'];
      expect(perms).toContainEqual({ resource: 'task', action: 'create', scope: 'project' });
      expect(perms).toContainEqual({ resource: 'task', action: 'read', scope: 'project' });
      expect(perms).toHaveLength(2);
      // All permissions should be project-scoped
      for (const p of perms) {
        expect(p.scope).toBe('project');
      }
    });

    it('Customer Stakeholder should only have task read at project scope', () => {
      const perms = BUILT_IN_PERMISSIONS['Customer Stakeholder'];
      expect(perms).toContainEqual({ resource: 'task', action: 'read', scope: 'project' });
      expect(perms).toHaveLength(1);
      // All permissions should be project-scoped
      for (const p of perms) {
        expect(p.scope).toBe('project');
      }
    });

    it('Org Owner should have all org-level permissions for invitation, membership, role, project, notification (create/read/update)', () => {
      const perms = BUILT_IN_PERMISSIONS['Org Owner'];
      expect(perms).toContainEqual({
        resource: 'organization',
        action: 'read',
        scope: 'organization',
      });
      // Invitation: create/read/update (no delete)
      expect(perms).toContainEqual({
        resource: 'invitation',
        action: 'create',
        scope: 'organization',
      });
      expect(perms).toContainEqual({
        resource: 'invitation',
        action: 'read',
        scope: 'organization',
      });
      expect(perms).toContainEqual({
        resource: 'invitation',
        action: 'update',
        scope: 'organization',
      });
      // Membership: read/update (no delete)
      expect(perms).toContainEqual({
        resource: 'membership',
        action: 'read',
        scope: 'organization',
      });
      expect(perms).toContainEqual({
        resource: 'membership',
        action: 'update',
        scope: 'organization',
      });
      // Role: create/read/update (no delete)
      expect(perms).toContainEqual({ resource: 'role', action: 'create', scope: 'organization' });
      expect(perms).toContainEqual({ resource: 'role', action: 'read', scope: 'organization' });
      expect(perms).toContainEqual({ resource: 'role', action: 'update', scope: 'organization' });
      // Project: create/read/update (no delete)
      expect(perms).toContainEqual({
        resource: 'project',
        action: 'create',
        scope: 'organization',
      });
      expect(perms).toContainEqual({ resource: 'project', action: 'read', scope: 'organization' });
      expect(perms).toContainEqual({
        resource: 'project',
        action: 'update',
        scope: 'organization',
      });
      // Notification: create/read/update (no delete)
      expect(perms).toContainEqual({
        resource: 'notification',
        action: 'create',
        scope: 'organization',
      });
      expect(perms).toContainEqual({
        resource: 'notification',
        action: 'read',
        scope: 'organization',
      });
      expect(perms).toContainEqual({
        resource: 'notification',
        action: 'update',
        scope: 'organization',
      });
      expect(perms).toHaveLength(15);
      // Org Owner should not have delete on any resource
      for (const p of perms) {
        expect(p.action).not.toBe('delete');
      }
    });

    it('Project Admin should have project read/update, task create/read/update/delete', () => {
      const perms = BUILT_IN_PERMISSIONS['Project Admin'];
      expect(perms).toContainEqual({ resource: 'project', action: 'read', scope: 'organization' });
      expect(perms).toContainEqual({
        resource: 'project',
        action: 'update',
        scope: 'organization',
      });
      expect(perms).toContainEqual({ resource: 'task', action: 'create', scope: 'project' });
      expect(perms).toContainEqual({ resource: 'task', action: 'read', scope: 'project' });
      expect(perms).toContainEqual({ resource: 'task', action: 'update', scope: 'project' });
      expect(perms).toContainEqual({ resource: 'task', action: 'delete', scope: 'project' });
      expect(perms).toHaveLength(6);
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
  it('should define all 14 role names', () => {
    expect(Object.values(ROLE_NAMES)).toEqual([
      'Super Admin',
      'Backend Developer',
      'Frontend Developer',
      'Designer',
      'QA Engineer',
      'DevOps/SRE',
      'Support Engineer',
      'Product Manager',
      'SEO Specialist',
      'Auth Flow Manager',
      'Customer Reporter',
      'Customer Stakeholder',
      'Org Owner',
      'Project Admin',
    ]);
  });
});
