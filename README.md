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
└── .ai/                  # Product/process docs, roadmap, feature specs, personas
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
| `pnpm test-seed` | Full dev reset + deterministic reseed (DEV ONLY) |

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

The deterministic seed fixtures (`NODE_ENV=development pnpm test-seed`) create these identities.

Shared password (all password-enabled users): `Taskforge123!`
MFA status: disabled for all seeded users by default.

### Global

| Role | Email |
|---|---|
| Super Admin | `superadmin@taskforge.local` |

### TaskForge Agency (4 projects)

| Role | Email |
|---|---|
| Org Owner | `owner@taskforge-agency.taskforge.local` |
| Project Admin | `projectadmin@taskforge-agency.taskforge.local` |
| Backend Developer | `backend1@taskforge-agency.taskforge.local` |
| Frontend Developer | `frontend1@taskforge-agency.taskforge.local` |
| Designer | `designer1@taskforge-agency.taskforge.local` |
| QA Engineer | `qa1@taskforge-agency.taskforge.local` |
| DevOps/SRE | `devops1@taskforge-agency.taskforge.local` |
| Support Engineer | `support1@taskforge-agency.taskforge.local` |
| Product Manager | `pm1@taskforge-agency.taskforge.local` |
| SEO Specialist | `seo1@taskforge-agency.taskforge.local` |
| Auth Flow Manager | `auth1@taskforge-agency.taskforge.local` |

### Acme Corp (6 projects)

| Role | Email |
|---|---|
| Org Owner | `owner@acme.taskforge.local` |
| Project Admin | `projectadmin@acme.taskforge.local` |
| Backend Developer | `backend1@acme.taskforge.local` |
| Frontend Developer | `frontend1@acme.taskforge.local` |
| Designer | `designer1@acme.taskforge.local` |
| QA Engineer | `qa1@acme.taskforge.local` |
| DevOps/SRE | `devops1@acme.taskforge.local` |
| Product Manager | `pm1@acme.taskforge.local` |
| Customer Reporter | `reporter1@acme.taskforge.local` |
| Customer Stakeholder | `stakeholder1@acme.taskforge.local` |

### Globex Inc (5 projects)

| Role | Email |
|---|---|
| Org Owner | `owner@globex.taskforge.local` |
| Project Admin | `projectadmin@globex.taskforge.local` |
| Backend Developer | `backend1@globex.taskforge.local` |
| Frontend Developer | `frontend1@globex.taskforge.local` |
| Designer | `designer1@globex.taskforge.local` |
| SEO Specialist | `seo1@globex.taskforge.local` |
| Product Manager | `pm1@globex.taskforge.local` |
| Customer Reporter | `reporter1@globex.taskforge.local` |
| Customer Stakeholder | `stakeholder1@globex.taskforge.local` |

### Soylent Corp (4 projects)

| Role | Email |
|---|---|
| Org Owner | `owner@soylent.taskforge.local` |
| Project Admin | `projectadmin@soylent.taskforge.local` |
| Backend Developer | `backend1@soylent.taskforge.local` |
| Support Engineer | `support1@soylent.taskforge.local` |
| Customer Reporter | `reporter1@soylent.taskforge.local` |
| Customer Stakeholder | `stakeholder1@soylent.taskforge.local` |

### Umbrella Corp (3 projects)

| Role | Email |
|---|---|
| Org Owner | `owner@umbrella.taskforge.local` |
| Project Admin | `projectadmin@umbrella.taskforge.local` |
| Backend Developer | `backend1@umbrella.taskforge.local` |
| QA Engineer | `qa1@umbrella.taskforge.local` |
| DevOps/SRE | `devops1@umbrella.taskforge.local` |
| Customer Reporter | `reporter1@umbrella.taskforge.local` |
| Customer Stakeholder | `stakeholder1@umbrella.taskforge.local` |

See [`.ai/setup.md`](.ai/setup.md) for the full role-permission breakdown.

## Documentation

Primary documentation lives in [`.ai/`](.ai/guidelines.md).

Start points:
- [Guidelines](.ai/guidelines.md) — context loading rules + feature workflow
- [Requirements (router)](.ai/requirements.md) — entry to MVP/future requirement docs
- [Roadmap](.ai/roadmap.md) — MVP, Phase 2, Phase 3 planning
- [Data Model (router)](.ai/data-model.md) — entry to MVP/future schema docs
- [API Conventions](.ai/api-conventions.md) — endpoint standards and contracts
- [Project Structure](.ai/project-structure.md) — codebase layout conventions
- [Setup](.ai/setup.md) — setup, commands, troubleshooting

## License

See [LICENSE](LICENSE).
