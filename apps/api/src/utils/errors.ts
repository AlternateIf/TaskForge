export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  GONE: 'GONE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  UNSUPPORTED_MEDIA_TYPE: 'UNSUPPORTED_MEDIA_TYPE',
  UNPROCESSABLE_ENTITY: 'UNPROCESSABLE_ENTITY',
  TRANSITION_BLOCKED: 'TRANSITION_BLOCKED',
  RATE_LIMITED: 'RATE_LIMITED',
  MFA_ENFORCED_BY_ORG: 'MFA_ENFORCED_BY_ORG',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface ErrorDetail {
  field: string;
  message: string;
}

export interface TransitionBlockDetails {
  unresolvedBlockersCount: number;
  incompleteChecklistCount: number;
}

export interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: ErrorDetail[];
    transitionDetails?: TransitionBlockDetails;
  };
}

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: ErrorDetail[],
    public readonly transitionDetails?: TransitionBlockDetails,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function buildErrorResponse(
  code: ErrorCode,
  message: string,
  details?: ErrorDetail[],
  transitionDetails?: TransitionBlockDetails,
): ErrorResponse {
  const response: ErrorResponse = { error: { code, message } };
  if (details && details.length > 0) {
    response.error.details = details;
  }
  if (transitionDetails) {
    response.error.transitionDetails = transitionDetails;
  }
  return response;
}
