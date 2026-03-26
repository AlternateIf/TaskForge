import { describe, expect, it } from 'vitest';
import { createCommentSchema, updateCommentSchema } from '../schemas/comment.schema.js';

const validUuid = '550e8400-e29b-41d4-a716-446655440000';

describe('comment schemas', () => {
  describe('createCommentSchema', () => {
    it('should accept a valid comment body', () => {
      const result = createCommentSchema.safeParse({ body: '<p>Hello world</p>' });
      expect(result.success).toBe(true);
    });

    it('should accept body with parentCommentId', () => {
      const result = createCommentSchema.safeParse({
        body: 'A reply',
        parentCommentId: validUuid,
      });
      expect(result.success).toBe(true);
    });

    it('should accept body with attachmentIds', () => {
      const result = createCommentSchema.safeParse({
        body: 'With files',
        attachmentIds: [validUuid],
      });
      expect(result.success).toBe(true);
    });

    it('should accept null parentCommentId', () => {
      const result = createCommentSchema.safeParse({
        body: 'Top-level comment',
        parentCommentId: null,
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty body', () => {
      const result = createCommentSchema.safeParse({ body: '' });
      expect(result.success).toBe(false);
    });

    it('should reject body exceeding max length', () => {
      const result = createCommentSchema.safeParse({ body: 'x'.repeat(50001) });
      expect(result.success).toBe(false);
    });

    it('should reject invalid parentCommentId', () => {
      const result = createCommentSchema.safeParse({
        body: 'test',
        parentCommentId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid attachmentIds', () => {
      const result = createCommentSchema.safeParse({
        body: 'test',
        attachmentIds: ['not-a-uuid'],
      });
      expect(result.success).toBe(false);
    });

    it('should reject more than 10 attachmentIds', () => {
      const result = createCommentSchema.safeParse({
        body: 'test',
        attachmentIds: Array.from({ length: 11 }, () => validUuid),
      });
      expect(result.success).toBe(false);
    });

    it('should accept omitted optional fields', () => {
      const result = createCommentSchema.safeParse({ body: 'Just text' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.parentCommentId).toBeUndefined();
        expect(result.data.attachmentIds).toBeUndefined();
      }
    });
  });

  describe('updateCommentSchema', () => {
    it('should accept a valid body', () => {
      const result = updateCommentSchema.safeParse({ body: 'Updated text' });
      expect(result.success).toBe(true);
    });

    it('should reject empty body', () => {
      const result = updateCommentSchema.safeParse({ body: '' });
      expect(result.success).toBe(false);
    });

    it('should reject body exceeding max length', () => {
      const result = updateCommentSchema.safeParse({ body: 'x'.repeat(50001) });
      expect(result.success).toBe(false);
    });

    it('should reject missing body', () => {
      const result = updateCommentSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});
