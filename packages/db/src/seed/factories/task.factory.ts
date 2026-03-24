import crypto from 'node:crypto';

export function createTask(
  overrides: Partial<{
    id: string;
    projectId: string;
    title: string;
    statusId: string;
    priority: 'none' | 'low' | 'medium' | 'high' | 'critical';
    assigneeId: string;
    reporterId: string;
    position: number;
  }> = {},
) {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    projectId: overrides.projectId ?? '',
    title: overrides.title ?? 'Test Task',
    statusId: overrides.statusId ?? '',
    priority: overrides.priority ?? ('none' as const),
    assigneeId: overrides.assigneeId ?? null,
    reporterId: overrides.reporterId ?? '',
    position: overrides.position ?? 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
