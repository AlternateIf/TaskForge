import crypto from 'node:crypto';

export function createUser(
  overrides: Partial<{
    id: string;
    email: string;
    passwordHash: string;
    displayName: string;
  }> = {},
) {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    email: overrides.email ?? `user-${crypto.randomUUID().slice(0, 8)}@taskforge.local`,
    passwordHash: overrides.passwordHash ?? '$2b$10$placeholder_hash_for_seeding',
    displayName: overrides.displayName ?? 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
