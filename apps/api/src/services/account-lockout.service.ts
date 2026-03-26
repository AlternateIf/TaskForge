import { getRedis } from '../utils/redis.js';

const KEY_PREFIX = 'lockout:';

/**
 * Progressive lockout thresholds.
 * After N consecutive failures, the account is locked for the given duration.
 */
const LOCKOUT_TIERS = [
  { failures: 20, durationSeconds: 30 * 60 }, // 30 minutes
  { failures: 10, durationSeconds: 5 * 60 }, // 5 minutes
  { failures: 5, durationSeconds: 60 }, // 1 minute
] as const;

/** Maximum TTL for the failure counter key (auto-expires after longest lockout) */
const COUNTER_TTL_SECONDS = 60 * 60; // 1 hour

function lockoutKey(email: string): string {
  return `${KEY_PREFIX}${email.toLowerCase()}`;
}

/**
 * Returns the lockout duration in seconds if the account is currently locked,
 * or 0 if the account is not locked.
 */
export async function checkLockout(email: string): Promise<number> {
  const redis = getRedis();
  const key = lockoutKey(email);
  const raw = await redis.get(key);
  if (!raw) return 0;

  const failures = Number.parseInt(raw, 10);
  if (Number.isNaN(failures)) return 0;

  for (const tier of LOCKOUT_TIERS) {
    if (failures >= tier.failures) {
      const ttl = await redis.ttl(key);
      return ttl > 0 ? ttl : 0;
    }
  }

  return 0;
}

/**
 * Records a failed login attempt. If a lockout threshold is crossed,
 * sets the TTL on the key to the lockout duration.
 */
export async function recordFailedAttempt(email: string): Promise<void> {
  const redis = getRedis();
  const key = lockoutKey(email);

  const failures = await redis.incr(key);

  // Find the matching lockout tier (highest first)
  for (const tier of LOCKOUT_TIERS) {
    if (failures >= tier.failures) {
      await redis.expire(key, tier.durationSeconds);
      return;
    }
  }

  // Below any lockout threshold — keep counter alive with a generous TTL
  await redis.expire(key, COUNTER_TTL_SECONDS);
}

/**
 * Resets the lockout counter on successful login.
 */
export async function resetLockout(email: string): Promise<void> {
  const redis = getRedis();
  await redis.del(lockoutKey(email));
}
