import crypto from 'node:crypto';
import { sql } from 'drizzle-orm';
import { db, pool } from '../client.js';
import * as schema from '../schema/index.js';
import { createOrganization } from './factories/organization.factory.js';
import { createProject } from './factories/project.factory.js';
import { createTask } from './factories/task.factory.js';
import { createUser } from './factories/user.factory.js';

async function waitForDb(retries = 10, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      await db.execute(sql`SELECT 1`);
      console.log('Database connected');
      return;
    } catch {
      console.log(`Waiting for database... (${i + 1}/${retries})`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error('Could not connect to database');
}

async function seed() {
  await waitForDb();

  console.log('Seeding database...');

  // Check if already seeded
  const existingUsers = await db.select().from(schema.users).limit(1);
  if (existingUsers.length > 0) {
    console.log('Database already seeded — skipping');
    return;
  }

  // 1. Create users
  const adminUser = createUser({
    id: '00000000-0000-0000-0000-000000000001',
    email: 'admin@taskforge.local',
    displayName: 'Admin User',
  });
  const pmUser = createUser({
    id: '00000000-0000-0000-0000-000000000002',
    email: 'pm@taskforge.local',
    displayName: 'Sarah Chen',
  });
  const memberUser = createUser({
    id: '00000000-0000-0000-0000-000000000003',
    email: 'member@taskforge.local',
    displayName: 'Marcus Dev',
  });

  await db.insert(schema.users).values([adminUser, pmUser, memberUser]);
  console.log('  Created 3 users');

  // 2. Create organization
  const org = createOrganization({
    id: '00000000-0000-0000-0000-000000000010',
    name: 'TaskForge Demo',
    slug: 'taskforge-demo',
  });
  await db.insert(schema.organizations).values(org);
  console.log('  Created organization');

  // 3. Create roles
  const roleData = [
    { id: '00000000-0000-0000-0000-000000000020', name: 'Super Admin', isSystem: true },
    { id: '00000000-0000-0000-0000-000000000021', name: 'Admin', isSystem: true },
    { id: '00000000-0000-0000-0000-000000000022', name: 'Project Manager', isSystem: true },
    { id: '00000000-0000-0000-0000-000000000023', name: 'Team Member', isSystem: true },
    { id: '00000000-0000-0000-0000-000000000024', name: 'Guest', isSystem: true },
  ];

  await db.insert(schema.roles).values(
    roleData.map((r) => ({
      ...r,
      organizationId: org.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  );
  console.log('  Created 5 roles');

  // 4. Add members to org
  await db.insert(schema.organizationMembers).values([
    {
      id: crypto.randomUUID(),
      organizationId: org.id,
      userId: adminUser.id,
      roleId: roleData[0].id,
      joinedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: crypto.randomUUID(),
      organizationId: org.id,
      userId: pmUser.id,
      roleId: roleData[2].id,
      joinedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: crypto.randomUUID(),
      organizationId: org.id,
      userId: memberUser.id,
      roleId: roleData[3].id,
      joinedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);
  console.log('  Added 3 org members');

  // 5. Create project
  const project = createProject({
    id: '00000000-0000-0000-0000-000000000030',
    organizationId: org.id,
    name: 'Product Launch',
    slug: 'product-launch',
    createdBy: pmUser.id,
  });
  await db.insert(schema.projects).values(project);
  console.log('  Created project');

  // 6. Create workflow
  const workflowId = '00000000-0000-0000-0000-000000000040';
  await db.insert(schema.workflows).values({
    id: workflowId,
    projectId: project.id,
    name: 'Default',
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const statuses = [
    {
      id: '00000000-0000-0000-0000-000000000050',
      name: 'To Do',
      color: '#6B7280',
      position: 0,
      isInitial: true,
      isFinal: false,
    },
    {
      id: '00000000-0000-0000-0000-000000000051',
      name: 'In Progress',
      color: '#3B82F6',
      position: 1,
      isInitial: false,
      isFinal: false,
    },
    {
      id: '00000000-0000-0000-0000-000000000052',
      name: 'In Review',
      color: '#F59E0B',
      position: 2,
      isInitial: false,
      isFinal: false,
    },
    {
      id: '00000000-0000-0000-0000-000000000053',
      name: 'Done',
      color: '#10B981',
      position: 3,
      isInitial: false,
      isFinal: true,
    },
  ];

  await db
    .insert(schema.workflowStatuses)
    .values(statuses.map((s) => ({ ...s, workflowId, createdAt: new Date() })));
  console.log('  Created workflow with 4 statuses');

  // 7. Create labels
  const labelData = [
    { id: crypto.randomUUID(), name: 'Bug', color: '#EF4444' },
    { id: crypto.randomUUID(), name: 'Feature', color: '#3B82F6' },
    { id: crypto.randomUUID(), name: 'Design', color: '#8B5CF6' },
    { id: crypto.randomUUID(), name: 'Documentation', color: '#6B7280' },
    { id: crypto.randomUUID(), name: 'Urgent', color: '#F97316' },
  ];

  await db
    .insert(schema.labels)
    .values(labelData.map((l) => ({ ...l, projectId: project.id, createdAt: new Date() })));
  console.log('  Created 5 labels');

  // 8. Create tasks
  const taskData = [
    createTask({
      projectId: project.id,
      title: 'Design landing page mockups',
      statusId: statuses[1].id,
      priority: 'high',
      assigneeId: memberUser.id,
      reporterId: pmUser.id,
      position: 0,
    }),
    createTask({
      projectId: project.id,
      title: 'Write API documentation',
      statusId: statuses[0].id,
      priority: 'medium',
      reporterId: pmUser.id,
      position: 1,
    }),
    createTask({
      projectId: project.id,
      title: 'Fix login redirect bug',
      statusId: statuses[0].id,
      priority: 'critical',
      assigneeId: memberUser.id,
      reporterId: adminUser.id,
      position: 2,
    }),
    createTask({
      projectId: project.id,
      title: 'Implement user onboarding flow',
      statusId: statuses[2].id,
      priority: 'high',
      assigneeId: memberUser.id,
      reporterId: pmUser.id,
      position: 0,
    }),
    createTask({
      projectId: project.id,
      title: 'Set up CI/CD pipeline',
      statusId: statuses[3].id,
      priority: 'medium',
      assigneeId: adminUser.id,
      reporterId: pmUser.id,
      position: 0,
    }),
    createTask({
      projectId: project.id,
      title: 'Review competitor analysis',
      statusId: statuses[0].id,
      priority: 'low',
      reporterId: pmUser.id,
      position: 3,
    }),
    createTask({
      projectId: project.id,
      title: 'Update brand guidelines',
      statusId: statuses[1].id,
      priority: 'medium',
      assigneeId: pmUser.id,
      reporterId: pmUser.id,
      position: 1,
    }),
    createTask({
      projectId: project.id,
      title: 'Plan Q2 sprint',
      statusId: statuses[0].id,
      priority: 'high',
      reporterId: pmUser.id,
      position: 4,
    }),
    createTask({
      projectId: project.id,
      title: 'Add search functionality',
      statusId: statuses[0].id,
      priority: 'medium',
      assigneeId: memberUser.id,
      reporterId: pmUser.id,
      position: 5,
    }),
    createTask({
      projectId: project.id,
      title: 'Performance audit',
      statusId: statuses[1].id,
      priority: 'high',
      assigneeId: memberUser.id,
      reporterId: adminUser.id,
      position: 2,
    }),
  ];

  await db.insert(schema.tasks).values(taskData);
  console.log('  Created 10 tasks');

  console.log('Seed complete!');
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
