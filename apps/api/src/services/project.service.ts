import crypto from 'node:crypto';
import {
  db,
  labels,
  projectMembers,
  projects,
  roles,
  users,
  workflowStatuses,
  workflows,
} from '@taskforge/db';
import type { CreateProjectInput, UpdateProjectInput } from '@taskforge/shared';
import { and, eq, isNull } from 'drizzle-orm';
import { AppError, ErrorCode } from '../utils/errors.js';

const DEFAULT_STATUSES = [
  { name: 'To Do', color: '#6B7280', position: 0, isInitial: true, isFinal: false },
  { name: 'In Progress', color: '#3B82F6', position: 1, isInitial: false, isFinal: false },
  { name: 'Review', color: '#EAB308', position: 2, isInitial: false, isFinal: false },
  { name: 'Done', color: '#22C55E', position: 3, isInitial: false, isFinal: true },
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function generateUniqueSlug(name: string, orgId: string): Promise<string> {
  const base = slugify(name) || `project-${crypto.randomBytes(4).toString('hex')}`;

  const existing = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.organizationId, orgId), eq(projects.slug, base)))
    .limit(1);

  if (existing.length === 0) return base;

  for (let i = 2; i <= 100; i++) {
    const candidate = `${base}-${i}`;
    const found = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.organizationId, orgId), eq(projects.slug, candidate)))
      .limit(1);
    if (found.length === 0) return candidate;
  }

  return `${base}-${crypto.randomBytes(4).toString('hex')}`;
}

export interface ProjectOutput {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  status: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

function toProjectOutput(p: typeof projects.$inferSelect): ProjectOutput {
  return {
    id: p.id,
    organizationId: p.organizationId,
    name: p.name,
    slug: p.slug,
    description: p.description ?? null,
    color: p.color ?? null,
    icon: p.icon ?? null,
    status: p.status,
    createdBy: p.createdBy ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export async function createProject(
  orgId: string,
  userId: string,
  input: CreateProjectInput,
): Promise<ProjectOutput> {
  const projectId = crypto.randomUUID();
  const slug = await generateUniqueSlug(input.name, orgId);
  const now = new Date();

  await db.insert(projects).values({
    id: projectId,
    organizationId: orgId,
    name: input.name,
    slug,
    description: input.description ?? null,
    color: input.color ?? null,
    icon: input.icon ?? null,
    status: 'active',
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  });

  // Create default workflow
  const workflowId = crypto.randomUUID();
  await db.insert(workflows).values({
    id: workflowId,
    projectId,
    name: 'Default',
    isDefault: true,
    createdAt: now,
    updatedAt: now,
  });

  for (const s of DEFAULT_STATUSES) {
    await db.insert(workflowStatuses).values({
      id: crypto.randomUUID(),
      workflowId,
      name: s.name,
      color: s.color,
      position: s.position,
      isInitial: s.isInitial,
      isFinal: s.isFinal,
      createdAt: now,
    });
  }

  // Add creator as project member
  await db.insert(projectMembers).values({
    id: crypto.randomUUID(),
    projectId,
    userId,
    roleId: null,
    createdAt: now,
  });

  const project = (await db.select().from(projects).where(eq(projects.id, projectId)).limit(1))[0];

  return toProjectOutput(project);
}

export async function listProjects(
  orgId: string,
  filters?: { status?: string; search?: string },
): Promise<ProjectOutput[]> {
  const conditions = [eq(projects.organizationId, orgId), isNull(projects.deletedAt)];

  if (filters?.status) {
    conditions.push(eq(projects.status, filters.status as 'active' | 'archived' | 'deleted'));
  }

  const result = await db
    .select()
    .from(projects)
    .where(and(...conditions));

  let filtered = result;
  if (filters?.search) {
    const term = filters.search.toLowerCase();
    filtered = result.filter(
      (p) => p.name.toLowerCase().includes(term) || p.description?.toLowerCase().includes(term),
    );
  }

  return filtered.map(toProjectOutput);
}

export async function getProject(projectId: string): Promise<ProjectOutput> {
  const project = (
    await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
      .limit(1)
  )[0];

  if (!project) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Project not found');
  }

  return toProjectOutput(project);
}

export async function updateProject(
  projectId: string,
  input: UpdateProjectInput,
): Promise<ProjectOutput> {
  const project = (
    await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
      .limit(1)
  )[0];

  if (!project) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Project not found');
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.color !== undefined) updateData.color = input.color;
  if (input.icon !== undefined) updateData.icon = input.icon;

  await db.update(projects).set(updateData).where(eq(projects.id, projectId));

  return getProject(projectId);
}

export async function archiveProject(projectId: string): Promise<ProjectOutput> {
  const project = (
    await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
      .limit(1)
  )[0];

  if (!project) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Project not found');
  }

  await db
    .update(projects)
    .set({ status: 'archived', updatedAt: new Date() })
    .where(eq(projects.id, projectId));

  return getProject(projectId);
}

export async function deleteProject(projectId: string): Promise<void> {
  const project = (
    await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
      .limit(1)
  )[0];

  if (!project) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Project not found');
  }

  await db
    .update(projects)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(projects.id, projectId));
}

// --- Members ---

export interface ProjectMemberOutput {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  roleId: string | null;
  roleName: string | null;
  createdAt: string;
}

export async function listProjectMembers(projectId: string): Promise<ProjectMemberOutput[]> {
  const members = await db
    .select({
      id: projectMembers.id,
      userId: projectMembers.userId,
      roleId: projectMembers.roleId,
      createdAt: projectMembers.createdAt,
      email: users.email,
      displayName: users.displayName,
    })
    .from(projectMembers)
    .innerJoin(users, eq(projectMembers.userId, users.id))
    .where(eq(projectMembers.projectId, projectId));

  const result: ProjectMemberOutput[] = [];
  for (const m of members) {
    let roleName: string | null = null;
    if (m.roleId) {
      const role = (
        await db.select({ name: roles.name }).from(roles).where(eq(roles.id, m.roleId)).limit(1)
      )[0];
      roleName = role?.name ?? null;
    }
    result.push({
      id: m.id,
      userId: m.userId,
      email: m.email,
      displayName: m.displayName,
      roleId: m.roleId,
      roleName,
      createdAt: m.createdAt.toISOString(),
    });
  }

  return result;
}

export async function addProjectMember(
  projectId: string,
  userId: string,
  roleId: string | null | undefined,
): Promise<ProjectMemberOutput> {
  // Check if already a member
  const existing = await db
    .select({ id: projectMembers.id })
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
    .limit(1);

  if (existing.length > 0) {
    throw new AppError(409, ErrorCode.CONFLICT, 'User is already a project member');
  }

  // Verify user exists
  const user = (
    await db
      .select({ id: users.id, email: users.email, displayName: users.displayName })
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1)
  )[0];

  if (!user) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'User not found');
  }

  let roleName: string | null = null;
  if (roleId) {
    const role = (
      await db.select({ name: roles.name }).from(roles).where(eq(roles.id, roleId)).limit(1)
    )[0];
    if (!role) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Role not found');
    }
    roleName = role.name;
  }

  const memberId = crypto.randomUUID();
  const now = new Date();

  await db.insert(projectMembers).values({
    id: memberId,
    projectId,
    userId,
    roleId: roleId ?? null,
    createdAt: now,
  });

  return {
    id: memberId,
    userId,
    email: user.email,
    displayName: user.displayName,
    roleId: roleId ?? null,
    roleName,
    createdAt: now.toISOString(),
  };
}

export async function updateProjectMember(
  projectId: string,
  memberId: string,
  roleId: string | null,
): Promise<ProjectMemberOutput> {
  const member = (
    await db
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.id, memberId), eq(projectMembers.projectId, projectId)))
      .limit(1)
  )[0];

  if (!member) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Project member not found');
  }

  // The projectMembers table doesn't have updatedAt, so we just update roleId
  await db.update(projectMembers).set({ roleId }).where(eq(projectMembers.id, memberId));

  const user = (
    await db
      .select({ email: users.email, displayName: users.displayName })
      .from(users)
      .where(eq(users.id, member.userId))
      .limit(1)
  )[0];

  let roleName: string | null = null;
  if (roleId) {
    const role = (
      await db.select({ name: roles.name }).from(roles).where(eq(roles.id, roleId)).limit(1)
    )[0];
    roleName = role?.name ?? null;
  }

  return {
    id: memberId,
    userId: member.userId,
    email: user.email,
    displayName: user.displayName,
    roleId,
    roleName,
    createdAt: member.createdAt.toISOString(),
  };
}

export async function removeProjectMember(projectId: string, memberId: string): Promise<void> {
  const member = (
    await db
      .select({ id: projectMembers.id })
      .from(projectMembers)
      .where(and(eq(projectMembers.id, memberId), eq(projectMembers.projectId, projectId)))
      .limit(1)
  )[0];

  if (!member) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Project member not found');
  }

  await db.delete(projectMembers).where(eq(projectMembers.id, memberId));
}

// --- Workflows ---

export interface WorkflowOutput {
  id: string;
  name: string;
  isDefault: boolean;
  statuses: WorkflowStatusOutput[];
}

export interface WorkflowStatusOutput {
  id: string;
  name: string;
  color: string | null;
  position: number;
  isInitial: boolean;
  isFinal: boolean;
}

export async function getProjectWorkflows(projectId: string): Promise<WorkflowOutput[]> {
  const wfs = await db.select().from(workflows).where(eq(workflows.projectId, projectId));

  const result: WorkflowOutput[] = [];
  for (const wf of wfs) {
    const statuses = await db
      .select()
      .from(workflowStatuses)
      .where(eq(workflowStatuses.workflowId, wf.id))
      .orderBy(workflowStatuses.position);

    result.push({
      id: wf.id,
      name: wf.name,
      isDefault: wf.isDefault,
      statuses: statuses.map((s) => ({
        id: s.id,
        name: s.name,
        color: s.color ?? null,
        position: s.position,
        isInitial: s.isInitial,
        isFinal: s.isFinal,
      })),
    });
  }

  return result;
}

export async function createWorkflow(projectId: string, name: string): Promise<WorkflowOutput> {
  const workflowId = crypto.randomUUID();
  const now = new Date();

  await db.insert(workflows).values({
    id: workflowId,
    projectId,
    name,
    isDefault: false,
    createdAt: now,
    updatedAt: now,
  });

  return { id: workflowId, name, isDefault: false, statuses: [] };
}

export async function addWorkflowStatus(
  projectId: string,
  input: { name: string; color?: string; isInitial?: boolean; isFinal?: boolean },
): Promise<WorkflowStatusOutput> {
  // Find the default workflow for this project
  const workflow = (
    await db
      .select()
      .from(workflows)
      .where(and(eq(workflows.projectId, projectId), eq(workflows.isDefault, true)))
      .limit(1)
  )[0];

  if (!workflow) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Default workflow not found');
  }

  // Get max position
  const existing = await db
    .select({ position: workflowStatuses.position })
    .from(workflowStatuses)
    .where(eq(workflowStatuses.workflowId, workflow.id))
    .orderBy(workflowStatuses.position);

  const maxPosition = existing.length > 0 ? existing[existing.length - 1].position : -1;

  const statusId = crypto.randomUUID();
  await db.insert(workflowStatuses).values({
    id: statusId,
    workflowId: workflow.id,
    name: input.name,
    color: input.color ?? null,
    position: maxPosition + 1,
    isInitial: input.isInitial ?? false,
    isFinal: input.isFinal ?? false,
    createdAt: new Date(),
  });

  return {
    id: statusId,
    name: input.name,
    color: input.color ?? null,
    position: maxPosition + 1,
    isInitial: input.isInitial ?? false,
    isFinal: input.isFinal ?? false,
  };
}

export async function updateWorkflowStatus(
  statusId: string,
  input: {
    name?: string;
    color?: string | null;
    position?: number;
    isInitial?: boolean;
    isFinal?: boolean;
  },
): Promise<WorkflowStatusOutput> {
  const status = (
    await db.select().from(workflowStatuses).where(eq(workflowStatuses.id, statusId)).limit(1)
  )[0];

  if (!status) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Workflow status not found');
  }

  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.color !== undefined) updateData.color = input.color;
  if (input.position !== undefined) updateData.position = input.position;
  if (input.isInitial !== undefined) updateData.isInitial = input.isInitial;
  if (input.isFinal !== undefined) updateData.isFinal = input.isFinal;

  if (Object.keys(updateData).length > 0) {
    await db.update(workflowStatuses).set(updateData).where(eq(workflowStatuses.id, statusId));
  }

  const updated = (
    await db.select().from(workflowStatuses).where(eq(workflowStatuses.id, statusId)).limit(1)
  )[0];

  return {
    id: updated.id,
    name: updated.name,
    color: updated.color ?? null,
    position: updated.position,
    isInitial: updated.isInitial,
    isFinal: updated.isFinal,
  };
}

export async function deleteWorkflowStatus(projectId: string, statusId: string): Promise<void> {
  const status = (
    await db.select().from(workflowStatuses).where(eq(workflowStatuses.id, statusId)).limit(1)
  )[0];

  if (!status) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Workflow status not found');
  }

  // Check if any tasks use this status (tasks table has status_id)
  // Import tasks dynamically to avoid circular deps
  const { tasks } = await import('@taskforge/db');
  const tasksUsingStatus = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(eq(tasks.statusId, statusId))
    .limit(1);

  if (tasksUsingStatus.length > 0) {
    throw new AppError(
      400,
      ErrorCode.BAD_REQUEST,
      'Cannot delete status: tasks are still assigned to it',
    );
  }

  await db.delete(workflowStatuses).where(eq(workflowStatuses.id, statusId));
}

// --- Labels ---

export interface LabelOutput {
  id: string;
  name: string;
  color: string | null;
  createdAt: string;
}

export async function listLabels(projectId: string): Promise<LabelOutput[]> {
  const result = await db.select().from(labels).where(eq(labels.projectId, projectId));

  return result.map((l) => ({
    id: l.id,
    name: l.name,
    color: l.color ?? null,
    createdAt: l.createdAt.toISOString(),
  }));
}

export async function createLabel(
  projectId: string,
  input: { name: string; color?: string },
): Promise<LabelOutput> {
  const labelId = crypto.randomUUID();
  const now = new Date();

  await db.insert(labels).values({
    id: labelId,
    projectId,
    name: input.name,
    color: input.color ?? null,
    createdAt: now,
  });

  return {
    id: labelId,
    name: input.name,
    color: input.color ?? null,
    createdAt: now.toISOString(),
  };
}

export async function updateLabel(
  labelId: string,
  input: { name?: string; color?: string | null },
): Promise<LabelOutput> {
  const label = (await db.select().from(labels).where(eq(labels.id, labelId)).limit(1))[0];

  if (!label) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Label not found');
  }

  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.color !== undefined) updateData.color = input.color;

  if (Object.keys(updateData).length > 0) {
    await db.update(labels).set(updateData).where(eq(labels.id, labelId));
  }

  const updated = (await db.select().from(labels).where(eq(labels.id, labelId)).limit(1))[0];

  return {
    id: updated.id,
    name: updated.name,
    color: updated.color ?? null,
    createdAt: updated.createdAt.toISOString(),
  };
}

export async function deleteLabel(labelId: string): Promise<void> {
  const label = (await db.select().from(labels).where(eq(labels.id, labelId)).limit(1))[0];

  if (!label) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Label not found');
  }

  await db.delete(labels).where(eq(labels.id, labelId));
}
