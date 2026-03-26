import { render } from '@react-email/render';
import * as React from 'react';
import {
  DeadlineReminderEmail,
  type DeadlineReminderProps,
} from './templates/deadline-reminder.js';
import { MentionEmail, type MentionProps } from './templates/mention.js';
import { TaskAssignedEmail, type TaskAssignedProps } from './templates/task-assigned.js';
import {
  TaskStatusChangedEmail,
  type TaskStatusChangedProps,
} from './templates/task-status-changed.js';
import { WelcomeEmail, type WelcomeProps } from './templates/welcome.js';

export type {
  DeadlineReminderProps,
  MentionProps,
  TaskAssignedProps,
  TaskStatusChangedProps,
  WelcomeProps,
};

export function renderTaskAssigned(props: TaskAssignedProps): Promise<string> {
  return render(React.createElement(TaskAssignedEmail, props));
}

export function renderTaskStatusChanged(props: TaskStatusChangedProps): Promise<string> {
  return render(React.createElement(TaskStatusChangedEmail, props));
}

export function renderMention(props: MentionProps): Promise<string> {
  return render(React.createElement(MentionEmail, props));
}

export function renderDeadlineReminder(props: DeadlineReminderProps): Promise<string> {
  return render(React.createElement(DeadlineReminderEmail, props));
}

export function renderWelcome(props: WelcomeProps): Promise<string> {
  return render(React.createElement(WelcomeEmail, props));
}
