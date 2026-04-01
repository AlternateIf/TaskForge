import type { ActivityItem } from '@/api/activity';
import type { Checklist } from '@/api/checklists';
import type { Comment } from '@/api/comments';
import {
  buildTimelineEntries,
  calculateSubtaskProgress,
  formatActivityAction,
  toggleChecklistItemOptimistic,
} from './task-detail-utils';

describe('task-detail-utils', () => {
  it('buildTimelineEntries interleaves comments and activity chronologically and filters comment_* activity', () => {
    const activity: ActivityItem[] = [
      {
        id: 'a-1',
        organizationId: 'org-1',
        actorId: 'u-1',
        actorDisplay: 'Sarah',
        entityType: 'task',
        entityId: 't-1',
        action: 'task_status_updated',
        changes: null,
        createdAt: '2026-03-01T10:00:00.000Z',
      },
      {
        id: 'a-2',
        organizationId: 'org-1',
        actorId: 'u-2',
        actorDisplay: 'Marcus',
        entityType: 'task',
        entityId: 't-1',
        action: 'comment_created',
        changes: null,
        createdAt: '2026-03-01T11:00:00.000Z',
      },
    ];

    const comments: Comment[] = [
      {
        id: 'c-1',
        entityType: 'task',
        entityId: 't-1',
        authorId: 'u-3',
        authorDisplayName: 'Elena',
        body: '<p>Looks good</p>',
        visibility: 'public',
        parentCommentId: null,
        mentions: [],
        createdAt: '2026-03-01T09:00:00.000Z',
        updatedAt: '2026-03-01T09:00:00.000Z',
        deletedAt: null,
      },
    ];

    const entries = buildTimelineEntries(activity, comments);

    expect(entries).toHaveLength(2);
    expect(entries[0].type).toBe('comment');
    expect(entries[1].type).toBe('activity');
    expect(entries[1].payload.id).toBe('a-1');
  });

  it('toggleChecklistItemOptimistic updates only the targeted item', () => {
    const checklists: Checklist[] = [
      {
        id: 'cl-1',
        taskId: 't-1',
        title: 'QA',
        position: 1,
        createdAt: '2026-03-01T00:00:00.000Z',
        items: [
          {
            id: 'i-1',
            checklistId: 'cl-1',
            title: 'Smoke test',
            isCompleted: false,
            position: 1,
            completedBy: null,
            completedAt: null,
            createdAt: '2026-03-01T00:00:00.000Z',
            updatedAt: '2026-03-01T00:00:00.000Z',
          },
          {
            id: 'i-2',
            checklistId: 'cl-1',
            title: 'Regression test',
            isCompleted: false,
            position: 2,
            completedBy: null,
            completedAt: null,
            createdAt: '2026-03-01T00:00:00.000Z',
            updatedAt: '2026-03-01T00:00:00.000Z',
          },
        ],
      },
    ];

    const updated = toggleChecklistItemOptimistic(checklists, 'i-2', true);

    expect(updated[0].items[0].isCompleted).toBe(false);
    expect(updated[0].items[1].isCompleted).toBe(true);
  });

  it('calculateSubtaskProgress and formatActivityAction return expected values', () => {
    expect(calculateSubtaskProgress(5, 2)).toBe(40);
    expect(calculateSubtaskProgress(0, 0)).toBe(0);
    expect(formatActivityAction('task_status_updated')).toBe('Task Status Updated');
  });
});
