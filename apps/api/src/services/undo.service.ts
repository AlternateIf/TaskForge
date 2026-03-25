import crypto from 'node:crypto';
import { db, taskLabels, tasks } from '@taskforge/db';
import { and, eq } from 'drizzle-orm';
import { AppError, ErrorCode } from '../utils/errors.js';
import { getRedis } from '../utils/redis.js';

const UNDO_TTL = 30; // seconds
const UNDO_PREFIX = 'undo:';

interface UndoPayload {
  userId: string;
  action: string;
  taskId: string;
  previousState: Record<string, unknown>;
}

export async function createUndoToken(
  userId: string,
  action: string,
  taskId: string,
  previousState: Record<string, unknown>,
): Promise<string> {
  const token = crypto.randomUUID();
  const payload: UndoPayload = { userId, action, taskId, previousState };
  const redis = getRedis();
  await redis.set(`${UNDO_PREFIX}${token}`, JSON.stringify(payload), 'EX', UNDO_TTL);
  return token;
}

export async function executeUndo(token: string, userId: string): Promise<void> {
  const redis = getRedis();
  const raw = await redis.get(`${UNDO_PREFIX}${token}`);

  if (!raw) {
    throw new AppError(410, ErrorCode.GONE, 'Undo token has expired');
  }

  const payload: UndoPayload = JSON.parse(raw);

  if (payload.userId !== userId) {
    throw new AppError(403, ErrorCode.FORBIDDEN, 'You can only undo your own actions');
  }

  // Delete the token so it can't be replayed
  await redis.del(`${UNDO_PREFIX}${token}`);

  const { action, taskId, previousState } = payload;

  switch (action) {
    case 'updateStatus':
      await db
        .update(tasks)
        .set({ statusId: previousState.statusId as string, updatedAt: new Date() })
        .where(eq(tasks.id, taskId));
      break;

    case 'assign':
      await db
        .update(tasks)
        .set({
          assigneeId: (previousState.assigneeId as string | null) ?? null,
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, taskId));
      break;

    case 'updatePriority':
      await db
        .update(tasks)
        .set({
          priority: previousState.priority as 'none' | 'low' | 'medium' | 'high' | 'critical',
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, taskId));
      break;

    case 'addLabel':
      await db
        .delete(taskLabels)
        .where(
          and(
            eq(taskLabels.taskId, taskId),
            eq(taskLabels.labelId, previousState.labelId as string),
          ),
        );
      break;

    case 'removeLabel':
      await db.insert(taskLabels).values({ taskId, labelId: previousState.labelId as string });
      break;

    case 'updatePosition':
      await db
        .update(tasks)
        .set({
          position: previousState.position as number,
          statusId: previousState.statusId as string,
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, taskId));
      break;

    default:
      throw new AppError(422, ErrorCode.UNPROCESSABLE_ENTITY, `Unknown undo action: ${action}`);
  }
}
