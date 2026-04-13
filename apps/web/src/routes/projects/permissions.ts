export const TASK_CREATE_PERMISSION = 'task.create.project';
export const TASK_READ_PERMISSION = 'task.read.project';
export const TASK_UPDATE_PERMISSION = 'task.update.project';

// Attachment permissions are gated by task permissions since attachments belong to tasks:
// - Upload/create: TASK_UPDATE_PERMISSION
// - View/download:  TASK_READ_PERMISSION
// - Delete:         TASK_UPDATE_PERMISSION
