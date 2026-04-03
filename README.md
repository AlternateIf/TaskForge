# TaskForge

TaskForge is a collaborative work management platform for teams that need speed, structure, and enterprise-grade controls. It supports day-to-day execution (tasks, projects, comments, realtime updates) while providing a roadmap toward advanced planning, reporting, compliance, and migration scenarios (including Workfront transition use cases).

## Project Status

TaskForge is in active MVP delivery.

Implemented MVP foundations include:
- Monorepo/tooling baseline (Turborepo, pnpm, Biome, TypeScript)
- Auth stack (JWT, OAuth, MFA), profile/session hardening
- Organizations, role-based access, projects, task CRUD, dependencies, checklists, comments/activity
- Realtime updates, notifications, full-text search, rich text editor, command palette
- API foundations (Fastify, Swagger/OpenAPI, health/readiness, rate limiting, ETag/Cache-Control)

Upcoming phases add custom roles matrix, dashboards/reports, time tracking, automations, integrations, portfolio/resource management, compliance, and SDK/sandbox capabilities.

## Monorepo Structure

```text
TaskForge/
├── apps/
│   ├── api/                 # Fastify API + worker entry
│   └── web/                 # React + Vite frontend
├── packages/
│   ├── db/                  # Drizzle schema/migrations/seed
│   ├── shared/              # Shared schemas/types/constants
│   └── email-templates/     # react-email templates
├── docker/                  # Local infrastructure + observability
└── .junie/                  # Product/process docs, roadmap, feature specs, personas
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query |
| Backend | Fastify, Zod, Drizzle ORM |
| Data & Infra | MariaDB, Redis, RabbitMQ, Meilisearch |
| Realtime | WebSocket + SSE |
| Email | Nodemailer + react-email |
| Observability | Prometheus, Grafana, Loki, Promtail |
| Testing | Vitest, Testing Library, Playwright |
| Tooling | Turborepo, pnpm, Biome, GitHub Actions |

## Prerequisites

- Node.js `>=22`
- `pnpm@9` (via Corepack or manual install)
- Docker + Docker Compose

## Quick Start (Local)

1. Clone and install dependencies

```bash
git clone <repo-url>
cd TaskForge
pnpm install
```

2. Create env files

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

cp docker/env/common.env.example docker/env/common.env
cp docker/env/api.env.example docker/env/api.env
cp docker/env/worker.env.example docker/env/worker.env
cp docker/env/web.env.example docker/env/web.env
cp docker/env/mariadb.env.example docker/env/mariadb.env
cp docker/env/rabbitmq.env.example docker/env/rabbitmq.env
cp docker/env/meilisearch.env.example docker/env/meilisearch.env
cp docker/env/grafana.env.example docker/env/grafana.env
```

3. Start infrastructure

```bash
docker compose -f docker/docker-compose.yml up -d
```

4. Run DB migrations and seed data

```bash
pnpm --filter @taskforge/db migrate
pnpm --filter @taskforge/db seed
```

5. Start app development servers

```bash
pnpm dev
```

6. (Optional) Run worker in local non-Docker dev flow

```bash
pnpm --filter @taskforge/api dev:worker
```

## Common Commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Start workspace dev tasks |
| `pnpm build` | Build all apps/packages |
| `pnpm test` | Run tests across workspace |
| `pnpm test:coverage` | Run tests with coverage |
| `pnpm lint` | Biome checks |
| `pnpm lint:fix` | Biome auto-fix |
| `pnpm --filter @taskforge/api dev` | Run API only |
| `pnpm --filter @taskforge/web dev` | Run web only |
| `pnpm --filter @taskforge/db seed` | Seed database |

## Local Service URLs

| Service | URL | Notes |
|---|---|---|
| Web | http://localhost:5173 | Frontend app |
| API | http://localhost:3000 | REST + realtime |
| Swagger UI | http://localhost:3000/docs | OpenAPI docs |
| RabbitMQ Mgmt | http://localhost:15672 | `taskforge / taskforge` by default |
| Meilisearch | http://localhost:7700 | Key from env |
| Mailpit | http://localhost:8025 | Local email inbox |
| Prometheus | http://localhost:9090 | Metrics |
| Grafana | http://localhost:3002 | `admin / admin` by default |

## Seeded Login Users

The deterministic seed fixtures (`NODE_ENV=development pnpm test-seed`) create these identities:

- Shared password (all password-enabled seeded users): `Taskforge123!`
- Interactive login users:
  - `owner@acme.taskforge.local` (`Super Admin` + `Acme Owner`, MFA enabled)
  - `admin@acme.taskforge.local` (`Global Admin`, `Acme Admin`, `Globex Member`)
  - `member@acme.taskforge.local` (`Acme Member`, `Globex Viewer`)
  - `owner@globex.taskforge.local` (`Globex Owner`, MFA enabled)
  - `admin@globex.taskforge.local` (`Globex Admin`)
  - `member@globex.taskforge.local` (`Globex Member`, `Acme Viewer`, seeded GitHub OAuth)
  - `qa@taskforge.local` (`Acme Admin`, `Globex Admin`)
  - `viewer@acme.taskforge.local` (`Acme Viewer`)
  - `contractor@globex.taskforge.local` (`Globex Viewer`)
  - `support@taskforge.local` (`Global Auditor`, `Acme Support`, `Globex Support`)
- Non-interactive seeded identity:
  - `integration.bot@taskforge.local` (no password hash; used for automation/integration fixtures)

See [`.junie/setup.md`](.junie/setup.md) for the full setup-oriented matrix.

## Documentation

Primary documentation lives in [`.junie/`](.junie/guidelines.md).

Start points:
- [Guidelines](.junie/guidelines.md) — context loading rules + feature workflow
- [Requirements (router)](.junie/requirements.md) — entry to MVP/future requirement docs
- [Roadmap](.junie/roadmap.md) — MVP, Phase 2, Phase 3 planning
- [Data Model (router)](.junie/data-model.md) — entry to MVP/future schema docs
- [API Conventions](.junie/api-conventions.md) — endpoint standards and contracts
- [Project Structure](.junie/project-structure.md) — codebase layout conventions
- [Setup](.junie/setup.md) — setup, commands, troubleshooting

## License

See [LICENSE](LICENSE).
