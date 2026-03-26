import { db, notifications, tasks, users } from '@taskforge/db';
import { and, between, eq, isNotNull, isNull } from 'drizzle-orm';
import { publish } from '../publisher.js';

const APP_URL = process.env.APP_URL ?? 'http://localhost:5173';

export async function checkDeadlineReminders(): Promise<void> {
  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Find tasks with due dates within the next 24 hours
  // that have an assignee and haven't been soft-deleted
  const dueSoonTasks = await db
    .select({
      taskId: tasks.id,
      taskTitle: tasks.title,
      dueDate: tasks.dueDate,
      assigneeId: tasks.assigneeId,
      projectId: tasks.projectId,
    })
    .from(tasks)
    .where(
      and(
        isNotNull(tasks.dueDate),
        isNotNull(tasks.assigneeId),
        isNull(tasks.deletedAt),
        between(tasks.dueDate, now, in24Hours),
      ),
    );

  for (const task of dueSoonTasks) {
    if (!task.assigneeId || !task.dueDate) continue;

    // Check if we already sent a deadline reminder for this task
    const existing = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, task.assigneeId),
          eq(notifications.type, 'task_deadline_approaching'),
          eq(notifications.entityType, 'task'),
          eq(notifications.entityId, task.taskId),
        ),
      )
      .limit(1);

    if (existing.length > 0) continue; // Already notified

    // Fetch assignee info
    const assignee = await db
      .select({ email: users.email, displayName: users.displayName })
      .from(users)
      .where(eq(users.id, task.assigneeId))
      .limit(1);

    if (assignee.length === 0) continue;

    const dueDateStr = task.dueDate.toISOString().split('T')[0];

    await publish('notification.task_deadline_approaching', {
      eventType: 'task_deadline_approaching',
      recipientId: task.assigneeId,
      recipientEmail: assignee[0].email,
      recipientName: assignee[0].displayName ?? 'there',
      title: `Deadline approaching: ${task.taskTitle}`,
      body: `Due: ${dueDateStr}`,
      entityType: 'task',
      entityId: task.taskId,
      emailSubject: `Deadline approaching: ${task.taskTitle}`,
      emailTemplateData: {
        recipientName: assignee[0].displayName ?? 'there',
        taskTitle: task.taskTitle,
        taskUrl: `${APP_URL}/tasks/${task.taskId}`,
        projectName: task.projectId,
        dueDate: dueDateStr,
      },
    });
  }
}
