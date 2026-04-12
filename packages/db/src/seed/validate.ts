/**
 * Seed validation — count checks, super user invariants, permission consistency.
 *
 * Invoked by `pnpm --filter @taskforge/db seed:validate`.
 * Exits non-zero on any invariant failure.
 */

import {
  PERMISSION_KEYS,
  PERMISSION_SET,
  toPermissionKey,
  toPermissionTuple,
} from '@taskforge/shared';
import { db, pool } from '../index.js';
import * as schema from '../schema/index.js';
import { SEED_PROFILES, type SeedCounts } from './fixture-metadata.js';
import { ALL_ORG_IDS, ALL_PROJECT_IDS, ORG_IDS, SUPER_USER_ID } from './id-registry.js';
import { type SeedProfile, resolveSeedOptions } from './options.js';

interface PermissionCatalogEntry {
  resource: string;
  action: string;
  scope: 'global' | 'organization' | 'project';
}

const permissionCatalog: PermissionCatalogEntry[] = PERMISSION_KEYS.map((key) => {
  const { resource, action, scope } = toPermissionTuple(key);
  return { resource, action, scope: scope as PermissionCatalogEntry['scope'] };
});

function fail(message: string): never {
  throw new Error(`[seed:validate] ${message}`);
}

function assert(condition: unknown, message: string): void {
  if (!condition) {
    fail(message);
  }
}

async function waitForDb(retries = 20, delay = 2000): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  fail('Could not connect to database during validation.');
}

async function countTable(tableName: string): Promise<number> {
  const [rows] = await pool.query(`SELECT COUNT(*) AS count FROM ${tableName}`);
  const countRow = (rows as Array<{ count: number | string }>)[0];
  return Number(countRow?.count ?? 0);
}

// ---------------------------------------------------------------------------
// Super user invariant checks
// ---------------------------------------------------------------------------

async function validateSuperUserInvariants(): Promise<void> {
  console.log('[seed:validate] Checking super user invariants...');

  // Invariant 1: Super user exists
  const [superUserRows] = await pool.query(
    'SELECT id, email, display_name FROM users WHERE id = ?',
    [SUPER_USER_ID],
  );
  const superUsers = superUserRows as Array<{ id: string; email: string; display_name: string }>;
  assert(
    superUsers.length === 1,
    `Expected exactly 1 super user with ID ${SUPER_USER_ID}, found ${superUsers.length}`,
  );
  console.log('  ✓ Super user exists');

  // Invariant 2: Super user has full effective permission coverage
  // The super admin role should have ALL permission keys from PERMISSION_KEYS
  const [superAdminPermRows] = await pool.query(
    `SELECT COUNT(DISTINCT CONCAT(p.resource, '.', p.action, '.', p.scope)) AS count
     FROM permissions p
     INNER JOIN role_assignments ra ON ra.role_id = p.role_id
     INNER JOIN roles r ON r.id = ra.role_id
     WHERE ra.user_id = ?
       AND ra.organization_id IS NULL
       AND r.name = 'Super Admin'`,
    [SUPER_USER_ID],
  );
  const superAdminPermCount = Number(
    (superAdminPermRows as Array<{ count: number | string }>)[0]?.count ?? 0,
  );
  assert(
    superAdminPermCount === PERMISSION_KEYS.length,
    `Expected super user to have all ${PERMISSION_KEYS.length} permission keys via Super Admin role, got ${superAdminPermCount}`,
  );
  console.log('  ✓ Super user has full effective permission coverage');

  // Also check each individual permission key is present
  const [superPermKeys] = await pool.query(
    `SELECT DISTINCT CONCAT(p.resource, '.', p.action, '.', p.scope) AS perm_key
     FROM permissions p
     INNER JOIN role_assignments ra ON ra.role_id = p.role_id
     INNER JOIN roles r ON r.id = ra.role_id
     WHERE ra.user_id = ?
       AND ra.organization_id IS NULL
       AND r.name = 'Super Admin'`,
    [SUPER_USER_ID],
  );
  const actualPermKeys = new Set(
    (superPermKeys as Array<{ perm_key: string }>).map((r) => {
      const { resource, action, scope } = toPermissionTuple(r.perm_key);
      return toPermissionKey(resource, action, scope);
    }),
  );
  for (const expectedKey of PERMISSION_KEYS) {
    assert(actualPermKeys.has(expectedKey), `Super user missing permission key: ${expectedKey}`);
  }
  console.log('  ✓ All individual permission keys present for super user');

  // Invariant 3: Super user is a member of every organization
  const [superUserOrgMemberships] = await pool.query(
    'SELECT organization_id FROM organization_members WHERE user_id = ?',
    [SUPER_USER_ID],
  );
  const superUserOrgIds = new Set(
    (superUserOrgMemberships as Array<{ organization_id: string }>).map((r) => r.organization_id),
  );
  assert(
    superUserOrgIds.size === 5,
    `Expected super user to be member of 5 organizations, found ${superUserOrgIds.size}`,
  );
  for (const orgId of ALL_ORG_IDS) {
    assert(superUserOrgIds.has(orgId), `Super user is not a member of organization ${orgId}`);
  }
  console.log('  ✓ Super user is member of all 5 organizations');

  // Invariant 4: Super user is assigned to every project with admin-capable role
  const [superUserProjectMemberships] = await pool.query(
    'SELECT project_id FROM project_members WHERE user_id = ?',
    [SUPER_USER_ID],
  );
  const superUserProjectIds = new Set(
    (superUserProjectMemberships as Array<{ project_id: string }>).map((r) => r.project_id),
  );
  assert(
    superUserProjectIds.size === 22,
    `Expected super user to be assigned to 22 projects, found ${superUserProjectIds.size}`,
  );
  for (const projectId of ALL_PROJECT_IDS) {
    assert(
      superUserProjectIds.has(projectId),
      `Super user is not assigned to project ${projectId}`,
    );
  }

  // Verify admin-capable role on all project memberships
  const [superUserProjectRoles] = await pool.query(
    `SELECT pm.project_id, r.name AS role_name
     FROM project_members pm
     LEFT JOIN roles r ON r.id = pm.role_id
     WHERE pm.user_id = ?`,
    [SUPER_USER_ID],
  );
  const projectRoles = superUserProjectRoles as Array<{
    project_id: string;
    role_name: string | null;
  }>;
  for (const row of projectRoles) {
    const isAdmin = row.role_name?.includes('Admin') || row.role_name?.includes('Owner');
    assert(isAdmin, `Super user project ${row.project_id} has non-admin role: ${row.role_name}`);
  }
  console.log('  ✓ Super user is assigned to all 22 projects with admin-capable role');

  console.log('[seed:validate] All super user invariants passed.\n');
}

// ---------------------------------------------------------------------------
// Permission consistency checks
// ---------------------------------------------------------------------------

async function validatePermissionConsistency(): Promise<void> {
  console.log('[seed:validate] Checking permission consistency...');

  // No permission row uses deprecated/non-canonical tokens
  const [allPermRows] = await pool.query(
    'SELECT DISTINCT resource, action, scope FROM permissions',
  );
  const allPermKeys = (
    allPermRows as Array<{ resource: string; action: string; scope: string }>
  ).map((r) => toPermissionKey(r.resource, r.action, r.scope));

  for (const key of allPermKeys) {
    assert(PERMISSION_SET.has(key), `Seeded permission uses non-canonical key: ${key}`);
  }
  console.log('  ✓ All seeded permission keys are canonical');

  // No permission assignment uses deprecated/non-canonical tokens
  const [allPermAssignments] = await pool.query(
    'SELECT DISTINCT permission_key FROM permission_assignments',
  );
  const allAssignedKeys = (allPermAssignments as Array<{ permission_key: string }>).map(
    (r) => r.permission_key,
  );

  for (const key of allAssignedKeys) {
    assert(PERMISSION_SET.has(key), `Direct permission assignment uses non-canonical key: ${key}`);
  }
  console.log('  ✓ All direct permission assignments use canonical keys');

  // No invitation_target_permissions entry uses a non-canonical key
  const [allInvTargetPerms] = await pool.query(
    'SELECT DISTINCT permission_key FROM invitation_target_permissions',
  );
  const allInvTargetPermKeys = (allInvTargetPerms as Array<{ permission_key: string }>).map(
    (r) => r.permission_key,
  );

  for (const key of allInvTargetPermKeys) {
    assert(PERMISSION_SET.has(key), `Invitation target permission uses non-canonical key: ${key}`);
  }
  console.log('  ✓ All invitation target permissions use canonical keys');

  console.log('[seed:validate] Permission consistency checks passed.\n');
}

// ---------------------------------------------------------------------------
// Org/project ownership invariants
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Task-label project scoping invariant
// ---------------------------------------------------------------------------

async function validateTaskLabelProjectScoping(): Promise<void> {
  console.log('[seed:validate] Checking task-label project scoping...');

  // Every task_labels row must satisfy: task.project_id = label.project_id
  const [mismatchRows] = await pool.query(
    `SELECT COUNT(*) AS count
     FROM task_labels tl
     INNER JOIN tasks t ON t.id = tl.task_id
     INNER JOIN labels l ON l.id = tl.label_id
     WHERE t.project_id <> l.project_id`,
  );
  const mismatchCount = Number((mismatchRows as Array<{ count: number | string }>)[0]?.count ?? 0);
  assert(
    mismatchCount === 0,
    `Found ${mismatchCount} task_labels rows where task.project_id <> label.project_id — labels must belong to the same project as the task`,
  );
  console.log('  ✓ All task_labels rows have matching project_id between task and label');

  console.log('[seed:validate] Task-label project scoping check passed.\n');
}

// ---------------------------------------------------------------------------
// Org/project ownership invariants
// ---------------------------------------------------------------------------

async function validateOwnershipInvariants(): Promise<void> {
  console.log('[seed:validate] Checking ownership invariants...');

  // Every org must have at least one member with an Owner role
  for (const orgId of ALL_ORG_IDS) {
    const [ownerRows] = await pool.query(
      `SELECT COUNT(*) AS count FROM organization_members om
       INNER JOIN roles r ON r.id = om.role_id
       WHERE om.organization_id = ? AND r.name LIKE '%Owner%'`,
      [orgId],
    );
    const ownerCount = Number((ownerRows as Array<{ count: number | string }>)[0]?.count ?? 0);
    assert(ownerCount >= 1, `Expected at least 1 Owner in org ${orgId}, found ${ownerCount}`);
  }
  console.log('  ✓ Every org has at least one Owner role member');

  // Every project must have at least one member with a Project Admin (or Owner/Admin) role
  for (const projectId of ALL_PROJECT_IDS) {
    const [adminRows] = await pool.query(
      `SELECT COUNT(*) AS count FROM project_members pm
       INNER JOIN roles r ON r.id = pm.role_id
       WHERE pm.project_id = ? AND (r.name LIKE '%Admin%' OR r.name LIKE '%Owner%')`,
      [projectId],
    );
    const adminCount = Number((adminRows as Array<{ count: number | string }>)[0]?.count ?? 0);
    assert(
      adminCount >= 1,
      `Expected at least one Admin/Owner role member in project ${projectId}, found ${adminCount}`,
    );
  }
  console.log('  ✓ Every project has at least one Admin/Owner role member');

  // Cross-functional role coverage per org: each functional role that is
  // assigned to users in an org must have a matching role row in that org
  const [orgMemberRoles] = await pool.query(
    `SELECT DISTINCT om.organization_id, r.name
     FROM organization_members om
     INNER JOIN roles r ON r.id = om.role_id
     ORDER BY om.organization_id, r.name`,
  );
  const memberRoleRows = orgMemberRoles as Array<{
    organization_id: string;
    name: string;
  }>;

  for (const row of memberRoleRows) {
    // Verify the role belongs to the same org
    const [roleOrgRows] = await pool.query('SELECT organization_id FROM roles WHERE name = ?', [
      row.name,
    ]);
    const roleOrgIds = (roleOrgRows as Array<{ organization_id: string | null }>).map(
      (r) => r.organization_id,
    );
    assert(
      roleOrgIds.some((oid) => oid === row.organization_id),
      `Role '${row.name}' used in org member for org ${row.organization_id} does not belong to that org`,
    );
  }
  console.log('  ✓ All org member roles belong to their assigned organization');

  console.log('[seed:validate] Ownership invariants passed.\n');
}

// ---------------------------------------------------------------------------
// Database state checks
// ---------------------------------------------------------------------------

async function validateDatabaseState(): Promise<void> {
  const options = resolveSeedOptions();
  const profile: SeedProfile = options.profile;
  const expected = SEED_PROFILES[profile];
  if (!expected) {
    fail(`Unknown seed profile '${profile}' — cannot validate.`);
  }

  const counts: SeedCounts = {
    users: await countTable('users'),
    organizations: await countTable('organizations'),
    organizationAuthSettings: await countTable('organization_auth_settings'),
    roles: await countTable('roles'),
    permissions: await countTable('permissions'),
    organizationMembers: await countTable('organization_members'),
    roleAssignments: await countTable('role_assignments'),
    permissionAssignments: await countTable('permission_assignments'),
    invitations: await countTable('invitations'),
    invitationTargets: await countTable('invitation_targets'),
    invitationTargetRoles: await countTable('invitation_target_roles'),
    invitationTargetPermissions: await countTable('invitation_target_permissions'),
    oauthAccounts: await countTable('oauth_accounts'),
    sessions: await countTable('sessions'),
    verificationTokens: await countTable('verification_tokens'),
    projects: await countTable('projects'),
    workflows: await countTable('workflows'),
    workflowStatuses: await countTable('workflow_statuses'),
    projectMembers: await countTable('project_members'),
    labels: await countTable('labels'),
    tasks: await countTable('tasks'),
    taskLabels: await countTable('task_labels'),
    taskWatchers: await countTable('task_watchers'),
    taskDependencies: await countTable('task_dependencies'),
    checklists: await countTable('checklists'),
    checklistItems: await countTable('checklist_items'),
    comments: await countTable('comments'),
    commentMentions: await countTable('comment_mentions'),
    activityLog: await countTable('activity_log'),
    notificationPreferences: await countTable('notification_preferences'),
    notifications: await countTable('notifications'),
  };

  // Assert core entity counts
  assert(
    counts.organizations === expected.organizations,
    `Expected ${expected.organizations} organizations, got ${counts.organizations}`,
  );
  assert(
    counts.projects === expected.projects,
    `Expected ${expected.projects} projects, got ${counts.projects}`,
  );
  assert(counts.users === expected.users, `Expected ${expected.users} users, got ${counts.users}`);
  assert(counts.tasks === expected.tasks, `Expected ${expected.tasks} tasks, got ${counts.tasks}`);
  assert(
    counts.comments === expected.comments,
    `Expected ${expected.comments} comments, got ${counts.comments}`,
  );
  assert(
    counts.notifications === expected.notifications,
    `Expected ${expected.notifications} notifications, got ${counts.notifications}`,
  );
  assert(
    counts.taskWatchers === expected.taskWatchers,
    `Expected ${expected.taskWatchers} task watchers, got ${counts.taskWatchers}`,
  );
  assert(
    counts.taskDependencies === expected.taskDependencies,
    `Expected ${expected.taskDependencies} task dependencies, got ${counts.taskDependencies}`,
  );

  // Assert task variety
  const priorityRows = await db.select({ priority: schema.tasks.priority }).from(schema.tasks);
  const distinctPriorities = new Set(priorityRows.map((row) => row.priority));
  assert(
    distinctPriorities.size === 5,
    `Expected 5 distinct priorities, got ${distinctPriorities.size}`,
  );

  const statusRows = await db.select({ statusId: schema.tasks.statusId }).from(schema.tasks);
  const distinctStatuses = new Set(statusRows.map((row) => row.statusId));
  assert(
    distinctStatuses.size >= 6,
    `Expected >=6 distinct workflow statuses, got ${distinctStatuses.size}`,
  );

  // Assert every org has at least 1 owner
  const [membershipRows] = await pool.query(
    'SELECT organization_id AS organizationId, COUNT(*) AS memberCount FROM organization_members GROUP BY organization_id',
  );
  const membershipPerOrg = membershipRows as Array<{
    organizationId: string;
    memberCount: number | string;
  }>;
  assert(
    membershipPerOrg.length === 5,
    `Expected memberships in 5 organizations, got ${membershipPerOrg.length}`,
  );

  for (const row of membershipPerOrg) {
    assert(
      Number(row.memberCount) >= 4,
      `Expected at least 4 members in org ${row.organizationId}`,
    );
  }

  // Assert every project has at least 1 member
  const [projectMemberRows] = await pool.query(
    'SELECT project_id AS projectId, COUNT(*) AS memberCount FROM project_members GROUP BY project_id',
  );
  const membershipPerProject = projectMemberRows as Array<{
    projectId: string;
    memberCount: number | string;
  }>;
  assert(
    membershipPerProject.length === 22,
    `Expected members in 22 projects, got ${membershipPerProject.length}`,
  );

  for (const row of membershipPerProject) {
    assert(Number(row.memberCount) >= 1, `Expected at least 1 member in project ${row.projectId}`);
  }

  // Assert customer reporter/stakeholder users exist in each customer org
  const customerOrgIds = [
    ORG_IDS.acmeCorp,
    ORG_IDS.globexInc,
    ORG_IDS.soylentCorp,
    ORG_IDS.umbrellaCorp,
  ];
  for (const orgId of customerOrgIds) {
    const [reporterRows] = await pool.query(
      `SELECT COUNT(*) AS count FROM organization_members om
       INNER JOIN roles r ON r.id = om.role_id
       WHERE om.organization_id = ? AND r.name LIKE '%Customer Reporter%'`,
      [orgId],
    );
    const reporterCount = Number(
      (reporterRows as Array<{ count: number | string }>)[0]?.count ?? 0,
    );
    assert(
      reporterCount >= 1,
      `Expected at least 1 Customer Reporter in org ${orgId}, got ${reporterCount}`,
    );

    const [stakeholderRows] = await pool.query(
      `SELECT COUNT(*) AS count FROM organization_members om
       INNER JOIN roles r ON r.id = om.role_id
       WHERE om.organization_id = ? AND r.name LIKE '%Customer Stakeholder%'`,
      [orgId],
    );
    const stakeholderCount = Number(
      (stakeholderRows as Array<{ count: number | string }>)[0]?.count ?? 0,
    );
    assert(
      stakeholderCount >= 1,
      `Expected at least 1 Customer Stakeholder in org ${orgId}, got ${stakeholderCount}`,
    );
  }

  // Permission tuple consistency
  const permissionRows = await db
    .select({
      resource: schema.permissions.resource,
      action: schema.permissions.action,
      scope: schema.permissions.scope,
    })
    .from(schema.permissions);

  function permissionTuple(resource: string, action: string, scope: string): string {
    return `${resource}:${action}:${scope}`;
  }

  const actualPermissionTuples = new Set(
    permissionRows.map((row) => permissionTuple(row.resource, row.action, row.scope)),
  );
  const expectedPermissionTuples = new Set(
    permissionCatalog.map((entry) => permissionTuple(entry.resource, entry.action, entry.scope)),
  );

  for (const tuple of expectedPermissionTuples) {
    assert(actualPermissionTuples.has(tuple), `Missing expected permission tuple: ${tuple}`);
  }

  for (const tuple of actualPermissionTuples) {
    assert(expectedPermissionTuples.has(tuple), `Unexpected permission tuple: ${tuple}`);
  }

  console.log('[seed:validate] Database state checks passed.');
}

function meiliHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.MEILISEARCH_MASTER_KEY ?? 'taskforge_dev_key'}`,
    'Content-Type': 'application/json',
  };
}

async function waitForSearchDocumentCount(
  baseUrl: string,
  indexName: string,
  minCount: number,
  timeoutMs = 30_000,
): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const response = await fetch(`${baseUrl}/indexes/${indexName}/stats`, {
      headers: meiliHeaders(),
    });

    if (response.ok) {
      const payload = (await response.json()) as { numberOfDocuments?: number };
      const documentCount = payload.numberOfDocuments ?? 0;
      if (documentCount >= minCount) {
        return;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  fail(
    `Timed out waiting for Meilisearch index '${indexName}' to contain at least ${minCount} documents.`,
  );
}

async function validateMeilisearch(expectedCounts: SeedCounts): Promise<void> {
  const meiliUrl = process.env.MEILISEARCH_URL ?? 'http://localhost:7700';

  const healthResponse = await fetch(`${meiliUrl}/health`);
  assert(healthResponse.ok, `Meilisearch health endpoint returned status ${healthResponse.status}`);

  const healthPayload = (await healthResponse.json()) as { status?: string };
  assert(healthPayload.status === 'available', 'Meilisearch is not available');

  await waitForSearchDocumentCount(meiliUrl, 'tasks', expectedCounts.tasks);
  await waitForSearchDocumentCount(meiliUrl, 'projects', expectedCounts.projects);
  await waitForSearchDocumentCount(meiliUrl, 'comments', expectedCounts.comments);

  const taskSearch = await fetch(`${meiliUrl}/indexes/tasks/search`, {
    method: 'POST',
    headers: meiliHeaders(),
    body: JSON.stringify({ q: 'launch', limit: 5 }),
  });

  assert(taskSearch.ok, `Task search request failed with status ${taskSearch.status}`);

  const taskSearchPayload = (await taskSearch.json()) as { hits?: unknown[] };
  assert(
    (taskSearchPayload.hits ?? []).length > 0,
    'Task search returned no results for seeded fixtures',
  );

  console.log('[seed:validate] Meilisearch checks passed.');
}

async function main(): Promise<void> {
  const options = resolveSeedOptions();
  const expected = SEED_PROFILES[options.profile];
  if (!expected) {
    fail(`Unknown seed profile '${options.profile}' — cannot validate.`);
  }

  await waitForDb();
  await validateDatabaseState();
  await validateSuperUserInvariants();
  await validatePermissionConsistency();
  await validateOwnershipInvariants();
  await validateTaskLabelProjectScoping();

  if (options.skipReindex) {
    console.log('[seed:validate] Skipping Meilisearch validation (SEED_SKIP_REINDEX=1).');
  } else {
    await validateMeilisearch(expected);
  }

  console.log('[seed:validate] All validation checks passed.');
}

void main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
