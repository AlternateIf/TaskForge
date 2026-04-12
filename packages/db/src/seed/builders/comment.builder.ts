/**
 * Comment builder — deterministic comments and mentions.
 */

import type * as schema from '../../schema/index.js';
import { TARGET_COUNTS } from '../dataset-config.js';
import { USER_IDS, id } from '../id-registry.js';

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

const COMMENT_BODIES = [
  'Confirmed, I can reproduce this locally. Attaching stack trace.',
  'Fixed in latest commit. Deploying to staging.',
  'Needs review from the team before we merge.',
  'Adding test coverage for this edge case.',
  'This is blocked by the upstream API change.',
  'Working on it now, ETA end of day.',
  'Migrated to the new schema. Please verify.',
  'Performance looks good after the optimization.',
  'I have a few questions about the requirements here.',
  'Moved to Review, looking for approval.',
  'This looks like a duplicate of the existing issue.',
  'Scheduling this for next sprint.',
  'Added documentation for this feature.',
  'Security review passed. Green to ship.',
  'Regression test is failing. Needs investigation.',
  'Updating the API contract for this.',
  'This is ready for QA validation.',
  'Workaround is in place, tracking root cause separately.',
  'Customer confirmed this resolves their issue.',
  'Added to the release notes.',
  'Refactoring the underlying data model first.',
  'This is a breaking change, needs migration plan.',
  'Monitoring shows no errors after rollout.',
  'Rolling back due to elevated error rate.',
  'Updating integration tests to match new behavior.',
  'This seems related to recent infra changes.',
  'Syncing with the other team on the interface.',
  'Closing as wontfix per product decision.',
  "Reopening — the fix didn't fully resolve it.",
  'Verified in production. Closing.',
];

export function buildComments(taskIds: string[]): (typeof schema.comments.$inferInsert)[] {
  const comments: (typeof schema.comments.$inferInsert)[] = [];
  const rng = seededRandom(111);
  const commentAuthors = [
    USER_IDS.superAdmin,
    USER_IDS.taskforgeAgencyOwner,
    USER_IDS.acmeCorpOwner,
    USER_IDS.globexIncOwner,
    USER_IDS.tfBackendDev1,
    USER_IDS.tfFrontendDev1,
    USER_IDS.tfQaEngineer1,
    USER_IDS.acmeBackendDev1,
    USER_IDS.acmeQaEngineer1,
    USER_IDS.globexBackendDev1,
    USER_IDS.soylentSupportEngineer1,
    USER_IDS.umbrellaQaEngineer1,
    USER_IDS.sharedQa,
    USER_IDS.sharedDevops,
  ];

  let commentIdCounter = 15001;

  // Distribute comments across tasks
  for (let i = 0; i < TARGET_COUNTS.comments; i++) {
    const taskId = taskIds[i % taskIds.length];
    const author = commentAuthors[Math.floor(rng() * commentAuthors.length)];
    const body = COMMENT_BODIES[i % COMMENT_BODIES.length];
    const hasParent = rng() > 0.75 && i > 0;
    const parentCommentId = hasParent ? (comments[comments.length - 1]?.id ?? null) : null;

    comments.push({
      id: id(commentIdCounter++),
      entityType: 'task' as const,
      entityId: taskId,
      authorId: author,
      body,
      visibility: rng() > 0.85 ? 'internal' : 'public',
      parentCommentId: parentCommentId as string | null,
      createdAt: at(160 + i * 3),
      updatedAt: at(160 + i * 3),
    });
  }

  return comments;
}

export function buildCommentMentions(
  comments: (typeof schema.comments.$inferInsert)[],
  userIds: string[],
): (typeof schema.commentMentions.$inferInsert)[] {
  const mentions: (typeof schema.commentMentions.$inferInsert)[] = [];
  const rng = seededRandom(222);
  let mentionIdCounter = 15201;
  const seen = new Set<string>();

  // Each comment can have 0-3 mentions
  for (const comment of comments) {
    const mentionCount = Math.floor(rng() * 3); // 0-2 mentions per comment
    for (let m = 0; m < mentionCount; m++) {
      const mentionedUser = userIds[Math.floor(rng() * userIds.length)];
      if (mentionedUser === comment.authorId) continue;
      const key = `${comment.id}:${mentionedUser}`;
      if (seen.has(key)) continue;
      seen.add(key);

      mentions.push({
        id: id(mentionIdCounter++),
        commentId: comment.id as string,
        userId: mentionedUser,
        createdAt: comment.createdAt as Date,
      });

      if (mentions.length >= TARGET_COUNTS.commentMentions) break;
    }

    if (mentions.length >= TARGET_COUNTS.commentMentions) break;
  }

  return mentions;
}
