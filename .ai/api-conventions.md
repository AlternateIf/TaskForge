# TaskForge — API Conventions

This file defines API contract conventions for backend implementation and reviews.

## Base And Versioning

- Base prefix: `/api/v1`
- New routes should be versioned under `/api/v1/*`.
- Breaking changes require explicit versioning strategy (new version or migration plan).

## Resource Naming

- Use plural resource paths.
- Use kebab-case for multi-word path segments.
- Prefer nested routes only when the parent context is required.

Examples:
- `/api/v1/organizations/:organizationId/projects`
- `/api/v1/projects/:projectId/tasks`

## HTTP Method Semantics

- `GET`: read-only operations
- `POST`: create operations or explicit actions that are not idempotent
- `PATCH`: partial updates
- `DELETE`: delete/archive operations

## Request And Response Contracts

- Validate request params/query/body with Zod schemas.
- Return typed response payloads with stable envelope shape for each endpoint family.
- Keep error responses consistent and machine-parseable.

Recommended error response shape:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to perform this action"
  }
}
```

## Auth And Permission Rules

- Authenticate first, authorize second.
- Use shared permission keys from `@taskforge/shared`.
- Avoid hardcoded permission strings in route logic when shared constants exist.
- Do not use global-role helper checks (`hasGlobalPermission`, `requireGlobal*`, `requireSuperAdmin`).

## Pagination, Filtering, Sorting

- Document query parameters explicitly in schema definitions.
- Use predictable defaults and max limits.
- Keep filtering and sorting fields explicit; reject unsupported fields.

## Idempotency And Safety

- Mutations should be safe against accidental replay when feasible.
- Use transactions for multi-write operations.
- Surface conflict/validation errors explicitly.

## OpenAPI / Swagger (Required)

Runtime wiring:
- Swagger plugin: `apps/api/src/plugins/swagger.plugin.ts`
- Server registration: `apps/api/src/server.ts`
- Swagger UI route: `/docs`

Rules:
- Any API contract change must be reflected in route schemas/OpenAPI metadata.
- PRs changing backend contracts are incomplete if `/docs` does not reflect the new contract.
- Keep tags/operation summaries concise and aligned with route behavior.

## Project Finish/Archive Endpoints

### Finish Project

- **Endpoint**: `POST /api/v1/projects/:id/finish`
- **Purpose**: Mark a project as finished/closed. Requires all non-deleted tasks to be in a final workflow status (`isFinal = true`).
- **Authorization**: `project.update` permission on the project.
- **Response**: `200 OK` with updated project (status = `archived`). Idempotent: returns `200` if already archived.
- **Blocking Error**: `422 UNPROCESSABLE_ENTITY` with `ErrorCode.UNPROCESSABLE_ENTITY` when any task has a non-final workflow status. Message: `"Finish all open tasks before marking this project as finished."`
- **Activity Log**: Action `'finished'` logged with status change.

### Archive Project (Hardened)

- **Endpoint**: `POST /api/v1/projects/:id/archive`
- **Purpose**: Archive a project. Now routes through the same validated finish service path.
- **Validation**: Identical to finish: returns `422 UNPROCESSABLE_ENTITY` if non-final tasks exist.
- **Response**: `200 OK` with updated project (status = `archived`). Idempotent: returns `200` if already archived.
- **Activity Log**: Action `'finished'` logged (not `'archived'`).

### Error Envelope

```json
{
  "error": {
    "code": "UNPROCESSABLE_ENTITY",
    "message": "Finish all open tasks before marking this project as finished."
  }
}
```

## Documentation And Validation Gate

For backend contract changes:
1. Update schema/contract annotations.
2. Verify Swagger UI (`/docs`) renders updated endpoints.
3. Run validation baseline: `pnpm lint && pnpm test`.
