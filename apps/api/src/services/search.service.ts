import {
  comments,
  db,
  labels,
  projectMembers,
  projects,
  taskLabels,
  tasks,
  users,
  workflowStatuses,
} from '@taskforge/db';
import { and, eq, isNull } from 'drizzle-orm';
import { MeiliSearch } from 'meilisearch';

const MEILISEARCH_URL = process.env.MEILISEARCH_URL ?? 'http://localhost:7700';
const MEILISEARCH_KEY = process.env.MEILISEARCH_MASTER_KEY ?? 'taskforge_dev_key';

const client = new MeiliSearch({ host: MEILISEARCH_URL, apiKey: MEILISEARCH_KEY });

export const TASKS_INDEX = 'tasks';
export const PROJECTS_INDEX = 'projects';
export const COMMENTS_INDEX = 'comments';

// --- Index initialization ---

export async function initIndexes(): Promise<void> {
  // Tasks index
  const tasksIdx = client.index(TASKS_INDEX);
  await tasksIdx.updateSettings({
    searchableAttributes: ['title', 'description'],
    filterableAttributes: ['status', 'priority', 'assigneeId', 'labels', 'projectId', 'dueDate'],
    sortableAttributes: ['dueDate', 'priority', 'createdAt'],
  });

  // Projects index
  const projectsIdx = client.index(PROJECTS_INDEX);
  await projectsIdx.updateSettings({
    searchableAttributes: ['name', 'description'],
    filterableAttributes: ['status'],
  });

  // Comments index
  const commentsIdx = client.index(COMMENTS_INDEX);
  await commentsIdx.updateSettings({
    searchableAttributes: ['body'],
    filterableAttributes: ['taskId', 'projectId', 'authorId'],
  });
}

// --- Index operations ---

export async function indexTask(taskId: string): Promise<void> {
  const result = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      statusId: tasks.statusId,
      statusName: workflowStatuses.name,
      priority: tasks.priority,
      assigneeId: tasks.assigneeId,
      assigneeName: users.displayName,
      projectId: tasks.projectId,
      projectName: projects.name,
      dueDate: tasks.dueDate,
      createdAt: tasks.createdAt,
    })
    .from(tasks)
    .leftJoin(workflowStatuses, eq(tasks.statusId, workflowStatuses.id))
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt)))
    .limit(1);

  if (result.length === 0) {
    await removeTask(taskId);
    return;
  }

  const row = result[0];

  // Fetch labels
  const taskLabelRows = await db
    .select({ name: labels.name })
    .from(taskLabels)
    .innerJoin(labels, eq(taskLabels.labelId, labels.id))
    .where(eq(taskLabels.taskId, taskId));

  const doc = {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.statusId,
    statusName: row.statusName,
    priority: row.priority,
    assigneeId: row.assigneeId,
    assigneeName: row.assigneeName,
    labels: taskLabelRows.map((l) => l.name),
    projectId: row.projectId,
    projectName: row.projectName,
    dueDate: row.dueDate?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };

  await client.index(TASKS_INDEX).addDocuments([doc]);
}

export async function removeTask(taskId: string): Promise<void> {
  await client.index(TASKS_INDEX).deleteDocument(taskId);
}

export async function indexProject(projectId: string): Promise<void> {
  const result = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1);

  if (result.length === 0) {
    await removeProject(projectId);
    return;
  }

  const row = result[0];
  await client.index(PROJECTS_INDEX).addDocuments([
    {
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status,
    },
  ]);
}

export async function removeProject(projectId: string): Promise<void> {
  await client.index(PROJECTS_INDEX).deleteDocument(projectId);
}

export async function indexComment(commentId: string): Promise<void> {
  const result = await db
    .select({
      id: comments.id,
      body: comments.body,
      authorId: comments.authorId,
      authorName: users.displayName,
      entityType: comments.entityType,
      entityId: comments.entityId,
      createdAt: comments.createdAt,
    })
    .from(comments)
    .leftJoin(users, eq(comments.authorId, users.id))
    .where(and(eq(comments.id, commentId), isNull(comments.deletedAt)))
    .limit(1);

  if (result.length === 0) {
    await removeComment(commentId);
    return;
  }

  const row = result[0];

  // Resolve projectId for task comments
  let projectId: string | null = null;
  if (row.entityType === 'task') {
    const taskRow = await db
      .select({ projectId: tasks.projectId })
      .from(tasks)
      .where(eq(tasks.id, row.entityId))
      .limit(1);
    projectId = taskRow[0]?.projectId ?? null;
  }

  await client.index(COMMENTS_INDEX).addDocuments([
    {
      id: row.id,
      body: row.body,
      authorId: row.authorId,
      authorName: row.authorName,
      taskId: row.entityType === 'task' ? row.entityId : null,
      projectId,
      createdAt: row.createdAt.toISOString(),
    },
  ]);
}

export async function removeComment(commentId: string): Promise<void> {
  await client.index(COMMENTS_INDEX).deleteDocument(commentId);
}

// --- Global search ---

export interface SearchOptions {
  query: string;
  types?: string[];
  projectId?: string;
  userId: string;
  limit?: number;
}

export interface SearchResults {
  tasks: { hits: unknown[]; totalHits: number };
  projects: { hits: unknown[]; totalHits: number };
  comments: { hits: unknown[]; totalHits: number };
}

export async function globalSearch(options: SearchOptions): Promise<SearchResults> {
  const { query, types, projectId, userId, limit = 20 } = options;

  // Get user's accessible project IDs for permission filtering
  const accessibleProjects = await db
    .select({ projectId: projectMembers.projectId })
    .from(projectMembers)
    .where(eq(projectMembers.userId, userId));
  const projectIds = accessibleProjects.map((r) => r.projectId);

  const searchTypes = types ?? ['task', 'project', 'comment'];
  const results: SearchResults = {
    tasks: { hits: [], totalHits: 0 },
    projects: { hits: [], totalHits: 0 },
    comments: { hits: [], totalHits: 0 },
  };

  if (projectIds.length === 0) {
    return results;
  }

  const projectFilter = projectId
    ? `projectId = "${projectId}"`
    : `projectId IN [${projectIds.map((id) => `"${id}"`).join(', ')}]`;

  if (searchTypes.includes('task')) {
    const taskResults = await client.index(TASKS_INDEX).search(query, {
      filter: projectFilter,
      limit,
    });
    results.tasks = { hits: taskResults.hits, totalHits: taskResults.estimatedTotalHits ?? 0 };
  }

  if (searchTypes.includes('project')) {
    // For projects, filter by accessible project IDs directly
    const idFilter = projectId
      ? `id = "${projectId}"`
      : `id IN [${projectIds.map((id) => `"${id}"`).join(', ')}]`;
    const projectResults = await client.index(PROJECTS_INDEX).search(query, {
      filter: idFilter,
      limit,
    });
    results.projects = {
      hits: projectResults.hits,
      totalHits: projectResults.estimatedTotalHits ?? 0,
    };
  }

  if (searchTypes.includes('comment')) {
    const commentResults = await client.index(COMMENTS_INDEX).search(query, {
      filter: projectFilter,
      limit,
    });
    results.comments = {
      hits: commentResults.hits,
      totalHits: commentResults.estimatedTotalHits ?? 0,
    };
  }

  return results;
}

// --- Resolve dynamic filter values ---

export function resolveDynamicFilters(
  filters: Record<string, unknown>,
  userId: string,
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(filters)) {
    if (value === 'me') {
      resolved[key] = userId;
    } else if (value === 'today') {
      resolved[key] = new Date().toISOString().split('T')[0];
    } else if (Array.isArray(value)) {
      resolved[key] = value.map((v) => {
        if (v === 'me') return userId;
        if (v === 'today') return new Date().toISOString().split('T')[0];
        return v;
      });
    } else {
      resolved[key] = value;
    }
  }

  return resolved;
}
