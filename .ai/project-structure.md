# TaskForge — Project Structure

Turborepo monorepo with pnpm workspaces. Two applications, shared packages, and an SDK.

---

## Top-Level Layout

```
TaskForge/
├── apps/
│   ├── api/                  # Fastify backend API + worker
│   └── web/                  # React SPA frontend
├── packages/
│   ├── shared/               # Shared TypeScript types, Zod schemas, constants
│   ├── db/                   # Drizzle schema, migrations, seed scripts
│   ├── email-templates/      # react-email templates
│   └── sdk/                  # Official TypeScript SDK (@taskforge/sdk)
├── docker/                   # Dockerfiles and Docker Compose config
├── .github/
│   └── workflows/            # GitHub Actions CI/CD pipelines
├── .ai/                   # Project guidelines, requirements, architecture and style docs
├── turbo.json                # Turborepo pipeline configuration
├── pnpm-workspace.yaml       # pnpm workspace definitions
├── biome.json                # Biome linting and formatting config
├── package.json              # Root package.json (scripts, devDependencies)
└── README.md
```

---

## apps/api — Backend

```
apps/api/
├── src/
│   ├── server.ts             # Fastify server setup, plugin registration
│   ├── worker.ts             # RabbitMQ consumer entry point
│   ├── routes/               # Route modules grouped by resource
│   │   ├── auth/
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.handlers.ts
│   │   │   └── auth.schemas.ts     # Zod request/response schemas
│   │   ├── projects/
│   │   ├── tasks/
│   │   ├── comments/
│   │   ├── issues/
│   │   ├── releases/
│   │   ├── test-cases/
│   │   ├── test-plans/
│   │   ├── dashboards/
│   │   ├── reports/
│   │   ├── time-entries/
│   │   ├── approvals/
│   │   ├── automations/
│   │   ├── webhooks/
│   │   ├── import/
│   │   ├── alerts/
│   │   ├── health/
│   │   │   └── health.routes.ts    # /health and /ready endpoints
│   │   └── ...
│   ├── services/             # Business logic layer
│   │   ├── auth.service.ts
│   │   ├── task.service.ts
│   │   ├── notification.service.ts
│   │   ├── import.service.ts
│   │   ├── alert-ingestion.service.ts
│   │   ├── workload-alert.service.ts
│   │   └── ...
│   ├── plugins/              # Fastify plugins (auth, rate-limit, swagger, etc.)
│   │   ├── auth.plugin.ts          # JWT + PAT + OAuth verification
│   │   ├── swagger.plugin.ts
│   │   ├── rate-limit.plugin.ts
│   │   ├── cors.plugin.ts
│   │   ├── helmet.plugin.ts
│   │   └── ...
│   ├── ws/                   # WebSocket / SSE real-time layer
│   │   ├── gateway.ts        # WebSocket server setup, connection handling
│   │   ├── channels.ts       # Channel subscription management
│   │   ├── presence.ts       # Presence tracking (who is viewing what)
│   │   └── sse.ts            # SSE fallback endpoint
│   ├── queues/               # RabbitMQ producers and consumers
│   │   ├── publisher.ts      # amqplib publisher setup
│   │   ├── consumer.ts       # amqplib consumer setup
│   │   └── handlers/         # Message handlers per event type
│   │       ├── notification.handler.ts
│   │       ├── email.handler.ts
│   │       ├── search-index.handler.ts
│   │       ├── realtime-broadcast.handler.ts   # Publishes events to WebSocket/SSE
│   │       ├── import.handler.ts               # Processes import jobs
│   │       ├── alert-ingestion.handler.ts      # Processes incoming alerts
│   │       ├── retention.handler.ts            # Scheduled retention enforcement
│   │       ├── workload-check.handler.ts       # Periodic workload threshold check
│   │       └── ...
│   ├── hooks/                # Fastify lifecycle hooks (onRequest, onError, onClose)
│   ├── utils/                # Shared utilities (logger, errors, pagination, etag helpers)
│   └── types/                # API-specific TypeScript types
├── test/
│   ├── routes/               # Route-level integration tests (Supertest)
│   ├── services/             # Service unit tests
│   ├── ws/                   # WebSocket/SSE tests
│   └── helpers/              # Test utilities, fixtures, factories
├── Dockerfile
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### Conventions
- **One route module per resource**: each resource directory has `*.routes.ts` (registration), `*.handlers.ts` (request handlers), and `*.schemas.ts` (Zod schemas)
- **Services own business logic**: route handlers delegate to services; services are testable without HTTP
- **Queues**: producers publish events from services; consumers run in the worker process and delegate to handlers
- **Real-time**: the `ws/` directory manages WebSocket connections; the `realtime-broadcast.handler.ts` queue handler pushes events to connected clients via the gateway
- **Health checks**: `/health` and `/ready` are registered outside the versioned API prefix

---

## apps/web — Frontend

```
apps/web/
├── src/
│   ├── main.tsx              # App entry point
│   ├── App.tsx               # Root component, router setup
│   ├── routes/               # Page components mapped to routes
│   │   ├── dashboard/
│   │   ├── projects/
│   │   ├── tasks/
│   │   ├── issues/
│   │   ├── releases/
│   │   ├── reports/
│   │   ├── settings/
│   │   ├── import/
│   │   ├── auth/
│   │   └── onboarding/      # First-login guided flow, sample project setup
│   ├── components/           # Reusable UI components
│   │   ├── ui/               # shadcn/ui base components
│   │   ├── layout/           # Shell, sidebar, header, etc.
│   │   ├── forms/            # Form components (inputs, selects, etc.)
│   │   ├── data/             # Data display (tables, charts, cards)
│   │   ├── gantt/            # Gantt chart components
│   │   ├── kanban/           # Kanban board components
│   │   └── shortcuts/        # Keyboard shortcut overlay and handlers
│   ├── hooks/                # Custom React hooks
│   │   ├── use-realtime.ts   # WebSocket/SSE connection and subscriptions
│   │   ├── use-presence.ts   # Presence tracking
│   │   ├── use-shortcuts.ts  # Keyboard shortcut registration
│   │   └── ...
│   ├── api/                  # TanStack Query hooks and API client
│   │   ├── client.ts         # Fetch wrapper with auth headers
│   │   ├── realtime.ts       # WebSocket/SSE client, reconnection logic
│   │   ├── tasks.ts          # useTask, useTasks, useCreateTask, etc.
│   │   ├── projects.ts
│   │   └── ...
│   ├── stores/               # Client-only state (if needed, e.g., UI state)
│   ├── utils/                # Shared frontend utilities
│   └── types/                # Frontend-specific types (re-exports shared types)
├── public/                   # Static assets
├── test/
│   ├── components/           # Component tests (Testing Library)
│   ├── hooks/                # Hook tests
│   └── helpers/              # Test utilities, mocks
├── e2e/                      # Playwright E2E tests
│   ├── fixtures/
│   └── specs/
├── index.html
├── Dockerfile
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
└── tailwind.config.ts
```

### Conventions
- **Route-based code splitting**: each route directory is a lazy-loaded page
- **Colocation**: route-specific components live in their route directory; shared components go in `components/`
- **API hooks**: all server communication goes through TanStack Query hooks in `api/` — no raw fetch calls in components
- **Real-time**: `use-realtime.ts` hook manages WebSocket/SSE connection; TanStack Query cache is invalidated on incoming events for automatic UI refresh
- **Keyboard shortcuts**: global shortcuts registered in `use-shortcuts.ts`; overlay component toggled by `?` key

---

## packages/shared — Shared Code

```
packages/shared/
├── src/
│   ├── schemas/              # Zod schemas shared between API and web
│   │   ├── task.schema.ts
│   │   ├── project.schema.ts
│   │   ├── user.schema.ts
│   │   ├── release.schema.ts
│   │   ├── test-case.schema.ts
│   │   └── ...
│   ├── types/                # TypeScript types derived from Zod schemas
│   ├── constants/            # Shared constants (priorities, statuses, roles, limits, shortcuts)
│   └── utils/                # Shared pure utility functions
├── package.json
└── tsconfig.json
```

---

## packages/db — Database

```
packages/db/
├── src/
│   ├── schema/               # Drizzle schema definitions
│   │   ├── users.ts
│   │   ├── organizations.ts
│   │   ├── projects.ts
│   │   ├── tasks.ts
│   │   ├── issues.ts
│   │   ├── releases.ts
│   │   ├── test-management.ts
│   │   ├── billing-rates.ts
│   │   ├── import-jobs.ts
│   │   ├── alert-ingestion.ts
│   │   └── ...
│   ├── migrations/           # Generated Drizzle migration files
│   ├── seed/                 # Seed scripts for development data
│   │   ├── index.ts
│   │   ├── sample-project.ts # Sample/demo project for onboarding
│   │   └── factories/        # Data factories for testing
│   └── client.ts             # Drizzle client setup and connection
├── drizzle.config.ts
├── package.json
└── tsconfig.json
```

---

## packages/email-templates — Email

```
packages/email-templates/
├── src/
│   ├── templates/
│   │   ├── welcome.tsx
│   │   ├── task-assigned.tsx
│   │   ├── deadline-reminder.tsx
│   │   ├── approval-request.tsx
│   │   ├── workload-alert.tsx
│   │   ├── import-complete.tsx
│   │   ├── report-delivery.tsx
│   │   └── ...
│   └── preview.tsx           # Dev preview server
├── package.json
└── tsconfig.json
```

---

## packages/sdk — Official TypeScript SDK

```
packages/sdk/
├── src/
│   ├── client.ts             # TaskForgeClient class (auth, base URL config)
│   ├── resources/            # Resource-specific methods
│   │   ├── tasks.ts          # client.tasks.list(), .get(), .create(), .update(), .delete()
│   │   ├── projects.ts
│   │   ├── issues.ts
│   │   ├── comments.ts
│   │   ├── webhooks.ts
│   │   └── ...
│   ├── realtime.ts           # WebSocket/SSE subscription client
│   ├── types.ts              # Re-exports from @taskforge/shared
│   └── index.ts              # Public API entry point
├── test/
├── package.json              # Published as @taskforge/sdk
├── tsconfig.json
└── tsup.config.ts            # Bundle config for npm publishing
```

---

## docker/ — Container Configuration

```
docker/
├── docker-compose.yml        # Full stack for local development
├── docker-compose.prod.yml   # Production overrides
├── api/
│   └── Dockerfile
├── web/
│   └── Dockerfile
├── worker/
│   └── Dockerfile
├── prometheus/
│   └── prometheus.yml        # Scrape targets configuration
├── grafana/
│   ├── provisioning/         # Auto-provisioned dashboards and data sources
│   └── dashboards/
├── loki/
│   └── loki-config.yml
└── promtail/
    └── promtail-config.yml
```

---

## .github/workflows — CI/CD

```
.github/
└── workflows/
    ├── ci.yml                # Lint, type-check, test, bundle size check, dependency audit
    ├── e2e.yml               # Playwright E2E tests (runs after CI passes)
    ├── deploy.yml            # Build Docker images, push to registry, deploy
    └── sdk-publish.yml       # Publish @taskforge/sdk to npm on release
```

### CI pipeline steps
1. Install dependencies (pnpm)
2. Biome lint + format check
3. TypeScript type check (all packages)
4. Unit + integration tests (Vitest) with coverage
5. **Bundle size check** — fail if web bundle exceeds 500KB gzipped, warn at 250KB
6. **Dependency vulnerability scan** — `pnpm audit --audit-level=high`
7. Build all packages

---

## Service Communication

```
                        ┌──────────┐
                        │   web    │
                        │ (React)  │
                        └────┬─────┘
                             │ HTTP (REST API) + WebSocket/SSE
                             ▼
                        ┌──────────┐        ┌─────────────┐
                        │   api    │───────→│  Meilisearch │
                        │(Fastify) │        └─────────────┘
                        └──┬───┬───┘
                           │   │
              ┌────────────┘   └────────────┐
              ▼                              ▼
        ┌──────────┐                  ┌──────────┐
        │ MariaDB  │                  │  Redis   │
        └──────────┘                  └──────────┘
                                           ▲
                                           │ pub/sub (real-time broadcast)
              publishes events             │
              ┌────────────────────────────┘
              ▼
        ┌──────────┐
        │ RabbitMQ │
        └────┬─────┘
             │  consumes
             ▼
        ┌──────────┐        ┌──────────┐
        │  worker  │───────→│ Mailpit  │ (dev)
        │(consumer)│        └──────────┘
        └──────────┘

External:
  GitHub ──webhook──→ api (PR/deployment events → activity log)
  AlertManager ──webhook──→ api /alerts/ingest (→ auto-creates issues)
```

- **web → api**: REST API over HTTP + WebSocket/SSE for real-time updates
- **api → MariaDB**: Drizzle ORM queries
- **api → Redis**: Cache reads/writes, session management, real-time pub/sub for multi-instance broadcast
- **api → Meilisearch**: Search queries
- **api → RabbitMQ**: Publishes events (amqplib)
- **worker ← RabbitMQ**: Consumes events, sends emails, updates search indexes, processes automations, handles imports, checks workload thresholds, enforces retention
- **Redis pub/sub**: Used by API instances to broadcast real-time events across multiple API server instances (horizontal scaling)
- **GitHub → api**: Incoming webhooks for PR linking and deployment events
- **AlertManager/Grafana → api**: Incoming alert webhooks auto-create issues
