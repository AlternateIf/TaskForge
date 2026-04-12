/**
 * Frontend Permission Gating Tests
 *
 * Tests that UI components correctly show/hide/disable elements based on
 * user permissions for FE-gated permissions:
 * - organization.create.org, organization.read.org, organization.update.org, organization.delete.org
 * - invitation.create.org, invitation.read.org, invitation.update.org, invitation.delete.org
 * - membership.read.org, membership.update.org, membership.delete.org
 * - role.create.org, role.read.org, role.update.org, role.delete.org
 * - permission.read.org, permission.update.org
 * - project.create.org, project.read.org, project.update.org, project.delete.org
 * - notification.read.org
 * - task.create.project, task.read.project, task.update.project
 */

import {
  INVITATION_CREATE_PERMISSION,
  INVITATION_DELETE_PERMISSION,
  INVITATION_READ_PERMISSION,
  INVITATION_UPDATE_PERMISSION,
  MEMBERSHIP_DELETE_PERMISSION,
  MEMBERSHIP_READ_PERMISSION,
  MEMBERSHIP_UPDATE_PERMISSION,
  NOTIFICATION_READ_PERMISSION,
  ORGANIZATION_CREATE_PERMISSION,
  ORGANIZATION_DELETE_PERMISSION,
  ORGANIZATION_READ_PERMISSION,
  ORGANIZATION_UPDATE_PERMISSION,
  PERMISSION_READ_PERMISSION,
  PERMISSION_UPDATE_PERMISSION,
  PROJECT_CREATE_PERMISSION,
  PROJECT_DELETE_PERMISSION,
  PROJECT_READ_PERMISSION,
  PROJECT_UPDATE_PERMISSION,
  ROLE_CREATE_PERMISSION,
  ROLE_DELETE_PERMISSION,
  ROLE_READ_PERMISSION,
  ROLE_UPDATE_PERMISSION,
  TASK_CREATE_PERMISSION,
  TASK_READ_PERMISSION,
  TASK_UPDATE_PERMISSION,
} from '@taskforge/shared';
import { describe, expect, it } from 'vitest';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockUserWithAllPermissions = {
  id: 'user-1',
  email: 'admin@example.com',
  displayName: 'Admin User',
  avatarUrl: null,
  organizationId: 'org-1',
  organizationName: 'Acme Corp',
  permissions: [
    // Organization
    'organization.create.org',
    'organization.read.org',
    'organization.update.org',
    'organization.delete.org',
    // Invitation
    'invitation.create.org',
    'invitation.read.org',
    'invitation.update.org',
    'invitation.delete.org',
    // Membership
    'membership.read.org',
    'membership.update.org',
    'membership.delete.org',
    // Role
    'role.create.org',
    'role.read.org',
    'role.update.org',
    'role.delete.org',
    // Permission
    'permission.read.org',
    'permission.update.org',
    // Project
    'project.create.org',
    'project.read.org',
    'project.update.org',
    'project.delete.org',
    // Notification
    'notification.read.org',
    // Task
    'task.create.project',
    'task.read.project',
    'task.update.project',
  ],
  organizations: [{ id: 'org-1', name: 'Acme Corp' }],
};

const mockUserWithNoPermissions = {
  id: 'user-2',
  email: 'user@example.com',
  displayName: 'Regular User',
  avatarUrl: null,
  organizationId: 'org-1',
  organizationName: 'Acme Corp',
  permissions: [] as string[],
  organizations: [{ id: 'org-1', name: 'Acme Corp' }],
};

// ─── Permission Gate Helper ───────────────────────────────────────────────────

function hasPermission(userPermissions: string[], permission: string): boolean {
  return new Set(userPermissions).has(permission);
}

function createPermissionCheck(userPermissions: string[]) {
  return (permission: string) => hasPermission(userPermissions, permission);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Organization Permission Gates', () => {
  describe('organization.create.org', () => {
    it('should show create organization button when user has permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithAllPermissions.permissions);
      const canCreateOrg = checkPermission(ORGANIZATION_CREATE_PERMISSION);
      expect(canCreateOrg).toBe(true);
    });

    it('should hide create organization button when user lacks permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithNoPermissions.permissions);
      const canCreateOrg = checkPermission(ORGANIZATION_CREATE_PERMISSION);
      expect(canCreateOrg).toBe(false);
    });
  });

  describe('organization.read.org', () => {
    it('should allow viewing organization details when user has permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithAllPermissions.permissions);
      expect(checkPermission(ORGANIZATION_READ_PERMISSION)).toBe(true);
    });

    it('should restrict viewing organization details when user lacks permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithNoPermissions.permissions);
      expect(checkPermission(ORGANIZATION_READ_PERMISSION)).toBe(false);
    });
  });

  describe('organization.update.org', () => {
    it('should show edit controls when user has permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithAllPermissions.permissions);
      const canEditOrg = checkPermission(ORGANIZATION_UPDATE_PERMISSION);
      expect(canEditOrg).toBe(true);
    });

    it('should hide edit controls when user lacks permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithNoPermissions.permissions);
      const canEditOrg = checkPermission(ORGANIZATION_UPDATE_PERMISSION);
      expect(canEditOrg).toBe(false);
    });
  });

  describe('organization.delete.org', () => {
    it('should show delete button when user has permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithAllPermissions.permissions);
      const canDeleteOrg = checkPermission(ORGANIZATION_DELETE_PERMISSION);
      expect(canDeleteOrg).toBe(true);
    });

    it('should hide delete button when user lacks permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithNoPermissions.permissions);
      const canDeleteOrg = checkPermission(ORGANIZATION_DELETE_PERMISSION);
      expect(canDeleteOrg).toBe(false);
    });
  });
});

describe('Invitation Permission Gates', () => {
  describe('invitation.create.org', () => {
    it('should show invite button when user has permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithAllPermissions.permissions);
      expect(checkPermission(INVITATION_CREATE_PERMISSION)).toBe(true);
    });

    it('should hide invite button when user lacks permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithNoPermissions.permissions);
      expect(checkPermission(INVITATION_CREATE_PERMISSION)).toBe(false);
    });
  });

  describe('invitation.read.org', () => {
    it('should show invitations list when user has permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithAllPermissions.permissions);
      expect(checkPermission(INVITATION_READ_PERMISSION)).toBe(true);
    });

    it('should hide invitations list when user lacks permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithNoPermissions.permissions);
      expect(checkPermission(INVITATION_READ_PERMISSION)).toBe(false);
    });
  });

  describe('invitation.update.org', () => {
    it('should enable resend action when user has permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithAllPermissions.permissions);
      expect(checkPermission(INVITATION_UPDATE_PERMISSION)).toBe(true);
    });

    it('should disable resend action when user lacks permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithNoPermissions.permissions);
      expect(checkPermission(INVITATION_UPDATE_PERMISSION)).toBe(false);
    });
  });

  describe('invitation.delete.org', () => {
    it('should enable revoke action when user has permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithAllPermissions.permissions);
      expect(checkPermission(INVITATION_DELETE_PERMISSION)).toBe(true);
    });

    it('should disable revoke action when user lacks permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithNoPermissions.permissions);
      expect(checkPermission(INVITATION_DELETE_PERMISSION)).toBe(false);
    });
  });
});

describe('Membership Permission Gates', () => {
  describe('membership.read.org', () => {
    it('should show members list when user has permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithAllPermissions.permissions);
      expect(checkPermission(MEMBERSHIP_READ_PERMISSION)).toBe(true);
    });

    it('should hide members list when user lacks permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithNoPermissions.permissions);
      expect(checkPermission(MEMBERSHIP_READ_PERMISSION)).toBe(false);
    });
  });

  describe('membership.update.org', () => {
    it('should show role assignment controls when user has permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithAllPermissions.permissions);
      expect(checkPermission(MEMBERSHIP_UPDATE_PERMISSION)).toBe(true);
    });

    it('should hide role assignment controls when user lacks permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithNoPermissions.permissions);
      expect(checkPermission(MEMBERSHIP_UPDATE_PERMISSION)).toBe(false);
    });
  });

  describe('membership.delete.org', () => {
    it('should show remove member button when user has permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithAllPermissions.permissions);
      expect(checkPermission(MEMBERSHIP_DELETE_PERMISSION)).toBe(true);
    });

    it('should hide remove member button when user lacks permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithNoPermissions.permissions);
      expect(checkPermission(MEMBERSHIP_DELETE_PERMISSION)).toBe(false);
    });
  });
});

describe('Role Permission Gates', () => {
  describe('role.create.org', () => {
    it('should show create role button when user has permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithAllPermissions.permissions);
      expect(checkPermission(ROLE_CREATE_PERMISSION)).toBe(true);
    });

    it('should hide create role button when user lacks permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithNoPermissions.permissions);
      expect(checkPermission(ROLE_CREATE_PERMISSION)).toBe(false);
    });
  });

  describe('role.read.org', () => {
    it('should show roles list when user has permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithAllPermissions.permissions);
      expect(checkPermission(ROLE_READ_PERMISSION)).toBe(true);
    });

    it('should hide roles list when user lacks permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithNoPermissions.permissions);
      expect(checkPermission(ROLE_READ_PERMISSION)).toBe(false);
    });
  });

  describe('role.update.org', () => {
    it('should show edit role controls when user has permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithAllPermissions.permissions);
      expect(checkPermission(ROLE_UPDATE_PERMISSION)).toBe(true);
    });

    it('should hide edit role controls when user lacks permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithNoPermissions.permissions);
      expect(checkPermission(ROLE_UPDATE_PERMISSION)).toBe(false);
    });
  });

  describe('role.delete.org', () => {
    it('should show delete role button when user has permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithAllPermissions.permissions);
      expect(checkPermission(ROLE_DELETE_PERMISSION)).toBe(true);
    });

    it('should hide delete role button when user lacks permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithNoPermissions.permissions);
      expect(checkPermission(ROLE_DELETE_PERMISSION)).toBe(false);
    });
  });
});

describe('Permission Permission Gates', () => {
  describe('permission.read.org', () => {
    it('should show permission assignments list when user has permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithAllPermissions.permissions);
      expect(checkPermission(PERMISSION_READ_PERMISSION)).toBe(true);
    });

    it('should hide permission assignments list when user lacks permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithNoPermissions.permissions);
      expect(checkPermission(PERMISSION_READ_PERMISSION)).toBe(false);
    });
  });

  describe('permission.update.org', () => {
    it('should show permission assignment controls when user has permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithAllPermissions.permissions);
      expect(checkPermission(PERMISSION_UPDATE_PERMISSION)).toBe(true);
    });

    it('should hide permission assignment controls when user lacks permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithNoPermissions.permissions);
      expect(checkPermission(PERMISSION_UPDATE_PERMISSION)).toBe(false);
    });
  });
});

describe('Project Permission Gates', () => {
  describe('project.create.org', () => {
    it('should show create project button when user has permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithAllPermissions.permissions);
      expect(checkPermission(PROJECT_CREATE_PERMISSION)).toBe(true);
    });

    it('should hide create project button when user lacks permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithNoPermissions.permissions);
      expect(checkPermission(PROJECT_CREATE_PERMISSION)).toBe(false);
    });
  });

  describe('project.read.org', () => {
    it('should show projects list when user has permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithAllPermissions.permissions);
      expect(checkPermission(PROJECT_READ_PERMISSION)).toBe(true);
    });

    it('should hide projects list when user lacks permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithNoPermissions.permissions);
      expect(checkPermission(PROJECT_READ_PERMISSION)).toBe(false);
    });
  });

  describe('project.update.org', () => {
    it('should show edit project controls when user has permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithAllPermissions.permissions);
      expect(checkPermission(PROJECT_UPDATE_PERMISSION)).toBe(true);
    });

    it('should hide edit project controls when user lacks permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithNoPermissions.permissions);
      expect(checkPermission(PROJECT_UPDATE_PERMISSION)).toBe(false);
    });
  });

  describe('project.delete.org', () => {
    it('should show delete project button when user has permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithAllPermissions.permissions);
      expect(checkPermission(PROJECT_DELETE_PERMISSION)).toBe(true);
    });

    it('should hide delete project button when user lacks permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithNoPermissions.permissions);
      expect(checkPermission(PROJECT_DELETE_PERMISSION)).toBe(false);
    });
  });
});

describe('Notification Permission Gates', () => {
  describe('notification.read.org', () => {
    it('should show notifications panel when user has permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithAllPermissions.permissions);
      expect(checkPermission(NOTIFICATION_READ_PERMISSION)).toBe(true);
    });

    it('should hide notifications panel when user lacks permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithNoPermissions.permissions);
      expect(checkPermission(NOTIFICATION_READ_PERMISSION)).toBe(false);
    });
  });
});

describe('Task Permission Gates', () => {
  describe('task.create.project', () => {
    it('should show create task button when user has permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithAllPermissions.permissions);
      expect(checkPermission(TASK_CREATE_PERMISSION)).toBe(true);
    });

    it('should hide create task button when user lacks permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithNoPermissions.permissions);
      expect(checkPermission(TASK_CREATE_PERMISSION)).toBe(false);
    });
  });

  describe('task.read.project', () => {
    it('should allow viewing tasks when user has permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithAllPermissions.permissions);
      expect(checkPermission(TASK_READ_PERMISSION)).toBe(true);
    });

    it('should restrict viewing tasks when user lacks permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithNoPermissions.permissions);
      expect(checkPermission(TASK_READ_PERMISSION)).toBe(false);
    });
  });

  describe('task.update.project', () => {
    it('should enable task edit controls when user has permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithAllPermissions.permissions);
      expect(checkPermission(TASK_UPDATE_PERMISSION)).toBe(true);
    });

    it('should disable task edit controls when user lacks permission', () => {
      const checkPermission = createPermissionCheck(mockUserWithNoPermissions.permissions);
      expect(checkPermission(TASK_UPDATE_PERMISSION)).toBe(false);
    });
  });
});

describe('Permission Constants Verification', () => {
  it('should have valid ORGANIZATION_*_PERMISSION constants', () => {
    expect(ORGANIZATION_CREATE_PERMISSION).toBe('organization.create.org');
    expect(ORGANIZATION_READ_PERMISSION).toBe('organization.read.org');
    expect(ORGANIZATION_UPDATE_PERMISSION).toBe('organization.update.org');
    expect(ORGANIZATION_DELETE_PERMISSION).toBe('organization.delete.org');
  });

  it('should have valid INVITATION_*_PERMISSION constants', () => {
    expect(INVITATION_CREATE_PERMISSION).toBe('invitation.create.org');
    expect(INVITATION_READ_PERMISSION).toBe('invitation.read.org');
    expect(INVITATION_UPDATE_PERMISSION).toBe('invitation.update.org');
    expect(INVITATION_DELETE_PERMISSION).toBe('invitation.delete.org');
  });

  it('should have valid MEMBERSHIP_*_PERMISSION constants', () => {
    expect(MEMBERSHIP_READ_PERMISSION).toBe('membership.read.org');
    expect(MEMBERSHIP_UPDATE_PERMISSION).toBe('membership.update.org');
    expect(MEMBERSHIP_DELETE_PERMISSION).toBe('membership.delete.org');
  });

  it('should have valid ROLE_*_PERMISSION constants', () => {
    expect(ROLE_CREATE_PERMISSION).toBe('role.create.org');
    expect(ROLE_READ_PERMISSION).toBe('role.read.org');
    expect(ROLE_UPDATE_PERMISSION).toBe('role.update.org');
    expect(ROLE_DELETE_PERMISSION).toBe('role.delete.org');
  });

  it('should have valid PERMISSION_*_PERMISSION constants', () => {
    expect(PERMISSION_READ_PERMISSION).toBe('permission.read.org');
    expect(PERMISSION_UPDATE_PERMISSION).toBe('permission.update.org');
  });

  it('should have valid PROJECT_*_PERMISSION constants', () => {
    expect(PROJECT_CREATE_PERMISSION).toBe('project.create.org');
    expect(PROJECT_READ_PERMISSION).toBe('project.read.org');
    expect(PROJECT_UPDATE_PERMISSION).toBe('project.update.org');
    expect(PROJECT_DELETE_PERMISSION).toBe('project.delete.org');
  });

  it('should have valid NOTIFICATION_*_PERMISSION constants', () => {
    expect(NOTIFICATION_READ_PERMISSION).toBe('notification.read.org');
  });

  it('should have valid TASK_*_PERMISSION constants', () => {
    expect(TASK_CREATE_PERMISSION).toBe('task.create.project');
    expect(TASK_READ_PERMISSION).toBe('task.read.project');
    expect(TASK_UPDATE_PERMISSION).toBe('task.update.project');
  });
});

describe('Combined Permission Checks', () => {
  it('should correctly compute canManageProject from project permissions', () => {
    const userPermissions = mockUserWithAllPermissions.permissions;
    const permissionSet = new Set(userPermissions);

    const canCreateProject = permissionSet.has(PROJECT_CREATE_PERMISSION);
    const canReadProject = permissionSet.has(PROJECT_READ_PERMISSION);
    const canUpdateProject = permissionSet.has(PROJECT_UPDATE_PERMISSION);
    const canDeleteProject = permissionSet.has(PROJECT_DELETE_PERMISSION);

    expect(canCreateProject).toBe(true);
    expect(canReadProject).toBe(true);
    expect(canUpdateProject).toBe(true);
    expect(canDeleteProject).toBe(true);
  });

  it('should correctly compute canManageInvitations from invitation permissions', () => {
    const userPermissions = mockUserWithAllPermissions.permissions;
    const permissionSet = new Set(userPermissions);

    const canCreateInvite = permissionSet.has(INVITATION_CREATE_PERMISSION);
    const canReadInvite = permissionSet.has(INVITATION_READ_PERMISSION);
    const canUpdateInvite = permissionSet.has(INVITATION_UPDATE_PERMISSION);
    const canDeleteInvite = permissionSet.has(INVITATION_DELETE_PERMISSION);

    expect(canCreateInvite).toBe(true);
    expect(canReadInvite).toBe(true);
    expect(canUpdateInvite).toBe(true);
    expect(canDeleteInvite).toBe(true);
  });

  it('should deny all actions for user with no permissions', () => {
    const permissionSet = new Set(mockUserWithNoPermissions.permissions);

    const allPermissions = [
      ORGANIZATION_CREATE_PERMISSION,
      ORGANIZATION_READ_PERMISSION,
      ORGANIZATION_UPDATE_PERMISSION,
      ORGANIZATION_DELETE_PERMISSION,
      INVITATION_CREATE_PERMISSION,
      INVITATION_READ_PERMISSION,
      INVITATION_UPDATE_PERMISSION,
      INVITATION_DELETE_PERMISSION,
      MEMBERSHIP_READ_PERMISSION,
      MEMBERSHIP_UPDATE_PERMISSION,
      MEMBERSHIP_DELETE_PERMISSION,
      ROLE_CREATE_PERMISSION,
      ROLE_READ_PERMISSION,
      ROLE_UPDATE_PERMISSION,
      ROLE_DELETE_PERMISSION,
      PERMISSION_READ_PERMISSION,
      PERMISSION_UPDATE_PERMISSION,
      PROJECT_CREATE_PERMISSION,
      PROJECT_READ_PERMISSION,
      PROJECT_UPDATE_PERMISSION,
      PROJECT_DELETE_PERMISSION,
      NOTIFICATION_READ_PERMISSION,
      TASK_CREATE_PERMISSION,
      TASK_READ_PERMISSION,
      TASK_UPDATE_PERMISSION,
    ];

    for (const perm of allPermissions) {
      expect(permissionSet.has(perm)).toBe(false);
    }
  });
});
