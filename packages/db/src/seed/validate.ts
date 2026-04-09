import {
  activityLog,
  checklistItems,
  checklists,
  commentMentions,
  comments,
  db,
  invitationTargetPermissions,
  invitationTargetRoles,
  invitationTargets,
  invitations,
  notificationPreferences,
  notifications,
  organizationMembers,
  organizations,
  permissionAssignments,
  permissions,
  pool,
  projectMembers,
  projects,
  roleAssignments,
  roles,
  taskDependencies,
  taskWatchers,
  tasks,
  users,
} from '../index.js';
import { SEED_PROFILES, type SeedCounts } from './fixture-metadata.js';
import { type SeedProfile, resolveSeedOptions } from './options.js';

interface PermissionCatalogEntry {
  resource: string;
  action: string;
  scope: 'global' | 'organization';
}

const permissionCatalog: PermissionCatalogEntry[] = [
  { resource: 'organization', action: 'create', scope: 'global' },
  { resource: 'organization', action: 'read', scope: 'organization' },
  { resource: 'organization', action: 'update', scope: 'organization' },
  { resource: 'organization', action: 'delete', scope: 'organization' },
  { resource: 'organization_settings', action: 'read', scope: 'organization' },
  { resource: 'organization_settings', action: 'update', scope: 'organization' },
  { resource: 'organization_auth_settings', action: 'read', scope: 'organization' },
  { resource: 'organization_auth_settings', action: 'update', scope: 'organization' },
  { resource: 'organization_features', action: 'read', scope: 'organization' },
  { resource: 'organization_features', action: 'update', scope: 'organization' },
  { resource: 'invitation', action: 'create', scope: 'organization' },
  { resource: 'invitation', action: 'read', scope: 'organization' },
  { resource: 'invitation', action: 'update', scope: 'organization' },
  { resource: 'invitation', action: 'delete', scope: 'organization' },
  { resource: 'membership', action: 'create', scope: 'organization' },
  { resource: 'membership', action: 'read', scope: 'organization' },
  { resource: 'membership', action: 'update', scope: 'organization' },
  { resource: 'membership', action: 'delete', scope: 'organization' },
  { resource: 'role', action: 'create', scope: 'organization' },
  { resource: 'role', action: 'read', scope: 'organization' },
  { resource: 'role', action: 'update', scope: 'organization' },
  { resource: 'role', action: 'delete', scope: 'organization' },
  { resource: 'permission', action: 'read', scope: 'organization' },
  { resource: 'permission', action: 'update', scope: 'organization' },
  { resource: 'project', action: 'create', scope: 'organization' },
  { resource: 'project', action: 'read', scope: 'organization' },
  { resource: 'project', action: 'update', scope: 'organization' },
  { resource: 'project', action: 'delete', scope: 'organization' },
  { resource: 'task', action: 'create', scope: 'organization' },
  { resource: 'task', action: 'read', scope: 'organization' },
  { resource: 'task', action: 'update', scope: 'organization' },
  { resource: 'task', action: 'delete', scope: 'organization' },
  { resource: 'comment', action: 'create', scope: 'organization' },
  { resource: 'comment', action: 'read', scope: 'organization' },
  { resource: 'comment', action: 'update', scope: 'organization' },
  { resource: 'comment', action: 'delete', scope: 'organization' },
  { resource: 'attachment', action: 'create', scope: 'organization' },
  { resource: 'attachment', action: 'read', scope: 'organization' },
  { resource: 'attachment', action: 'update', scope: 'organization' },
  { resource: 'attachment', action: 'delete', scope: 'organization' },
  { resource: 'notification', action: 'create', scope: 'organization' },
  { resource: 'notification', action: 'read', scope: 'organization' },
  { resource: 'notification', action: 'update', scope: 'organization' },
  { resource: 'notification', action: 'delete', scope: 'organization' },
  { resource: 'global_role_assignment', action: 'create', scope: 'global' },
  { resource: 'global_role_assignment', action: 'read', scope: 'global' },
  { resource: 'global_role_assignment', action: 'update', scope: 'global' },
  { resource: 'global_role_assignment', action: 'delete', scope: 'global' },
];

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

async function countFrom(table: unknown): Promise<number> {
  const queryByTable = new Map<unknown, string>([
    [users, 'users'],
    [organizations, 'organizations'],
    [roles, 'roles'],
    [permissions, 'permissions'],
    [projects, 'projects'],
    [projectMembers, 'project_members'],
    [tasks, 'tasks'],
    [taskDependencies, 'task_dependencies'],
    [taskWatchers, 'task_watchers'],
    [checklists, 'checklists'],
    [checklistItems, 'checklist_items'],
    [comments, 'comments'],
    [commentMentions, 'comment_mentions'],
    [activityLog, 'activity_log'],
    [notificationPreferences, 'notification_preferences'],
    [notifications, 'notifications'],
    [organizationMembers, 'organization_members'],
    [roleAssignments, 'role_assignments'],
    [permissionAssignments, 'permission_assignments'],
    [invitations, 'invitations'],
    [invitationTargets, 'invitation_targets'],
    [invitationTargetRoles, 'invitation_target_roles'],
    [invitationTargetPermissions, 'invitation_target_permissions'],
  ]);

  const tableName = queryByTable.get(table);
  if (!tableName) {
    fail('Unknown table passed to countFrom');
  }

  const [rows] = await pool.query(`SELECT COUNT(*) AS count FROM ${tableName}`);
  const countRow = (rows as Array<{ count: number | string }>)[0];
  return Number(countRow?.count ?? 0);
}

function permissionTuple(resource: string, action: string, scope: string): string {
  return `${resource}:${action}:${scope}`;
}

async function validateDatabaseState(): Promise<void> {
  const options = resolveSeedOptions();
  const profile: SeedProfile = options.profile;
  const expected = SEED_PROFILES[profile];
  if (!expected) {
    fail(`Unknown seed profile '${profile}' — cannot validate.`);
  }

  const counts = {
    users: await countFrom(users),
    organizations: await countFrom(organizations),
    roles: await countFrom(roles),
    permissions: await countFrom(permissions),
    projects: await countFrom(projects),
    projectMembers: await countFrom(projectMembers),
    tasks: await countFrom(tasks),
    taskDependencies: await countFrom(taskDependencies),
    taskWatchers: await countFrom(taskWatchers),
    checklists: await countFrom(checklists),
    checklistItems: await countFrom(checklistItems),
    comments: await countFrom(comments),
    commentMentions: await countFrom(commentMentions),
    activityLog: await countFrom(activityLog),
    notificationPreferences: await countFrom(notificationPreferences),
    notifications: await countFrom(notifications),
    organizationMembers: await countFrom(organizationMembers),
    roleAssignments: await countFrom(roleAssignments),
    permissionAssignments: await countFrom(permissionAssignments),
    invitations: await countFrom(invitations),
    invitationTargets: await countFrom(invitationTargets),
    invitationTargetRoles: await countFrom(invitationTargetRoles),
    invitationTargetPermissions: await countFrom(invitationTargetPermissions),
  };

  assert(counts.users === expected.users, `Expected ${expected.users} users, got ${counts.users}`);
  assert(
    counts.organizations === expected.organizations,
    `Expected ${expected.organizations} organizations, got ${counts.organizations}`,
  );
  assert(counts.roles === expected.roles, `Expected ${expected.roles} roles, got ${counts.roles}`);
  assert(
    counts.permissions === expected.permissions,
    `Expected ${expected.permissions} role permissions, got ${counts.permissions}`,
  );
  assert(
    counts.projects === expected.projects,
    `Expected ${expected.projects} projects, got ${counts.projects}`,
  );
  assert(
    counts.projectMembers === expected.projectMembers,
    `Expected ${expected.projectMembers} project members, got ${counts.projectMembers}`,
  );
  assert(counts.tasks === expected.tasks, `Expected ${expected.tasks} tasks, got ${counts.tasks}`);
  assert(
    counts.taskDependencies === expected.taskDependencies,
    `Expected ${expected.taskDependencies} task dependencies, got ${counts.taskDependencies}`,
  );
  assert(
    counts.taskWatchers === expected.taskWatchers,
    `Expected ${expected.taskWatchers} task watchers, got ${counts.taskWatchers}`,
  );
  assert(
    counts.checklists === expected.checklists,
    `Expected ${expected.checklists} checklists, got ${counts.checklists}`,
  );
  assert(
    counts.checklistItems === expected.checklistItems,
    `Expected ${expected.checklistItems} checklist items, got ${counts.checklistItems}`,
  );
  assert(
    counts.comments === expected.comments,
    `Expected ${expected.comments} comments, got ${counts.comments}`,
  );
  assert(
    counts.commentMentions === expected.commentMentions,
    `Expected ${expected.commentMentions} comment mentions, got ${counts.commentMentions}`,
  );
  assert(
    counts.activityLog === expected.activityLog,
    `Expected ${expected.activityLog} activity entries, got ${counts.activityLog}`,
  );
  assert(
    counts.notificationPreferences === expected.notificationPreferences,
    `Expected ${expected.notificationPreferences} notification preferences, got ${counts.notificationPreferences}`,
  );
  assert(
    counts.notifications === expected.notifications,
    `Expected ${expected.notifications} notifications, got ${counts.notifications}`,
  );
  assert(
    counts.organizationMembers === expected.organizationMembers,
    `Expected ${expected.organizationMembers} organization memberships, got ${counts.organizationMembers}`,
  );
  assert(
    counts.roleAssignments === expected.roleAssignments,
    `Expected ${expected.roleAssignments} role assignments, got ${counts.roleAssignments}`,
  );
  assert(
    counts.permissionAssignments === expected.permissionAssignments,
    `Expected ${expected.permissionAssignments} direct permission assignments, got ${counts.permissionAssignments}`,
  );
  assert(
    counts.invitations === expected.invitations,
    `Expected ${expected.invitations} invitations, got ${counts.invitations}`,
  );
  assert(
    counts.invitationTargets === expected.invitationTargets,
    `Expected ${expected.invitationTargets} invitation targets, got ${counts.invitationTargets}`,
  );
  assert(
    counts.invitationTargetRoles === expected.invitationTargetRoles,
    `Expected ${expected.invitationTargetRoles} invitation target roles, got ${counts.invitationTargetRoles}`,
  );
  assert(
    counts.invitationTargetPermissions === expected.invitationTargetPermissions,
    `Expected ${expected.invitationTargetPermissions} invitation target permissions, got ${counts.invitationTargetPermissions}`,
  );

  const priorityRows = await db.select({ priority: tasks.priority }).from(tasks);
  const distinctPriorities = new Set(priorityRows.map((row) => row.priority));
  assert(
    distinctPriorities.size === 5,
    `Expected 5 distinct priorities, got ${distinctPriorities.size}`,
  );

  const statusRows = await db.select({ statusId: tasks.statusId }).from(tasks);
  const distinctStatuses = new Set(statusRows.map((row) => row.statusId));
  assert(
    distinctStatuses.size >= 6,
    `Expected >=6 distinct workflow statuses, got ${distinctStatuses.size}`,
  );

  const [membershipRows] = await pool.query(
    'SELECT organization_id AS organizationId, COUNT(*) AS memberCount FROM organization_members GROUP BY organization_id',
  );

  const membershipPerOrg = membershipRows as Array<{
    organizationId: string;
    memberCount: number | string;
  }>;
  assert(
    membershipPerOrg.length === 2,
    `Expected memberships in 2 organizations, got ${membershipPerOrg.length}`,
  );

  for (const row of membershipPerOrg) {
    assert(
      Number(row.memberCount) >= 4,
      `Expected at least 4 members in org ${row.organizationId}`,
    );
  }

  const [functionalRoleRows] = await pool.query(
    `SELECT r.id, r.name
     FROM roles r
     WHERE r.organization_id IS NOT NULL
       AND (r.name LIKE '%Member%' OR r.name LIKE '%Viewer%' OR r.name LIKE '%Support%')
       AND NOT EXISTS (
         SELECT 1
         FROM permissions p
         WHERE p.role_id = r.id
           AND p.resource = 'organization'
           AND p.action = 'read'
           AND p.scope = 'organization'
       )`,
  );

  const rolesMissingOrgRead = functionalRoleRows as Array<{ id: string; name: string }>;
  assert(
    rolesMissingOrgRead.length === 0,
    `Expected all Member/Viewer/Support roles to include organization.read.org, missing for: ${rolesMissingOrgRead
      .map((row) => row.name)
      .join(', ')}`,
  );

  const permissionRows = await db
    .select({
      resource: permissions.resource,
      action: permissions.action,
      scope: permissions.scope,
    })
    .from(permissions);

  const actualPermissionTuples = new Set(
    permissionRows.map((row) => permissionTuple(row.resource, row.action, row.scope)),
  );
  const expectedPermissionTuples = new Set(
    permissionCatalog.map((entry) => permissionTuple(entry.resource, entry.action, entry.scope)),
  );

  assert(
    actualPermissionTuples.size === expectedPermissionTuples.size,
    `Expected ${expectedPermissionTuples.size} distinct role permission tuples, got ${actualPermissionTuples.size}`,
  );

  for (const tuple of expectedPermissionTuples) {
    assert(actualPermissionTuples.has(tuple), `Missing expected permission tuple: ${tuple}`);
  }

  for (const tuple of actualPermissionTuples) {
    assert(expectedPermissionTuples.has(tuple), `Unexpected permission tuple: ${tuple}`);
  }

  // RBAC smoke checks (functional fixtures)
  const [memberOrgReadRows] = await pool.query(
    `SELECT COUNT(*) AS count
     FROM role_assignments ra
     INNER JOIN permissions p ON p.role_id = ra.role_id
     WHERE ra.user_id = ?
       AND (ra.organization_id = ? OR ra.organization_id IS NULL)
       AND p.resource = 'organization'
       AND p.action = 'read'
       AND p.scope = 'organization'`,
    ['00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000101'],
  );
  assert(
    Number((memberOrgReadRows as Array<{ count: number | string }>)[0]?.count ?? 0) > 0,
    'Expected member@acme to have organization.read.org via role assignments',
  );

  const [memberOrgDeleteRows] = await pool.query(
    `SELECT COUNT(*) AS count
     FROM role_assignments ra
     INNER JOIN permissions p ON p.role_id = ra.role_id
     WHERE ra.user_id = ?
       AND (ra.organization_id = ? OR ra.organization_id IS NULL)
       AND p.resource = 'organization'
       AND p.action = 'delete'
       AND p.scope = 'organization'`,
    ['00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000101'],
  );
  assert(
    Number((memberOrgDeleteRows as Array<{ count: number | string }>)[0]?.count ?? 0) === 0,
    'Expected member@acme to NOT have organization.delete.org',
  );

  const [supportInviteReadRows] = await pool.query(
    `SELECT COUNT(*) AS count
     FROM role_assignments ra
     INNER JOIN permissions p ON p.role_id = ra.role_id
     WHERE ra.user_id = ?
       AND (ra.organization_id = ? OR ra.organization_id IS NULL)
       AND p.resource = 'invitation'
       AND p.action = 'read'
       AND p.scope = 'organization'`,
    ['00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000101'],
  );
  assert(
    Number((supportInviteReadRows as Array<{ count: number | string }>)[0]?.count ?? 0) > 0,
    'Expected support@taskforge to have invitation.read.org in Acme',
  );

  const [viewerInviteDeleteRows] = await pool.query(
    `SELECT COUNT(*) AS count
     FROM role_assignments ra
     INNER JOIN permissions p ON p.role_id = ra.role_id
     WHERE ra.user_id = ?
       AND (ra.organization_id = ? OR ra.organization_id IS NULL)
       AND p.resource = 'invitation'
       AND p.action = 'delete'
       AND p.scope = 'organization'`,
    ['00000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000101'],
  );
  assert(
    Number((viewerInviteDeleteRows as Array<{ count: number | string }>)[0]?.count ?? 0) === 0,
    'Expected viewer@acme to NOT have invitation.delete.org',
  );

  const [globexAdminTaskReadRows] = await pool.query(
    `SELECT COUNT(*) AS count
     FROM role_assignments ra
     INNER JOIN permissions p ON p.role_id = ra.role_id
     WHERE ra.user_id = ?
       AND (ra.organization_id = ? OR ra.organization_id IS NULL)
       AND p.resource = 'task'
       AND p.action = 'read'
       AND p.scope = 'organization'`,
    ['00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000102'],
  );
  assert(
    Number((globexAdminTaskReadRows as Array<{ count: number | string }>)[0]?.count ?? 0) > 0,
    'Expected admin@globex to have task.read.org via role assignments',
  );

  const [globexMemberTaskReadRows] = await pool.query(
    `SELECT COUNT(*) AS count
     FROM role_assignments ra
     INNER JOIN permissions p ON p.role_id = ra.role_id
     WHERE ra.user_id = ?
       AND (ra.organization_id = ? OR ra.organization_id IS NULL)
       AND p.resource = 'task'
       AND p.action = 'read'
       AND p.scope = 'organization'`,
    ['00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000102'],
  );
  assert(
    Number((globexMemberTaskReadRows as Array<{ count: number | string }>)[0]?.count ?? 0) > 0,
    'Expected member@globex to have task.read.org via role assignments',
  );

  const [directGrantRows] = await pool.query(
    `SELECT COUNT(*) AS count
     FROM permission_assignments
     WHERE user_id = ?
       AND organization_id = ?
       AND permission_key = 'invitation.create.org'`,
    ['00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000101'],
  );
  assert(
    Number((directGrantRows as Array<{ count: number | string }>)[0]?.count ?? 0) === 1,
    'Expected member@globex to have deterministic direct invitation.create.org grant in Acme',
  );

  const [roleGrantRows] = await pool.query(
    `SELECT COUNT(*) AS count
     FROM role_assignments ra
     INNER JOIN permissions p ON p.role_id = ra.role_id
     WHERE ra.user_id = ?
       AND (ra.organization_id = ? OR ra.organization_id IS NULL)
       AND p.resource = 'invitation'
       AND p.action = 'create'
       AND p.scope = 'organization'`,
    ['00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000101'],
  );
  assert(
    Number((roleGrantRows as Array<{ count: number | string }>)[0]?.count ?? 0) === 0,
    'Expected member@globex to gain invitation.create.org only via direct assignment, not role',
  );

  const [superAdminPermissionRows] = await pool.query(
    `SELECT COUNT(*) AS count
     FROM permissions p
     INNER JOIN role_assignments ra ON ra.role_id = p.role_id
     INNER JOIN roles r ON r.id = ra.role_id
     WHERE ra.user_id = ?
       AND ra.organization_id IS NULL
       AND r.name = 'Super Admin'`,
    ['00000000-0000-0000-0000-000000000001'],
  );
  assert(
    Number((superAdminPermissionRows as Array<{ count: number | string }>)[0]?.count ?? 0) ===
      permissionCatalog.length,
    `Expected super admin global assignment to expose all ${permissionCatalog.length} governance permissions`,
  );

  console.log('[seed:validate] Database checks passed.');
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

  const projectSearch = await fetch(`${meiliUrl}/indexes/projects/search`, {
    method: 'POST',
    headers: meiliHeaders(),
    body: JSON.stringify({ q: 'globex', limit: 5 }),
  });

  assert(projectSearch.ok, `Project search request failed with status ${projectSearch.status}`);

  const projectSearchPayload = (await projectSearch.json()) as { hits?: unknown[] };
  assert(
    (projectSearchPayload.hits ?? []).length > 0,
    'Project search returned no results for seeded fixtures',
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
