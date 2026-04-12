/**
 * User builder — deterministic users with stable IDs and emails.
 */

import type * as schema from '../../schema/index.js';
import { KNOWN_PASSWORD_HASH } from '../dataset-config.js';
import { ORG_IDS, ORG_ROLE_IDS, USER_IDS, id } from '../id-registry.js';

const BASE_TIME = new Date('2026-03-01T09:00:00.000Z');

function at(minutesFromBase: number): Date {
  return new Date(BASE_TIME.getTime() + minutesFromBase * 60_000);
}

interface UserDef {
  id: string;
  email: string;
  displayName: string;
  hasPassword: boolean;
}

// ---------------------------------------------------------------------------
// Build full user list
// ---------------------------------------------------------------------------

export function buildUsers(): (typeof schema.users.$inferInsert)[] {
  const userDefs: UserDef[] = [
    // Super Admin
    {
      id: USER_IDS.superAdmin,
      email: 'superadmin@taskforge.local',
      displayName: 'Super Admin',
      hasPassword: true,
    },
    // Org owners
    {
      id: USER_IDS.taskforgeAgencyOwner,
      email: 'owner@taskforge-agency.taskforge.local',
      displayName: 'Morgan Agency',
      hasPassword: true,
    },
    {
      id: USER_IDS.acmeCorpOwner,
      email: 'owner@acme.taskforge.local',
      displayName: 'Alex Acme',
      hasPassword: true,
    },
    {
      id: USER_IDS.globexIncOwner,
      email: 'owner@globex.taskforge.local',
      displayName: 'Jordan Globex',
      hasPassword: true,
    },
    {
      id: USER_IDS.soylentCorpOwner,
      email: 'owner@soylent.taskforge.local',
      displayName: 'Taylor Soylent',
      hasPassword: true,
    },
    {
      id: USER_IDS.umbrellaCorpOwner,
      email: 'owner@umbrella.taskforge.local',
      displayName: 'Reese Umbrella',
      hasPassword: true,
    },
    // Shared internal staff
    {
      id: USER_IDS.sharedQa,
      email: 'qa-shared@taskforge.local',
      displayName: 'Anil QA',
      hasPassword: true,
    },
    {
      id: USER_IDS.sharedSupport,
      email: 'support-shared@taskforge.local',
      displayName: 'Riley Support',
      hasPassword: true,
    },
    {
      id: USER_IDS.sharedDevops,
      email: 'devops-shared@taskforge.local',
      displayName: 'Casey DevOps',
      hasPassword: true,
    },
    // TaskForge Agency internal staff (10–44)
    {
      id: USER_IDS.tfBackendDev1,
      email: 'backend1@taskforge-agency.taskforge.local',
      displayName: 'Ben Backend',
      hasPassword: true,
    },
    {
      id: USER_IDS.tfBackendDev2,
      email: 'backend2@taskforge-agency.taskforge.local',
      displayName: 'Nina Backend',
      hasPassword: true,
    },
    {
      id: USER_IDS.tfBackendDev3,
      email: 'backend3@taskforge-agency.taskforge.local',
      displayName: 'Omar Backend',
      hasPassword: true,
    },
    {
      id: USER_IDS.tfFrontendDev1,
      email: 'frontend1@taskforge-agency.taskforge.local',
      displayName: 'Faye Frontend',
      hasPassword: true,
    },
    {
      id: USER_IDS.tfFrontendDev2,
      email: 'frontend2@taskforge-agency.taskforge.local',
      displayName: 'Liam Frontend',
      hasPassword: true,
    },
    {
      id: USER_IDS.tfFrontendDev3,
      email: 'frontend3@taskforge-agency.taskforge.local',
      displayName: 'Sara Frontend',
      hasPassword: true,
    },
    {
      id: USER_IDS.tfDesigner1,
      email: 'designer1@taskforge-agency.taskforge.local',
      displayName: 'Dana Design',
      hasPassword: true,
    },
    {
      id: USER_IDS.tfDesigner2,
      email: 'designer2@taskforge-agency.taskforge.local',
      displayName: 'Kim Design',
      hasPassword: true,
    },
    {
      id: USER_IDS.tfSeoSpecialist1,
      email: 'seo1@taskforge-agency.taskforge.local',
      displayName: 'Sam SEO',
      hasPassword: true,
    },
    {
      id: USER_IDS.tfAuthFlowManager1,
      email: 'auth1@taskforge-agency.taskforge.local',
      displayName: 'Ava Auth',
      hasPassword: true,
    },
    {
      id: USER_IDS.tfQaEngineer1,
      email: 'qa1@taskforge-agency.taskforge.local',
      displayName: 'Priya QA',
      hasPassword: true,
    },
    {
      id: USER_IDS.tfQaEngineer2,
      email: 'qa2@taskforge-agency.taskforge.local',
      displayName: 'Kai QA',
      hasPassword: true,
    },
    {
      id: USER_IDS.tfDevopsSre1,
      email: 'devops1@taskforge-agency.taskforge.local',
      displayName: 'Drew DevOps',
      hasPassword: true,
    },
    {
      id: USER_IDS.tfDevopsSre2,
      email: 'devops2@taskforge-agency.taskforge.local',
      displayName: 'Blake DevOps',
      hasPassword: true,
    },
    {
      id: USER_IDS.tfSupportEngineer1,
      email: 'support1@taskforge-agency.taskforge.local',
      displayName: 'Eli Support',
      hasPassword: true,
    },
    {
      id: USER_IDS.tfSupportEngineer2,
      email: 'support2@taskforge-agency.taskforge.local',
      displayName: 'Jo Support',
      hasPassword: true,
    },
    {
      id: USER_IDS.tfProductManager1,
      email: 'pm1@taskforge-agency.taskforge.local',
      displayName: 'Pat PM',
      hasPassword: true,
    },
    // Acme Corp users (45–55)
    {
      id: USER_IDS.acmeBackendDev1,
      email: 'backend1@acme.taskforge.local',
      displayName: 'Marcus Backend',
      hasPassword: true,
    },
    {
      id: USER_IDS.acmeBackendDev2,
      email: 'backend2@acme.taskforge.local',
      displayName: 'Aria Backend',
      hasPassword: true,
    },
    {
      id: USER_IDS.acmeFrontendDev1,
      email: 'frontend1@acme.taskforge.local',
      displayName: 'Finn Frontend',
      hasPassword: true,
    },
    {
      id: USER_IDS.acmeDesigner1,
      email: 'designer1@acme.taskforge.local',
      displayName: 'Iris Design',
      hasPassword: true,
    },
    {
      id: USER_IDS.acmeQaEngineer1,
      email: 'qa1@acme.taskforge.local',
      displayName: 'Tara QA',
      hasPassword: true,
    },
    {
      id: USER_IDS.acmeDevopsSre1,
      email: 'devops1@acme.taskforge.local',
      displayName: 'Brock DevOps',
      hasPassword: true,
    },
    {
      id: USER_IDS.acmeProductManager1,
      email: 'pm1@acme.taskforge.local',
      displayName: 'Priya PM',
      hasPassword: true,
    },
    {
      id: USER_IDS.acmeCustomerReporter1,
      email: 'reporter1@acme.taskforge.local',
      displayName: 'Vera Reporter',
      hasPassword: true,
    },
    {
      id: USER_IDS.acmeCustomerReporter2,
      email: 'reporter2@acme.taskforge.local',
      displayName: 'Dirk Reporter',
      hasPassword: true,
    },
    {
      id: USER_IDS.acmeCustomerStakeholder1,
      email: 'stakeholder1@acme.taskforge.local',
      displayName: 'Wes Stakeholder',
      hasPassword: true,
    },
    {
      id: USER_IDS.acmeCustomerStakeholder2,
      email: 'stakeholder2@acme.taskforge.local',
      displayName: 'Uma Stakeholder',
      hasPassword: true,
    },
    {
      id: USER_IDS.acmeBackendDev3,
      email: 'backend3@acme.taskforge.local',
      displayName: 'Dana Backend',
      hasPassword: true,
    },
    {
      id: USER_IDS.acmeFrontendDev2,
      email: 'frontend2@acme.taskforge.local',
      displayName: 'Gail Frontend',
      hasPassword: true,
    },
    // Globex Inc users (56–65)
    {
      id: USER_IDS.globexBackendDev1,
      email: 'backend1@globex.taskforge.local',
      displayName: 'Sven Backend',
      hasPassword: true,
    },
    {
      id: USER_IDS.globexFrontendDev1,
      email: 'frontend1@globex.taskforge.local',
      displayName: 'Lena Frontend',
      hasPassword: true,
    },
    {
      id: USER_IDS.globexDesigner1,
      email: 'designer1@globex.taskforge.local',
      displayName: 'Marco Design',
      hasPassword: true,
    },
    {
      id: USER_IDS.globexSeoSpecialist1,
      email: 'seo1@globex.taskforge.local',
      displayName: 'Gail SEO',
      hasPassword: true,
    },
    {
      id: USER_IDS.globexProductManager1,
      email: 'pm1@globex.taskforge.local',
      displayName: 'Dale PM',
      hasPassword: true,
    },
    {
      id: USER_IDS.globexCustomerReporter1,
      email: 'reporter1@globex.taskforge.local',
      displayName: 'Hope Reporter',
      hasPassword: true,
    },
    {
      id: USER_IDS.globexCustomerReporter2,
      email: 'reporter2@globex.taskforge.local',
      displayName: 'Fritz Reporter',
      hasPassword: true,
    },
    {
      id: USER_IDS.globexCustomerStakeholder1,
      email: 'stakeholder1@globex.taskforge.local',
      displayName: 'Bea Stakeholder',
      hasPassword: true,
    },
    {
      id: USER_IDS.globexCustomerStakeholder2,
      email: 'stakeholder2@globex.taskforge.local',
      displayName: 'Cal Stakeholder',
      hasPassword: true,
    },
    {
      id: USER_IDS.globexCustomerStakeholder3,
      email: 'stakeholder3@globex.taskforge.local',
      displayName: 'Dot Stakeholder',
      hasPassword: true,
    },
    {
      id: USER_IDS.globexBackendDev2,
      email: 'backend2@globex.taskforge.local',
      displayName: 'Erin Backend',
      hasPassword: true,
    },
    {
      id: USER_IDS.globexFrontendDev2,
      email: 'frontend2@globex.taskforge.local',
      displayName: 'Nora Frontend',
      hasPassword: true,
    },
    // Soylent Corp users (66–71)
    {
      id: USER_IDS.soylentBackendDev1,
      email: 'backend1@soylent.taskforge.local',
      displayName: 'Oleg Backend',
      hasPassword: true,
    },
    {
      id: USER_IDS.soylentSupportEngineer1,
      email: 'support1@soylent.taskforge.local',
      displayName: 'Ian Support',
      hasPassword: true,
    },
    {
      id: USER_IDS.soylentSupportEngineer2,
      email: 'support2@soylent.taskforge.local',
      displayName: 'Jan Support',
      hasPassword: true,
    },
    {
      id: USER_IDS.soylentCustomerReporter1,
      email: 'reporter1@soylent.taskforge.local',
      displayName: 'Kit Reporter',
      hasPassword: true,
    },
    {
      id: USER_IDS.soylentCustomerReporter2,
      email: 'reporter2@soylent.taskforge.local',
      displayName: 'Liv Reporter',
      hasPassword: true,
    },
    {
      id: USER_IDS.soylentCustomerStakeholder1,
      email: 'stakeholder1@soylent.taskforge.local',
      displayName: 'Ned Stakeholder',
      hasPassword: true,
    },
    {
      id: USER_IDS.soylentCustomerReporter3,
      email: 'reporter3@soylent.taskforge.local',
      displayName: 'Quinn Reporter',
      hasPassword: true,
    },
    {
      id: USER_IDS.soylentCustomerStakeholder2,
      email: 'stakeholder2@soylent.taskforge.local',
      displayName: 'Ora Stakeholder',
      hasPassword: true,
    },
    // Umbrella Corp users (72–77)
    {
      id: USER_IDS.umbrellaBackendDev1,
      email: 'backend1@umbrella.taskforge.local',
      displayName: 'Vic Backend',
      hasPassword: true,
    },
    {
      id: USER_IDS.umbrellaQaEngineer1,
      email: 'qa1@umbrella.taskforge.local',
      displayName: 'Ash QA',
      hasPassword: true,
    },
    {
      id: USER_IDS.umbrellaDevopsSre1,
      email: 'devops1@umbrella.taskforge.local',
      displayName: 'Red DevOps',
      hasPassword: true,
    },
    {
      id: USER_IDS.umbrellaCustomerReporter1,
      email: 'reporter1@umbrella.taskforge.local',
      displayName: 'Eve Reporter',
      hasPassword: true,
    },
    {
      id: USER_IDS.umbrellaCustomerReporter2,
      email: 'reporter2@umbrella.taskforge.local',
      displayName: 'Tom Reporter',
      hasPassword: true,
    },
    {
      id: USER_IDS.umbrellaCustomerStakeholder1,
      email: 'stakeholder1@umbrella.taskforge.local',
      displayName: 'Ian Stakeholder',
      hasPassword: true,
    },
    {
      id: USER_IDS.umbrellaCustomerReporter3,
      email: 'reporter3@umbrella.taskforge.local',
      displayName: 'Phil Reporter',
      hasPassword: true,
    },
    {
      id: USER_IDS.umbrellaCustomerStakeholder2,
      email: 'stakeholder2@umbrella.taskforge.local',
      displayName: 'Joy Stakeholder',
      hasPassword: true,
    },
  ];

  return userDefs.map((def, i) => ({
    id: def.id,
    email: def.email,
    passwordHash: def.hasPassword ? KNOWN_PASSWORD_HASH : null,
    displayName: def.displayName,
    mfaEnabled: false,
    mfaSecret: null,
    emailVerifiedAt: at(i + 1),
    lastLoginAt: at(500 + i),
    createdAt: at(0),
    updatedAt: at(0),
  }));
}

// ---------------------------------------------------------------------------
// Oauth, sessions, verification tokens (minimal deterministic set)
// ---------------------------------------------------------------------------

export function buildOauthAccounts(): (typeof schema.oauthAccounts.$inferInsert)[] {
  return [
    {
      id: id(401),
      userId: USER_IDS.tfFrontendDev1,
      provider: 'github',
      providerUserId: 'github-uid-faye-1',
      accessToken: 'gho_seed_access_token',
      refreshToken: 'ghr_seed_refresh_token',
      expiresAt: at(10000),
      createdAt: at(40),
      updatedAt: at(40),
    },
  ];
}

export function buildSessions(): (typeof schema.sessions.$inferInsert)[] {
  return [
    {
      id: id(411),
      userId: USER_IDS.superAdmin,
      tokenHash: 'session_hash_super_admin',
      ipAddress: '127.0.0.1',
      userAgent: 'TaskForge Seed Browser/1.0',
      expiresAt: at(20000),
      createdAt: at(41),
    },
    {
      id: id(412),
      userId: USER_IDS.acmeCorpOwner,
      tokenHash: 'session_hash_owner_acme',
      ipAddress: '127.0.0.1',
      userAgent: 'TaskForge Seed Browser/1.0',
      expiresAt: at(20010),
      createdAt: at(42),
    },
    {
      id: id(413),
      userId: USER_IDS.sharedQa,
      tokenHash: 'session_hash_qa_shared',
      ipAddress: '127.0.0.1',
      userAgent: 'TaskForge Seed Browser/1.0',
      expiresAt: at(20020),
      createdAt: at(43),
    },
  ];
}

export function buildVerificationTokens(): (typeof schema.verificationTokens.$inferInsert)[] {
  return [
    {
      id: id(421),
      userId: USER_IDS.acmeCorpOwner,
      type: 'password_reset' as const,
      tokenHash: 'password_reset_hash_owner_acme',
      expiresAt: at(5000),
      usedAt: null,
      createdAt: at(44),
    },
    {
      id: id(422),
      userId: USER_IDS.globexIncOwner,
      type: 'email_verify' as const,
      tokenHash: 'email_verify_hash_owner_globex',
      expiresAt: at(5001),
      usedAt: at(4500),
      createdAt: at(45),
    },
  ];
}

// ---------------------------------------------------------------------------
// Invitations (deterministic set across orgs)
// ---------------------------------------------------------------------------

export function buildInvitations(): (typeof schema.invitations.$inferInsert)[] {
  return [
    {
      id: id(431),
      inviterOrgId: ORG_IDS.acmeCorp,
      invitedByUserId: USER_IDS.acmeCorpOwner,
      email: 'pending.invite@taskforge.local',
      tokenHash: '1111111111111111111111111111111111111111111111111111111111111111',
      status: 'sent' as const,
      allowedAuthMethods: ['password', 'google'],
      sentAt: new Date('2098-01-10T09:00:00.000Z'),
      expiresAt: new Date('2098-01-13T09:00:00.000Z'),
      acceptedAt: null,
      revokedAt: null,
      consumedByUserId: null,
      createdAt: at(46),
      updatedAt: at(46),
    },
    {
      id: id(432),
      inviterOrgId: ORG_IDS.globexInc,
      invitedByUserId: USER_IDS.globexIncOwner,
      email: 'revoked.invite@taskforge.local',
      tokenHash: '2222222222222222222222222222222222222222222222222222222222222222',
      status: 'revoked' as const,
      allowedAuthMethods: ['password', 'github'],
      sentAt: at(47),
      expiresAt: at(47 + 72 * 60),
      acceptedAt: null,
      revokedAt: at(60),
      consumedByUserId: null,
      createdAt: at(47),
      updatedAt: at(60),
    },
  ];
}

export function buildInvitationTargets(): (typeof schema.invitationTargets.$inferInsert)[] {
  return [
    { id: id(441), invitationId: id(431), organizationId: ORG_IDS.acmeCorp, createdAt: at(46) },
    { id: id(442), invitationId: id(432), organizationId: ORG_IDS.globexInc, createdAt: at(46) },
  ];
}

export function buildInvitationTargetRoles(): (typeof schema.invitationTargetRoles.$inferInsert)[] {
  return [
    {
      id: id(451),
      invitationTargetId: id(441),
      roleId: ORG_ROLE_IDS.acmeCorp.customerReporter,
      createdAt: at(46),
    },
    {
      id: id(452),
      invitationTargetId: id(442),
      roleId: ORG_ROLE_IDS.globexInc.customerReporter,
      createdAt: at(46),
    },
  ];
}

export function buildInvitationTargetPermissions(): (typeof schema.invitationTargetPermissions.$inferInsert)[] {
  return [
    {
      id: id(461),
      invitationTargetId: id(441),
      permissionKey: 'membership.read.org',
      createdAt: at(46),
    },
    {
      id: id(462),
      invitationTargetId: id(442),
      permissionKey: 'invitation.read.org',
      createdAt: at(46),
    },
  ];
}
