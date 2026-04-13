# Repository Guidelines

`AGENTS.md` is the primary routing entry for AI agents in this repository.

Routing precedence:
1. `AGENTS.md` (this file)
2. `.ai/guidelines.md`
3. `.opencode/agents/*.md` (role-specific runtime behavior)

## Project Layout

TaskForge is a `pnpm` + Turborepo monorepo:
- `apps/api`: Fastify backend (`routes/`, `services/`, `plugins/`, `hooks/`, `queues/`, `ws/`)
- `apps/web`: React + Vite frontend
- `packages/shared`: shared schemas/types/constants
- `packages/db`: Drizzle schema, migrations, seeders
- `packages/email-templates`: React email templates
- `docker/`: local infrastructure

Boundary rule:
- `apps/web` must not depend on `@taskforge/db`; data access goes through API endpoints.

## Build, Test, and Dev Commands

- `pnpm dev`
- `pnpm build`
- `pnpm test`
- `pnpm test:coverage`
- `pnpm lint` / `pnpm lint:fix`
- `pnpm --filter @taskforge/api dev`
- `pnpm --filter @taskforge/db seed`

Runtime baseline:
- Node `>=22`
- `pnpm@9`

## Coding and Testing Rules

- TypeScript strict mode is enabled.
- Follow Biome config: 2-space indent, single quotes, semicolons, trailing commas.
- Use kebab-case filenames (example: `auth.plugin.ts`).
- Keep route handlers thin; place business logic in `apps/api/src/services/*`.
- Keep tests near code in `__tests__/*.test.ts`.
- Update tests for behavior changes before PR.

## AI Context Map

Use this as default context routing for agent prompts:
- `planner`, `plan-challenger`: `.ai/guidelines.md`, `.ai/requirements.md`, `.ai/roadmap.md`, `.ai/stack.md`, `.ai/project-structure.md`, `.ai/design-principles.md`
- `frontend-prototyper-implementer`, `reviewer-frontend`, `tester-frontend`: `.ai/stack.md`, `.ai/styleguide-core.md` (load `.ai/styleguide-extended.md` only when explicitly needed)
- `backend-implementer`, `reviewer-backend`, `tester-backend`: `.ai/stack.md`, `.ai/api-conventions.md`, `.ai/project-structure.md`
- `unit-test-agent`, `tester-full`, `reviewer-full`: `.ai/stack.md`, `.ai/project-structure.md` plus touched-scope docs
- `docs-contract-agent`: `.ai/api-conventions.md`, relevant changed runtime files

## Permissions Source Of Truth (Agent Rule)

Permission definitions must only live in:
- `packages/shared/src/constants/permission.ts`
- `packages/shared/src/constants/permissions.ts`

Additional rules:
- Do not create additional `permission.ts`/`permissions.ts` files in `apps/*` or `packages/*`.
- Import permission constants/types from `@taskforge/shared` (or the two shared files above while editing shared package internals).

## Documentation Ownership Rules

- `AGENTS.md` and `.ai/*`: agent and internal engineering operation docs.
- `README.md` and `USAGE.md`: user-facing docs.
- Do not reference feature-spec directories from routing docs.
- `.ai/plans/` is temporary agent working output and is ignored by git.
