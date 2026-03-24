# TaskForge — Technology Stack

## Frontend

| Layer | Technology | Purpose |
|---|---|---|
| Framework | React + TypeScript | UI framework with type safety |
| Build tool | Vite | Fast dev server and production builds |
| Styling | Tailwind CSS + shadcn/ui | Utility-first CSS with accessible components |
| Server state | TanStack Query | Caching, background refetching, server state management |
| Real-time | Native WebSocket + EventSource (SSE) | Live updates, presence, notifications |

## Backend

| Layer | Technology | Purpose |
|---|---|---|
| Framework | Fastify | HTTP server |
| Plugins | @fastify/cors, @fastify/helmet, @fastify/rate-limit | CORS, security headers, rate limiting |
| ORM | Drizzle | Type-safe database access and migrations |
| Database | MariaDB | Primary relational data store |
| Cache / Sessions | Redis (ioredis) | Caching, session storage, real-time pub/sub for multi-instance broadcast |
| Message queue | RabbitMQ (rascal) | Async messaging and job processing |
| Search | Meilisearch (official JS SDK) | Full-text search |
| Real-time | @fastify/websocket + sse | WebSocket/SSE server for push updates and presence |
| Auth | @fastify/jwt + openid-client | JWT-based auth, OAuth 2.0, OIDC |
| Validation | Zod + fastify-type-provider-zod | Schema validation (shared with frontend) |
| Email | Nodemailer + react-email | Transactional email with JSX templates |
| API docs | @fastify/swagger + @fastify/swagger-ui | Auto-generated OpenAPI specification |
| Metrics | prom-client | Prometheus metrics endpoint |

## SDK

| Layer | Technology | Purpose |
|---|---|---|
| Package | @taskforge/sdk (TypeScript) | Official API client for third-party integrations |
| Bundler | tsup | Build and publish to npm |

## Testing

| Layer | Technology | Purpose |
|---|---|---|
| Backend unit / integration | Vitest + Supertest | API and service testing |
| Frontend unit / integration | Vitest + Testing Library | Component and hook testing |
| E2E | Playwright | Cross-browser end-to-end testing |

## Tooling

| Layer | Technology | Purpose |
|---|---|---|
| Monorepo | Turborepo + pnpm | Task orchestration and dependency management |
| Linting / Formatting | Biome | Single tool for linting and formatting |
| CI/CD | GitHub Actions | Automated testing, bundle size checks, dependency audit, deployment |

## Docker Compose Services

| Container | Image | Purpose | Dev | Prod |
|---|---|---|---|---|
| api | Custom (Node.js + Fastify) | Backend API server + WebSocket/SSE | yes | yes |
| worker | Custom (Node.js + Fastify) | RabbitMQ consumer for async jobs | yes | yes |
| web | Custom (Node.js + Vite / nginx) | React SPA | yes | yes |
| mariadb | mariadb | Primary database | yes | yes |
| redis | redis | Cache, sessions, real-time pub/sub | yes | yes |
| rabbitmq | rabbitmq:management | Message queue with management UI | yes | yes |
| meilisearch | getmeili/meilisearch | Full-text search engine | yes | yes |
| prometheus | prom/prometheus | Metrics collection | yes | yes |
| grafana | grafana/grafana | Dashboards and visualization | yes | yes |
| loki | grafana/loki | Log aggregation | yes | yes |
| promtail | grafana/promtail | Ships container logs to Loki | yes | yes |
| mailpit | axllent/mailpit | Local email testing | yes | no |

Infrastructure-level concerns (reverse proxy, SSL, load balancing, CDN for static assets) are handled outside Docker Compose at the deployment layer.
