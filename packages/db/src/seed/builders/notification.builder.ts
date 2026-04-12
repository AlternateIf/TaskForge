/**
 * Notification builder — deterministic notifications and preferences.
 */

import type * as schema from '../../schema/index.js';
import { TARGET_COUNTS } from '../dataset-config.js';
import { ORG_IDS, SUPER_USER_ID, USER_IDS, id } from '../id-registry.js';

const BASE_TIME = new Date('2026-03-01T09:00:00.000Z');

function at(minutesFromBase: number): Date {
  return new Date(BASE_TIME.getTime() + minutesFromBase * 60_000);
}

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) & 0xffffffff;
    return (state >>> 0) / 0xffffffff;
  };
}

const NOTIFICATION_TYPES = [
  'task_assigned',
  'comment_mention',
  'comment_added',
  'deadline_reminder',
  'status_changed',
  'task_created',
];

const NOTIFICATION_TEMPLATES: Record<string, Array<{ title: string; body: string }>> = {
  task_assigned: [
    { title: 'Task assigned to you', body: 'You have been assigned a new task.' },
    { title: 'New assignment', body: 'A task has been reassigned to you.' },
  ],
  comment_mention: [{ title: 'Mentioned in a comment', body: 'You were mentioned in a comment.' }],
  comment_added: [{ title: 'New comment', body: 'A comment was added to your task.' }],
  deadline_reminder: [{ title: 'Task due soon', body: 'This task is due within 24 hours.' }],
  status_changed: [{ title: 'Task status updated', body: 'A task you watch has changed status.' }],
  task_created: [{ title: 'New task created', body: 'A new task was created in your project.' }],
};

export function buildNotifications(
  taskIds: string[],
  commentIds: string[],
): (typeof schema.notifications.$inferInsert)[] {
  const notifications: (typeof schema.notifications.$inferInsert)[] = [];
  const rng = seededRandom(555);
  const notifUsers = [
    SUPER_USER_ID,
    USER_IDS.taskforgeAgencyOwner,
    USER_IDS.acmeCorpOwner,
    USER_IDS.globexIncOwner,
    USER_IDS.soylentCorpOwner,
    USER_IDS.umbrellaCorpOwner,
    USER_IDS.tfBackendDev1,
    USER_IDS.tfFrontendDev1,
    USER_IDS.tfQaEngineer1,
    USER_IDS.acmeBackendDev1,
    USER_IDS.globexBackendDev1,
    USER_IDS.sharedQa,
  ];

  let notifIdCounter = 18001;

  for (let i = 0; i < TARGET_COUNTS.notifications; i++) {
    const userId = notifUsers[i % notifUsers.length];
    const type = NOTIFICATION_TYPES[i % NOTIFICATION_TYPES.length];
    const templates = NOTIFICATION_TEMPLATES[type];
    const template = templates[i % templates.length];

    // Determine entity type and ID
    let entityType: string;
    let entityId: string;
    if (type === 'comment_mention' || type === 'comment_added') {
      entityType = 'comment';
      entityId = commentIds[i % commentIds.length] ?? taskIds[0];
    } else {
      entityType = 'task';
      entityId = taskIds[i % taskIds.length];
    }

    notifications.push({
      id: id(notifIdCounter++),
      userId,
      type,
      title: template.title,
      body: template.body,
      entityType,
      entityId,
      readAt: rng() > 0.6 ? at(190 + i * 3) : null,
      createdAt: at(190 + i * 3),
    });
  }

  return notifications;
}

export function buildNotificationPreferences(): (typeof schema.notificationPreferences.$inferInsert)[] {
  const prefs: (typeof schema.notificationPreferences.$inferInsert)[] = [];
  let prefIdCounter = 17001;
  const coreUsers = [
    SUPER_USER_ID,
    USER_IDS.taskforgeAgencyOwner,
    USER_IDS.acmeCorpOwner,
    USER_IDS.globexIncOwner,
    USER_IDS.soylentCorpOwner,
    USER_IDS.umbrellaCorpOwner,
    USER_IDS.tfBackendDev1,
    USER_IDS.tfFrontendDev1,
    USER_IDS.tfQaEngineer1,
    USER_IDS.acmeBackendDev1,
    USER_IDS.globexBackendDev1,
    USER_IDS.sharedQa,
  ];

  const eventTypes = ['task.assigned', 'comment.mention', 'deadline.reminder', 'status.changed'];
  const channels = ['in_app', 'email'];

  for (const userId of coreUsers) {
    for (const eventType of eventTypes) {
      for (const channel of channels) {
        prefs.push({
          id: id(prefIdCounter++),
          userId,
          eventType,
          channel,
          enabled: true,
          createdAt: at(180),
          updatedAt: at(180),
        });
      }
    }
  }

  return prefs;
}

// ---------------------------------------------------------------------------
// Activity log
// ---------------------------------------------------------------------------

export function buildActivityLog(taskIds: string[]): (typeof schema.activityLog.$inferInsert)[] {
  const entries: (typeof schema.activityLog.$inferInsert)[] = [];
  const orgs = [
    ORG_IDS.taskforgeAgency,
    ORG_IDS.acmeCorp,
    ORG_IDS.globexInc,
    ORG_IDS.soylentCorp,
    ORG_IDS.umbrellaCorp,
  ];
  const actors = [
    { id: SUPER_USER_ID, display: 'Super Admin' },
    { id: USER_IDS.taskforgeAgencyOwner, display: 'Morgan Agency' },
    { id: USER_IDS.acmeCorpOwner, display: 'Alex Acme' },
    { id: USER_IDS.globexIncOwner, display: 'Jordan Globex' },
    { id: USER_IDS.soylentCorpOwner, display: 'Taylor Soylent' },
    { id: USER_IDS.umbrellaCorpOwner, display: 'Reese Umbrella' },
    { id: USER_IDS.tfBackendDev1, display: 'Ben Backend' },
    { id: USER_IDS.tfQaEngineer1, display: 'Priya QA' },
    { id: USER_IDS.sharedQa, display: 'Anil QA' },
  ];

  const actions = [
    'created',
    'status_changed',
    'priority_changed',
    'assigned',
    'commented',
    'completed',
  ];
  let activityIdCounter = 16001;

  for (let i = 0; i < 80; i++) {
    const actor = actors[i % actors.length];
    const orgId = orgs[i % orgs.length];
    const taskId = taskIds[i % taskIds.length];
    const action = actions[i % actions.length];

    entries.push({
      id: id(activityIdCounter++),
      organizationId: orgId,
      actorId: actor.id,
      actorDisplay: actor.display,
      entityType: 'task',
      entityId: taskId,
      action,
      changes: { title: { before: null, after: `Task ${i}` } },
      createdAt: at(170 + i),
    });
  }

  return entries;
}
