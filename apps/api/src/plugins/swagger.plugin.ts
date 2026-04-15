import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import fp from 'fastify-plugin';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';

const PATH_PARAM_DESCRIPTIONS: Record<string, string> = {
  id: 'Unique identifier of the target resource.',
  orgId: 'Unique identifier of the organization.',
  organizationId: 'Unique identifier of the organization.',
  projectId: 'Unique identifier of the project.',
  taskId: 'Unique identifier of the task.',
  memberId: 'Unique identifier of the member.',
  statusId: 'Unique identifier of the workflow status.',
  labelId: 'Unique identifier of the label.',
  provider: 'OAuth provider slug (for example: google or github).',
};

const QUERY_PARAM_DESCRIPTIONS: Record<string, string> = {
  cursor: 'Pagination cursor returned by a previous response.',
  limit: 'Maximum number of records to return.',
  q: 'Search text query.',
  type: 'Optional entity type filter.',
  status: 'Status filter.',
  search: 'Free-text filter.',
  priority: 'Priority filter.',
  assigneeId: 'Filter by assignee user ID.',
  labelId: 'Filter by label ID.',
  dueDateFrom: 'Filter tasks due on or after this date (ISO-8601).',
  dueDateTo: 'Filter tasks due on or before this date (ISO-8601).',
  sort: 'Field used for sorting results.',
  order: 'Sort direction (`asc` or `desc`).',
};

const SPECIAL_SUMMARIES: Record<string, string> = {
  'GET /health': 'Health check',
  'GET /ready': 'Readiness check',
  'POST /api/v1/auth/refresh': 'Refresh access token',
  'POST /api/v1/auth/logout': 'Log out current session',
  'GET /api/v1/auth/oauth/providers': 'List OAuth providers',
  'GET /api/v1/auth/oauth/:provider': 'Start OAuth login',
  'GET /api/v1/auth/oauth/:provider/callback': 'Handle OAuth callback',
  'POST /api/v1/notifications/read-all': 'Mark all notifications as read',
  'GET /api/v1/notifications/unread-count': 'Get unread notification count',
  'POST /api/v1/tasks/:id/watch': 'Watch task',
  'DELETE /api/v1/tasks/:id/watch': 'Unwatch task',
  'PATCH /api/v1/tasks/:id/position': 'Update task position',
  'GET /api/v1/organizations/:id/members/:userId/effective-permissions':
    'Get member effective permissions',
  'POST /api/v1/projects/:id/finish': 'Finish project',
  'POST /api/v1/projects/:id/archive': 'Archive project',
};

const SPECIAL_DESCRIPTIONS: Record<string, string> = {
  'POST /api/v1/projects/:id/finish':
    'Mark a project as finished. All non-deleted tasks must be in a final workflow status (isFinal=true). Returns 422 if non-final tasks exist. Idempotent: returns current state if already finished.',
  'POST /api/v1/projects/:id/archive':
    'Archive a project. Validates that all non-deleted tasks are in a final workflow status. Returns 422 if non-final tasks exist. Idempotent: returns current state if already archived.',
  'PATCH /api/v1/tasks/:id':
    'Update a task. When changing statusId to a final or validated workflow status (isFinal=true or isValidated=true), returns 422 TRANSITION_BLOCKED if the task has unresolved blockers or incomplete checklist items.',
  'PATCH /api/v1/tasks/:id/position':
    'Update task position. When the new position implies a status change to a final or validated workflow status (isFinal=true or isValidated=true), returns 422 TRANSITION_BLOCKED if the task has unresolved blockers or incomplete checklist items.',
};

const TAGS_BY_ROOT: Record<string, string> = {
  auth: 'Auth',
  organizations: 'Organizations',
  projects: 'Projects',
  tasks: 'Tasks',
  checklists: 'Checklists',
  comments: 'Comments',
  attachments: 'Attachments',
  activity: 'Activity',
  search: 'Search',
  'saved-filters': 'Saved Filters',
  notifications: 'Notifications',
  'notification-preferences': 'Notifications',
  users: 'Users',
};

const SEGMENT_LABELS: Record<string, string> = {
  organizations: 'organization',
  projects: 'project',
  tasks: 'task',
  checklists: 'checklist',
  comments: 'comment',
  attachments: 'attachment',
  notifications: 'notification',
  members: 'member',
  labels: 'label',
  workflows: 'workflow',
  'workflow-statuses': 'workflow status',
  dependencies: 'dependency',
  subtasks: 'subtask',
  items: 'item',
  features: 'feature toggle',
  'auth-settings': 'auth settings',
  'saved-filters': 'saved filter',
  'notification-preferences': 'notification preference',
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getMethod(method: unknown): string {
  if (typeof method === 'string') return method.toUpperCase();
  if (Array.isArray(method)) {
    const first = method.find((entry): entry is string => typeof entry === 'string');
    if (first) return first.toUpperCase();
  }
  return 'GET';
}

function normalizePath(url: string): string {
  return url.split('?')[0] ?? url;
}

function toTitleCase(value: string): string {
  return value
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function singularize(value: string): string {
  if (value.endsWith('ies')) return `${value.slice(0, -3)}y`;
  if (value.endsWith('ses')) return value.slice(0, -2);
  if (value.endsWith('s')) return value.slice(0, -1);
  return value;
}

function segmentToLabel(segment: string): string {
  const fromMap = SEGMENT_LABELS[segment];
  if (fromMap) return fromMap;
  return singularize(segment.replace(/-/g, ' '));
}

function staticSegments(url: string): string[] {
  const raw = normalizePath(url).split('/').filter(Boolean);
  const trimmed = raw[0] === 'api' && raw[1] === 'v1' ? raw.slice(2) : raw;
  return trimmed.filter((segment) => !segment.startsWith(':'));
}

function inferTag(url: string): string {
  if (url === '/health' || url === '/ready') return 'Health';
  const segments = staticSegments(url);
  if (segments.length === 0) return 'General';
  if (segments[0] === 'auth' && segments[1] === 'oauth') return 'OAuth';
  if (segments[0] === 'auth' && segments[1] === 'mfa') return 'MFA';
  return TAGS_BY_ROOT[segments[0]] ?? toTitleCase(segmentToLabel(segments[0]));
}

function inferSummary(method: string, url: string): string {
  const path = normalizePath(url);
  const special = SPECIAL_SUMMARIES[`${method} ${path}`];
  if (special) return special;

  const segments = staticSegments(path);
  if (segments.length === 0) return `${method} ${path}`;

  const last = segments[segments.length - 1] ?? '';
  const previous = segments[segments.length - 2] ?? last;
  const lastLabel = toTitleCase(segmentToLabel(last));
  const previousLabel = toTitleCase(segmentToLabel(previous));
  const endsWithParam = /\/:[^/]+$/.test(path);

  if (method === 'GET') {
    if (endsWithParam) return `Get ${lastLabel}`;
    return `List ${lastLabel}`;
  }
  if (method === 'POST') {
    if (last === 'archive') return `Archive ${previousLabel}`;
    if (last === 'assign') return `Assign ${previousLabel}`;
    return `Create ${lastLabel}`;
  }
  if (method === 'PATCH' || method === 'PUT') {
    return `Update ${endsWithParam ? lastLabel : previousLabel}`;
  }
  if (method === 'DELETE') {
    return `Delete ${endsWithParam ? lastLabel : previousLabel}`;
  }
  return `${method} ${path}`;
}

function inferPathParamNames(url: string): string[] {
  const matches = normalizePath(url).matchAll(/:([A-Za-z0-9_]+)/g);
  const unique = new Set<string>();
  for (const match of matches) {
    if (match[1]) unique.add(match[1]);
  }
  return [...unique];
}

function inferParamDescription(name: string): string {
  const known = PATH_PARAM_DESCRIPTIONS[name];
  if (known) return known;
  if (name.endsWith('Id') && name.length > 2) {
    const label = toTitleCase(segmentToLabel(name.slice(0, -2)));
    return `Unique identifier of the ${label.toLowerCase()}.`;
  }
  return `Path parameter: ${name}.`;
}

function addPathParamDescriptions(schema: Record<string, unknown>, url: string): void {
  const names = inferPathParamNames(url);
  if (names.length === 0) return;

  const params = isObject(schema.params) ? { ...schema.params } : {};
  const properties = isObject(params.properties) ? { ...params.properties } : {};
  const required = Array.isArray(params.required)
    ? params.required.filter((entry): entry is string => typeof entry === 'string')
    : [];

  for (const name of names) {
    const current = properties[name];
    if (isObject(current)) {
      const next: Record<string, unknown> = { type: 'string', ...current };
      if (typeof next.description !== 'string') {
        next.description = inferParamDescription(name);
      }
      properties[name] = next;
    } else {
      properties[name] = {
        type: 'string',
        description: inferParamDescription(name),
      };
    }

    if (!required.includes(name)) required.push(name);
  }

  params.type = 'object';
  params.properties = properties;
  params.required = required;
  schema.params = params;
}

function addQueryParamDescriptions(schema: Record<string, unknown>): void {
  if (!isObject(schema.querystring)) return;
  if (!isObject(schema.querystring.properties)) return;

  const properties = { ...schema.querystring.properties };
  for (const [name, current] of Object.entries(properties)) {
    if (!isObject(current)) continue;
    if (typeof current.description === 'string') continue;

    const inferred =
      QUERY_PARAM_DESCRIPTIONS[name] ??
      (name.endsWith('Id')
        ? `Filter by ${toTitleCase(segmentToLabel(name.slice(0, -2))).toLowerCase()} ID.`
        : undefined);
    if (inferred) {
      properties[name] = { ...current, description: inferred };
    }
  }

  schema.querystring = { ...schema.querystring, properties };
}

export default fp(
  async (fastify) => {
    await fastify.register(swagger, {
      openapi: {
        info: {
          title: 'TaskForge API',
          description: 'TaskForge project management API',
          version: '1.0.0',
        },
        servers: [{ url: `http://localhost:${process.env.PORT ?? 3000}` }],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
      },
      transform: (input) => {
        const transformed = jsonSchemaTransform(input);
        const method = getMethod(input.route.method);
        const path = normalizePath(transformed.url ?? input.url);

        if (path.startsWith('/docs')) return transformed;

        const schema = isObject(transformed.schema) ? { ...transformed.schema } : {};
        if (!Array.isArray(schema.tags) || schema.tags.length === 0) {
          schema.tags = [inferTag(path)];
        }

        if (typeof schema.summary !== 'string') {
          schema.summary = inferSummary(method, path);
        }
        if (typeof schema.description !== 'string') {
          const specialDesc = SPECIAL_DESCRIPTIONS[`${method} ${path}`];
          schema.description = specialDesc ?? `${schema.summary as string}.`;
        }

        addPathParamDescriptions(schema, path);
        addQueryParamDescriptions(schema);

        return { ...transformed, schema };
      },
    });

    await fastify.register(swaggerUi, {
      routePrefix: '/docs',
    });
  },
  { name: 'swagger' },
);
