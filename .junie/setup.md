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
- Shared TOTP secret (MFA-enabled users — `owner@acme`, `owner@globex`): `JBSWY3DPEHPK3PXP`
  - Add to any authenticator app (Google Authenticator, Authy, 1Password, etc.) or use the URI:
    `otpauth://totp/TaskForge?secret=JBSWY3DPEHPK3PXP&issuer=TaskForge&algorithm=SHA1&digits=6&period=30`
- Fixture organizations: **Acme** = `Acme Product Group` · **Globex** = `Globex Operations`

### User matrix

| Email | Global Role | Acme Role | Globex Role | Direct Grants | Auth |
|---|---|---|---|---|---|
| `owner@acme.taskforge.local` | Super Admin | Acme Owner | — | — | Password + MFA |
| `admin@acme.taskforge.local` | Global Admin | Acme Admin | Globex Member | — | Password |
| `member@acme.taskforge.local` | — | Acme Member | Globex Viewer | `invitation.read` (Acme) | Password |
| `owner@globex.taskforge.local` | — | — | Globex Owner | — | Password + MFA |
| `admin@globex.taskforge.local` | — | — | Globex Admin | — | Password |
| `member@globex.taskforge.local` | — | Acme Viewer | Globex Member | `invitation.create` (Acme) | Password (GitHub OAuth is a DB fixture only — use password to log in locally) |
| `qa@taskforge.local` | — | Acme Admin | Globex Admin | — | Password |
| `viewer@acme.taskforge.local` | — | Acme Viewer | — | `membership.update` (Acme) | Password |
| `contractor@globex.taskforge.local` | — | — | Globex Viewer | `invitation.read` (Globex) | Password |
| `support@taskforge.local` | Global Auditor | Acme Support | Globex Support | — | Password |
| `integration.bot@taskforge.local` | — | Acme Viewer | — | `organization.create.global` | No password — not for interactive login |

### Role permissions reference

#### Global roles

| Role | Permissions |
|---|---|
| **Super Admin** | All global and organization-scope permissions |
| **Global Admin** | `organization.create.global`; `global_role_assignment` create/read/update/delete |
| **Global Auditor** | `global_role_assignment.read` |

#### Organization-scoped roles (Acme and Globex roles follow the same permission set)

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
