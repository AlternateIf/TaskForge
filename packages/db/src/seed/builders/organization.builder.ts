/**
 * Organization builder — deterministic org, auth settings, roles, and permissions.
 */

import { PERMISSION_KEYS, toPermissionTuple } from '@taskforge/shared';
import type * as schema from '../../schema/index.js';
import { ORG_CATALOG } from '../dataset-config.js';
import {
  GLOBAL_ROLE_IDS,
  ORG_AUTH_SETTING_IDS,
  ORG_IDS,
  ORG_ROLE_IDS,
  id,
} from '../id-registry.js';

const BASE_TIME = new Date('2026-03-01T09:00:00.000Z');

function at(minutesFromBase: number): Date {
  return new Date(BASE_TIME.getTime() + minutesFromBase * 60_000);
}

type PermissionScope = 'global' | 'organization' | 'project';

interface PermissionCatalogEntry {
  key: string;
  resource: string;
  action: string;
  scope: PermissionScope;
}

export const permissionCatalog: PermissionCatalogEntry[] = PERMISSION_KEYS.map((key) => {
  const { resource, action, scope } = toPermissionTuple(key);
  return { key, resource, action, scope: scope as PermissionScope };
});

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------

export function buildOrganizations(): (typeof schema.organizations.$inferInsert)[] {
  return ORG_CATALOG.map((def, i) => ({
    id: ALL_ORG_IDS[i],
    name: def.name,
    slug: def.slug,
    settings: def.settings,
    createdAt: at(10 + i),
    updatedAt: at(10 + i),
  }));
}

const ALL_ORG_IDS = [
  ORG_IDS.taskforgeAgency,
  ORG_IDS.acmeCorp,
  ORG_IDS.globexInc,
  ORG_IDS.soylentCorp,
  ORG_IDS.umbrellaCorp,
];

// ---------------------------------------------------------------------------
// Organization auth settings
// ---------------------------------------------------------------------------

export function buildOrganizationAuthSettings(): (typeof schema.organizationAuthSettings.$inferInsert)[] {
  const allOrgIds = [
    ORG_IDS.taskforgeAgency,
    ORG_IDS.acmeCorp,
    ORG_IDS.globexInc,
    ORG_IDS.soylentCorp,
    ORG_IDS.umbrellaCorp,
  ];
  const allAuthIds = [
    ORG_AUTH_SETTING_IDS.taskforgeAgency,
    ORG_AUTH_SETTING_IDS.acmeCorp,
    ORG_AUTH_SETTING_IDS.globexInc,
    ORG_AUTH_SETTING_IDS.soylentCorp,
    ORG_AUTH_SETTING_IDS.umbrellaCorp,
  ];

  // Seed users use org-specific subdomains of taskforge.local
  // (e.g. acme.taskforge.local, globex.taskforge.local, taskforge-agency.taskforge.local).
  // The auth service does exact domain matching, so we must list every subdomain
  // that users in that org will use, plus the root domain for shared/global accounts.
  // Super Admin and shared staff use just "taskforge.local" as their email domain.
  const perOrgAllowedDomains: string[][] = [
    // TaskForge Agency: root domain + agency subdomain
    ['taskforge.local', 'taskforge-agency.taskforge.local'],
    // Acme Corp: root domain + acme subdomain
    ['taskforge.local', 'acme.taskforge.local'],
    // Globex Inc: root domain + globex subdomain
    ['taskforge.local', 'globex.taskforge.local'],
    // Soylent Corp: root domain + soylent subdomain
    ['taskforge.local', 'soylent.taskforge.local'],
    // Umbrella Corp: root domain + umbrella subdomain
    ['taskforge.local', 'umbrella.taskforge.local'],
  ];

  return allOrgIds.map((orgId, i) => ({
    id: allAuthIds[i],
    organizationId: orgId,
    passwordAuthEnabled: true,
    googleOauthEnabled: i === 0 || i === 1, // TF Agency + Acme
    githubOauthEnabled: true,
    mfaEnforced: false,
    mfaEnforcedAt: null,
    mfaGracePeriodDays: 7,
    allowedEmailDomains: perOrgAllowedDomains[i],
    createdAt: at(15 + i),
    updatedAt: at(15 + i),
  }));
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export function buildRoles(): (typeof schema.roles.$inferInsert)[] {
  const roles: (typeof schema.roles.$inferInsert)[] = [
    // Global Super Admin role
    {
      id: GLOBAL_ROLE_IDS.superAdmin,
      organizationId: null,
      name: 'Super Admin',
      description: 'All global and organization governance permissions',
      isSystem: true,
      createdAt: at(20),
      updatedAt: at(20),
    },
  ];

  // TaskForge Agency roles
  const tfRoles = ORG_ROLE_IDS.taskforgeAgency;
  roles.push(
    {
      id: tfRoles.owner,
      organizationId: ORG_IDS.taskforgeAgency,
      name: 'Agency Owner',
      description: 'Owns organization governance and membership',
      isSystem: false,
      createdAt: at(21),
      updatedAt: at(21),
    },
    {
      id: tfRoles.projectAdmin,
      organizationId: ORG_IDS.taskforgeAgency,
      name: 'Agency Project Admin',
      description: 'Administers projects and team assignments',
      isSystem: false,
      createdAt: at(21),
      updatedAt: at(21),
    },
    {
      id: tfRoles.backendDev,
      organizationId: ORG_IDS.taskforgeAgency,
      name: 'Agency Backend Developer',
      description: 'Backend development and API work',
      isSystem: false,
      createdAt: at(21),
      updatedAt: at(21),
    },
    {
      id: tfRoles.frontendDev,
      organizationId: ORG_IDS.taskforgeAgency,
      name: 'Agency Frontend Developer',
      description: 'Frontend development and UI work',
      isSystem: false,
      createdAt: at(21),
      updatedAt: at(21),
    },
    {
      id: tfRoles.designer,
      organizationId: ORG_IDS.taskforgeAgency,
      name: 'Agency Designer',
      description: 'Design and UX work',
      isSystem: false,
      createdAt: at(21),
      updatedAt: at(21),
    },
    {
      id: tfRoles.seoSpecialist,
      organizationId: ORG_IDS.taskforgeAgency,
      name: 'Agency SEO Specialist',
      description: 'SEO and content visibility',
      isSystem: false,
      createdAt: at(21),
      updatedAt: at(21),
    },
    {
      id: tfRoles.authFlowManager,
      organizationId: ORG_IDS.taskforgeAgency,
      name: 'Agency Auth Flow Manager',
      description: 'Auth flow and identity management',
      isSystem: false,
      createdAt: at(21),
      updatedAt: at(21),
    },
    {
      id: tfRoles.qaEngineer,
      organizationId: ORG_IDS.taskforgeAgency,
      name: 'Agency QA Engineer',
      description: 'Testing and quality assurance',
      isSystem: false,
      createdAt: at(21),
      updatedAt: at(21),
    },
    {
      id: tfRoles.devopsSre,
      organizationId: ORG_IDS.taskforgeAgency,
      name: 'Agency DevOps/SRE',
      description: 'Infrastructure and reliability',
      isSystem: false,
      createdAt: at(21),
      updatedAt: at(21),
    },
    {
      id: tfRoles.supportEngineer,
      organizationId: ORG_IDS.taskforgeAgency,
      name: 'Agency Support Engineer',
      description: 'Enterprise support and escalation',
      isSystem: false,
      createdAt: at(21),
      updatedAt: at(21),
    },
    {
      id: tfRoles.productManager,
      organizationId: ORG_IDS.taskforgeAgency,
      name: 'Agency Product Manager',
      description: 'Product planning and prioritization',
      isSystem: false,
      createdAt: at(21),
      updatedAt: at(21),
    },
  );

  // Acme Corp roles
  const acmeRoles = ORG_ROLE_IDS.acmeCorp;
  roles.push(
    {
      id: acmeRoles.owner,
      organizationId: ORG_IDS.acmeCorp,
      name: 'Acme Owner',
      description: 'Owns organization governance and membership',
      isSystem: false,
      createdAt: at(22),
      updatedAt: at(22),
    },
    {
      id: acmeRoles.projectAdmin,
      organizationId: ORG_IDS.acmeCorp,
      name: 'Acme Project Admin',
      description: 'Administers projects and team assignments',
      isSystem: false,
      createdAt: at(22),
      updatedAt: at(22),
    },
    {
      id: acmeRoles.backendDev,
      organizationId: ORG_IDS.acmeCorp,
      name: 'Acme Backend Developer',
      description: 'Backend development and API work',
      isSystem: false,
      createdAt: at(22),
      updatedAt: at(22),
    },
    {
      id: acmeRoles.frontendDev,
      organizationId: ORG_IDS.acmeCorp,
      name: 'Acme Frontend Developer',
      description: 'Frontend development and UI work',
      isSystem: false,
      createdAt: at(22),
      updatedAt: at(22),
    },
    {
      id: acmeRoles.designer,
      organizationId: ORG_IDS.acmeCorp,
      name: 'Acme Designer',
      description: 'Design and UX work',
      isSystem: false,
      createdAt: at(22),
      updatedAt: at(22),
    },
    {
      id: acmeRoles.qaEngineer,
      organizationId: ORG_IDS.acmeCorp,
      name: 'Acme QA Engineer',
      description: 'Testing and quality assurance',
      isSystem: false,
      createdAt: at(22),
      updatedAt: at(22),
    },
    {
      id: acmeRoles.devopsSre,
      organizationId: ORG_IDS.acmeCorp,
      name: 'Acme DevOps/SRE',
      description: 'Infrastructure and reliability',
      isSystem: false,
      createdAt: at(22),
      updatedAt: at(22),
    },
    {
      id: acmeRoles.productManager,
      organizationId: ORG_IDS.acmeCorp,
      name: 'Acme Product Manager',
      description: 'Product planning and prioritization',
      isSystem: false,
      createdAt: at(22),
      updatedAt: at(22),
    },
    {
      id: acmeRoles.customerReporter,
      organizationId: ORG_IDS.acmeCorp,
      name: 'Acme Customer Reporter',
      description: 'Files bugs and feature requests',
      isSystem: false,
      createdAt: at(22),
      updatedAt: at(22),
    },
    {
      id: acmeRoles.customerStakeholder,
      organizationId: ORG_IDS.acmeCorp,
      name: 'Acme Customer Stakeholder',
      description: 'Reviews and prioritizes reported items',
      isSystem: false,
      createdAt: at(22),
      updatedAt: at(22),
    },
  );

  // Globex Inc roles
  const globexRoles = ORG_ROLE_IDS.globexInc;
  roles.push(
    {
      id: globexRoles.owner,
      organizationId: ORG_IDS.globexInc,
      name: 'Globex Owner',
      description: 'Owns organization governance and membership',
      isSystem: false,
      createdAt: at(23),
      updatedAt: at(23),
    },
    {
      id: globexRoles.projectAdmin,
      organizationId: ORG_IDS.globexInc,
      name: 'Globex Project Admin',
      description: 'Administers projects and team assignments',
      isSystem: false,
      createdAt: at(23),
      updatedAt: at(23),
    },
    {
      id: globexRoles.backendDev,
      organizationId: ORG_IDS.globexInc,
      name: 'Globex Backend Developer',
      description: 'Backend development and API work',
      isSystem: false,
      createdAt: at(23),
      updatedAt: at(23),
    },
    {
      id: globexRoles.frontendDev,
      organizationId: ORG_IDS.globexInc,
      name: 'Globex Frontend Developer',
      description: 'Frontend development and UI work',
      isSystem: false,
      createdAt: at(23),
      updatedAt: at(23),
    },
    {
      id: globexRoles.designer,
      organizationId: ORG_IDS.globexInc,
      name: 'Globex Designer',
      description: 'Design and UX work',
      isSystem: false,
      createdAt: at(23),
      updatedAt: at(23),
    },
    {
      id: globexRoles.seoSpecialist,
      organizationId: ORG_IDS.globexInc,
      name: 'Globex SEO Specialist',
      description: 'SEO and content visibility',
      isSystem: false,
      createdAt: at(23),
      updatedAt: at(23),
    },
    {
      id: globexRoles.productManager,
      organizationId: ORG_IDS.globexInc,
      name: 'Globex Product Manager',
      description: 'Product planning and prioritization',
      isSystem: false,
      createdAt: at(23),
      updatedAt: at(23),
    },
    {
      id: globexRoles.customerReporter,
      organizationId: ORG_IDS.globexInc,
      name: 'Globex Customer Reporter',
      description: 'Files bugs and feature requests',
      isSystem: false,
      createdAt: at(23),
      updatedAt: at(23),
    },
    {
      id: globexRoles.customerStakeholder,
      organizationId: ORG_IDS.globexInc,
      name: 'Globex Customer Stakeholder',
      description: 'Reviews and prioritizes reported items',
      isSystem: false,
      createdAt: at(23),
      updatedAt: at(23),
    },
  );

  // Soylent Corp roles
  const soylentRoles = ORG_ROLE_IDS.soylentCorp;
  roles.push(
    {
      id: soylentRoles.owner,
      organizationId: ORG_IDS.soylentCorp,
      name: 'Soylent Owner',
      description: 'Owns organization governance and membership',
      isSystem: false,
      createdAt: at(24),
      updatedAt: at(24),
    },
    {
      id: soylentRoles.projectAdmin,
      organizationId: ORG_IDS.soylentCorp,
      name: 'Soylent Project Admin',
      description: 'Administers projects and team assignments',
      isSystem: false,
      createdAt: at(24),
      updatedAt: at(24),
    },
    {
      id: soylentRoles.backendDev,
      organizationId: ORG_IDS.soylentCorp,
      name: 'Soylent Backend Developer',
      description: 'Backend development and API work',
      isSystem: false,
      createdAt: at(24),
      updatedAt: at(24),
    },
    {
      id: soylentRoles.supportEngineer,
      organizationId: ORG_IDS.soylentCorp,
      name: 'Soylent Support Engineer',
      description: 'Enterprise support and escalation',
      isSystem: false,
      createdAt: at(24),
      updatedAt: at(24),
    },
    {
      id: soylentRoles.customerReporter,
      organizationId: ORG_IDS.soylentCorp,
      name: 'Soylent Customer Reporter',
      description: 'Files bugs and feature requests',
      isSystem: false,
      createdAt: at(24),
      updatedAt: at(24),
    },
    {
      id: soylentRoles.customerStakeholder,
      organizationId: ORG_IDS.soylentCorp,
      name: 'Soylent Customer Stakeholder',
      description: 'Reviews and prioritizes reported items',
      isSystem: false,
      createdAt: at(24),
      updatedAt: at(24),
    },
  );

  // Umbrella Corp roles
  const umbrellaRoles = ORG_ROLE_IDS.umbrellaCorp;
  roles.push(
    {
      id: umbrellaRoles.owner,
      organizationId: ORG_IDS.umbrellaCorp,
      name: 'Umbrella Owner',
      description: 'Owns organization governance and membership',
      isSystem: false,
      createdAt: at(25),
      updatedAt: at(25),
    },
    {
      id: umbrellaRoles.projectAdmin,
      organizationId: ORG_IDS.umbrellaCorp,
      name: 'Umbrella Project Admin',
      description: 'Administers projects and team assignments',
      isSystem: false,
      createdAt: at(25),
      updatedAt: at(25),
    },
    {
      id: umbrellaRoles.backendDev,
      organizationId: ORG_IDS.umbrellaCorp,
      name: 'Umbrella Backend Developer',
      description: 'Backend development and API work',
      isSystem: false,
      createdAt: at(25),
      updatedAt: at(25),
    },
    {
      id: umbrellaRoles.qaEngineer,
      organizationId: ORG_IDS.umbrellaCorp,
      name: 'Umbrella QA Engineer',
      description: 'Testing and quality assurance',
      isSystem: false,
      createdAt: at(25),
      updatedAt: at(25),
    },
    {
      id: umbrellaRoles.devopsSre,
      organizationId: ORG_IDS.umbrellaCorp,
      name: 'Umbrella DevOps/SRE',
      description: 'Infrastructure and reliability',
      isSystem: false,
      createdAt: at(25),
      updatedAt: at(25),
    },
    {
      id: umbrellaRoles.customerReporter,
      organizationId: ORG_IDS.umbrellaCorp,
      name: 'Umbrella Customer Reporter',
      description: 'Files bugs and feature requests',
      isSystem: false,
      createdAt: at(25),
      updatedAt: at(25),
    },
    {
      id: umbrellaRoles.customerStakeholder,
      organizationId: ORG_IDS.umbrellaCorp,
      name: 'Umbrella Customer Stakeholder',
      description: 'Reviews and prioritizes reported items',
      isSystem: false,
      createdAt: at(25),
      updatedAt: at(25),
    },
  );

  return roles;
}

// ---------------------------------------------------------------------------
// Permissions (role → permission key mappings)
// ---------------------------------------------------------------------------

// Full org-scope permission keys
const ALL_ORG_PERMISSION_KEYS = permissionCatalog
  .filter((e) => e.scope === 'organization')
  .map((e) => e.key);

// Full permission keys
const ALL_PERMISSION_KEYS = permissionCatalog.map((e) => e.key);

// Admin-capable org permission keys (owner + admin)
const ADMIN_ORG_PERMISSION_KEYS = [
  'organization.read.org',
  'organization.update.org',
  'organization.delete.org',
  'invitation.create.org',
  'invitation.read.org',
  'invitation.update.org',
  'invitation.delete.org',
  'membership.read.org',
  'membership.update.org',
  'membership.delete.org',
  'role.create.org',
  'role.read.org',
  'role.update.org',
  'role.delete.org',
  'permission.read.org',
  'permission.update.org',
  'project.create.org',
  'project.read.org',
  'project.update.org',
  'project.delete.org',
  'task.create.project',
  'task.read.project',
  'task.update.project',
  'task.delete.project',
  'notification.create.org',
  'notification.read.org',
  'notification.delete.org',
];

// Developer/contributor permission keys
const CONTRIBUTOR_PERMISSION_KEYS = [
  'organization.read.org',
  'membership.read.org',
  'project.read.org',
  'task.create.project',
  'task.read.project',
  'task.update.project',
  'notification.read.org',
];

// Customer reporter permission keys
const REPORTER_PERMISSION_KEYS = [
  'organization.read.org',
  'project.read.org',
  'task.create.project',
  'task.read.project',
  'task.update.project',
  'notification.read.org',
];

// Customer stakeholder permission keys
const STAKEHOLDER_PERMISSION_KEYS = [
  'organization.read.org',
  'project.read.org',
  'task.read.project',
  'notification.read.org',
  'permission.read.org',
];

// Support permission keys
const SUPPORT_PERMISSION_KEYS = [
  'organization.read.org',
  'invitation.read.org',
  'invitation.update.org',
  'membership.read.org',
  'membership.update.org',
  'role.read.org',
  'permission.read.org',
  'project.read.org',
  'project.update.org',
  'task.read.project',
  'task.update.project',
  'notification.read.org',
];

function rolePermissionMap(): Record<string, string[]> {
  const map: Record<string, string[]> = {};

  // Super Admin gets all permissions
  map[GLOBAL_ROLE_IDS.superAdmin] = ALL_PERMISSION_KEYS;

  // TaskForge Agency
  const tf = ORG_ROLE_IDS.taskforgeAgency;
  map[tf.owner] = ALL_ORG_PERMISSION_KEYS;
  map[tf.projectAdmin] = ADMIN_ORG_PERMISSION_KEYS;
  map[tf.backendDev] = CONTRIBUTOR_PERMISSION_KEYS;
  map[tf.frontendDev] = CONTRIBUTOR_PERMISSION_KEYS;
  map[tf.designer] = CONTRIBUTOR_PERMISSION_KEYS;
  map[tf.seoSpecialist] = CONTRIBUTOR_PERMISSION_KEYS;
  map[tf.authFlowManager] = [
    ...CONTRIBUTOR_PERMISSION_KEYS,
    'invitation.read.org',
    'invitation.update.org',
  ];
  map[tf.qaEngineer] = [...CONTRIBUTOR_PERMISSION_KEYS, 'role.read.org', 'permission.read.org'];
  map[tf.devopsSre] = [...CONTRIBUTOR_PERMISSION_KEYS, 'project.update.org'];
  map[tf.supportEngineer] = SUPPORT_PERMISSION_KEYS;
  map[tf.productManager] = [
    ...CONTRIBUTOR_PERMISSION_KEYS,
    'project.update.org',
    'role.read.org',
    'permission.read.org',
  ];

  // Acme Corp
  const ac = ORG_ROLE_IDS.acmeCorp;
  map[ac.owner] = ALL_ORG_PERMISSION_KEYS;
  map[ac.projectAdmin] = ADMIN_ORG_PERMISSION_KEYS;
  map[ac.backendDev] = CONTRIBUTOR_PERMISSION_KEYS;
  map[ac.frontendDev] = CONTRIBUTOR_PERMISSION_KEYS;
  map[ac.designer] = CONTRIBUTOR_PERMISSION_KEYS;
  map[ac.qaEngineer] = [...CONTRIBUTOR_PERMISSION_KEYS, 'role.read.org'];
  map[ac.devopsSre] = [...CONTRIBUTOR_PERMISSION_KEYS, 'project.update.org'];
  map[ac.productManager] = [
    ...CONTRIBUTOR_PERMISSION_KEYS,
    'project.update.org',
    'role.read.org',
    'permission.read.org',
  ];
  map[ac.customerReporter] = REPORTER_PERMISSION_KEYS;
  map[ac.customerStakeholder] = STAKEHOLDER_PERMISSION_KEYS;

  // Globex Inc
  const gl = ORG_ROLE_IDS.globexInc;
  map[gl.owner] = ALL_ORG_PERMISSION_KEYS;
  map[gl.projectAdmin] = ADMIN_ORG_PERMISSION_KEYS;
  map[gl.backendDev] = CONTRIBUTOR_PERMISSION_KEYS;
  map[gl.frontendDev] = CONTRIBUTOR_PERMISSION_KEYS;
  map[gl.designer] = CONTRIBUTOR_PERMISSION_KEYS;
  map[gl.seoSpecialist] = [...CONTRIBUTOR_PERMISSION_KEYS, 'project.update.org'];
  map[gl.productManager] = [
    ...CONTRIBUTOR_PERMISSION_KEYS,
    'project.update.org',
    'role.read.org',
    'permission.read.org',
  ];
  map[gl.customerReporter] = REPORTER_PERMISSION_KEYS;
  map[gl.customerStakeholder] = STAKEHOLDER_PERMISSION_KEYS;

  // Soylent Corp
  const so = ORG_ROLE_IDS.soylentCorp;
  map[so.owner] = ALL_ORG_PERMISSION_KEYS;
  map[so.projectAdmin] = ADMIN_ORG_PERMISSION_KEYS;
  map[so.backendDev] = CONTRIBUTOR_PERMISSION_KEYS;
  map[so.supportEngineer] = SUPPORT_PERMISSION_KEYS;
  map[so.customerReporter] = REPORTER_PERMISSION_KEYS;
  map[so.customerStakeholder] = STAKEHOLDER_PERMISSION_KEYS;

  // Umbrella Corp
  const um = ORG_ROLE_IDS.umbrellaCorp;
  map[um.owner] = ALL_ORG_PERMISSION_KEYS;
  map[um.projectAdmin] = ADMIN_ORG_PERMISSION_KEYS;
  map[um.backendDev] = CONTRIBUTOR_PERMISSION_KEYS;
  map[um.qaEngineer] = [...CONTRIBUTOR_PERMISSION_KEYS, 'role.read.org'];
  map[um.devopsSre] = [...CONTRIBUTOR_PERMISSION_KEYS, 'project.update.org'];
  map[um.customerReporter] = REPORTER_PERMISSION_KEYS;
  map[um.customerStakeholder] = STAKEHOLDER_PERMISSION_KEYS;

  return map;
}

export function buildPermissions(): (typeof schema.permissions.$inferInsert)[] {
  const rolePermMap = rolePermissionMap();
  const permissionByKey = new Map(permissionCatalog.map((entry) => [entry.key, entry]));
  const result: (typeof schema.permissions.$inferInsert)[] = [];
  let permissionIdCounter = 1000;

  for (const [roleId, keys] of Object.entries(rolePermMap)) {
    for (const key of keys) {
      const permission = permissionByKey.get(key);
      if (!permission) {
        throw new Error(`Unknown permission key in role mapping: ${key}`);
      }
      result.push({
        id: id(permissionIdCounter),
        roleId,
        resource: permission.resource,
        action: permission.action,
        scope: permission.scope,
      });
      permissionIdCounter += 1;
    }
  }

  return result;
}

/**
 * Returns the total number of permission rows for metadata.
 * Must be called after buildPermissions() to count accurately.
 */
export function countPermissions(): number {
  const rolePermMap = rolePermissionMap();
  let count = 0;
  for (const keys of Object.values(rolePermMap)) {
    count += keys.length;
  }
  return count;
}

/**
 * Returns the total number of roles for metadata.
 */
export function countRoles(): number {
  return buildRoles().length;
}
