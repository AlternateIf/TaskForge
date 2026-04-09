/**
 * Seed option resolution from environment variables and CLI flags.
 *
 * Env-var contract:
 *   SEED_MODE=reset-and-seed|reset-only|seed-only  (default: reset-and-seed)
 *   SEED_INCLUDE_SAMPLE_DATA=1|0                    (default: 0)
 *   SEED_SKIP_REINDEX=1|0                           (default: 0)
 */

export type SeedMode = 'reset-and-seed' | 'reset-only' | 'seed-only';
export type SeedProfile = 'core' | 'core+sample';

export interface SeedOptions {
  mode: SeedMode;
  profile: SeedProfile;
  includeSampleData: boolean;
  skipReindex: boolean;
}

function parseBoolEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value === '') {
    return defaultValue;
  }
  return value === '1' || value.toLowerCase() === 'true';
}

function parseModeEnv(value: string | undefined): SeedMode {
  if (value === 'reset-only' || value === 'seed-only' || value === 'reset-and-seed') {
    return value;
  }
  return 'reset-and-seed';
}

/**
 * Resolve seed options from environment variables.
 * The shell script `test-seed.sh` maps CLI flags to env vars before invoking the seed script.
 */
export function resolveSeedOptions(env?: Record<string, string | undefined>): SeedOptions {
  const e = env ?? process.env;

  const mode = parseModeEnv(e.SEED_MODE);
  const includeSampleData = parseBoolEnv(e.SEED_INCLUDE_SAMPLE_DATA, false);
  const skipReindex = parseBoolEnv(e.SEED_SKIP_REINDEX, false);

  const profile: SeedProfile = includeSampleData ? 'core+sample' : 'core';

  return {
    mode,
    profile,
    includeSampleData,
    skipReindex,
  };
}
