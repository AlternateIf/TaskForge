import crypto from 'node:crypto';

export function createOrganization(
  overrides: Partial<{
    id: string;
    name: string;
    slug: string;
  }> = {},
) {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    name: overrides.name ?? 'Test Organization',
    slug: overrides.slug ?? `test-org-${crypto.randomUUID().slice(0, 8)}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
