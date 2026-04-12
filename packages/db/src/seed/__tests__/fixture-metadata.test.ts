/**
 * Unit tests for fixture metadata alignment with builder outputs.
 */

import { describe, expect, it } from 'vitest';
import { buildCommentMentions, buildComments } from '../builders/comment.builder.js';
import { buildNotifications } from '../builders/notification.builder.js';
import {
  buildOrganizationAuthSettings,
  buildOrganizations,
  buildPermissions,
  buildRoles,
} from '../builders/organization.builder.js';
import {
  buildProjects,
  buildWorkflowStatuses,
  buildWorkflows,
} from '../builders/project.builder.js';
import {
  buildTaskDependencies,
  buildTaskWatchers,
  buildTasks,
  getTaskIds,
} from '../builders/task.builder.js';
import { buildUsers } from '../builders/user.builder.js';
import { CORE_COUNTS, SEED_PROFILES } from '../fixture-metadata.js';

describe('fixture-metadata', () => {
  describe('core profile counts match builders', () => {
    it('users count matches buildUsers output', () => {
      expect(buildUsers()).toHaveLength(CORE_COUNTS.users);
    });

    it('organizations count matches buildOrganizations output', () => {
      expect(buildOrganizations()).toHaveLength(CORE_COUNTS.organizations);
    });

    it('organizationAuthSettings count matches', () => {
      expect(buildOrganizationAuthSettings()).toHaveLength(CORE_COUNTS.organizationAuthSettings);
    });

    it('roles count matches buildRoles output', () => {
      expect(buildRoles()).toHaveLength(CORE_COUNTS.roles);
    });

    it('permissions count matches buildPermissions output', () => {
      expect(buildPermissions()).toHaveLength(CORE_COUNTS.permissions);
    });

    it('projects count matches buildProjects output', () => {
      expect(buildProjects()).toHaveLength(CORE_COUNTS.projects);
    });

    it('workflows count matches', () => {
      expect(buildWorkflows()).toHaveLength(CORE_COUNTS.workflows);
    });

    it('workflowStatuses count matches', () => {
      expect(buildWorkflowStatuses()).toHaveLength(CORE_COUNTS.workflowStatuses);
    });

    it('tasks count matches buildTasks output', () => {
      expect(buildTasks()).toHaveLength(CORE_COUNTS.tasks);
    });

    it('taskWatchers count matches target', () => {
      const users = buildUsers();
      const taskIds = getTaskIds();
      const watchers = buildTaskWatchers(
        taskIds,
        users.map((u) => u.id),
      );
      expect(watchers).toHaveLength(CORE_COUNTS.taskWatchers);
    });

    it('taskDependencies count matches target', () => {
      const taskIds = getTaskIds();
      const deps = buildTaskDependencies(taskIds);
      expect(deps).toHaveLength(CORE_COUNTS.taskDependencies);
    });

    it('comments count matches', () => {
      const taskIds = getTaskIds();
      expect(buildComments(taskIds)).toHaveLength(CORE_COUNTS.comments);
    });

    it('commentMentions count matches target', () => {
      const taskIds = getTaskIds();
      const users = buildUsers();
      const comments = buildComments(taskIds);
      const mentions = buildCommentMentions(
        comments,
        users.map((u) => u.id),
      );
      expect(mentions).toHaveLength(CORE_COUNTS.commentMentions);
    });

    it('notifications count matches', () => {
      const taskIds = getTaskIds();
      const comments = buildComments(taskIds);
      const commentIds = comments.map((c) => c.id as string);
      expect(buildNotifications(taskIds, commentIds)).toHaveLength(CORE_COUNTS.notifications);
    });
  });

  describe('SEED_PROFILES', () => {
    it('has core and core+sample profiles', () => {
      expect(SEED_PROFILES.core).toBeDefined();
      expect(SEED_PROFILES['core+sample']).toBeDefined();
    });

    it('core profile matches CORE_COUNTS', () => {
      expect(SEED_PROFILES.core).toEqual(CORE_COUNTS);
    });
  });
});
