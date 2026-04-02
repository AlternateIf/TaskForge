import {
  activityLog,
  checklistItems,
  checklists,
  commentMentions,
  comments,
  db,
  notificationPreferences,
  notifications,
  organizationMembers,
  organizations,
  permissions,
  pool,
  projects,
  roles,
  taskDependencies,
  taskWatchers,
  tasks,
  users,
} from '../index.js';

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
  const counts = {
    users: await countFrom(users),
    organizations: await countFrom(organizations),
    roles: await countFrom(roles),
    permissions: await countFrom(permissions),
    projects: await countFrom(projects),
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
  };

  assert(counts.users === 8, `Expected 8 users, got ${counts.users}`);
  assert(counts.organizations === 2, `Expected 2 organizations, got ${counts.organizations}`);
  assert(counts.roles === 8, `Expected 8 roles, got ${counts.roles}`);
  assert(counts.permissions === 115, `Expected 115 role permissions, got ${counts.permissions}`);
  assert(counts.projects === 4, `Expected 4 projects, got ${counts.projects}`);
  assert(counts.tasks === 15, `Expected 15 tasks, got ${counts.tasks}`);
  assert(
    counts.taskDependencies === 3,
    `Expected 3 task dependencies, got ${counts.taskDependencies}`,
  );
  assert(counts.taskWatchers === 8, `Expected 8 task watchers, got ${counts.taskWatchers}`);
  assert(counts.checklists === 3, `Expected 3 checklists, got ${counts.checklists}`);
  assert(counts.checklistItems === 5, `Expected 5 checklist items, got ${counts.checklistItems}`);
  assert(counts.comments === 6, `Expected 6 comments, got ${counts.comments}`);
  assert(
    counts.commentMentions === 3,
    `Expected 3 comment mentions, got ${counts.commentMentions}`,
  );
  assert(counts.activityLog === 6, `Expected 6 activity entries, got ${counts.activityLog}`);
  assert(
    counts.notificationPreferences === 4,
    `Expected 4 notification preferences, got ${counts.notificationPreferences}`,
  );
  assert(counts.notifications === 4, `Expected 4 notifications, got ${counts.notifications}`);
  assert(
    counts.organizationMembers === 9,
    `Expected 9 organization memberships, got ${counts.organizationMembers}`,
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
    `Expected ${expectedPermissionTuples.size} distinct governance permission tuples, got ${actualPermissionTuples.size}`,
  );

  for (const tuple of expectedPermissionTuples) {
    assert(actualPermissionTuples.has(tuple), `Missing governance permission tuple: ${tuple}`);
  }

  for (const tuple of actualPermissionTuples) {
    assert(expectedPermissionTuples.has(tuple), `Unexpected governance permission tuple: ${tuple}`);
  }

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

async function validateMeilisearch(): Promise<void> {
  const meiliUrl = process.env.MEILISEARCH_URL ?? 'http://localhost:7700';

  const healthResponse = await fetch(`${meiliUrl}/health`);
  assert(healthResponse.ok, `Meilisearch health endpoint returned status ${healthResponse.status}`);

  const healthPayload = (await healthResponse.json()) as { status?: string };
  assert(healthPayload.status === 'available', 'Meilisearch is not available');

  await waitForSearchDocumentCount(meiliUrl, 'tasks', 15);
  await waitForSearchDocumentCount(meiliUrl, 'projects', 4);
  await waitForSearchDocumentCount(meiliUrl, 'comments', 6);

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
  await waitForDb();
  await validateDatabaseState();
  await validateMeilisearch();
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
