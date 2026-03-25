import { z } from 'zod';

export const TASK_PRIORITIES = ['none', 'low', 'medium', 'high', 'critical'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().max(50000).optional(),
  statusId: z.string().uuid('Invalid status ID').optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  assigneeId: z.string().uuid('Invalid assignee ID').nullable().optional(),
  dueDate: z.string().datetime({ message: 'Invalid date format' }).nullable().optional(),
  startDate: z.string().datetime({ message: 'Invalid date format' }).nullable().optional(),
  estimatedHours: z.number().min(0).max(99999).optional(),
  parentTaskId: z.string().uuid('Invalid parent task ID').optional(),
  labelIds: z.array(z.string().uuid('Invalid label ID')).optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(50000).nullable().optional(),
  statusId: z.string().uuid('Invalid status ID').optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  assigneeId: z.string().uuid('Invalid assignee ID').nullable().optional(),
  dueDate: z.string().datetime({ message: 'Invalid date format' }).nullable().optional(),
  startDate: z.string().datetime({ message: 'Invalid date format' }).nullable().optional(),
  estimatedHours: z.number().min(0).max(99999).nullable().optional(),
  parentTaskId: z.string().uuid('Invalid parent task ID').nullable().optional(),
});

export const assignTaskSchema = z.object({
  assigneeId: z.string().uuid('Invalid assignee ID').nullable(),
});

export const updateTaskPositionSchema = z.object({
  position: z.number().int().min(0),
  statusId: z.string().uuid('Invalid status ID').optional(),
});

export const addTaskLabelSchema = z.object({
  labelId: z.string().uuid('Invalid label ID'),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type AssignTaskInput = z.infer<typeof assignTaskSchema>;
export type UpdateTaskPositionInput = z.infer<typeof updateTaskPositionSchema>;
export type AddTaskLabelInput = z.infer<typeof addTaskLabelSchema>;
