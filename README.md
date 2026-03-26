# TaskForge

A collaborative task and project management application designed for teams of all sizes — from solo freelancers to enterprise organizations migrating from tools like Workfront.

## Features

- **Projects & Tasks** — customizable workflows, subtasks, checklists, dependencies, drag-and-drop Kanban board, list view
- **Real-Time Collaboration** — WebSocket/SSE push updates, presence indicators, threaded comments with @mentions
- **Search & Filtering** — full-text search (Meilisearch), saved filter presets, global search bar
- **Notifications** — in-app + email notifications with per-event preferences
- **Roles & Permissions** — organization and project-level RBAC with 5 built-in roles
- **Auth** — JWT, OAuth 2.0/OIDC (Google, GitHub), MFA (TOTP)
- **Dashboard** — personalized view with assigned tasks, deadlines, overdue items, project progress
- **Keyboard Shortcuts** — full shortcut system with chord support and reference overlay
- **File Uploads** — drag-and-drop with MIME validation and thumbnails
- **API** — RESTful API with OpenAPI docs, cursor-based pagination, rate limiting, ETag caching

### Planned

- Gantt chart, calendar view, custom fields, custom dashboards & reports
- Time tracking, approval workflows, automations
- GitHub & GitLab integration (PR/MR linking, CI status, issue import/export)
- Workfront import/export with bidirectional sync
- Portfolios, resource management, billing rates, test case management
- Official TypeScript SDK, webhooks, personal access tokens

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query |
| Backend | Fastify, Drizzle ORM, Zod |
| Database | MariaDB |
| Cache | Redis |
| Queue | RabbitMQ (amqplib) |
| Search | Meilisearch |
| Email | Nodemailer, react-email |
| Monitoring | Prometheus, Grafana, Loki |
| Testing | Vitest, Testing Library, Playwright |
| Tooling | Turborepo, pnpm, Biome, GitHub Actions |

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm (`corepack enable`)
- Docker & Docker Compose

### Setup

```bash
git clone <repo-url> && cd TaskForge
pnpm install
cp docker/.env.example docker/.env
docker compose -f docker/docker-compose.yml up -d
```

### Development

```bash
pnpm dev          # Start all apps in dev mode
pnpm build        # Build all packages
pnpm test         # Run tests
pnpm lint         # Lint & format check (Biome)
pnpm lint:fix     # Auto-fix lint issues
```

### Services

| Service | URL |
|---|---|
| API | http://localhost:3000 |
| Web | http://localhost:5173 |
| Grafana | http://localhost:3002 |
| RabbitMQ Management | http://localhost:15672 |
| Mailpit | http://localhost:8025 |
| Meilisearch | http://localhost:7700 |
| Prometheus | http://localhost:9090 |

## Project Structure

```
TaskForge/
├── apps/
│   ├── api/          # Fastify backend API + WebSocket server
│   └── web/          # React SPA
├── packages/
│   ├── shared/       # Shared types, constants, Zod schemas
│   ├── db/           # Drizzle ORM schemas and migrations
│   └── email-templates/  # react-email templates
├── docker/           # Docker Compose, Dockerfiles, monitoring configs
└── .github/          # CI/CD workflows
```

## Documentation

Full project documentation lives in [`.junie/`](.junie/guidelines.md):

- [Requirements](.junie/requirements.md) — features and non-functional requirements
- [Stack](.junie/stack.md) — technology choices
- [Roadmap](.junie/roadmap.md) — MVP, Phase 2, Phase 3 feature phasing
- [Data Model](.junie/data-model.md) — entities and relationships
- [API Conventions](.junie/api-conventions.md) — REST standards, errors, auth
- [Project Structure](.junie/project-structure.md) — monorepo layout
- [Design Principles](.junie/design-principles.md) — architecture guidelines
- [Setup](.junie/setup.md) — environment setup and troubleshooting

## License

See [LICENSE](LICENSE).
