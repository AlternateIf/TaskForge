import {
  comments,
  db,
  labels,
  organizationMembers,
  projects,
  taskLabels,
  tasks,
  users,
  workflowStatuses,
} from '@taskforge/db';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { MeiliSearch } from 'meilisearch';

const MEILISEARCH_URL = process.env.MEILISEARCH_URL ?? 'http://localhost:7700';
const MEILISEARCH_KEY = process.env.MEILISEARCH_MASTER_KEY ?? 'taskforge_dev_key';

const client = new MeiliSearch({ host: MEILISEARCH_URL, apiKey: MEILISEARCH_KEY });

export const TASKS_INDEX = 'tasks';
export const PROJECTS_INDEX = 'projects';
export const COMMENTS_INDEX = 'comments';

let didBootstrap = false;
const SHOULD_BOOTSTRAP = process.env.NODE_ENV !== 'test';

// --- Index initialization ---

export async function initIndexes(): Promise<void> {
  // Tasks index
  const tasksIdx = client.index(TASKS_INDEX);
  await tasksIdx.updateSettings({
    searchableAttributes: ['title', 'description', 'projectName'],
    filterableAttributes: ['status', 'priority', 'assigneeId', 'labels', 'projectId', 'dueDate'],
    sortableAttributes: ['dueDate', 'priority', 'createdAt'],
  });

  // Projects index
  const projectsIdx = client.index(PROJECTS_INDEX);
  await projectsIdx.updateSettings({
    searchableAttributes: ['name', 'slug', 'description'],
    filterableAttributes: ['id', 'status'],
  });

  // Comments index
  const commentsIdx = client.index(COMMENTS_INDEX);
  await commentsIdx.updateSettings({
    searchableAttributes: ['body', 'authorName'],
    filterableAttributes: ['taskId', 'projectId', 'authorId'],
  });

  if (SHOULD_BOOTSTRAP) {
    await bootstrapIndexesIfNeeded();
  }
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

  await client.index(TASKS_INDEX).addDocuments([doc], { primaryKey: 'id' });
}

export async function removeTask(taskId: string): Promise<void> {
  await client.index(TASKS_INDEX).deleteDocument(taskId);
}

export async function indexProject(projectId: string): Promise<void> {
  const result = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      status: projects.status,
      slug: projects.slug,
    })
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1);

  if (result.length === 0) {
    await removeProject(projectId);
    return;
  }

  const row = result[0];
  await client.index(PROJECTS_INDEX).addDocuments(
    [
      {
        id: row.id,
        name: row.name,
        description: row.description,
        status: row.status,
        slug: row.slug,
      },
    ],
    { primaryKey: 'id' },
  );
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

  await client.index(COMMENTS_INDEX).addDocuments(
    [
      {
        id: row.id,
        body: row.body,
        authorId: row.authorId,
        authorName: row.authorName,
        taskId: row.entityType === 'task' ? row.entityId : null,
        projectId,
        createdAt: row.createdAt.toISOString(),
      },
    ],
    { primaryKey: 'id' },
  );
}

export async function removeComment(commentId: string): Promise<void> {
  await client.index(COMMENTS_INDEX).deleteDocument(commentId);
}

async function bootstrapIndexesIfNeeded(): Promise<void> {
  if (didBootstrap) {
    return;
  }

  await reindexAllDocuments();
  didBootstrap = true;
}

async function reindexAllDocuments(): Promise<void> {
  await Promise.all([reindexAllProjects(), reindexAllTasks(), reindexAllComments()]);
}

async function reindexAllProjects(): Promise<void> {
  const projectRows = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      status: projects.status,
      slug: projects.slug,
    })
    .from(projects)
    .where(isNull(projects.deletedAt));

  if (projectRows.length === 0) {
    return;
  }

  await client.index(PROJECTS_INDEX).addDocuments(projectRows, { primaryKey: 'id' });
}

async function reindexAllTasks(): Promise<void> {
  const taskRows = await db
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
    .where(and(isNull(tasks.deletedAt), isNull(projects.deletedAt)));

  if (taskRows.length === 0) {
    return;
  }

  const taskIds = taskRows.map((row) => row.id);
  const taskLabelRows =
    taskIds.length > 0
      ? await db
          .select({ taskId: taskLabels.taskId, name: labels.name })
          .from(taskLabels)
          .innerJoin(labels, eq(taskLabels.labelId, labels.id))
          .where(inArray(taskLabels.taskId, taskIds))
      : [];

  const labelsByTask = new Map<string, string[]>();
  for (const label of taskLabelRows) {
    const existing = labelsByTask.get(label.taskId) ?? [];
    existing.push(label.name);
    labelsByTask.set(label.taskId, existing);
  }

  await client.index(TASKS_INDEX).addDocuments(
    taskRows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.statusId,
      statusName: row.statusName,
      priority: row.priority,
      assigneeId: row.assigneeId,
      assigneeName: row.assigneeName,
      labels: labelsByTask.get(row.id) ?? [],
      projectId: row.projectId,
      projectName: row.projectName,
      dueDate: row.dueDate?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    })),
    { primaryKey: 'id' },
  );
}

async function reindexAllComments(): Promise<void> {
  const commentRows = await db
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
    .where(isNull(comments.deletedAt));

  if (commentRows.length === 0) {
    return;
  }

  const taskIds = [
    ...new Set(commentRows.filter((row) => row.entityType === 'task').map((row) => row.entityId)),
  ];
  const taskProjectRows =
    taskIds.length > 0
      ? await db
          .select({ id: tasks.id, projectId: tasks.projectId })
          .from(tasks)
          .where(inArray(tasks.id, taskIds))
      : [];
  const taskProjectMap = new Map(taskProjectRows.map((row) => [row.id, row.projectId]));

  await client.index(COMMENTS_INDEX).addDocuments(
    commentRows.map((row) => ({
      id: row.id,
      body: row.body,
      authorId: row.authorId,
      authorName: row.authorName,
      taskId: row.entityType === 'task' ? row.entityId : null,
      projectId: row.entityType === 'task' ? (taskProjectMap.get(row.entityId) ?? null) : null,
      createdAt: row.createdAt.toISOString(),
    })),
    { primaryKey: 'id' },
  );
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

async function searchTasksIndex(
  query: string,
  filter: string,
  limit: number,
): Promise<{ hits: unknown[]; totalHits: number }> {
  try {
    const taskResults = await client.index(TASKS_INDEX).search(query, {
      filter,
      limit,
    });
    return { hits: taskResults.hits, totalHits: taskResults.estimatedTotalHits ?? 0 };
  } catch {
    return { hits: [], totalHits: 0 };
  }
}

async function searchProjectsIndex(
  query: string,
  filter: string,
  limit: number,
): Promise<{ hits: unknown[]; totalHits: number }> {
  try {
    const projectResults = await client.index(PROJECTS_INDEX).search(query, {
      filter,
      limit,
    });
    return { hits: projectResults.hits, totalHits: projectResults.estimatedTotalHits ?? 0 };
  } catch {
    return { hits: [], totalHits: 0 };
  }
}

export async function globalSearch(options: SearchOptions): Promise<SearchResults> {
  const { query, types, projectId, userId, limit = 100 } = options;

  if (SHOULD_BOOTSTRAP) {
    try {
      await bootstrapIndexesIfNeeded();
    } catch {
      // Search can still proceed against whatever documents are currently indexed.
    }
  }

  // Get user's accessible project IDs for permission filtering.
  // A user can access all non-deleted projects in orgs where they are a member.
  const accessibleProjects = await db
    .select({ projectId: projects.id })
    .from(projects)
    .innerJoin(organizationMembers, eq(organizationMembers.organizationId, projects.organizationId))
    .where(and(eq(organizationMembers.userId, userId), isNull(projects.deletedAt)));
  const projectIds = [...new Set(accessibleProjects.map((r) => r.projectId))];

  const requestedTypes = types ?? ['task', 'project'];
  const searchTypes = [...new Set(requestedTypes)].filter(
    (type): type is 'task' | 'project' => type === 'task' || type === 'project',
  );
  const includesTask = searchTypes.includes('task');
  const includesProject = searchTypes.includes('project');

  let taskLimit = includesTask ? limit : 0;
  let projectLimit = includesProject ? limit : 0;

  if (includesTask && includesProject) {
    // Primary split for mixed task/project search: 90% tasks, 10% projects.
    taskLimit = Math.max(1, Math.floor(limit * 0.9));
    projectLimit = Math.max(1, limit - taskLimit);
  }

  const results: SearchResults = {
    tasks: { hits: [], totalHits: 0 },
    projects: { hits: [], totalHits: 0 },
    comments: { hits: [], totalHits: 0 },
  };

  if (projectIds.length === 0) {
    return results;
  }

  // Validate projectId is accessible and is a valid UUID (prevents filter injection)
  if (projectId) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(projectId) || !projectIds.includes(projectId)) {
      return results; // Return empty results for unauthorized or invalid project
    }
  }

  const projectFilter = projectId
    ? `projectId = "${projectId}"`
    : `projectId IN [${projectIds.map((id) => `"${id}"`).join(', ')}]`;
  const idFilter = projectId
    ? `id = "${projectId}"`
    : `id IN [${projectIds.map((id) => `"${id}"`).join(', ')}]`;

  if (includesTask) {
    results.tasks = await searchTasksIndex(query, projectFilter, taskLimit);
  }

  if (includesProject) {
    // For projects, filter by accessible project IDs directly.
    // projectId is already validated above against accessible list + UUID format.
    results.projects = await searchProjectsIndex(query, idFilter, projectLimit);
  }

  // If one side has no matches, use full budget for the other side.
  if (includesTask && includesProject) {
    if (results.tasks.totalHits === 0 && results.projects.totalHits > 0 && projectLimit < limit) {
      results.projects = await searchProjectsIndex(query, idFilter, limit);
    }
    if (results.projects.totalHits === 0 && results.tasks.totalHits > 0 && taskLimit < limit) {
      results.tasks = await searchTasksIndex(query, projectFilter, limit);
    }
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
