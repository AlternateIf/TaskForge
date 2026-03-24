import { describe, expect, it } from 'vitest';
import { paginated, success } from '../response.js';

describe('response', () => {
  describe('success', () => {
    it('wraps data in an envelope', () => {
      expect(success({ id: 1 })).toEqual({ data: { id: 1 } });
    });
  });

  describe('paginated', () => {
    it('returns items with pagination meta', () => {
      const result = paginated([{ id: 1 }], 'abc', true, 100);
      expect(result).toEqual({
        data: [{ id: 1 }],
        meta: { cursor: 'abc', hasMore: true, totalCount: 100 },
      });
    });

    it('omits totalCount when undefined', () => {
      const result = paginated([], null, false);
      expect(result.meta.totalCount).toBeUndefined();
    });
  });
});
