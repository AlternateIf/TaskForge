import { z } from 'zod';
import { uid } from './uuid.js';

export const TASK_PRIORITIES = ['none', 'low', 'medium', 'high', 'critical'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().max(50000).optional(),
  statusId: uid('Invalid status ID').optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  assigneeId: uid('Invalid assignee ID').nullable().optional(),
  dueDate: z.string().datetime({ message: 'Invalid date format' }).nullable().optional(),
  startDate: z.string().datetime({ message: 'Invalid date format' }).nullable().optional(),
  estimatedHours: z.number().min(0).max(99999).optional(),
  parentTaskId: uid('Invalid parent task ID').optional(),
  labelIds: z.array(uid('Invalid label ID')).optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(50000).nullable().optional(),
  statusId: uid('Invalid status ID').optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  assigneeId: uid('Invalid assignee ID').nullable().optional(),
  dueDate: z.string().datetime({ message: 'Invalid date format' }).nullable().optional(),
  startDate: z.string().datetime({ message: 'Invalid date format' }).nullable().optional(),
  estimatedHours: z.number().min(0).max(99999).nullable().optional(),
  parentTaskId: uid('Invalid parent task ID').nullable().optional(),
});

export const assignTaskSchema = z.object({
  assigneeId: uid('Invalid assignee ID').nullable(),
});

const legacyPositionMoveSchema = z.object({
  position: z.number().int().min(0),
  statusId: uid('Invalid status ID').optional(),
});

const anchorMoveSchema = z
  .object({
    statusId: uid('Invalid status ID').optional(),
    beforeTaskId: uid('Invalid task ID').optional(),
    afterTaskId: uid('Invalid task ID').optional(),
  })
  .refine((value) => value.statusId || value.beforeTaskId || value.afterTaskId, {
    message: 'At least one placement target must be provided',
  });

export const updateTaskPositionSchema = z.union([legacyPositionMoveSchema, anchorMoveSchema]);

export const addTaskLabelSchema = z.object({
  labelId: uid('Invalid label ID'),
});

// --- Subtask ---

export const createSubtaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().max(50000).optional(),
  statusId: uid('Invalid status ID').optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  assigneeId: uid('Invalid assignee ID').nullable().optional(),
  dueDate: z.string().datetime({ message: 'Invalid date format' }).nullable().optional(),
  startDate: z.string().datetime({ message: 'Invalid date format' }).nullable().optional(),
  estimatedHours: z.number().min(0).max(99999).optional(),
  labelIds: z.array(uid('Invalid label ID')).optional(),
});

// --- Checklists ---

export const createChecklistSchema = z.object({
  title: z.string().min(1, 'Checklist title is required').max(255),
});

export const updateChecklistSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  position: z.number().int().min(0).optional(),
});

export const createChecklistItemSchema = z.object({
  title: z.string().min(1, 'Item title is required').max(500),
});

export const updateChecklistItemSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  isCompleted: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
});

// --- Dependencies ---

export const DEPENDENCY_TYPES = ['blocked_by'] as const;
export type DependencyType = (typeof DEPENDENCY_TYPES)[number];

export const createDependencySchema = z.object({
  dependsOnTaskId: uid('Invalid task ID'),
  type: z.enum(DEPENDENCY_TYPES),
});

export type CreateDependencyInput = z.infer<typeof createDependencySchema>;

// --- Bulk Actions ---

export const BULK_ACTIONS = [
  'updateStatus',
  'assign',
  'updatePriority',
  'addLabel',
  'delete',
  'moveToProject',
] as const;
export type BulkAction = (typeof BULK_ACTIONS)[number];

export const bulkActionSchema = z.object({
  action: z.enum(BULK_ACTIONS),
  ids: z
    .array(uid('Invalid task ID'))
    .min(1, 'At least one task ID required')
    .max(100, 'Maximum 100 tasks per bulk request'),
  data: z
    .object({
      statusId: uid('Invalid status ID').optional(),
      assigneeId: uid('Invalid assignee ID').nullable().optional(),
      priority: z.enum(TASK_PRIORITIES).optional(),
      labelId: uid('Invalid label ID').optional(),
      projectId: uid('Invalid project ID').optional(),
    })
    .optional(),
});

export type BulkActionInput = z.infer<typeof bulkActionSchema>;

// --- Undo ---

export const undoSchema = z.object({
  undoToken: z.string().min(1, 'Undo token is required'),
});

export type UndoInput = z.infer<typeof undoSchema>;

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type AssignTaskInput = z.infer<typeof assignTaskSchema>;
export type UpdateTaskPositionInput = z.infer<typeof updateTaskPositionSchema>;
export type AddTaskLabelInput = z.infer<typeof addTaskLabelSchema>;
export type CreateSubtaskInput = z.infer<typeof createSubtaskSchema>;
export type CreateChecklistInput = z.infer<typeof createChecklistSchema>;
export type UpdateChecklistInput = z.infer<typeof updateChecklistSchema>;
export type CreateChecklistItemInput = z.infer<typeof createChecklistItemSchema>;
export type UpdateChecklistItemInput = z.infer<typeof updateChecklistItemSchema>;
