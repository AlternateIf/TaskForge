import type { ActivityItem } from '@/api/activity';
import type { Checklist } from '@/api/checklists';
import type { Comment } from '@/api/comments';

export interface TimelineActivityEntry {
  id: string;
  type: 'activity';
  createdAt: string;
  payload: ActivityItem;
}

export interface TimelineCommentEntry {
  id: string;
  type: 'comment';
  createdAt: string;
  payload: Comment;
}

export type TimelineEntry = TimelineActivityEntry | TimelineCommentEntry;

export function buildTimelineEntries(
  activity: ActivityItem[],
  comments: Comment[],
): TimelineEntry[] {
  const commentEntries: TimelineCommentEntry[] = comments.map((comment) => ({
    id: `comment-${comment.id}`,
    type: 'comment',
    createdAt: comment.createdAt,
    payload: comment,
  }));

  const activityEntries: TimelineActivityEntry[] = activity
    .filter((item) => !item.action.startsWith('comment_'))
    .map((item) => ({
      id: `activity-${item.id}`,
      type: 'activity',
      createdAt: item.createdAt,
      payload: item,
    }));

  return [...commentEntries, ...activityEntries].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export function toggleChecklistItemOptimistic(
  checklists: Checklist[],
  itemId: string,
  isCompleted: boolean,
): Checklist[] {
  return checklists.map((checklist) => ({
    ...checklist,
    items: checklist.items.map((item) => (item.id === itemId ? { ...item, isCompleted } : item)),
  }));
}

export function calculateSubtaskProgress(
  subtaskCount: number,
  subtaskCompletedCount: number,
): number {
  if (subtaskCount <= 0) {
    return 0;
  }

  return Math.round((subtaskCompletedCount / subtaskCount) * 100);
}

export function formatActivityAction(action: string): string {
  return action.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}
