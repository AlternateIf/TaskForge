# TaskForge — Environment Setup

How to run TaskForge locally for development and testing.

## Prerequisites

- Node.js `>=22`
- `pnpm@9`
- Docker + Docker Compose

## First-Time Setup

1. Install dependencies:

```bash
pnpm install
```

2. Create env files:

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

3. Start infra services:

```bash
docker compose -f docker/docker-compose.yml up -d
```

4. Run DB migration and seed:

```bash
pnpm --filter @taskforge/db migrate
pnpm --filter @taskforge/db seed
```

5. Start app dev processes:

```bash
pnpm dev
```

Optional worker-only local run:

```bash
pnpm --filter @taskforge/api dev:worker
```

## Local URLs

- Web: `http://localhost:5173`
- API: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/docs`
- RabbitMQ: `http://localhost:15672`
- Meilisearch: `http://localhost:7700`
- Mailpit: `http://localhost:8025`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001`

## Seed And Reset Workflows

Standard seed:

```bash
pnpm --filter @taskforge/db seed
```

Validation of seeded invariants:

```bash
pnpm --filter @taskforge/db seed:validate
```

Full deterministic reset (dev only, destructive):

```bash
NODE_ENV=development pnpm test-seed
```

`test-seed` script location:
- `scripts/test-seed.sh`

Supported `test-seed` options:
- `--reset-only`
- `--seed-only`
- `--with-sample-data`
- `--skip-reindex`

Seed implementation sources:
- `packages/db/src/seed/index.ts`
- `packages/db/src/seed/dataset-config.ts`
- `packages/db/src/seed/credential-catalog.ts`
- `packages/db/src/seed/summary.ts`

## Common Commands

Development:

```bash
pnpm dev
pnpm --filter @taskforge/api dev
pnpm --filter @taskforge/web dev
```

Build + test + lint:

```bash
pnpm build
pnpm test
pnpm lint
```

Database tooling:

```bash
pnpm --filter @taskforge/db migrate
pnpm --filter @taskforge/db migrate:generate
pnpm --filter @taskforge/db push
pnpm --filter @taskforge/db studio
```

## Troubleshooting

Port conflicts:
- Override ports in `docker/docker-compose.yml` or `docker/env/*.env`.

Database unavailable:
- Check compose services and health:

```bash
docker compose -f docker/docker-compose.yml ps
```

RabbitMQ startup lag:
- Wait a few seconds; API and worker retry connections automatically.

Stale local state:
- Use `NODE_ENV=development pnpm test-seed` for a full reset.
