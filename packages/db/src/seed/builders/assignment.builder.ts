/**
 * Assignment builder — org memberships, role assignments, project memberships,
 * permission assignments, watchers, and dependencies.
 */

import type * as schema from '../../schema/index.js';
import {
  GLOBAL_ROLE_IDS,
  ORG_IDS,
  ORG_ROLE_IDS,
  PROJECT_IDS,
  SUPER_USER_ID,
  USER_IDS,
  id,
} from '../id-registry.js';

const BASE_TIME = new Date('2026-03-01T09:00:00.000Z');

function at(minutesFromBase: number): Date {
  return new Date(BASE_TIME.getTime() + minutesFromBase * 60_000);
}

// ---------------------------------------------------------------------------
// Organization members
// ---------------------------------------------------------------------------

export function buildOrganizationMembers(): (typeof schema.organizationMembers.$inferInsert)[] {
  const members: (typeof schema.organizationMembers.$inferInsert)[] = [];
  let memberIdCounter = 300;

  function addMember(orgId: string, userId: string, roleId: string) {
    members.push({
      id: id(memberIdCounter++),
      organizationId: orgId,
      userId,
      roleId,
      joinedAt: at(30 + members.length),
      createdAt: at(30 + members.length),
      updatedAt: at(30 + members.length),
    });
  }

  // Super Admin is a member of every organization
  addMember(ORG_IDS.taskforgeAgency, SUPER_USER_ID, ORG_ROLE_IDS.taskforgeAgency.owner);
  addMember(ORG_IDS.acmeCorp, SUPER_USER_ID, ORG_ROLE_IDS.acmeCorp.owner);
  addMember(ORG_IDS.globexInc, SUPER_USER_ID, ORG_ROLE_IDS.globexInc.owner);
  addMember(ORG_IDS.soylentCorp, SUPER_USER_ID, ORG_ROLE_IDS.soylentCorp.owner);
  addMember(ORG_IDS.umbrellaCorp, SUPER_USER_ID, ORG_ROLE_IDS.umbrellaCorp.owner);

  // TaskForge Agency members
  addMember(
    ORG_IDS.taskforgeAgency,
    USER_IDS.taskforgeAgencyOwner,
    ORG_ROLE_IDS.taskforgeAgency.owner,
  );
  addMember(
    ORG_IDS.taskforgeAgency,
    USER_IDS.tfBackendDev1,
    ORG_ROLE_IDS.taskforgeAgency.backendDev,
  );
  addMember(
    ORG_IDS.taskforgeAgency,
    USER_IDS.tfBackendDev2,
    ORG_ROLE_IDS.taskforgeAgency.backendDev,
  );
  addMember(
    ORG_IDS.taskforgeAgency,
    USER_IDS.tfBackendDev3,
    ORG_ROLE_IDS.taskforgeAgency.backendDev,
  );
  addMember(
    ORG_IDS.taskforgeAgency,
    USER_IDS.tfFrontendDev1,
    ORG_ROLE_IDS.taskforgeAgency.frontendDev,
  );
  addMember(
    ORG_IDS.taskforgeAgency,
    USER_IDS.tfFrontendDev2,
    ORG_ROLE_IDS.taskforgeAgency.frontendDev,
  );
  addMember(
    ORG_IDS.taskforgeAgency,
    USER_IDS.tfFrontendDev3,
    ORG_ROLE_IDS.taskforgeAgency.frontendDev,
  );
  addMember(ORG_IDS.taskforgeAgency, USER_IDS.tfDesigner1, ORG_ROLE_IDS.taskforgeAgency.designer);
  addMember(ORG_IDS.taskforgeAgency, USER_IDS.tfDesigner2, ORG_ROLE_IDS.taskforgeAgency.designer);
  addMember(
    ORG_IDS.taskforgeAgency,
    USER_IDS.tfSeoSpecialist1,
    ORG_ROLE_IDS.taskforgeAgency.seoSpecialist,
  );
  addMember(
    ORG_IDS.taskforgeAgency,
    USER_IDS.tfAuthFlowManager1,
    ORG_ROLE_IDS.taskforgeAgency.authFlowManager,
  );
  addMember(
    ORG_IDS.taskforgeAgency,
    USER_IDS.tfQaEngineer1,
    ORG_ROLE_IDS.taskforgeAgency.qaEngineer,
  );
  addMember(
    ORG_IDS.taskforgeAgency,
    USER_IDS.tfQaEngineer2,
    ORG_ROLE_IDS.taskforgeAgency.qaEngineer,
  );
  addMember(ORG_IDS.taskforgeAgency, USER_IDS.tfDevopsSre1, ORG_ROLE_IDS.taskforgeAgency.devopsSre);
  addMember(ORG_IDS.taskforgeAgency, USER_IDS.tfDevopsSre2, ORG_ROLE_IDS.taskforgeAgency.devopsSre);
  addMember(
    ORG_IDS.taskforgeAgency,
    USER_IDS.tfSupportEngineer1,
    ORG_ROLE_IDS.taskforgeAgency.supportEngineer,
  );
  addMember(
    ORG_IDS.taskforgeAgency,
    USER_IDS.tfSupportEngineer2,
    ORG_ROLE_IDS.taskforgeAgency.supportEngineer,
  );
  addMember(
    ORG_IDS.taskforgeAgency,
    USER_IDS.tfProductManager1,
    ORG_ROLE_IDS.taskforgeAgency.productManager,
  );
  // Shared users in TaskForge Agency
  addMember(ORG_IDS.taskforgeAgency, USER_IDS.sharedQa, ORG_ROLE_IDS.taskforgeAgency.qaEngineer);
  addMember(
    ORG_IDS.taskforgeAgency,
    USER_IDS.sharedSupport,
    ORG_ROLE_IDS.taskforgeAgency.supportEngineer,
  );
  addMember(ORG_IDS.taskforgeAgency, USER_IDS.sharedDevops, ORG_ROLE_IDS.taskforgeAgency.devopsSre);

  // Acme Corp members
  addMember(ORG_IDS.acmeCorp, USER_IDS.acmeCorpOwner, ORG_ROLE_IDS.acmeCorp.owner);
  addMember(ORG_IDS.acmeCorp, USER_IDS.acmeBackendDev1, ORG_ROLE_IDS.acmeCorp.backendDev);
  addMember(ORG_IDS.acmeCorp, USER_IDS.acmeBackendDev2, ORG_ROLE_IDS.acmeCorp.backendDev);
  addMember(ORG_IDS.acmeCorp, USER_IDS.acmeFrontendDev1, ORG_ROLE_IDS.acmeCorp.frontendDev);
  addMember(ORG_IDS.acmeCorp, USER_IDS.acmeDesigner1, ORG_ROLE_IDS.acmeCorp.designer);
  addMember(ORG_IDS.acmeCorp, USER_IDS.acmeQaEngineer1, ORG_ROLE_IDS.acmeCorp.qaEngineer);
  addMember(ORG_IDS.acmeCorp, USER_IDS.acmeDevopsSre1, ORG_ROLE_IDS.acmeCorp.devopsSre);
  addMember(ORG_IDS.acmeCorp, USER_IDS.acmeProductManager1, ORG_ROLE_IDS.acmeCorp.productManager);
  addMember(
    ORG_IDS.acmeCorp,
    USER_IDS.acmeCustomerReporter1,
    ORG_ROLE_IDS.acmeCorp.customerReporter,
  );
  addMember(
    ORG_IDS.acmeCorp,
    USER_IDS.acmeCustomerReporter2,
    ORG_ROLE_IDS.acmeCorp.customerReporter,
  );
  addMember(
    ORG_IDS.acmeCorp,
    USER_IDS.acmeCustomerStakeholder1,
    ORG_ROLE_IDS.acmeCorp.customerStakeholder,
  );
  addMember(
    ORG_IDS.acmeCorp,
    USER_IDS.acmeCustomerStakeholder2,
    ORG_ROLE_IDS.acmeCorp.customerStakeholder,
  );
  addMember(ORG_IDS.acmeCorp, USER_IDS.acmeBackendDev3, ORG_ROLE_IDS.acmeCorp.backendDev);
  addMember(ORG_IDS.acmeCorp, USER_IDS.acmeFrontendDev2, ORG_ROLE_IDS.acmeCorp.frontendDev);
  // Shared users in Acme
  addMember(ORG_IDS.acmeCorp, USER_IDS.sharedQa, ORG_ROLE_IDS.acmeCorp.qaEngineer);
  addMember(ORG_IDS.acmeCorp, USER_IDS.sharedSupport, ORG_ROLE_IDS.acmeCorp.devopsSre);

  // Globex Inc members
  addMember(ORG_IDS.globexInc, USER_IDS.globexIncOwner, ORG_ROLE_IDS.globexInc.owner);
  addMember(ORG_IDS.globexInc, USER_IDS.globexBackendDev1, ORG_ROLE_IDS.globexInc.backendDev);
  addMember(ORG_IDS.globexInc, USER_IDS.globexFrontendDev1, ORG_ROLE_IDS.globexInc.frontendDev);
  addMember(ORG_IDS.globexInc, USER_IDS.globexDesigner1, ORG_ROLE_IDS.globexInc.designer);
  addMember(ORG_IDS.globexInc, USER_IDS.globexSeoSpecialist1, ORG_ROLE_IDS.globexInc.seoSpecialist);
  addMember(
    ORG_IDS.globexInc,
    USER_IDS.globexProductManager1,
    ORG_ROLE_IDS.globexInc.productManager,
  );
  addMember(
    ORG_IDS.globexInc,
    USER_IDS.globexCustomerReporter1,
    ORG_ROLE_IDS.globexInc.customerReporter,
  );
  addMember(
    ORG_IDS.globexInc,
    USER_IDS.globexCustomerReporter2,
    ORG_ROLE_IDS.globexInc.customerReporter,
  );
  addMember(
    ORG_IDS.globexInc,
    USER_IDS.globexCustomerStakeholder1,
    ORG_ROLE_IDS.globexInc.customerStakeholder,
  );
  addMember(
    ORG_IDS.globexInc,
    USER_IDS.globexCustomerStakeholder2,
    ORG_ROLE_IDS.globexInc.customerStakeholder,
  );
  addMember(
    ORG_IDS.globexInc,
    USER_IDS.globexCustomerStakeholder3,
    ORG_ROLE_IDS.globexInc.customerStakeholder,
  );
  addMember(ORG_IDS.globexInc, USER_IDS.globexBackendDev2, ORG_ROLE_IDS.globexInc.backendDev);
  addMember(ORG_IDS.globexInc, USER_IDS.globexFrontendDev2, ORG_ROLE_IDS.globexInc.frontendDev);

  // Soylent Corp members
  addMember(ORG_IDS.soylentCorp, USER_IDS.soylentCorpOwner, ORG_ROLE_IDS.soylentCorp.owner);
  addMember(ORG_IDS.soylentCorp, USER_IDS.soylentBackendDev1, ORG_ROLE_IDS.soylentCorp.backendDev);
  addMember(
    ORG_IDS.soylentCorp,
    USER_IDS.soylentSupportEngineer1,
    ORG_ROLE_IDS.soylentCorp.supportEngineer,
  );
  addMember(
    ORG_IDS.soylentCorp,
    USER_IDS.soylentSupportEngineer2,
    ORG_ROLE_IDS.soylentCorp.supportEngineer,
  );
  addMember(
    ORG_IDS.soylentCorp,
    USER_IDS.soylentCustomerReporter1,
    ORG_ROLE_IDS.soylentCorp.customerReporter,
  );
  addMember(
    ORG_IDS.soylentCorp,
    USER_IDS.soylentCustomerReporter2,
    ORG_ROLE_IDS.soylentCorp.customerReporter,
  );
  addMember(
    ORG_IDS.soylentCorp,
    USER_IDS.soylentCustomerStakeholder1,
    ORG_ROLE_IDS.soylentCorp.customerStakeholder,
  );
  addMember(
    ORG_IDS.soylentCorp,
    USER_IDS.soylentCustomerReporter3,
    ORG_ROLE_IDS.soylentCorp.customerReporter,
  );
  addMember(
    ORG_IDS.soylentCorp,
    USER_IDS.soylentCustomerStakeholder2,
    ORG_ROLE_IDS.soylentCorp.customerStakeholder,
  );

  // Umbrella Corp members
  addMember(ORG_IDS.umbrellaCorp, USER_IDS.umbrellaCorpOwner, ORG_ROLE_IDS.umbrellaCorp.owner);
  addMember(
    ORG_IDS.umbrellaCorp,
    USER_IDS.umbrellaBackendDev1,
    ORG_ROLE_IDS.umbrellaCorp.backendDev,
  );
  addMember(
    ORG_IDS.umbrellaCorp,
    USER_IDS.umbrellaQaEngineer1,
    ORG_ROLE_IDS.umbrellaCorp.qaEngineer,
  );
  addMember(ORG_IDS.umbrellaCorp, USER_IDS.umbrellaDevopsSre1, ORG_ROLE_IDS.umbrellaCorp.devopsSre);
  addMember(
    ORG_IDS.umbrellaCorp,
    USER_IDS.umbrellaCustomerReporter1,
    ORG_ROLE_IDS.umbrellaCorp.customerReporter,
  );
  addMember(
    ORG_IDS.umbrellaCorp,
    USER_IDS.umbrellaCustomerReporter2,
    ORG_ROLE_IDS.umbrellaCorp.customerReporter,
  );
  addMember(
    ORG_IDS.umbrellaCorp,
    USER_IDS.umbrellaCustomerStakeholder1,
    ORG_ROLE_IDS.umbrellaCorp.customerStakeholder,
  );
  addMember(
    ORG_IDS.umbrellaCorp,
    USER_IDS.umbrellaCustomerReporter3,
    ORG_ROLE_IDS.umbrellaCorp.customerReporter,
  );
  addMember(
    ORG_IDS.umbrellaCorp,
    USER_IDS.umbrellaCustomerStakeholder2,
    ORG_ROLE_IDS.umbrellaCorp.customerStakeholder,
  );
  // Shared users in Umbrella
  addMember(ORG_IDS.umbrellaCorp, USER_IDS.sharedQa, ORG_ROLE_IDS.umbrellaCorp.qaEngineer);
  addMember(ORG_IDS.umbrellaCorp, USER_IDS.sharedDevops, ORG_ROLE_IDS.umbrellaCorp.devopsSre);

  return members;
}

// ---------------------------------------------------------------------------
// Role assignments
// ---------------------------------------------------------------------------

export function buildRoleAssignments(): (typeof schema.roleAssignments.$inferInsert)[] {
  const assignments: (typeof schema.roleAssignments.$inferInsert)[] = [];
  let assignmentIdCounter = 3200;

  function addAssignment(userId: string, roleId: string, orgId: string | null, assignedBy: string) {
    assignments.push({
      id: id(assignmentIdCounter++),
      userId,
      roleId,
      organizationId: orgId,
      assignedByUserId: assignedBy,
      createdAt: at(39),
      updatedAt: at(39),
    });
  }

  // Super Admin global role assignment
  addAssignment(SUPER_USER_ID, GLOBAL_ROLE_IDS.superAdmin, null, SUPER_USER_ID);

  // For org membership roles, we also create role_assignments mirroring org memberships
  // Super Admin gets owner role assignment in each org
  addAssignment(
    SUPER_USER_ID,
    ORG_ROLE_IDS.taskforgeAgency.owner,
    ORG_IDS.taskforgeAgency,
    SUPER_USER_ID,
  );
  addAssignment(SUPER_USER_ID, ORG_ROLE_IDS.acmeCorp.owner, ORG_IDS.acmeCorp, SUPER_USER_ID);
  addAssignment(SUPER_USER_ID, ORG_ROLE_IDS.globexInc.owner, ORG_IDS.globexInc, SUPER_USER_ID);
  addAssignment(SUPER_USER_ID, ORG_ROLE_IDS.soylentCorp.owner, ORG_IDS.soylentCorp, SUPER_USER_ID);
  addAssignment(
    SUPER_USER_ID,
    ORG_ROLE_IDS.umbrellaCorp.owner,
    ORG_IDS.umbrellaCorp,
    SUPER_USER_ID,
  );

  // Org owners get owner role assignment in their org
  addAssignment(
    USER_IDS.taskforgeAgencyOwner,
    ORG_ROLE_IDS.taskforgeAgency.owner,
    ORG_IDS.taskforgeAgency,
    SUPER_USER_ID,
  );
  addAssignment(
    USER_IDS.acmeCorpOwner,
    ORG_ROLE_IDS.acmeCorp.owner,
    ORG_IDS.acmeCorp,
    SUPER_USER_ID,
  );
  addAssignment(
    USER_IDS.globexIncOwner,
    ORG_ROLE_IDS.globexInc.owner,
    ORG_IDS.globexInc,
    SUPER_USER_ID,
  );
  addAssignment(
    USER_IDS.soylentCorpOwner,
    ORG_ROLE_IDS.soylentCorp.owner,
    ORG_IDS.soylentCorp,
    SUPER_USER_ID,
  );
  addAssignment(
    USER_IDS.umbrellaCorpOwner,
    ORG_ROLE_IDS.umbrellaCorp.owner,
    ORG_IDS.umbrellaCorp,
    SUPER_USER_ID,
  );

  // Key delivery team members get role assignments (representative subset)
  // TaskForge Agency staff
  addAssignment(
    USER_IDS.tfBackendDev1,
    ORG_ROLE_IDS.taskforgeAgency.backendDev,
    ORG_IDS.taskforgeAgency,
    USER_IDS.taskforgeAgencyOwner,
  );
  addAssignment(
    USER_IDS.tfFrontendDev1,
    ORG_ROLE_IDS.taskforgeAgency.frontendDev,
    ORG_IDS.taskforgeAgency,
    USER_IDS.taskforgeAgencyOwner,
  );
  addAssignment(
    USER_IDS.tfQaEngineer1,
    ORG_ROLE_IDS.taskforgeAgency.qaEngineer,
    ORG_IDS.taskforgeAgency,
    USER_IDS.taskforgeAgencyOwner,
  );
  addAssignment(
    USER_IDS.tfDevopsSre1,
    ORG_ROLE_IDS.taskforgeAgency.devopsSre,
    ORG_IDS.taskforgeAgency,
    USER_IDS.taskforgeAgencyOwner,
  );
  addAssignment(
    USER_IDS.tfProductManager1,
    ORG_ROLE_IDS.taskforgeAgency.productManager,
    ORG_IDS.taskforgeAgency,
    USER_IDS.taskforgeAgencyOwner,
  );

  // Acme Corp staff
  addAssignment(
    USER_IDS.acmeBackendDev1,
    ORG_ROLE_IDS.acmeCorp.backendDev,
    ORG_IDS.acmeCorp,
    USER_IDS.acmeCorpOwner,
  );
  addAssignment(
    USER_IDS.acmeQaEngineer1,
    ORG_ROLE_IDS.acmeCorp.qaEngineer,
    ORG_IDS.acmeCorp,
    USER_IDS.acmeCorpOwner,
  );
  addAssignment(
    USER_IDS.acmeCustomerReporter1,
    ORG_ROLE_IDS.acmeCorp.customerReporter,
    ORG_IDS.acmeCorp,
    USER_IDS.acmeCorpOwner,
  );

  // Globex Inc staff
  addAssignment(
    USER_IDS.globexBackendDev1,
    ORG_ROLE_IDS.globexInc.backendDev,
    ORG_IDS.globexInc,
    USER_IDS.globexIncOwner,
  );
  addAssignment(
    USER_IDS.globexCustomerReporter1,
    ORG_ROLE_IDS.globexInc.customerReporter,
    ORG_IDS.globexInc,
    USER_IDS.globexIncOwner,
  );

  // Soylent Corp staff
  addAssignment(
    USER_IDS.soylentBackendDev1,
    ORG_ROLE_IDS.soylentCorp.backendDev,
    ORG_IDS.soylentCorp,
    USER_IDS.soylentCorpOwner,
  );
  addAssignment(
    USER_IDS.soylentSupportEngineer1,
    ORG_ROLE_IDS.soylentCorp.supportEngineer,
    ORG_IDS.soylentCorp,
    USER_IDS.soylentCorpOwner,
  );

  // Umbrella Corp staff
  addAssignment(
    USER_IDS.umbrellaBackendDev1,
    ORG_ROLE_IDS.umbrellaCorp.backendDev,
    ORG_IDS.umbrellaCorp,
    USER_IDS.umbrellaCorpOwner,
  );
  addAssignment(
    USER_IDS.umbrellaQaEngineer1,
    ORG_ROLE_IDS.umbrellaCorp.qaEngineer,
    ORG_IDS.umbrellaCorp,
    USER_IDS.umbrellaCorpOwner,
  );

  // Shared staff assignments in customer orgs
  addAssignment(
    USER_IDS.sharedQa,
    ORG_ROLE_IDS.acmeCorp.qaEngineer,
    ORG_IDS.acmeCorp,
    USER_IDS.acmeCorpOwner,
  );
  addAssignment(
    USER_IDS.sharedQa,
    ORG_ROLE_IDS.umbrellaCorp.qaEngineer,
    ORG_IDS.umbrellaCorp,
    USER_IDS.umbrellaCorpOwner,
  );
  addAssignment(
    USER_IDS.sharedDevops,
    ORG_ROLE_IDS.umbrellaCorp.devopsSre,
    ORG_IDS.umbrellaCorp,
    USER_IDS.umbrellaCorpOwner,
  );

  return assignments;
}

// ---------------------------------------------------------------------------
// Permission assignments (direct grants)
// ---------------------------------------------------------------------------

export function buildPermissionAssignments(): (typeof schema.permissionAssignments.$inferInsert)[] {
  const assignments: (typeof schema.permissionAssignments.$inferInsert)[] = [];
  let permIdCounter = 350;

  function addPerm(
    userId: string,
    orgId: string | null,
    permissionKey: string,
    assignedBy: string,
  ) {
    assignments.push({
      id: id(permIdCounter++),
      userId,
      organizationId: orgId,
      permissionKey,
      assignedByUserId: assignedBy,
      createdAt: at(41),
      updatedAt: at(41),
    });
  }

  // Example direct permission grants (same pattern as original seed)
  addPerm(USER_IDS.sharedQa, ORG_IDS.acmeCorp, 'invitation.read.org', USER_IDS.acmeCorpOwner);
  addPerm(
    USER_IDS.soylentCustomerReporter1,
    ORG_IDS.soylentCorp,
    'invitation.read.org',
    USER_IDS.soylentCorpOwner,
  );
  addPerm(
    USER_IDS.globexCustomerReporter1,
    ORG_IDS.globexInc,
    'membership.read.org',
    USER_IDS.globexIncOwner,
  );
  addPerm(
    USER_IDS.acmeCustomerStakeholder1,
    ORG_IDS.acmeCorp,
    'invitation.create.org',
    USER_IDS.acmeCorpOwner,
  );
  addPerm(
    USER_IDS.umbrellaCustomerStakeholder1,
    ORG_IDS.umbrellaCorp,
    'membership.update.org',
    USER_IDS.umbrellaCorpOwner,
  );

  return assignments;
}

// ---------------------------------------------------------------------------
// Project memberships
// ---------------------------------------------------------------------------

export function buildProjectMembers(): (typeof schema.projectMembers.$inferInsert)[] {
  const members: (typeof schema.projectMembers.$inferInsert)[] = [];
  let memberCounter = 700;

  function addProjectMember(projectId: string, userId: string, roleId: string) {
    members.push({
      id: id(memberCounter++),
      projectId,
      userId,
      roleId,
      createdAt: at(90 + members.length),
    });
  }

  // For each project, add the super user as project admin
  // plus relevant org members with realistic role assignments

  // Project → user assignments (deterministic)
  // Each project gets: Super Admin, org owner, and 3-5 relevant team members
  // Non-admin users get their functional role (not projectAdmin)
  const tfRoles = ORG_ROLE_IDS.taskforgeAgency;
  const acRoles = ORG_ROLE_IDS.acmeCorp;
  const glRoles = ORG_ROLE_IDS.globexInc;
  const soRoles = ORG_ROLE_IDS.soylentCorp;
  const umRoles = ORG_ROLE_IDS.umbrellaCorp;

  // TaskForge Agency projects
  addProjectMember(PROJECT_IDS.tfPlatform, SUPER_USER_ID, tfRoles.projectAdmin);
  addProjectMember(PROJECT_IDS.tfPlatform, USER_IDS.taskforgeAgencyOwner, tfRoles.projectAdmin);
  addProjectMember(PROJECT_IDS.tfPlatform, USER_IDS.tfBackendDev1, tfRoles.backendDev);
  addProjectMember(PROJECT_IDS.tfPlatform, USER_IDS.tfFrontendDev1, tfRoles.frontendDev);
  addProjectMember(PROJECT_IDS.tfPlatform, USER_IDS.tfQaEngineer1, tfRoles.qaEngineer);
  addProjectMember(PROJECT_IDS.tfPlatform, USER_IDS.tfDevopsSre1, tfRoles.devopsSre);

  addProjectMember(PROJECT_IDS.tfSecurityProgram, SUPER_USER_ID, tfRoles.projectAdmin);
  addProjectMember(
    PROJECT_IDS.tfSecurityProgram,
    USER_IDS.taskforgeAgencyOwner,
    tfRoles.projectAdmin,
  );
  addProjectMember(PROJECT_IDS.tfSecurityProgram, USER_IDS.tfBackendDev1, tfRoles.backendDev);
  addProjectMember(PROJECT_IDS.tfSecurityProgram, USER_IDS.tfQaEngineer1, tfRoles.qaEngineer);
  addProjectMember(PROJECT_IDS.tfSecurityProgram, USER_IDS.tfDevopsSre1, tfRoles.devopsSre);

  addProjectMember(PROJECT_IDS.tfAuthService, SUPER_USER_ID, tfRoles.projectAdmin);
  addProjectMember(PROJECT_IDS.tfAuthService, USER_IDS.taskforgeAgencyOwner, tfRoles.projectAdmin);
  addProjectMember(PROJECT_IDS.tfAuthService, USER_IDS.tfBackendDev1, tfRoles.backendDev);
  addProjectMember(PROJECT_IDS.tfAuthService, USER_IDS.tfAuthFlowManager1, tfRoles.authFlowManager);
  addProjectMember(PROJECT_IDS.tfAuthService, USER_IDS.tfQaEngineer1, tfRoles.qaEngineer);

  addProjectMember(PROJECT_IDS.tfInfrastructure, SUPER_USER_ID, tfRoles.projectAdmin);
  addProjectMember(
    PROJECT_IDS.tfInfrastructure,
    USER_IDS.taskforgeAgencyOwner,
    tfRoles.projectAdmin,
  );
  addProjectMember(PROJECT_IDS.tfInfrastructure, USER_IDS.tfDevopsSre1, tfRoles.devopsSre);
  addProjectMember(PROJECT_IDS.tfInfrastructure, USER_IDS.tfQaEngineer1, tfRoles.qaEngineer);
  addProjectMember(PROJECT_IDS.tfInfrastructure, USER_IDS.tfDevopsSre2, tfRoles.devopsSre);

  // Acme Corp projects
  addProjectMember(PROJECT_IDS.acmeMobileLaunch, SUPER_USER_ID, acRoles.projectAdmin);
  addProjectMember(PROJECT_IDS.acmeMobileLaunch, USER_IDS.acmeCorpOwner, acRoles.projectAdmin);
  addProjectMember(PROJECT_IDS.acmeMobileLaunch, USER_IDS.acmeBackendDev1, acRoles.backendDev);
  addProjectMember(PROJECT_IDS.acmeMobileLaunch, USER_IDS.acmeFrontendDev1, acRoles.frontendDev);
  addProjectMember(PROJECT_IDS.acmeMobileLaunch, USER_IDS.acmeQaEngineer1, acRoles.qaEngineer);
  addProjectMember(PROJECT_IDS.acmeMobileLaunch, USER_IDS.acmeDevopsSre1, acRoles.devopsSre);
  addProjectMember(
    PROJECT_IDS.acmeMobileLaunch,
    USER_IDS.acmeProductManager1,
    acRoles.productManager,
  );

  addProjectMember(PROJECT_IDS.acmePlatformReliability, SUPER_USER_ID, acRoles.projectAdmin);
  addProjectMember(
    PROJECT_IDS.acmePlatformReliability,
    USER_IDS.acmeCorpOwner,
    acRoles.projectAdmin,
  );
  addProjectMember(
    PROJECT_IDS.acmePlatformReliability,
    USER_IDS.acmeBackendDev1,
    acRoles.backendDev,
  );
  addProjectMember(
    PROJECT_IDS.acmePlatformReliability,
    USER_IDS.acmeQaEngineer1,
    acRoles.qaEngineer,
  );
  addProjectMember(PROJECT_IDS.acmePlatformReliability, USER_IDS.acmeDevopsSre1, acRoles.devopsSre);

  addProjectMember(PROJECT_IDS.acmeWebRefresh, SUPER_USER_ID, acRoles.projectAdmin);
  addProjectMember(PROJECT_IDS.acmeWebRefresh, USER_IDS.acmeCorpOwner, acRoles.projectAdmin);
  addProjectMember(PROJECT_IDS.acmeWebRefresh, USER_IDS.acmeFrontendDev1, acRoles.frontendDev);
  addProjectMember(PROJECT_IDS.acmeWebRefresh, USER_IDS.acmeDesigner1, acRoles.designer);
  addProjectMember(
    PROJECT_IDS.acmeWebRefresh,
    USER_IDS.acmeProductManager1,
    acRoles.productManager,
  );

  addProjectMember(PROJECT_IDS.acmePaymentGateway, SUPER_USER_ID, acRoles.projectAdmin);
  addProjectMember(PROJECT_IDS.acmePaymentGateway, USER_IDS.acmeCorpOwner, acRoles.projectAdmin);
  addProjectMember(PROJECT_IDS.acmePaymentGateway, USER_IDS.acmeBackendDev1, acRoles.backendDev);
  addProjectMember(PROJECT_IDS.acmePaymentGateway, USER_IDS.acmeDevopsSre1, acRoles.devopsSre);
  addProjectMember(PROJECT_IDS.acmePaymentGateway, USER_IDS.acmeQaEngineer1, acRoles.qaEngineer);

  addProjectMember(PROJECT_IDS.acmeCustomerPortal, SUPER_USER_ID, acRoles.projectAdmin);
  addProjectMember(PROJECT_IDS.acmeCustomerPortal, USER_IDS.acmeCorpOwner, acRoles.projectAdmin);
  addProjectMember(PROJECT_IDS.acmeCustomerPortal, USER_IDS.acmeFrontendDev1, acRoles.frontendDev);
  addProjectMember(
    PROJECT_IDS.acmeCustomerPortal,
    USER_IDS.acmeProductManager1,
    acRoles.productManager,
  );
  addProjectMember(
    PROJECT_IDS.acmeCustomerPortal,
    USER_IDS.acmeCustomerReporter1,
    acRoles.customerReporter,
  );
  addProjectMember(
    PROJECT_IDS.acmeCustomerPortal,
    USER_IDS.acmeCustomerStakeholder1,
    acRoles.customerStakeholder,
  );

  addProjectMember(PROJECT_IDS.acmeApiV2, SUPER_USER_ID, acRoles.projectAdmin);
  addProjectMember(PROJECT_IDS.acmeApiV2, USER_IDS.acmeCorpOwner, acRoles.projectAdmin);
  addProjectMember(PROJECT_IDS.acmeApiV2, USER_IDS.acmeBackendDev1, acRoles.backendDev);
  addProjectMember(PROJECT_IDS.acmeApiV2, USER_IDS.acmeDevopsSre1, acRoles.devopsSre);
  addProjectMember(PROJECT_IDS.acmeApiV2, USER_IDS.acmeProductManager1, acRoles.productManager);

  // Globex Inc projects
  addProjectMember(PROJECT_IDS.globexCustomerOps, SUPER_USER_ID, glRoles.projectAdmin);
  addProjectMember(PROJECT_IDS.globexCustomerOps, USER_IDS.globexIncOwner, glRoles.projectAdmin);
  addProjectMember(PROJECT_IDS.globexCustomerOps, USER_IDS.globexBackendDev1, glRoles.backendDev);
  addProjectMember(PROJECT_IDS.globexCustomerOps, USER_IDS.globexFrontendDev1, glRoles.frontendDev);
  addProjectMember(PROJECT_IDS.globexCustomerOps, USER_IDS.globexDesigner1, glRoles.designer);
  addProjectMember(
    PROJECT_IDS.globexCustomerOps,
    USER_IDS.globexSeoSpecialist1,
    glRoles.seoSpecialist,
  );
  addProjectMember(
    PROJECT_IDS.globexCustomerOps,
    USER_IDS.globexProductManager1,
    glRoles.productManager,
  );

  addProjectMember(PROJECT_IDS.globexSecurityProgram, SUPER_USER_ID, glRoles.projectAdmin);
  addProjectMember(
    PROJECT_IDS.globexSecurityProgram,
    USER_IDS.globexIncOwner,
    glRoles.projectAdmin,
  );
  addProjectMember(
    PROJECT_IDS.globexSecurityProgram,
    USER_IDS.globexBackendDev1,
    glRoles.backendDev,
  );
  addProjectMember(
    PROJECT_IDS.globexSecurityProgram,
    USER_IDS.globexProductManager1,
    glRoles.productManager,
  );

  addProjectMember(PROJECT_IDS.globexMarketingHub, SUPER_USER_ID, glRoles.projectAdmin);
  addProjectMember(PROJECT_IDS.globexMarketingHub, USER_IDS.globexIncOwner, glRoles.projectAdmin);
  addProjectMember(
    PROJECT_IDS.globexMarketingHub,
    USER_IDS.globexFrontendDev1,
    glRoles.frontendDev,
  );
  addProjectMember(
    PROJECT_IDS.globexMarketingHub,
    USER_IDS.globexSeoSpecialist1,
    glRoles.seoSpecialist,
  );
  addProjectMember(
    PROJECT_IDS.globexMarketingHub,
    USER_IDS.globexProductManager1,
    glRoles.productManager,
  );
  addProjectMember(
    PROJECT_IDS.globexMarketingHub,
    USER_IDS.globexCustomerReporter1,
    glRoles.customerReporter,
  );

  addProjectMember(PROJECT_IDS.globexProductCatalog, SUPER_USER_ID, glRoles.projectAdmin);
  addProjectMember(PROJECT_IDS.globexProductCatalog, USER_IDS.globexIncOwner, glRoles.projectAdmin);
  addProjectMember(
    PROJECT_IDS.globexProductCatalog,
    USER_IDS.globexBackendDev1,
    glRoles.backendDev,
  );
  addProjectMember(PROJECT_IDS.globexProductCatalog, USER_IDS.globexDesigner1, glRoles.designer);
  addProjectMember(
    PROJECT_IDS.globexProductCatalog,
    USER_IDS.globexProductManager1,
    glRoles.productManager,
  );

  addProjectMember(PROJECT_IDS.globexDataPipeline, SUPER_USER_ID, glRoles.projectAdmin);
  addProjectMember(PROJECT_IDS.globexDataPipeline, USER_IDS.globexIncOwner, glRoles.projectAdmin);
  addProjectMember(PROJECT_IDS.globexDataPipeline, USER_IDS.globexBackendDev1, glRoles.backendDev);
  addProjectMember(
    PROJECT_IDS.globexDataPipeline,
    USER_IDS.globexProductManager1,
    glRoles.productManager,
  );

  // Soylent Corp projects
  addProjectMember(PROJECT_IDS.soylentEnterpriseSupport, SUPER_USER_ID, soRoles.projectAdmin);
  addProjectMember(
    PROJECT_IDS.soylentEnterpriseSupport,
    USER_IDS.soylentCorpOwner,
    soRoles.projectAdmin,
  );
  addProjectMember(
    PROJECT_IDS.soylentEnterpriseSupport,
    USER_IDS.soylentBackendDev1,
    soRoles.backendDev,
  );
  addProjectMember(
    PROJECT_IDS.soylentEnterpriseSupport,
    USER_IDS.soylentCustomerReporter1,
    soRoles.customerReporter,
  );
  addProjectMember(
    PROJECT_IDS.soylentEnterpriseSupport,
    USER_IDS.soylentCustomerStakeholder1,
    soRoles.customerStakeholder,
  );

  addProjectMember(PROJECT_IDS.soylentMigrationEngine, SUPER_USER_ID, soRoles.projectAdmin);
  addProjectMember(
    PROJECT_IDS.soylentMigrationEngine,
    USER_IDS.soylentCorpOwner,
    soRoles.projectAdmin,
  );
  addProjectMember(
    PROJECT_IDS.soylentMigrationEngine,
    USER_IDS.soylentBackendDev1,
    soRoles.backendDev,
  );
  addProjectMember(
    PROJECT_IDS.soylentMigrationEngine,
    USER_IDS.soylentSupportEngineer1,
    soRoles.supportEngineer,
  );

  addProjectMember(PROJECT_IDS.soylentComplianceSuite, SUPER_USER_ID, soRoles.projectAdmin);
  addProjectMember(
    PROJECT_IDS.soylentComplianceSuite,
    USER_IDS.soylentCorpOwner,
    soRoles.projectAdmin,
  );
  addProjectMember(
    PROJECT_IDS.soylentComplianceSuite,
    USER_IDS.soylentBackendDev1,
    soRoles.backendDev,
  );
  addProjectMember(
    PROJECT_IDS.soylentComplianceSuite,
    USER_IDS.soylentCustomerStakeholder1,
    soRoles.customerStakeholder,
  );

  addProjectMember(PROJECT_IDS.soylentApiGateway, SUPER_USER_ID, soRoles.projectAdmin);
  addProjectMember(PROJECT_IDS.soylentApiGateway, USER_IDS.soylentCorpOwner, soRoles.projectAdmin);
  addProjectMember(PROJECT_IDS.soylentApiGateway, USER_IDS.soylentBackendDev1, soRoles.backendDev);
  addProjectMember(
    PROJECT_IDS.soylentApiGateway,
    USER_IDS.soylentSupportEngineer1,
    soRoles.supportEngineer,
  );

  // Umbrella Corp projects
  addProjectMember(PROJECT_IDS.umbrellaThreatIntel, SUPER_USER_ID, umRoles.projectAdmin);
  addProjectMember(
    PROJECT_IDS.umbrellaThreatIntel,
    USER_IDS.umbrellaCorpOwner,
    umRoles.projectAdmin,
  );
  addProjectMember(
    PROJECT_IDS.umbrellaThreatIntel,
    USER_IDS.umbrellaBackendDev1,
    umRoles.backendDev,
  );
  addProjectMember(
    PROJECT_IDS.umbrellaThreatIntel,
    USER_IDS.umbrellaQaEngineer1,
    umRoles.qaEngineer,
  );
  addProjectMember(PROJECT_IDS.umbrellaThreatIntel, USER_IDS.umbrellaDevopsSre1, umRoles.devopsSre);

  addProjectMember(PROJECT_IDS.umbrellaPenTestTracker, SUPER_USER_ID, umRoles.projectAdmin);
  addProjectMember(
    PROJECT_IDS.umbrellaPenTestTracker,
    USER_IDS.umbrellaCorpOwner,
    umRoles.projectAdmin,
  );
  addProjectMember(
    PROJECT_IDS.umbrellaPenTestTracker,
    USER_IDS.umbrellaBackendDev1,
    umRoles.backendDev,
  );
  addProjectMember(
    PROJECT_IDS.umbrellaPenTestTracker,
    USER_IDS.umbrellaQaEngineer1,
    umRoles.qaEngineer,
  );

  addProjectMember(PROJECT_IDS.umbrellaIncidentResponse, SUPER_USER_ID, umRoles.projectAdmin);
  addProjectMember(
    PROJECT_IDS.umbrellaIncidentResponse,
    USER_IDS.umbrellaCorpOwner,
    umRoles.projectAdmin,
  );
  addProjectMember(
    PROJECT_IDS.umbrellaIncidentResponse,
    USER_IDS.umbrellaBackendDev1,
    umRoles.backendDev,
  );
  addProjectMember(
    PROJECT_IDS.umbrellaIncidentResponse,
    USER_IDS.umbrellaDevopsSre1,
    umRoles.devopsSre,
  );
  addProjectMember(
    PROJECT_IDS.umbrellaIncidentResponse,
    USER_IDS.umbrellaCustomerReporter1,
    umRoles.customerReporter,
  );
  addProjectMember(
    PROJECT_IDS.umbrellaIncidentResponse,
    USER_IDS.umbrellaCustomerStakeholder1,
    umRoles.customerStakeholder,
  );

  return members;
}
