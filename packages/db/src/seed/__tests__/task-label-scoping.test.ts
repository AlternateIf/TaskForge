/**
 * Unit tests for task-label project scoping in buildTaskLabels.
 *
 * Verifies that no task_labels row ever assigns a label from a different
 * project than the task's own project.
 */

import { describe, expect, it } from 'vitest';
import { buildLabels, getLabelIdToProjectIdMap } from '../builders/project.builder.js';
import { buildTaskLabels, getTaskIds } from '../builders/task.builder.js';
import { buildTasks } from '../builders/task.builder.js';

describe('task-label scoping', () => {
  it('never assigns a label from a different project than the task', () => {
    const tasks = buildTasks();
    const labels = buildLabels();
    const taskIds = getTaskIds();
    const labelIds = labels.map((l) => l.id as string);
    const labelIdToProjectId = getLabelIdToProjectIdMap();

    // Build taskIdToProjectId map from task data
    const taskIdToProjectId = new Map<string, string>();
    for (const task of tasks) {
      taskIdToProjectId.set(task.id as string, task.projectId as string);
    }

    const taskLabelRows = buildTaskLabels(taskIds, labelIds, labelIdToProjectId, taskIdToProjectId);

    // Verify each task_label row has matching project_id between task and label
    for (const row of taskLabelRows) {
      const taskProjectId = taskIdToProjectId.get(row.taskId);
      const labelProjectId = labelIdToProjectId.get(row.labelId);
      expect(taskProjectId).toBeDefined();
      expect(labelProjectId).toBeDefined();
      expect(taskProjectId).toBe(labelProjectId);
    }
  });

  it('does not assign labels to tasks whose project has no labels', () => {
    const tasks = buildTasks();
    const labels = buildLabels();
    const taskIds = getTaskIds();
    const labelIds = labels.map((l) => l.id as string);
    const labelIdToProjectId = getLabelIdToProjectIdMap();

    // Build taskIdToProjectId map
    const taskIdToProjectId = new Map<string, string>();
    for (const task of tasks) {
      taskIdToProjectId.set(task.id as string, task.projectId as string);
    }

    // Simulate a project that has no labels by creating a modified scenario
    // where we add a taskId that maps to a project with no labels
    const fakeTaskId = '00000000-0000-0000-0000-999999999999';
    const fakeProjectId = '00000000-0000-0000-0000-888888888888'; // project with no labels

    const extendedTaskIds = [...taskIds, fakeTaskId];
    const extendedTaskIdToProjectId = new Map(taskIdToProjectId);
    extendedTaskIdToProjectId.set(fakeTaskId, fakeProjectId);

    const result = buildTaskLabels(
      extendedTaskIds,
      labelIds,
      labelIdToProjectId,
      extendedTaskIdToProjectId,
    );

    // The fake task must not have any labels assigned since its project has none
    const fakeTaskLabels = result.filter((r) => r.taskId === fakeTaskId);
    expect(fakeTaskLabels).toHaveLength(0);
  });

  it('produces a non-empty set of task labels for the real dataset', () => {
    const tasks = buildTasks();
    const labels = buildLabels();
    const taskIds = getTaskIds();
    const labelIds = labels.map((l) => l.id as string);
    const labelIdToProjectId = getLabelIdToProjectIdMap();

    const taskIdToProjectId = new Map<string, string>();
    for (const task of tasks) {
      taskIdToProjectId.set(task.id as string, task.projectId as string);
    }

    const result = buildTaskLabels(taskIds, labelIds, labelIdToProjectId, taskIdToProjectId);
    expect(result.length).toBeGreaterThan(0);
  });
});
