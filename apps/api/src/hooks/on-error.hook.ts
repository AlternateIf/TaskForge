import type { FastifyError, FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { AppError, ErrorCode, buildErrorResponse } from '../utils/errors.js';

export function registerErrorHandler(fastify: FastifyInstance) {
  fastify.setErrorHandler((error: FastifyError | Error, request, reply) => {
    request.log.error({ err: error, requestId: request.id }, 'request error');

    if (error instanceof AppError) {
      return reply
        .status(error.statusCode)
        .send(buildErrorResponse(error.code, error.message, error.details));
    }

    if (error instanceof ZodError) {
      const details = error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return reply
        .status(400)
        .send(buildErrorResponse(ErrorCode.VALIDATION_ERROR, 'Validation failed', details));
    }

    const fastifyError = error as FastifyError;

    // Fastify validation errors (from schema validation)
    if (fastifyError.validation) {
      const details = fastifyError.validation.map(
        (v: {
          instancePath?: string;
          params?: { missingProperty?: string };
          message?: string;
        }) => ({
          field:
            v.instancePath?.replace(/^\//, '').replace(/\//g, '.') ||
            v.params?.missingProperty ||
            'unknown',
          message: v.message ?? 'Invalid value',
        }),
      );
      return reply
        .status(400)
        .send(buildErrorResponse(ErrorCode.VALIDATION_ERROR, 'Validation failed', details));
    }

    const statusCode = fastifyError.statusCode ?? 500;

    // Fastify 404
    if (statusCode === 404) {
      return reply.status(404).send(buildErrorResponse(ErrorCode.NOT_FOUND, 'Resource not found'));
    }

    // Rate limit
    if (statusCode === 429) {
      return reply.status(429).send(buildErrorResponse(ErrorCode.RATE_LIMITED, error.message));
    }

    // Unknown errors — never expose internals
    return reply
      .status(statusCode)
      .send(buildErrorResponse(ErrorCode.INTERNAL_ERROR, 'An unexpected error occurred'));
  });

  fastify.setNotFoundHandler((request, reply) => {
    reply
      .status(404)
      .send(
        buildErrorResponse(ErrorCode.NOT_FOUND, `Route ${request.method} ${request.url} not found`),
      );
  });
}
