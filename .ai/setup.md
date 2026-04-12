# TaskForge — Environment Setup

How to clone, install, run, and test TaskForge locally.

---

## Prerequisites

| Tool | Minimum Version | Purpose |
|---|---|---|
| Node.js | >=22 (LTS) | Runtime |
| pnpm | 9.x | Package manager |
| Docker | 24.x | Container runtime |
| Docker Compose | 2.x | Service orchestration |
| Git | 2.x | Version control |

---

## Getting Started

### 1. Clone the repository

```bash
git clone git@github.com:<org>/TaskForge.git
cd TaskForge
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Set up environment variables

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

Edit `.env` files as needed. Defaults work for local Docker development.

### 4. Start all services

```bash
docker compose -f docker/docker-compose.yml up -d
```

This starts: MariaDB, Redis, RabbitMQ, Meilisearch, Prometheus, Grafana, Loki, Promtail, and Mailpit.

### 5. Run database migrations and seed

```bash
pnpm --filter db migrate
pnpm --filter db seed
```

### 6. Start the development servers

```bash
pnpm dev
```

This starts both the API and web dev servers via Turborepo:
- **API**: http://localhost:3000
- **Web**: http://localhost:5173
- **Swagger UI**: http://localhost:3000/docs

---

## Service URLs (Local Development)

| Service | URL | Credentials |
|---|---|---|
| Web app | http://localhost:5173 | Seeded test users (see seed output) |
| API | http://localhost:3000 | — |
| Swagger docs | http://localhost:3000/docs | — |
| RabbitMQ management | http://localhost:15672 | guest / guest |
| Meilisearch | http://localhost:7700 | Master key in .env |
| Grafana | http://localhost:3001 | admin / admin |
| Prometheus | http://localhost:9090 | — |
| Mailpit (email) | http://localhost:8025 | — |

---

## Seeded Login Users (Deterministic Fixtures)

These identities are created by `NODE_ENV=development pnpm test-seed` and `pnpm --filter db seed`.

- Shared password (all password-enabled seeded users): `Taskforge123!`
- MFA status: disabled for all seeded users by default.

### User matrix

#### Global

| Role | Email |
|---|---|
| Super Admin | `superadmin@taskforge.local` |

#### TaskForge Agency (4 projects)

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

#### Acme Corp (6 projects)

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

#### Globex Inc (5 projects)

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

#### Soylent Corp (4 projects)

| Role | Email |
|---|---|
| Org Owner | `owner@soylent.taskforge.local` |
| Project Admin | `projectadmin@soylent.taskforge.local` |
| Backend Developer | `backend1@soylent.taskforge.local` |
| Support Engineer | `support1@soylent.taskforge.local` |
| Customer Reporter | `reporter1@soylent.taskforge.local` |
| Customer Stakeholder | `stakeholder1@soylent.taskforge.local` |

#### Umbrella Corp (3 projects)

| Role | Email |
|---|---|
| Org Owner | `owner@umbrella.taskforge.local` |
| Project Admin | `projectadmin@umbrella.taskforge.local` |
| Backend Developer | `backend1@umbrella.taskforge.local` |
| QA Engineer | `qa1@umbrella.taskforge.local` |
| DevOps/SRE | `devops1@umbrella.taskforge.local` |
| Customer Reporter | `reporter1@umbrella.taskforge.local` |
| Customer Stakeholder | `stakeholder1@umbrella.taskforge.local` |

### Role permissions reference

#### Global roles

| Role | Permissions |
|---|---|
| **Super Admin** | All global and organization-scope permissions |
| **Global Admin** | `organization.create.global` |
| **Global Auditor** | _(read-only global role view)_ |

#### Organization-scoped roles

| Role | Permissions |
|---|---|
| **Owner** | Full org governance: all org settings, auth settings, feature flags, invitations, memberships, roles, permissions, projects, tasks, comments, attachments, notifications (full CRUD) |
| **Admin** | Org read/update; settings, auth settings, feature flags read/update; invitations (full CRUD); memberships read/update; roles/permissions read; projects, tasks, comments, attachments, notifications (full CRUD) |
| **Member** | Org read; membership read; project read; tasks create/read/update; comments create/read/update; attachments create/read; notification read |
| **Viewer** | Org read; membership, invitation, role, permission read; project, task, comment, attachment, notification read only |
| **Support** | Org, settings, auth settings, feature flags read; invitations read/update; memberships read/update; roles/permissions read; projects, tasks, comments read/update; attachments, notifications read |

---

## Common Commands

### Development

```bash
pnpm dev                    # Start all dev servers (Turborepo)
pnpm dev --filter api       # Start API only
pnpm dev --filter web       # Start web only
```

### Building

```bash
pnpm build                  # Build all packages and apps
pnpm build --filter api     # Build API only
pnpm build --filter web     # Build web only
```

### Database

```bash
pnpm --filter db migrate          # Run pending migrations
pnpm --filter db migrate:generate # Generate migration from schema changes
pnpm --filter db seed             # Seed development data
pnpm --filter db studio           # Open Drizzle Studio (DB browser)
NODE_ENV=development pnpm test-seed # DEV-ONLY full reset + deterministic reseed
```

### Testing

```bash
pnpm test                   # Run all tests (Turborepo)
pnpm test --filter api      # Run API tests only
pnpm test --filter web      # Run web tests only
pnpm test:e2e               # Run Playwright E2E tests
pnpm test:coverage          # Run tests with coverage report
```

### Linting & Formatting

```bash
pnpm lint                   # Run Biome check
pnpm lint:fix               # Auto-fix lint and format issues
```

### Docker

```bash
docker compose -f docker/docker-compose.yml up -d      # Start all services
docker compose -f docker/docker-compose.yml down        # Stop all services
docker compose -f docker/docker-compose.yml logs -f api # Tail API logs
```

---

## Worker

The worker process runs separately from the API and consumes RabbitMQ messages:

```bash
pnpm --filter api worker    # Start the worker process
```

In Docker, the worker runs as a separate container using the same API image with a different entry point.

---

## Troubleshooting

### Port conflicts
If default ports are in use, override them in `docker/docker-compose.yml` or the relevant file under `docker/env/*.env`.

### Database connection refused
Ensure MariaDB container is healthy before running migrations:
```bash
docker compose -f docker/docker-compose.yml ps
```

### RabbitMQ not ready
RabbitMQ may take a few seconds to initialize. The API and worker will retry connections automatically.

### Clean reset
To start fresh (destroys all local data):
```bash
NODE_ENV=development pnpm test-seed
```

`pnpm test-seed` is **DEV ONLY** and intentionally destructive. It resets compose local state
(MariaDB, Redis, RabbitMQ, Meilisearch, monitoring/tooling volumes), clears `local/uploads`,
runs DB migration + deterministic seed, reindexes Meilisearch, and executes post-seed checks.
