/**
 * Seed orchestration — truncation, insert order, command output.
 *
 * This is the single entrypoint invoked by `pnpm --filter @taskforge/db seed`.
 * All fixture data is built by dedicated builders; this file only orchestrates.
 */

import { db, pool } from '../client.js';
import * as schema from '../schema/index.js';
import { getAllSeededTables } from './fixture-metadata.js';
import { id } from './id-registry.js';
import { resolveSeedOptions } from './options.js';
import { printSeedSummary } from './summary.js';

import {
  buildOrganizationMembers,
  buildPermissionAssignments,
  buildProjectMembers,
  buildRoleAssignments,
} from './builders/assignment.builder.js';
import { buildCommentMentions, buildComments } from './builders/comment.builder.js';
import {
  buildActivityLog,
  buildNotificationPreferences,
  buildNotifications,
} from './builders/notification.builder.js';
// Builders
import {
  buildOrganizationAuthSettings,
  buildOrganizations,
  buildPermissions,
  buildRoles,
} from './builders/organization.builder.js';
import {
  buildLabels,
  buildProjects,
  buildWorkflowStatuses,
  buildWorkflows,
  getLabelIdToProjectIdMap,
} from './builders/project.builder.js';
import {
  buildChecklistItems,
  buildChecklists,
  buildTaskDependencies,
  buildTaskLabels,
  buildTaskWatchers,
  buildTasks,
  getTaskIds,
} from './builders/task.builder.js';
import {
  buildInvitationTargetPermissions,
  buildInvitationTargetRoles,
  buildInvitationTargets,
  buildInvitations,
  buildOauthAccounts,
  buildSessions,
  buildUsers,
  buildVerificationTokens,
} from './builders/user.builder.js';

async function waitForDb(retries = 20, delay = 2000): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('Database connected');
      return;
    } catch {
      console.log(`Waiting for database... (${i + 1}/${retries})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error('Could not connect to database');
}

async function normalizeWorkflowStatusFlagsByName(): Promise<void> {
  const [todoUpdate] = await pool.query(
    "UPDATE workflow_statuses SET is_initial = 1 WHERE REPLACE(LOWER(TRIM(name)), ' ', '-') IN ('to-do', 'todo') AND is_initial <> 1",
  );
  const [doneUpdate] = await pool.query(
    "UPDATE workflow_statuses SET is_final = 1 WHERE LOWER(TRIM(name)) = 'done' AND is_final <> 1",
  );
  const [reviewUpdate] = await pool.query(
    "UPDATE workflow_statuses SET is_validated = 1 WHERE LOWER(TRIM(name)) = 'review' AND is_validated <> 1",
  );

  const todoAffected = Number((todoUpdate as { affectedRows?: number }).affectedRows ?? 0);
  const doneAffected = Number((doneUpdate as { affectedRows?: number }).affectedRows ?? 0);
  const reviewAffected = Number((reviewUpdate as { affectedRows?: number }).affectedRows ?? 0);

  console.log(
    `Normalized workflow status flags: isInitial on ${todoAffected} To-Do column(s), isFinal on ${doneAffected} Done column(s), isValidated on ${reviewAffected} Review column(s).`,
  );
}

function augmentProjectMembersWithTaskAssignees(
  projectMembers: (typeof schema.projectMembers.$inferInsert)[],
  taskRows: (typeof schema.tasks.$inferInsert)[],
): (typeof schema.projectMembers.$inferInsert)[] {
  const nextMembers = [...projectMembers];
  const existingMembershipKeys = new Set(
    nextMembers.map((member) => `${member.projectId}:${member.userId}`),
  );
  const existingIds = nextMembers
    .map((member) => Number.parseInt(member.id.slice(-12), 10))
    .filter((value) => Number.isFinite(value));
  let nextMemberId = (existingIds.length > 0 ? Math.max(...existingIds) : 700) + 1;
  const createdAt = new Date('2026-03-01T13:00:00.000Z');

  const assigneePairs = [...new Set(taskRows.map((task) => `${task.projectId}:${task.assigneeId}`))]
    .filter((pair) => !pair.endsWith(':null'))
    .sort();

  for (const pair of assigneePairs) {
    const [projectId, userId] = pair.split(':');
    if (!projectId || !userId) continue;
    if (existingMembershipKeys.has(pair)) continue;

    existingMembershipKeys.add(pair);
    nextMembers.push({
      id: id(nextMemberId++),
      projectId,
      userId,
      roleId: null,
      createdAt,
    });
  }

  return nextMembers;
}

async function seed(): Promise<void> {
  const options = resolveSeedOptions();

  await waitForDb();

  console.log(
    `Seeding database with deterministic fixtures (mode: ${options.mode}, profile: ${options.profile})...`,
  );

  // In seed-only mode, truncate seeded tables before inserting to allow reseed
  if (options.mode === 'seed-only') {
    console.log('Truncating seeded tables for reseed...');
    const tables = getAllSeededTables();
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of tables) {
      await pool.query(`TRUNCATE TABLE ${table}`);
    }
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('Truncated seeded tables.');
  }

  const existingUsers = await db.select().from(schema.users).limit(1);
  if (existingUsers.length > 0 && options.mode !== 'seed-only') {
    console.log('Database already seeded — skipping');
    return;
  }

  // ── Build all entities ──────────────────────────────────────────

  console.log('Building organizations...');
  const organizations = buildOrganizations();
  const organizationAuthSettings = buildOrganizationAuthSettings();
  const roles = buildRoles();
  const permissions = buildPermissions();

  console.log('Building users...');
  const users = buildUsers();
  const oauthAccounts = buildOauthAccounts();
  const sessions = buildSessions();
  const verificationTokens = buildVerificationTokens();
  const invitations = buildInvitations();
  const invitationTargets = buildInvitationTargets();
  const invitationTargetRoles = buildInvitationTargetRoles();
  const invitationTargetPermissions = buildInvitationTargetPermissions();

  console.log('Building assignments...');
  const organizationMembers = buildOrganizationMembers();
  const roleAssignments = buildRoleAssignments();
  const permissionAssignments = buildPermissionAssignments();

  console.log('Building projects...');
  const projects = buildProjects();
  const workflows = buildWorkflows();
  const workflowStatuses = buildWorkflowStatuses();
  const manuallyAddedProjectMembers = buildProjectMembers();
  const labels = buildLabels();

  console.log('Building tasks...');
  const tasks = buildTasks();
  const taskIds = getTaskIds();
  const labelIds = labels.map((l) => l.id as string);
  const labelIdToProjectId = getLabelIdToProjectIdMap();
  // Build task→projectId map from task data
  const taskIdToProjectId = new Map<string, string>();
  for (const task of tasks) {
    taskIdToProjectId.set(task.id as string, task.projectId as string);
  }
  const taskLabels = buildTaskLabels(taskIds, labelIds, labelIdToProjectId, taskIdToProjectId);

  const allUserIds = users.map((u) => u.id);
  const taskWatchers = buildTaskWatchers(taskIds, allUserIds);
  const taskDependencies = buildTaskDependencies(taskIds);
  const checklists = buildChecklists(taskIds);
  const checklistIds = checklists.map((c) => c.id as string);
  const checklistItems = buildChecklistItems(checklistIds, allUserIds);
  const projectMembers = augmentProjectMembersWithTaskAssignees(manuallyAddedProjectMembers, tasks);

  console.log('Building comments...');
  const comments = buildComments(taskIds);
  const commentIds = comments.map((c) => c.id as string);
  const commentMentions = buildCommentMentions(comments, allUserIds);

  console.log('Building notifications and activity...');
  const activityLog = buildActivityLog(taskIds);
  const notificationPreferences = buildNotificationPreferences();
  const notifications = buildNotifications(taskIds, commentIds);

  // ── Insert in FK-safe order ────────────────────────────────────

  console.log('Inserting entities...');

  await db.transaction(async (tx) => {
    // Layer 1: Users
    await tx.insert(schema.users).values(users);

    // Layer 2: Organizations + auth settings
    await tx.insert(schema.organizations).values(organizations);
    await tx.insert(schema.organizationAuthSettings).values(organizationAuthSettings);

    // Layer 3: Roles + Permissions
    await tx.insert(schema.roles).values(roles);
    await tx.insert(schema.permissions).values(permissions);

    // Layer 4: Org members, role assignments, permission assignments
    await tx.insert(schema.organizationMembers).values(organizationMembers);
    await tx.insert(schema.roleAssignments).values(roleAssignments);
    if (permissionAssignments.length > 0) {
      await tx.insert(schema.permissionAssignments).values(permissionAssignments);
    }

    // Layer 5: Invitations
    await tx.insert(schema.invitations).values(invitations);
    await tx.insert(schema.invitationTargets).values(invitationTargets);
    await tx.insert(schema.invitationTargetRoles).values(invitationTargetRoles);
    await tx.insert(schema.invitationTargetPermissions).values(invitationTargetPermissions);

    // Layer 6: OAuth, sessions, verification tokens
    await tx.insert(schema.oauthAccounts).values(oauthAccounts);
    await tx.insert(schema.sessions).values(sessions);
    await tx.insert(schema.verificationTokens).values(verificationTokens);

    // Layer 7: Projects, workflows, statuses, labels
    await tx.insert(schema.projects).values(projects);
    await tx.insert(schema.workflows).values(workflows);
    await tx.insert(schema.workflowStatuses).values(workflowStatuses);
    await tx.insert(schema.labels).values(labels);

    // Layer 8: Project memberships
    await tx.insert(schema.projectMembers).values(projectMembers);

    // Layer 9: Tasks and task relationships
    await tx.insert(schema.tasks).values(tasks);
    await tx.insert(schema.taskLabels).values(taskLabels);
    await tx.insert(schema.taskWatchers).values(taskWatchers);
    await tx.insert(schema.taskDependencies).values(taskDependencies);

    // Layer 10: Checklists
    await tx.insert(schema.checklists).values(checklists);
    await tx.insert(schema.checklistItems).values(checklistItems);

    // Layer 11: Comments, mentions, activity, notifications
    await tx.insert(schema.comments).values(comments);
    await tx.insert(schema.commentMentions).values(commentMentions);
    await tx.insert(schema.activityLog).values(activityLog);
    await tx.insert(schema.notificationPreferences).values(notificationPreferences);
    await tx.insert(schema.notifications).values(notifications);
  });

  await normalizeWorkflowStatusFlagsByName();

  printSeedSummary(options.profile);
}

void seed()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
