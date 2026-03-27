import { describe, expect, it } from 'vitest';
import { generateETag } from '../etag.js';

describe('etag', () => {
  it('generates a quoted md5 hash', () => {
    const etag = generateETag({ id: 1, name: 'test' });
    expect(etag).toMatch(/^W\/"[a-f0-9]{32}"$/);
  });

  it('returns the same etag for the same data', () => {
    const data = { foo: 'bar' };
    expect(generateETag(data)).toBe(generateETag(data));
  });

  it('returns different etags for different data', () => {
    expect(generateETag({ a: 1 })).not.toBe(generateETag({ a: 2 }));
  });
});
