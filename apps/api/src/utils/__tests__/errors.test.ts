import { describe, expect, it } from 'vitest';
import { AppError, ErrorCode, buildErrorResponse } from '../errors.js';

describe('errors', () => {
  describe('AppError', () => {
    it('creates an error with status code and error code', () => {
      const err = new AppError(404, ErrorCode.NOT_FOUND, 'Not found');
      expect(err.statusCode).toBe(404);
      expect(err.code).toBe('NOT_FOUND');
      expect(err.message).toBe('Not found');
      expect(err.name).toBe('AppError');
    });

    it('includes details when provided', () => {
      const details = [{ field: 'email', message: 'Required' }];
      const err = new AppError(400, ErrorCode.VALIDATION_ERROR, 'Validation failed', details);
      expect(err.details).toEqual(details);
    });
  });

  describe('buildErrorResponse', () => {
    it('builds a standard error envelope', () => {
      const response = buildErrorResponse(ErrorCode.NOT_FOUND, 'Not found');
      expect(response).toEqual({
        error: { code: 'NOT_FOUND', message: 'Not found' },
      });
    });

    it('includes details when non-empty', () => {
      const details = [{ field: 'name', message: 'Too short' }];
      const response = buildErrorResponse(ErrorCode.VALIDATION_ERROR, 'Invalid', details);
      expect(response.error.details).toEqual(details);
    });

    it('omits details when empty', () => {
      const response = buildErrorResponse(ErrorCode.INTERNAL_ERROR, 'Error', []);
      expect(response.error.details).toBeUndefined();
    });
  });
});
