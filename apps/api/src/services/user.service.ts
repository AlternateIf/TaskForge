import { db, users } from '@taskforge/db';
import type { UpdateProfileInput, UserOutput } from '@taskforge/shared';
import { and, eq, isNull } from 'drizzle-orm';
import { AppError, ErrorCode } from '../utils/errors.js';

export function toUserOutput(user: typeof users.$inferSelect): UserOutput {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl ?? null,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function getUserById(userId: string): Promise<UserOutput> {
  const user = (
    await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1)
  )[0];

  if (!user) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'User not found');
  }

  return toUserOutput(user);
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<UserOutput> {
  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (input.displayName !== undefined) {
    updateData.displayName = input.displayName;
  }
  if (input.avatarUrl !== undefined) {
    updateData.avatarUrl = input.avatarUrl;
  }

  await db.update(users).set(updateData).where(eq(users.id, userId));

  return getUserById(userId);
}
