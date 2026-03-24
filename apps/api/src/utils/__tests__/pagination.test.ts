import { describe, expect, it } from 'vitest';
import { decodeCursor, encodeCursor, normalizeLimit } from '../pagination.js';

describe('pagination', () => {
  describe('encodeCursor / decodeCursor', () => {
    it('round-trips a cursor payload', () => {
      const payload = { id: 'abc-123', createdAt: '2026-01-01' };
      const encoded = encodeCursor(payload);
      const decoded = decodeCursor(encoded);
      expect(decoded).toEqual(payload);
    });

    it('returns null for invalid cursor', () => {
      expect(decodeCursor('not-valid-base64!!!')).toBeNull();
    });

    it('returns null if payload has no id', () => {
      const encoded = Buffer.from(JSON.stringify({ foo: 'bar' })).toString('base64url');
      expect(decodeCursor(encoded)).toBeNull();
    });
  });

  describe('normalizeLimit', () => {
    it('defaults to 25 when undefined', () => {
      expect(normalizeLimit()).toBe(25);
    });

    it('caps at 100', () => {
      expect(normalizeLimit(500)).toBe(100);
    });

    it('uses provided value within range', () => {
      expect(normalizeLimit(50)).toBe(50);
    });

    it('defaults for zero or negative', () => {
      expect(normalizeLimit(0)).toBe(25);
      expect(normalizeLimit(-1)).toBe(25);
    });
  });
});
