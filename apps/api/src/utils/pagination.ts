const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export interface CursorPayload {
  id: string;
  [key: string]: unknown;
}

export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function decodeCursor(cursor: string): CursorPayload | null {
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf-8');
    const parsed = JSON.parse(json);
    if (typeof parsed === 'object' && parsed !== null && typeof parsed.id === 'string') {
      return parsed as CursorPayload;
    }
    return null;
  } catch {
    return null;
  }
}

export function normalizeLimit(limit?: number): number {
  if (!limit || limit < 1) return DEFAULT_LIMIT;
  return Math.min(limit, MAX_LIMIT);
}
