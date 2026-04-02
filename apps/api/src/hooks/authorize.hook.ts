import type { Action, Resource } from '@taskforge/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  checkPermission,
  getOrgIdFromProject,
  getProjectIdFromTask,
  loadPermissionContext,
} from '../services/permission.service.js';
import type { PermissionContext } from '../services/permission.service.js';
import { AppError, ErrorCode } from '../utils/errors.js';

declare module 'fastify' {
  interface FastifyRequest {
    permissionContext?: PermissionContext;
  }
}

interface AuthorizeOptions {
  resource: Resource;
  action: Action;
  /**
   * Extract the organization ID from the request.
   * Defaults to `request.params.id` (for org routes) or derived from projectId.
   */
  getOrgId?: (request: FastifyRequest) => string | undefined;
  /**
   * Extract the project ID from the request (for project-scoped permission checks).
   */
  getProjectId?: (request: FastifyRequest) => string | undefined;
  /**
   * Extract the task ID from the request (resolves project + org from the task).
   * May be async (e.g. when resolving from a checklist or checklist item).
   */
  getTaskId?: (request: FastifyRequest) => string | undefined | Promise<string>;
}

/**
 * Returns a Fastify preHandler that checks if the authenticated user
 * has the required permission for the given resource and action.
 *
 * Must be used AFTER `fastify.authenticate`.
 */
export function authorize(options: AuthorizeOptions) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    if (!request.authUser) {
      throw new AppError(401, ErrorCode.UNAUTHORIZED, 'Not authenticated');
    }

    const userId = request.authUser.userId;
    const params = request.params as Record<string, string>;

    // Resolve orgId
    let orgId: string | undefined;
    if (options.getOrgId) {
      orgId = options.getOrgId(request);
    }

    // Resolve projectId
    let projectId: string | undefined;
    if (options.getProjectId) {
      projectId = options.getProjectId(request);
    } else if (params.projectId) {
      projectId = params.projectId;
    }

    // Resolve from taskId if no projectId/orgId yet
    if (!projectId && !orgId) {
      const taskId = (await options.getTaskId?.(request)) ?? params.taskId;
      if (taskId) {
        const resolved = await getProjectIdFromTask(taskId);
        if (!resolved) {
          throw new AppError(404, ErrorCode.NOT_FOUND, 'Task not found');
        }
        projectId = resolved.projectId;
        orgId = resolved.orgId;
      }
    }

    // If we have a projectId but no orgId, resolve orgId from the project
    if (projectId && !orgId) {
      const resolvedOrgId = await getOrgIdFromProject(projectId);
      if (!resolvedOrgId) {
        throw new AppError(404, ErrorCode.NOT_FOUND, 'Project not found');
      }
      orgId = resolvedOrgId;
    }

    // Fall back to route params for orgId
    if (!orgId) {
      orgId = params.orgId ?? params.organizationId ?? params.id;
    }

    if (!orgId) {
      throw new AppError(400, ErrorCode.BAD_REQUEST, 'Organization context required');
    }

    // Load permission context (cached per request)
    if (!request.permissionContext || request.permissionContext.orgId !== orgId) {
      const ctx = await loadPermissionContext(userId, orgId);
      if (!ctx) {
        throw new AppError(403, ErrorCode.FORBIDDEN, 'Insufficient permissions');
      }
      request.permissionContext = ctx;
    }

    const allowed = await checkPermission(
      request.permissionContext,
      userId,
      options.resource,
      options.action,
      projectId,
    );

    if (!allowed) {
      throw new AppError(403, ErrorCode.FORBIDDEN, 'Insufficient permissions');
    }
  };
}
