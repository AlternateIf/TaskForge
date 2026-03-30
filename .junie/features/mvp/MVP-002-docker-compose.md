# MVP-002: Docker Compose Setup

## Description
Configure Docker Compose with all required services for local development. Create Dockerfiles for API, worker, and web containers.

## Personas
- **Sam (DevOps)**: Needs consistent local environment matching production
- **Marcus (Backend)**: One command to start all dependencies

## Dependencies
- MVP-001 (monorepo structure exists)

## Scope

### Files to create
```
docker/
├── docker-compose.yml
├── docker-compose.prod.yml
├── api/
│   └── Dockerfile
├── web/
│   └── Dockerfile
├── worker/
│   └── Dockerfile
├── prometheus/
│   └── prometheus.yml
├── grafana/
│   ├── provisioning/
│   │   ├── datasources/
│   │   │   └── datasources.yml    # Prometheus + Loki
│   │   └── dashboards/
│   │       └── dashboards.yml
│   └── dashboards/
│       └── api-overview.json       # Pre-built API metrics dashboard
├── loki/
│   └── loki-config.yml
└── promtail/
    └── promtail-config.yml
```

### docker-compose.yml services

| Service | Image | Ports | Health check |
|---|---|---|---|
| api | build: ./docker/api | 3000:3000 | GET /health |
| worker | build: ./docker/worker | — | — |
| web | build: ./docker/web | 5173:5173 | — |
| mariadb | mariadb:11 | 3306:3306 | mysqladmin ping |
| redis | redis:7-alpine | 6379:6379 | redis-cli ping |
| rabbitmq | rabbitmq:3-management | 5672:5672, 15672:15672 | rabbitmq-diagnostics -q check_running |
| meilisearch | getmeili/meilisearch:v1 | 7700:7700 | curl /health |
| prometheus | prom/prometheus | 9090:9090 | — |
| grafana | grafana/grafana | 3001:3001 | — |
| loki | grafana/loki | 3100:3100 | — |
| promtail | grafana/promtail | — | — |
| mailpit | axllent/mailpit | 8025:8025, 1025:1025 | — |

### Environment variables
Create `.env.example` files:
- `docker/env/*.env.example` — split per service (`common`, `api`, `worker`, `web`, `mariadb`, `rabbitmq`, `meilisearch`, `grafana`)
- `apps/api/.env.example` — DATABASE_URL, REDIS_URL, RABBITMQ_URL, MEILISEARCH_URL, JWT_SECRET, etc.
- `apps/web/.env.example` — VITE_API_URL

### Dockerfiles
- **api**: Node.js 20 alpine, pnpm install, build, start via `node dist/server.js`
- **worker**: Same image as api, different entrypoint: `node dist/worker.js`
- **web (dev)**: Node.js 20 alpine, pnpm dev (Vite dev server)
- **web (prod)**: Multi-stage — build with Node, serve with nginx

### Dependency ordering
- api depends_on: mariadb (healthy), redis (healthy), rabbitmq (healthy), meilisearch (healthy)
- worker depends_on: mariadb (healthy), redis (healthy), rabbitmq (healthy)

## Acceptance Criteria
- [x] `docker compose -f docker/docker-compose.yml up -d` starts all 12 services
- [x] All health checks pass within 60 seconds
- [x] API container can reach MariaDB, Redis, RabbitMQ, and Meilisearch
- [x] Grafana is accessible at localhost:3002 with pre-provisioned Prometheus and Loki data sources
- [x] RabbitMQ management UI accessible at localhost:15672
- [x] Mailpit web UI accessible at localhost:8025
- [x] `docker compose down` cleanly stops all services
- [x] `docker compose down -v` also removes volumes (clean reset)
