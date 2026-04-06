import type { Priority } from '@/api/tasks';

export interface ProjectViewSearch {
  task?: string;
  search?: string;
  statusId?: string[];
  priority?: Priority[];
  assigneeId?: string[];
  labelId?: string[];
  dueDateFrom?: string;
  dueDateTo?: string;
}

function parseStringArray(val: unknown): string[] | undefined {
  if (Array.isArray(val)) {
    const arr = val.filter((v): v is string => typeof v === 'string');
    return arr.length ? arr : undefined;
  }
  if (typeof val === 'string') return [val];
  return undefined;
}

export function validateProjectViewSearch(raw: Record<string, unknown>): ProjectViewSearch {
  return {
    task: typeof raw.task === 'string' ? raw.task : undefined,
    search: typeof raw.search === 'string' ? raw.search : undefined,
    statusId: parseStringArray(raw.statusId),
    priority: parseStringArray(raw.priority) as Priority[] | undefined,
    assigneeId: parseStringArray(raw.assigneeId),
    labelId: parseStringArray(raw.labelId),
    dueDateFrom: typeof raw.dueDateFrom === 'string' ? raw.dueDateFrom : undefined,
    dueDateTo: typeof raw.dueDateTo === 'string' ? raw.dueDateTo : undefined,
  };
}
