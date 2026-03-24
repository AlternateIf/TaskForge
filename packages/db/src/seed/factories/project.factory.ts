import crypto from 'node:crypto';

export function createProject(
  overrides: Partial<{
    id: string;
    organizationId: string;
    name: string;
    slug: string;
    createdBy: string;
  }> = {},
) {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    organizationId: overrides.organizationId ?? '',
    name: overrides.name ?? 'Test Project',
    slug: overrides.slug ?? `test-project-${crypto.randomUUID().slice(0, 8)}`,
    color: '#3B82F6',
    status: 'active' as const,
    createdBy: overrides.createdBy ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
