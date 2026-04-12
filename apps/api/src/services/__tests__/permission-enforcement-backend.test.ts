import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Permission Enforcement Backend Tests
 *
 * Covers permission gates for zero/low-coverage permissions:
 * - membership.delete.org      (organization.service.ts:removeMember)
 * - role.create.org            (rbac.service.ts:createRole)
 * - permission.read.org        (rbac.service.ts:listPermissionAssignments)
 * - project.create.org         (project.service.ts:createProject)
 * - project.read.org           (project.service.ts:listProjects)
 * - project.update.org         (project.service.ts:updateProject/archiveProject/deleteProject)
 * - notification.read.org      (notification.service.ts:listNotifications/markAsRead/markAllAsRead)
 * - task.create.project        (task.service.ts:createTask/createSubtask)
 * - task.update.project        (task.service.ts:updateTask/assignTask)
 *
 * Plus allow-path coverage for low-coverage permissions:
 * - organization.delete.org    (organization.service.ts:deleteOrganization)
 * - invitation.create.org     (invitation.service.ts:createInvitation)
 * - role.update.org           (rbac.service.ts:updateRole)
 * - role.delete.org           (rbac.service.ts:deleteRole)
 * - permission.update.org      (rbac.service.ts:deletePermissionAssignment via actorHasPermissionKey)
 */

// ─── Shared Mock Setup ─────────────────────────────────────────────────────────

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockTransaction = vi.fn();
const mockHasOrgPermission = vi.fn();
const mockActivityLog = vi.fn();
const mockPublish = vi.fn();

vi.mock('@taskforge/db', () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    transaction: mockTransaction,
  },
  organizations: {
    id: 'organizations.id',
    name: 'organizations.name',
    slug: 'organizations.slug',
    logoUrl: 'organizations.logoUrl',
    settings: 'organizations.settings',
    trialExpiresAt: 'organizations.trialExpiresAt',
    deletedAt: 'organizations.deletedAt',
    createdAt: 'organizations.createdAt',
    updatedAt: 'organizations.updatedAt',
  },
  organizationMembers: {
    id: 'organizationMembers.id',
    organizationId: 'organizationMembers.organizationId',
    userId: 'organizationMembers.userId',
    roleId: 'organizationMembers.roleId',
    joinedAt: 'organizationMembers.joinedAt',
    createdAt: 'organizationMembers.createdAt',
    updatedAt: 'organizationMembers.updatedAt',
  },
  roleAssignments: {
    id: 'roleAssignments.id',
    userId: 'roleAssignments.userId',
    roleId: 'roleAssignments.roleId',
    organizationId: 'roleAssignments.organizationId',
    assignedByUserId: 'roleAssignments.assignedByUserId',
  },
  roles: {
    id: 'roles.id',
    name: 'roles.name',
    organizationId: 'roles.organizationId',
    description: 'roles.description',
    isSystem: 'roles.isSystem',
    createdAt: 'roles.createdAt',
    updatedAt: 'roles.updatedAt',
  },
  projects: {
    id: 'projects.id',
    organizationId: 'projects.organizationId',
    name: 'projects.name',
    slug: 'projects.slug',
    description: 'projects.description',
    color: 'projects.color',
    icon: 'projects.icon',
    status: 'projects.status',
    createdBy: 'projects.createdBy',
    createdAt: 'projects.createdAt',
    updatedAt: 'projects.updatedAt',
    deletedAt: 'projects.deletedAt',
  },
  projectMembers: {
    id: 'projectMembers.id',
    projectId: 'projectMembers.projectId',
    userId: 'projectMembers.userId',
    roleId: 'projectMembers.roleId',
  },
  tasks: {
    id: 'tasks.id',
    projectId: 'tasks.projectId',
    statusId: 'tasks.statusId',
    title: 'tasks.title',
    description: 'tasks.description',
    priority: 'tasks.priority',
    assigneeId: 'tasks.assigneeId',
    reporterId: 'tasks.reporterId',
    parentTaskId: 'tasks.parentTaskId',
    dueDate: 'tasks.dueDate',
    startDate: 'tasks.startDate',
    estimatedHours: 'tasks.estimatedHours',
    position: 'tasks.position',
    createdAt: 'tasks.createdAt',
    updatedAt: 'tasks.updatedAt',
    deletedAt: 'tasks.deletedAt',
  },
  workflowStatuses: {
    id: 'workflowStatuses.id',
    workflowId: 'workflowStatuses.workflowId',
    name: 'workflowStatuses.name',
    color: 'workflowStatuses.color',
    position: 'workflowStatuses.position',
    isInitial: 'workflowStatuses.isInitial',
    isFinal: 'workflowStatuses.isFinal',
    createdAt: 'workflowStatuses.createdAt',
  },
  workflows: {
    id: 'workflows.id',
    projectId: 'workflows.projectId',
    name: 'workflows.name',
    isDefault: 'workflows.isDefault',
    createdAt: 'workflows.createdAt',
    updatedAt: 'workflows.updatedAt',
  },
  users: {
    id: 'users.id',
    email: 'users.email',
    displayName: 'users.displayName',
    avatarUrl: 'users.avatarUrl',
    deletedAt: 'users.deletedAt',
  },
  permissions: {
    id: 'permissions.id',
    roleId: 'permissions.roleId',
    resource: 'permissions.resource',
    action: 'permissions.action',
    scope: 'permissions.scope',
  },
  permissionAssignments: {
    id: 'permissionAssignments.id',
    userId: 'permissionAssignments.userId',
    organizationId: 'permissionAssignments.organizationId',
    permissionKey: 'permissionAssignments.permissionKey',
    assignedByUserId: 'permissionAssignments.assignedByUserId',
  },
  invitations: {
    id: 'invitations.id',
    inviterOrgId: 'invitations.inviterOrgId',
    invitedByUserId: 'invitations.invitedByUserId',
    email: 'invitations.email',
    tokenHash: 'invitations.tokenHash',
    status: 'invitations.status',
    allowedAuthMethods: 'invitations.allowedAuthMethods',
    sentAt: 'invitations.sentAt',
    expiresAt: 'invitations.expiresAt',
    acceptedAt: 'invitations.acceptedAt',
    revokedAt: 'invitations.revokedAt',
    consumedByUserId: 'invitations.consumedByUserId',
    createdAt: 'invitations.createdAt',
    updatedAt: 'invitations.updatedAt',
  },
  invitationTargets: {
    id: 'invitationTargets.id',
    invitationId: 'invitationTargets.invitationId',
    organizationId: 'invitationTargets.organizationId',
  },
  invitationTargetPermissions: {
    invitationTargetId: 'invitationTargetPermissions.invitationTargetId',
    permissionKey: 'invitationTargetPermissions.permissionKey',
  },
  invitationTargetRoles: {
    invitationTargetId: 'invitationTargetRoles.invitationTargetId',
    roleId: 'invitationTargetRoles.roleId',
  },
  notifications: {
    id: 'notifications.id',
    userId: 'notifications.userId',
    type: 'notifications.type',
    title: 'notifications.title',
    body: 'notifications.body',
    entityType: 'notifications.entityType',
    entityId: 'notifications.entityId',
    readAt: 'notifications.readAt',
    createdAt: 'notifications.createdAt',
  },
  notificationPreferences: {
    id: 'notificationPreferences.id',
    userId: 'notificationPreferences.userId',
    eventType: 'notificationPreferences.eventType',
    channel: 'notificationPreferences.channel',
    enabled: 'notificationPreferences.enabled',
  },
  taskWatchers: {
    id: 'taskWatchers.id',
    taskId: 'taskWatchers.taskId',
    userId: 'taskWatchers.userId',
  },
  taskLabels: {
    id: 'taskLabels.id',
    taskId: 'taskLabels.taskId',
    labelId: 'taskLabels.labelId',
  },
  labels: {
    id: 'labels.id',
    projectId: 'labels.projectId',
    name: 'labels.name',
    color: 'labels.color',
  },
  checklists: {
    id: 'checklists.id',
    taskId: 'checklists.taskId',
  },
  checklistItems: {
    id: 'checklistItems.id',
    checklistId: 'checklistItems.checklistId',
    isCompleted: 'checklistItems.isCompleted',
  },
  organizationAuthSettings: {
    id: 'organizationAuthSettings.id',
    organizationId: 'organizationAuthSettings.organizationId',
    passwordAuthEnabled: 'organizationAuthSettings.passwordAuthEnabled',
    googleOauthEnabled: 'organizationAuthSettings.googleOauthEnabled',
    githubOauthEnabled: 'organizationAuthSettings.githubOauthEnabled',
  },
  oauthAccounts: {
    id: 'oauthAccounts.id',
    userId: 'oauthAccounts.userId',
    provider: 'oauthAccounts.provider',
    providerUserId: 'oauthAccounts.providerUserId',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a: unknown, b: unknown) => ({ _type: 'eq', a, b })),
  and: vi.fn((...args: unknown[]) => ({ _type: 'and', args })),
  or: vi.fn((...args: unknown[]) => ({ _type: 'or', args })),
  isNull: vi.fn((a: unknown) => ({ _type: 'isNull', a })),
  inArray: vi.fn((a: unknown, b: unknown[]) => ({ _type: 'inArray', a, b })),
  not: vi.fn((a: unknown) => ({ _type: 'not', a })),
  desc: vi.fn((col: unknown) => ({ _type: 'desc', col })),
  lt: vi.fn((a: unknown, b: unknown) => ({ _type: 'lt', a, b })),
  lte: vi.fn((a: unknown, b: unknown) => ({ _type: 'lte', a, b })),
  gte: vi.fn((a: unknown, b: unknown) => ({ _type: 'gte', a, b })),
  count: vi.fn((col: unknown) => ({ _type: 'count', col })),
  sql: Object.assign(
    vi.fn(() => ({ _type: 'sql' })),
    { raw: vi.fn(() => ({ _type: 'sql' })) },
  ),
}));

vi.mock('../permission.service.js', () => ({
  hasOrgPermission: (...args: unknown[]) => mockHasOrgPermission(...args),
  loadPermissionContext: vi.fn(),
}));

vi.mock('../activity.service.js', () => ({
  log: mockActivityLog,
}));

vi.mock('../../queues/publisher.js', () => ({
  publish: mockPublish,
}));

vi.mock('../dependency.service.js', () => ({
  computeBlockedStatus: vi.fn().mockResolvedValue({ isBlocked: false, blockedByCount: 0 }),
  createDependency: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../search.service.js', () => ({
  indexTask: vi.fn().mockResolvedValue(undefined),
  indexProject: vi.fn().mockResolvedValue(undefined),
  indexComment: vi.fn().mockResolvedValue(undefined),
  removeTask: vi.fn().mockResolvedValue(undefined),
  removeProject: vi.fn().mockResolvedValue(undefined),
  removeComment: vi.fn().mockResolvedValue(undefined),
  initIndexes: vi.fn().mockResolvedValue(undefined),
}));

// Re-seedable crypto mock - resetAllMocks clears these so we need a helper
const mockCryptoUUID = vi.fn().mockReturnValue('generated-uuid');
const mockCryptoRandomBytes = vi
  .fn()
  .mockImplementation(() => ({ toString: (_encoding?: string) => 'deadbeef' }));
const mockCryptoCreateHash = vi.fn().mockReturnValue({
  update: vi.fn().mockReturnValue({ digest: vi.fn().mockReturnValue('hashedtoken') }),
});

function reseedCryptoMocks() {
  mockCryptoUUID.mockReturnValue('generated-uuid');
  mockCryptoRandomBytes.mockImplementation(() => ({
    toString: (_encoding?: string) => 'deadbeef',
  }));
  mockCryptoCreateHash.mockReturnValue({
    update: vi.fn().mockReturnValue({ digest: vi.fn().mockReturnValue('hashedtoken') }),
  });
}

vi.mock('node:crypto', () => ({
  default: {
    randomUUID: mockCryptoUUID,
    randomBytes: mockCryptoRandomBytes,
    createHash: mockCryptoCreateHash,
  },
}));

// ─── Helper Functions ──────────────────────────────────────────────────────────

function createThenableChain(chain: Record<string, ReturnType<typeof vi.fn>>, result: unknown) {
  const thenable = Object.assign(() => {}, chain) as unknown as Record<
    string,
    ReturnType<typeof vi.fn>
  > & {
    then: (resolve: (value: unknown) => unknown) => Promise<unknown>;
  };
  // biome-ignore lint/suspicious/noThenProperty: test mock needs thenable for Drizzle query chain resolution
  thenable.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return thenable;
}

function setupSelectLimit(result: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    innerJoin: vi.fn(),
    leftJoin: vi.fn(),
    groupBy: vi.fn(),
    orderBy: vi.fn(),
  };
  mockSelect.mockReturnValueOnce(chain);
  chain.from.mockReturnValue(chain);
  // where() must return chain to support .where().limit() pattern
  chain.where.mockReturnValue(chain);
  chain.limit.mockResolvedValue(result);
  chain.innerJoin.mockReturnValue(chain);
  chain.leftJoin.mockReturnValue(chain);
  chain.groupBy.mockReturnValue(chain);
  chain.orderBy.mockReturnValue(chain);
  return chain;
}

function setupSelectFieldWhereLimit(result: unknown) {
  // For db.select({ field }).from(table).where().limit(1)
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    innerJoin: vi.fn(),
    leftJoin: vi.fn(),
    groupBy: vi.fn(),
    orderBy: vi.fn(),
  };
  mockSelect.mockReturnValueOnce(chain);
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.limit.mockResolvedValue(result);
  chain.innerJoin.mockReturnValue(chain);
  chain.leftJoin.mockReturnValue(chain);
  chain.groupBy.mockReturnValue(chain);
  chain.orderBy.mockReturnValue(chain);
  return chain;
}

function setupSelectWhere(result: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    innerJoin: vi.fn(),
    leftJoin: vi.fn(),
    groupBy: vi.fn(),
    orderBy: vi.fn(),
  };
  mockSelect.mockReturnValueOnce(chain);
  chain.from.mockReturnValue(chain);
  chain.where.mockImplementation(() => createThenableChain(chain, result));
  chain.limit.mockResolvedValue(result);
  chain.innerJoin.mockReturnValue(chain);
  chain.leftJoin.mockReturnValue(chain);
  // groupBy returns chain but we need to make the final await resolve to result
  chain.groupBy.mockImplementation(() => createThenableChain(chain, result));
  chain.orderBy.mockReturnValue(chain);
  return chain;
}

function setupSelectWithSql(result: unknown) {
  // For queries like db.select({ maxPos: sql`MAX(...)` }).from(...).where(...)
  // where .where() is the final chain call (no .limit())
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    innerJoin: vi.fn(),
    leftJoin: vi.fn(),
    groupBy: vi.fn(),
    orderBy: vi.fn(),
  };
  mockSelect.mockReturnValueOnce(chain);
  chain.from.mockReturnValue(chain);
  chain.where.mockImplementation(() => createThenableChain(chain, result));
  chain.limit.mockResolvedValue(result);
  chain.innerJoin.mockReturnValue(chain);
  chain.leftJoin.mockReturnValue(chain);
  chain.groupBy.mockReturnValue(chain);
  chain.orderBy.mockReturnValue(chain);
  return chain;
}

function setupInsertChain() {
  const chain = {
    values: vi.fn().mockResolvedValue(undefined),
  };
  mockInsert.mockReturnValueOnce(chain);
  return chain;
}

function setupUpdateChain() {
  const chain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  };
  mockUpdate.mockReturnValueOnce(chain);
  chain.set.mockReturnValue(chain);
  return chain;
}

function setupDeleteChain() {
  const chain = {
    where: vi.fn().mockResolvedValue(undefined),
  };
  mockDelete.mockReturnValueOnce(chain);
  return chain;
}

function setupTransactionMock() {
  const txDeleteChain = { where: vi.fn().mockResolvedValue(undefined) };
  const txUpdateChain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  };
  txUpdateChain.set.mockReturnValue(txUpdateChain);
  const txInsertChain = { values: vi.fn().mockResolvedValue(undefined) };
  const txSelectChain = {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      }),
    }),
  };
  const tx = {
    delete: vi.fn().mockReturnValue(txDeleteChain),
    update: vi.fn().mockReturnValue(txUpdateChain),
    insert: vi.fn().mockReturnValue(txInsertChain),
    select: vi.fn().mockReturnValue(txSelectChain),
  };
  mockTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<void>) => {
    await callback(tx);
  });
  return { txDeleteChain, txUpdateChain, txInsertChain };
}

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const orgId = '00000000-0000-0000-0000-000000000001';
const userId = '00000000-0000-0000-0000-000000000002';
const projectId = '00000000-0000-0000-0000-000000000003';

// ─── Tests ───────────────────────────────────────────────────────────────────────

describe('Permission: membership.delete.org', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    reseedCryptoMocks();
    mockHasOrgPermission.mockResolvedValue(true);
  });

  it('should deny action when user lacks membership.delete.org', async () => {
    // requireMembership lookup
    setupSelectWhere([{ id: orgId }]);
    mockHasOrgPermission.mockResolvedValueOnce(false);

    const { removeMember } = await import('../organization.service.js');
    await expect(removeMember(orgId, userId, 'member-to-remove')).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Insufficient permissions to remove members from this organization',
    });
  });

  it('should allow action when user has membership.delete.org', async () => {
    // requireMembership lookup
    setupSelectWhere([{ id: orgId }]);
    // membership.delete.org check
    mockHasOrgPermission.mockResolvedValueOnce(true);
    // Member lookup
    setupSelectWhere([
      {
        id: 'member-to-remove',
        organizationId: orgId,
        userId: 'target-user',
        roleId: 'role-1',
        joinedAt: new Date(),
      },
    ]);
    // All members lookup for last-admin check
    setupSelectWhere([{ userId: 'target-user' }, { userId: 'other-admin' }]);
    mockHasOrgPermission
      .mockResolvedValueOnce(true) // membership.delete check
      .mockResolvedValueOnce(true) // other-admin has org.update → not last admin
      .mockResolvedValueOnce(true); // target-user has org.update → skip last-admin guard
    // Member user displayName lookup
    setupSelectWhere([{ displayName: 'Target User' }]);
    // Org projects lookup for cascade cleanup
    setupSelectWhere([{ id: 'project-1' }, { id: 'project-2' }]);
    // Transaction wraps all delete operations
    const { txDeleteChain } = setupTransactionMock();

    const { removeMember } = await import('../organization.service.js');
    await removeMember(orgId, userId, 'member-to-remove');

    expect(mockHasOrgPermission).toHaveBeenCalledWith(userId, orgId, 'membership', 'delete');
    expect(txDeleteChain.where).toHaveBeenCalled();
  });
});

describe('Permission: role.create.org', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    reseedCryptoMocks();
    mockHasOrgPermission.mockResolvedValue(true);
  });

  it('should deny action when user lacks role.create.org', async () => {
    mockHasOrgPermission.mockResolvedValueOnce(false);

    const rbacService = await import('../rbac.service.js');
    await expect(
      rbacService.createRole(userId, {
        name: 'New Role',
        organizationId: orgId,
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Insufficient permissions to create roles in this organization',
    });
  });

  it('should allow action when user has role.create.org', async () => {
    mockHasOrgPermission.mockResolvedValue(true);
    // Insert role
    setupInsertChain();
    // Post-insert role re-fetch: db.select().from(roles).where(...).limit(1)
    setupSelectLimit([
      {
        id: 'generated-uuid',
        name: 'New Role',
        organizationId: orgId,
        description: null,
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const rbacService = await import('../rbac.service.js');
    const result = await rbacService.createRole(userId, {
      name: 'New Role',
      organizationId: orgId,
    });

    expect(mockHasOrgPermission).toHaveBeenCalledWith(userId, orgId, 'role', 'create');
    expect(result.name).toBe('New Role');
  });
});

describe('Permission: permission.read.org', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    reseedCryptoMocks();
    mockHasOrgPermission.mockResolvedValue(true);
  });

  it('should deny action when user lacks permission.read.org', async () => {
    mockHasOrgPermission.mockResolvedValueOnce(false);

    const rbacService = await import('../rbac.service.js');
    await expect(rbacService.listPermissionAssignments(orgId, 'target-user')).rejects.toMatchObject(
      {
        statusCode: 403,
        code: 'FORBIDDEN',
        message: 'Insufficient permissions to list permission assignments in this organization',
      },
    );
  });

  it('should allow action when user has permission.read.org', async () => {
    mockHasOrgPermission.mockResolvedValue(true);
    // listPermissionAssignments does db.select().from(permissionAssignments).where(...)
    setupSelectWhere([
      {
        id: 'perm-1',
        userId: 'target-user',
        organizationId: orgId,
        permissionKey: 'task.read.project',
      },
    ]);

    const rbacService = await import('../rbac.service.js');
    const result = await rbacService.listPermissionAssignments(orgId, 'target-user');

    expect(mockHasOrgPermission).toHaveBeenCalledWith('target-user', orgId, 'permission', 'read');
    expect(result).toHaveLength(1);
  });
});

describe('Permission: project.create.org', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    reseedCryptoMocks();
    mockHasOrgPermission.mockResolvedValue(true);
  });

  it('should deny action when user lacks project.create.org', async () => {
    mockHasOrgPermission.mockResolvedValueOnce(false);

    const { createProject } = await import('../project.service.js');
    await expect(createProject(orgId, userId, { name: 'New Project' })).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Insufficient permissions to create projects in this organization',
    });
  });

  it('should allow action when user has project.create.org', async () => {
    mockHasOrgPermission.mockResolvedValue(true);
    // Slug lookup
    setupSelectFieldWhereLimit([]);
    // Insert project
    setupInsertChain();
    // Insert workflow
    setupInsertChain();
    // Insert workflow statuses (4 times for DEFAULT_STATUSES)
    setupInsertChain();
    setupInsertChain();
    setupInsertChain();
    setupInsertChain();
    // Insert project member
    setupInsertChain();
    // Project re-fetch after create
    setupSelectLimit([
      {
        id: 'generated-uuid',
        organizationId: orgId,
        name: 'New Project',
        slug: 'new-project',
        description: null,
        color: null,
        icon: null,
        status: 'active',
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    ]);

    const { createProject } = await import('../project.service.js');
    const result = await createProject(orgId, userId, { name: 'New Project' });

    expect(mockHasOrgPermission).toHaveBeenCalledWith(userId, orgId, 'project', 'create');
    expect(result.name).toBe('New Project');
  });
});

describe('Permission: project.read.org', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    reseedCryptoMocks();
    mockHasOrgPermission.mockResolvedValue(true);
  });

  it('should deny action when user lacks project.read.org', async () => {
    mockHasOrgPermission.mockResolvedValueOnce(false);

    const { listProjects } = await import('../project.service.js');
    await expect(listProjects(orgId, undefined, userId)).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Insufficient permissions to list projects in this organization',
    });
  });

  it('should allow action when user has project.read.org', async () => {
    mockHasOrgPermission.mockResolvedValue(true);
    // Projects query
    setupSelectWhere([
      {
        id: projectId,
        organizationId: orgId,
        name: 'Test Project',
        slug: 'test-project',
        description: null,
        color: null,
        icon: null,
        status: 'active',
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    ]);
    // Task counts query
    setupSelectWhere([]);
    // Members query
    setupSelectWhere([]);

    const { listProjects } = await import('../project.service.js');
    const result = await listProjects(orgId, undefined, userId);

    expect(mockHasOrgPermission).toHaveBeenCalledWith(userId, orgId, 'project', 'read');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Test Project');
  });
});

describe('Permission: project.update.org', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    reseedCryptoMocks();
    mockHasOrgPermission.mockResolvedValue(true);
  });

  it('should deny action when user lacks project.update.org (updateProject)', async () => {
    mockHasOrgPermission.mockResolvedValueOnce(false);
    // getOrgIdForProject lookup - uses select({ orgId: projects.organizationId })
    setupSelectFieldWhereLimit([{ orgId: orgId }]);

    const { updateProject } = await import('../project.service.js');
    await expect(updateProject(projectId, { name: 'Updated Name' }, userId)).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Insufficient permissions to update this project',
    });
  });

  it('should deny action when user lacks project.update.org (archiveProject)', async () => {
    mockHasOrgPermission.mockResolvedValueOnce(false);
    setupSelectFieldWhereLimit([{ orgId: orgId }]);

    const { archiveProject } = await import('../project.service.js');
    await expect(archiveProject(projectId, userId)).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Insufficient permissions to archive this project',
    });
  });

  it('should deny action when user lacks project.update.org (deleteProject)', async () => {
    mockHasOrgPermission.mockResolvedValueOnce(false);
    setupSelectFieldWhereLimit([{ orgId: orgId }]);

    const { deleteProject } = await import('../project.service.js');
    await expect(deleteProject(projectId, userId)).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Insufficient permissions to delete this project',
    });
  });

  it('should allow action when user has project.update.org (updateProject)', async () => {
    mockHasOrgPermission.mockResolvedValue(true);
    // 1. getOrgIdForProject
    setupSelectFieldWhereLimit([{ orgId: orgId }]);
    // 2. Project lookup: db.select().from(projects).where(...).limit(1)
    setupSelectLimit([
      {
        id: projectId,
        organizationId: orgId,
        name: 'Old Name',
        slug: 'test-project',
        description: null,
        color: null,
        icon: null,
        status: 'active',
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    ]);
    // 3. db.update(projects).set(...).where(...)
    const updateChain = setupUpdateChain();
    // 4. getProject for response: db.select().from(projects).where(...).limit(1)
    //    (syncProjectSearch is mocked via search.service.js, no extra db.select)
    setupSelectLimit([
      {
        id: projectId,
        organizationId: orgId,
        name: 'New Name',
        slug: 'test-project',
        description: null,
        color: null,
        icon: null,
        status: 'active',
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    ]);

    const { updateProject } = await import('../project.service.js');
    await updateProject(projectId, { name: 'New Name' }, userId);

    expect(mockHasOrgPermission).toHaveBeenCalledWith(userId, orgId, 'project', 'update');
    expect(updateChain.where).toHaveBeenCalled();
  });
});

describe('Permission: notification.read.org', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    reseedCryptoMocks();
    mockHasOrgPermission.mockResolvedValue(true);
  });

  it('should deny action when user lacks notification.read.org (listNotifications)', async () => {
    mockHasOrgPermission.mockResolvedValueOnce(false);

    const { listNotifications } = await import('../notification.service.js');
    await expect(listNotifications(userId, undefined, 25, orgId)).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Insufficient permissions to read notifications in this organization',
    });
  });

  it('should deny action when user lacks notification.read.org (markAsRead)', async () => {
    mockHasOrgPermission.mockResolvedValueOnce(false);

    const { markAsRead } = await import('../notification.service.js');
    await expect(markAsRead('notif-1', userId, orgId)).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Insufficient permissions to read notifications in this organization',
    });
  });

  it('should deny action when user lacks notification.read.org (markAllAsRead)', async () => {
    mockHasOrgPermission.mockResolvedValueOnce(false);

    const { markAllAsRead } = await import('../notification.service.js');
    await expect(markAllAsRead(userId, orgId)).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Insufficient permissions to read notifications in this organization',
    });
  });

  it('should allow action when user has notification.read.org (listNotifications)', async () => {
    mockHasOrgPermission.mockResolvedValue(true);
    setupSelectLimit([{ id: 'n1', userId, createdAt: new Date() }]);

    const { listNotifications } = await import('../notification.service.js');
    const result = await listNotifications(userId, undefined, 25, orgId);

    expect(mockHasOrgPermission).toHaveBeenCalledWith(userId, orgId, 'notification', 'read');
    expect(result.items).toHaveLength(1);
  });

  it('should allow action when user has notification.read.org (markAsRead)', async () => {
    mockHasOrgPermission.mockResolvedValue(true);
    const updateChain = setupUpdateChain();

    const { markAsRead } = await import('../notification.service.js');
    await markAsRead('notif-1', userId, orgId);

    expect(mockHasOrgPermission).toHaveBeenCalledWith(userId, orgId, 'notification', 'read');
    expect(updateChain.where).toHaveBeenCalled();
  });
});

describe('Permission: task.create.project', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    reseedCryptoMocks();
    mockHasOrgPermission.mockResolvedValue(true);
  });

  it('should deny action when user lacks task.create.project (createTask)', async () => {
    mockHasOrgPermission.mockResolvedValueOnce(false);
    // getOrgIdForProject lookup
    setupSelectFieldWhereLimit([{ organizationId: orgId }]);

    const { createTask } = await import('../task.service.js');
    await expect(
      createTask(projectId, userId, {
        title: 'New Task',
        statusId: 'status-1',
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Insufficient permissions to create tasks in this project',
    });
  });

  it('should deny action when user lacks task.create.project (createSubtask)', async () => {
    mockHasOrgPermission.mockResolvedValueOnce(false);
    // Parent task lookup - uses .limit(1)
    setupSelectLimit([{ id: 'parent-task-id', projectId, parentTaskId: null }]);
    // getOrgIdForProject inside createSubtask
    setupSelectFieldWhereLimit([{ organizationId: orgId }]);

    const { createSubtask } = await import('../task.service.js');
    await expect(
      createSubtask('parent-task-id', userId, {
        title: 'Subtask',
        statusId: 'status-1',
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Insufficient permissions to create tasks in this project',
    });
  });

  it('should allow action when user has task.create.project (createTask)', async () => {
    mockHasOrgPermission.mockResolvedValue(true);
    // getOrgIdForProject
    setupSelectFieldWhereLimit([{ organizationId: orgId }]);
    // validateStatusBelongsToProject (innerJoin + where + limit)
    setupSelectLimit([{ id: 'status-1' }]);
    // getNextPosition (uses sql`MAX(...)` query - no .limit(), resolves via .where() thenable)
    setupSelectWithSql([{ maxPos: 0 }]);
    // Insert task
    setupInsertChain();
    // Insert taskWatchers (reporter auto-watches)
    setupInsertChain();
    // Status name lookup for response
    setupSelectFieldWhereLimit([{ name: 'To Do' }]);
    // Task re-fetch
    setupSelectLimit([
      {
        id: 'generated-uuid',
        projectId,
        statusId: 'status-1',
        title: 'New Task',
        description: null,
        priority: 'none',
        assigneeId: null,
        reporterId: userId,
        parentTaskId: null,
        dueDate: null,
        startDate: null,
        estimatedHours: null,
        position: 1000,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    ]);

    const { createTask } = await import('../task.service.js');
    const result = await createTask(projectId, userId, {
      title: 'New Task',
      statusId: 'status-1',
    });

    expect(mockHasOrgPermission).toHaveBeenCalledWith(userId, orgId, 'task', 'create');
    expect(result.title).toBe('New Task');
  });
});

describe('Permission: task.update.project', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    reseedCryptoMocks();
    mockHasOrgPermission.mockResolvedValue(true);
  });

  it('should deny action when user lacks task.update.project (updateTask)', async () => {
    mockHasOrgPermission.mockResolvedValueOnce(false);
    // getOrgIdForProject
    setupSelectFieldWhereLimit([{ organizationId: orgId }]);

    const { updateTask } = await import('../task.service.js');
    await expect(
      updateTask('task-1', projectId, { title: 'Updated' }, userId),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Insufficient permissions to update tasks in this project',
    });
  });

  it('should deny action when user lacks task.update.project (assignTask)', async () => {
    mockHasOrgPermission.mockResolvedValueOnce(false);
    // getOrgIdForProject
    setupSelectFieldWhereLimit([{ organizationId: orgId }]);

    const { assignTask } = await import('../task.service.js');
    // assignTask signature: (taskId, projectId, assigneeId, actorId)
    await expect(assignTask('task-1', projectId, 'assignee-1', userId)).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Insufficient permissions to assign tasks in this project',
    });
  });

  it('should allow action when user has task.update.project (updateTask)', async () => {
    mockHasOrgPermission.mockResolvedValue(true);
    // 1. getOrgIdForProject (permission check)
    setupSelectFieldWhereLimit([{ organizationId: orgId }]);
    // 2. Task lookup: db.select().from(tasks).where(...).limit(1)
    setupSelectLimit([
      {
        id: 'task-1',
        projectId,
        statusId: 'status-1',
        title: 'Original',
        description: null,
        priority: 'none',
        assigneeId: null,
        reporterId: userId,
        parentTaskId: null,
        dueDate: null,
        startDate: null,
        estimatedHours: null,
        position: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    ]);
    // 3. db.update(tasks).set(...).where(...)
    const updateChain = setupUpdateChain();
    // 4. getOrgIdForProject for activity log (since title changed)
    setupSelectFieldWhereLimit([{ organizationId: orgId }]);
    // 5. getTask(taskId) - no userId, so no permission check
    //    Main query: db.select({...}).from(tasks).leftJoin().leftJoin().where(...).limit(1)
    setupSelectLimit([
      {
        task: {
          id: 'task-1',
          projectId,
          statusId: 'status-1',
          title: 'Updated',
          description: null,
          priority: 'none',
          assigneeId: null,
          reporterId: userId,
          parentTaskId: null,
          dueDate: null,
          startDate: null,
          estimatedHours: null,
          position: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
        statusName: 'To Do',
        assigneeDisplayName: null,
        assigneeAvatarUrl: null,
      },
    ]);
    // 6. Labels query for getTask: db.select({...}).from(taskLabels).innerJoin().where(...)
    setupSelectWhere([]);
    // 7. loadTaskProgress: subtasks query
    setupSelectWhere([]);
    // 8. loadTaskProgress: checklists query
    setupSelectWhere([]);
    // computeBlockedStatus is mocked, no db calls
    // (syncTaskSearch is mocked via search.service.js, no extra db.select)

    const { updateTask } = await import('../task.service.js');
    await updateTask('task-1', projectId, { title: 'Updated' }, userId);

    expect(mockHasOrgPermission).toHaveBeenCalledWith(userId, orgId, 'task', 'update');
    expect(updateChain.where).toHaveBeenCalled();
  });
});

// ─── Low-Coverage Permissions (Allow Path Only) ─────────────────────────────────

describe('Permission (allow path): organization.delete.org', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    reseedCryptoMocks();
    mockHasOrgPermission.mockResolvedValue(true);
  });

  it('should allow deleteOrganization when user has organization.delete.org', async () => {
    // requireMembership lookup
    setupSelectFieldWhereLimit([{ id: orgId }]);
    // Organization lookup: db.select().from(organizations).where(...).limit(1)
    setupSelectLimit([
      {
        id: orgId,
        name: 'Test Org',
        slug: 'test-org',
        logoUrl: null,
        settings: {},
        trialExpiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    ]);
    // Update org to mark deleted
    const updateChain = setupUpdateChain();

    const { deleteOrganization } = await import('../organization.service.js');
    await deleteOrganization(orgId, userId);

    expect(mockHasOrgPermission).toHaveBeenCalledWith(userId, orgId, 'organization', 'delete');
    expect(updateChain.where).toHaveBeenCalled();
  });
});

describe('Permission (allow path): invitation.create.org', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    reseedCryptoMocks();
    mockHasOrgPermission.mockResolvedValue(true);
    mockPublish.mockResolvedValue(undefined);
    mockActivityLog.mockResolvedValue(undefined);
  });

  it('should allow createInvitation when user has invitation.create.org', async () => {
    // 1. cleanupExpiredInvitations: db.select({id}).from(invitations).where(...)
    setupSelectWhere([]);
    // 2. computeAllowedAuthMethods: db.select({...}).from(organizationAuthSettings).where(inArray(...))
    setupSelectWhere([
      {
        organizationId: orgId,
        passwordAuthEnabled: true,
        googleOauthEnabled: false,
        githubOauthEnabled: false,
      },
    ]);
    // 3. Active invites query: db.select().from(invitations).where(and(eq, eq, eq))
    //    No .limit() → resolves via .where() thenable, then .filter() + .sort()
    setupSelectWhere([]);
    // Transaction mock - wraps invitation insert + upsertInvitationTargetSnapshot
    const txInsertChain = { values: vi.fn().mockResolvedValue(undefined) };
    // tx.select chain must support:
    //   .select({...}).from(t).where(...).limit(1)  → resolves to []
    //   .select({...}).from(t).where(...)           → awaiting resolves to [] (for .map())
    const txWhereResult = Object.assign([], {
      limit: vi.fn().mockResolvedValue([]),
    });
    const txWhereThenable = {
      // biome-ignore lint/suspicious/noThenProperty: test mock needs thenable for Drizzle query chain resolution
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(txWhereResult).then(resolve),
      limit: vi.fn().mockResolvedValue([]),
    };
    const txSelectChain = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue(txWhereThenable),
      }),
    };
    const tx = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
      insert: vi.fn().mockReturnValue(txInsertChain),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
      select: vi.fn().mockReturnValue(txSelectChain),
    };
    mockTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<void>) => {
      await callback(tx);
    });

    const { createInvitation } = await import('../invitation.service.js');
    const result = await createInvitation(orgId, userId, {
      email: 'newuser@example.com',
      targets: [{ organizationId: orgId }],
    });

    expect(mockHasOrgPermission).toHaveBeenCalledWith(userId, orgId, 'invitation', 'create');
    expect(result.invitation).toBeDefined();
    expect(mockPublish).toHaveBeenCalled();
  });
});

describe('Permission (allow path): role.update.org', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    reseedCryptoMocks();
    mockHasOrgPermission.mockResolvedValue(true);
  });

  it('should allow updateRole when user has role.update.org', async () => {
    // Role lookup
    setupSelectLimit([
      { id: 'role-1', name: 'Old Name', organizationId: orgId, description: null },
    ]);
    const updateChain = setupUpdateChain();
    // Role re-fetch after update
    setupSelectLimit([
      { id: 'role-1', name: 'New Name', organizationId: orgId, description: null },
    ]);

    const rbacService = await import('../rbac.service.js');
    const result = await rbacService.updateRole(userId, 'role-1', { name: 'New Name' });

    expect(mockHasOrgPermission).toHaveBeenCalledWith(userId, orgId, 'role', 'update');
    expect(updateChain.where).toHaveBeenCalled();
    expect(result.name).toBe('New Name');
  });
});

describe('Permission (allow path): role.delete.org', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    reseedCryptoMocks();
    mockHasOrgPermission.mockResolvedValue(true);
  });

  it('should allow deleteRole when user has role.delete.org', async () => {
    // Role lookup
    setupSelectLimit([
      { id: 'role-1', name: 'To Delete', organizationId: orgId, description: null },
    ]);
    // Role assignments deletion
    const deleteChain = setupDeleteChain();
    // Roles deletion
    setupDeleteChain();

    const rbacService = await import('../rbac.service.js');
    await rbacService.deleteRole(userId, 'role-1');

    expect(mockHasOrgPermission).toHaveBeenCalledWith(userId, orgId, 'role', 'delete');
    expect(deleteChain.where).toHaveBeenCalled();
  });
});

describe('Permission (allow path): permission.update.org', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    reseedCryptoMocks();
    mockHasOrgPermission.mockResolvedValue(true);
  });

  it('should allow deletePermissionAssignment when actor has permission.update.org', async () => {
    // hasOrgPermission check for the permission key being deleted
    mockHasOrgPermission.mockResolvedValue(true);
    // Permission assignment lookup
    setupSelectWhere([
      {
        id: 'perm-1',
        userId: 'target-user',
        organizationId: orgId,
        permissionKey: 'task.read.project',
      },
    ]);
    const deleteChain = setupDeleteChain();

    const rbacService = await import('../rbac.service.js');
    await rbacService.deletePermissionAssignment(userId, 'perm-1');

    expect(mockHasOrgPermission).toHaveBeenCalled();
    expect(deleteChain.where).toHaveBeenCalled();
  });
});
