# TaskForge — Project Structure

This document defines where code should live and how modules are split.

## Top-Level Layout

```text
TaskForge/
├── apps/
│   ├── api/
│   └── web/
├── packages/
│   ├── db/
│   ├── shared/
│   └── email-templates/
├── docker/
├── scripts/
├── .ai/
├── .opencode/
└── local/
```

## `apps/api` (Backend)

Primary directories:
- `src/routes`: HTTP route definitions and request/response wiring
- `src/services`: business logic and orchestration
- `src/plugins`: Fastify plugin registration (auth, swagger, infra wiring)
- `src/hooks`: reusable request lifecycle hooks
- `src/queues`: queue producers/consumers integration points
- `src/ws`: websocket/realtime handlers
- `src/utils`: shared backend utilities
- `src/scripts`: operational scripts (for example reindex helpers)

Placement rules:
- Keep route handlers thin; move logic into services.
- Permission checks belong in auth/authorization layers and service boundaries.
- DB access should be encapsulated behind service-level operations.

## `apps/web` (Frontend)

Primary directories:
- `src/routes`: route modules and route-level screens
- `src/components`: shared UI components
- `src/hooks`: reusable hooks
- `src/stores`: app stores/state containers
- `src/api`: API client wrappers and request helpers
- `src/lib`: utilities and shared frontend helpers
- `src/test`: test setup/helpers

Placement rules:
- Keep route files focused on composition and data wiring.
- Move reusable logic into hooks/lib/components.
- Permission-based UI gating should use shared permission constants.

## `packages/shared`

Primary directories:
- `src/constants`: shared constants (including permissions)
- `src/schemas`: shared validation schemas/types
- `src/__tests__`: shared package tests

Rules:
- Shared package is the only place for cross-app constants and schema contracts.
- Permission constants must live only in shared permission constant files.

## `packages/db`

Primary directories:
- `src/schema`: Drizzle schema definitions
- `src/migrations`: generated and tracked migrations
- `src/seed`: deterministic seed logic and helpers

Rules:
- Schema and migration logic stays in db package.
- Runtime apps should consume db package exports, not duplicate schema definitions.

## `packages/email-templates`

Primary directories:
- `src/templates`: reusable email template definitions

Rules:
- Email template rendering logic should remain reusable and isolated from API route code.

## Tests And Validation

- Backend tests: colocate under backend modules (`__tests__/*.test.ts`).
- Frontend tests: colocate or keep in route/component-adjacent test files.
- Shared/db package tests: keep inside package-level test directories.

Validation baseline:
- `pnpm lint`
- `pnpm test`

## Boundaries And Anti-Patterns

Do:
- import shared types/constants from `@taskforge/shared`
- keep service responsibilities separated by domain

Do not:
- import `@taskforge/db` directly from `apps/web`
- place business logic directly in backend route handlers
- create local permission constants outside shared package
