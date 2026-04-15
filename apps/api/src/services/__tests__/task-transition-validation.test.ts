import { describe, expect, it } from 'vitest';
import {
  AppError,
  ErrorCode,
  type TransitionBlockDetails,
  buildErrorResponse,
} from '../../utils/errors.js';

// ---------------------------------------------------------------------------
// 1. Error code contract
// ---------------------------------------------------------------------------

describe('ErrorCode TRANSITION_BLOCKED', () => {
  it('enum includes TRANSITION_BLOCKED', () => {
    expect(ErrorCode.TRANSITION_BLOCKED).toBe('TRANSITION_BLOCKED');
  });

  it('is distinct from UNPROCESSABLE_ENTITY', () => {
    expect(ErrorCode.TRANSITION_BLOCKED).not.toBe(ErrorCode.UNPROCESSABLE_ENTITY);
  });
});

// ---------------------------------------------------------------------------
// 2. AppError with transitionDetails
// ---------------------------------------------------------------------------

describe('AppError with transitionDetails', () => {
  it('carries transitionDetails alongside code, status, message', () => {
    const details: TransitionBlockDetails = {
      unresolvedBlockersCount: 2,
      incompleteChecklistCount: 3,
    };

    const error = new AppError(
      422,
      ErrorCode.TRANSITION_BLOCKED,
      'Cannot move to final status: 2 unresolved blockers and 3 incomplete checklist items',
      undefined,
      details,
    );

    expect(error.statusCode).toBe(422);
    expect(error.code).toBe(ErrorCode.TRANSITION_BLOCKED);
    expect(error.transitionDetails).toEqual({
      unresolvedBlockersCount: 2,
      incompleteChecklistCount: 3,
    });
    expect(error.details).toBeUndefined();
  });

  it('preserves blocker-only message', () => {
    const error = new AppError(
      422,
      ErrorCode.TRANSITION_BLOCKED,
      'Cannot move to validated status: 1 unresolved blocker',
      undefined,
      { unresolvedBlockersCount: 1, incompleteChecklistCount: 0 },
    );
    expect(error.message).toContain('1 unresolved blocker');
    expect(error.message).toContain('validated');
  });

  it('preserves checklist-only message', () => {
    const error = new AppError(
      422,
      ErrorCode.TRANSITION_BLOCKED,
      'Cannot move to final status: 5 incomplete checklist items',
      undefined,
      { unresolvedBlockersCount: 0, incompleteChecklistCount: 5 },
    );
    expect(error.message).toContain('5 incomplete checklist items');
    expect(error.message).toContain('final');
  });

  it('preserves combined message', () => {
    const error = new AppError(
      422,
      ErrorCode.TRANSITION_BLOCKED,
      'Cannot move to validated status: 1 unresolved blocker and 2 incomplete checklist items',
      undefined,
      { unresolvedBlockersCount: 1, incompleteChecklistCount: 2 },
    );
    expect(error.message).toContain('1 unresolved blocker');
    expect(error.message).toContain('2 incomplete checklist items');
  });

  it('field-level ErrorDetail[] on UNPROCESSABLE_ENTITY is unaffected', () => {
    const fieldError = new AppError(422, ErrorCode.UNPROCESSABLE_ENTITY, 'Validation failed', [
      { field: 'title', message: 'Title is required' },
    ]);
    expect(fieldError.details).toEqual([{ field: 'title', message: 'Title is required' }]);
    expect(fieldError.transitionDetails).toBeUndefined();
  });

  it('transitionDetails is accessible from the error instance for hook passthrough', () => {
    const details: TransitionBlockDetails = {
      unresolvedBlockersCount: 2,
      incompleteChecklistCount: 4,
    };
    const error = new AppError(422, ErrorCode.TRANSITION_BLOCKED, 'Blocked', undefined, details);

    expect(error.transitionDetails).toBeDefined();
    expect(error.transitionDetails?.unresolvedBlockersCount).toBe(2);
    expect(error.transitionDetails?.incompleteChecklistCount).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// 3. buildErrorResponse with transitionDetails
// ---------------------------------------------------------------------------

describe('buildErrorResponse with transitionDetails', () => {
  it('serializes transitionDetails in error response', () => {
    const response = buildErrorResponse(
      ErrorCode.TRANSITION_BLOCKED,
      'Cannot move to final status',
      undefined,
      { unresolvedBlockersCount: 3, incompleteChecklistCount: 1 },
    );

    expect(response.error).toEqual({
      code: 'TRANSITION_BLOCKED',
      message: 'Cannot move to final status',
      transitionDetails: {
        unresolvedBlockersCount: 3,
        incompleteChecklistCount: 1,
      },
    });
  });

  it('omits transitionDetails when not provided', () => {
    const response = buildErrorResponse(ErrorCode.UNPROCESSABLE_ENTITY, 'Validation failed', [
      { field: 'statusId', message: 'Invalid status' },
    ]);
    expect(response.error.transitionDetails).toBeUndefined();
    expect(response.error.details).toEqual([{ field: 'statusId', message: 'Invalid status' }]);
  });

  it('includes both details and transitionDetails when both provided', () => {
    const response = buildErrorResponse(
      ErrorCode.TRANSITION_BLOCKED,
      'Transition blocked',
      [{ field: 'statusId', message: 'Target is final' }],
      { unresolvedBlockersCount: 1, incompleteChecklistCount: 0 },
    );
    expect(response.error.details).toEqual([{ field: 'statusId', message: 'Target is final' }]);
    expect(response.error.transitionDetails).toEqual({
      unresolvedBlockersCount: 1,
      incompleteChecklistCount: 0,
    });
  });

  it('omits details when empty array given', () => {
    const response = buildErrorResponse(ErrorCode.TRANSITION_BLOCKED, 'Blocked', []);
    expect(response.error.details).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 4. TransitionBlockDetails type shape
// ---------------------------------------------------------------------------

describe('TransitionBlockDetails type', () => {
  it('has exactly two numeric properties', () => {
    const details: TransitionBlockDetails = {
      unresolvedBlockersCount: 0,
      incompleteChecklistCount: 0,
    };
    const keys = Object.keys(details);
    expect(keys).toEqual(['unresolvedBlockersCount', 'incompleteChecklistCount']);
    expect(typeof details.unresolvedBlockersCount).toBe('number');
    expect(typeof details.incompleteChecklistCount).toBe('number');
  });
});
