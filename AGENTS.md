# Repository Guidelines

This file is a quick contributor entry point. The source of truth for process and project policy is [`.ai/guidelines.md`](.ai/guidelines.md) and the documents it links.

## Project Structure & Module Organization
TaskForge is a `pnpm` + Turborepo monorepo:

- `apps/api`: Fastify backend (`routes/`, `services/`, `plugins/`, `hooks/`, `queues/`).
- `apps/web`: frontend app.
- `packages/shared`: shared schemas/types/constants.
- `packages/db`: Drizzle schema, migrations, and seeders.
- `packages/email-templates`: React email templates.
- `docker/`: local infra and observability.

Place business logic in `apps/api/src/services/*`; keep route handlers thin.

## Build, Test, and Development Commands
- `pnpm dev`: run workspace dev tasks.
- `pnpm build`: build all apps/packages.
- `pnpm test`: run all tests.
- `pnpm test:coverage`: run tests with coverage.
- `pnpm lint` / `pnpm lint:fix`: Biome checks and auto-fixes.
- `pnpm --filter @taskforge/api dev`: run API only.
- `pnpm --filter @taskforge/db seed`: seed DB.

Use Node `>=22` and `pnpm@9`.

## Coding Style & Naming Conventions
TypeScript strict mode is enabled. Follow Biome config: 2-space indent, single quotes, semicolons, trailing commas. Use kebab-case filenames (example: `auth.plugin.ts`). Keep tests near code in `__tests__/*.test.ts`.

## Testing Guidelines
Vitest is used in `apps/api` and `packages/shared`. Update tests for all behavior changes, especially service logic and route contracts. Run `pnpm test` locally before opening a PR.

## Commit & Pull Request Guidelines
Match current history style:
- `fix ...` / `update ...` for small changes.
- `implemented feature MVP-###-... - resolves #<issue>` for feature work.

PRs should link the feature/issue, summarize risk, include test evidence, and pass CI checks (`lint`, `build`, `test`, security).

## Security & Configuration Tips
Use `.env.example` files as templates and never commit secrets. Keep architecture boundaries intact: `apps/web` must not depend on `@taskforge/db`; data access goes through API endpoints.

## AI Agent Context Map
Use this as the default context routing for agent prompts:

- `planner`, `plan-challenger`: `.ai/guidelines.md`, `.ai/requirements.md`, `.ai/roadmap.md`, `.ai/stack.md`, `.ai/project-structure.md`
- `frontend-prototyper-implementer`, `reviewer-frontend`, `tester-frontend`: `.ai/stack.md`, `.ai/styleguide.md`, `.ai/styleguide-core.md` (load `.ai/styleguide-extended.md` only when explicitly needed)
- `backend-implementer`, `reviewer-backend`, `tester-backend`: `.ai/stack.md`, `.ai/api-conventions.md`, `.ai/project-structure.md`
- `unit-test-agent`, `tester-full`, `reviewer-full`: `.ai/stack.md`, `.ai/project-structure.md`, plus scope-specific docs above
- `docs-contract-agent`: `.ai/api-conventions.md`, relevant route/service docs, swagger/openapi-related plugin/spec files
