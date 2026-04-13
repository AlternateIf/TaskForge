import { db, organizations } from '@taskforge/db';
import { eq } from 'drizzle-orm';
import { AppError, ErrorCode } from '../utils/errors.js';

export const FEATURE_KEYS = [
  'notifications',
  'file_uploads',
  'search',
  'comments',
  'subtasks',
  'dependencies',
  'mfa',
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export type FeatureMap = Record<FeatureKey, boolean>;

const DEFAULT_FEATURES: FeatureMap = {
  notifications: true,
  file_uploads: true,
  search: true,
  comments: true,
  subtasks: true,
  dependencies: true,
  mfa: true,
};

function resolveFeatures(stored: Record<string, unknown> | null | undefined): FeatureMap {
  const result = { ...DEFAULT_FEATURES };
  if (!stored) return result;

  for (const key of FEATURE_KEYS) {
    if (typeof stored[key] === 'boolean') {
      result[key] = stored[key];
    }
  }
  return result;
}

/**
 * Internal: fetch features without permission checks.
 * Used by isFeatureEnabled (feature hook) which has its own auth layer.
 */
async function getFeaturesRaw(orgId: string): Promise<FeatureMap> {
  const rows = await db
    .select({ settings: organizations.settings })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  if (rows.length === 0) {
    throw new AppError(404, ErrorCode.NOT_FOUND, 'Organization not found');
  }

  const settings = rows[0].settings;
  const features = settings?.features as Record<string, unknown> | undefined;
  return resolveFeatures(features);
}

export async function isFeatureEnabled(orgId: string, feature: FeatureKey): Promise<boolean> {
  const features = await getFeaturesRaw(orgId);
  return features[feature];
}
