# TaskForge — Technology Stack

## Runtime Baseline

- Node.js: `>=22`
- Package manager: `pnpm@9`
- Monorepo: Turborepo
- Language: TypeScript (strict mode)

## Frontend

- Framework: React 19 + TypeScript
- Build/dev: Vite 8
- Routing: TanStack Router
- Server state/data fetching: TanStack Query
- State management: Zustand
- UI/styling: Tailwind CSS 4, shadcn/ui, CVA, Lucide
- Rich text/editor: Tiptap
- Realtime client: WebSocket + SSE consumers in app flow
- Tests: Vitest + Testing Library

## Backend

- Framework: Fastify 5
- Validation/types: Zod + `fastify-type-provider-zod`
- Persistence: Drizzle ORM + MariaDB
- Cache/session/pubsub: Redis (`ioredis`)
- Queue/workers: RabbitMQ (`amqplib`)
- Search: Meilisearch
- Realtime transport: `@fastify/websocket` + SSE endpoints
- Auth/security: JWT/OAuth flows, `@fastify/helmet`, `@fastify/rate-limit`, `@fastify/cors`
- Email: Nodemailer + `@taskforge/email-templates`
- API docs: `@fastify/swagger` + `@fastify/swagger-ui`
- Tests: Vitest + Supertest-style API/service tests

## Shared And Data Packages

- `@taskforge/shared`: shared schemas, constants, permission keys, utility types
- `@taskforge/db`: Drizzle schema/migrations/seed
- `@taskforge/email-templates`: reusable email templates

## Tooling And Quality Gates

- Lint/format: Biome
- CI: GitHub Actions
- Required validation baseline: `pnpm lint && pnpm test`

## Local Infrastructure (Docker)

Core services used in local/dev environments:
- api
- worker
- web
- mariadb
- redis
- rabbitmq
- meilisearch
- prometheus
- grafana
- loki
- promtail
- mailpit

## Architecture Boundaries

- `apps/web` must not import `@taskforge/db` directly.
- Data access for frontend flows must happen through API contracts.
- Permission definitions must stay in shared constants files only.
