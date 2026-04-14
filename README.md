# TaskForge

TaskForge is a collaborative work platform for multi-organization delivery teams that need clear ownership, strong permissions, and fast execution.

It combines project/task execution, role-based access, realtime collaboration, and operational tooling in one monorepo product.

## Why TaskForge

- Multi-org and multi-project structure for agency and customer work.
- Permission-driven access model for secure collaboration.
- Realtime updates, notifications, search, and rich task workflows.
- Full TypeScript stack with shared contracts across frontend and backend.

## Key Capabilities (Current MVP)

- Authentication and identity flows (JWT/OAuth/MFA foundations)
- Organization, membership, role, and permission management
- Project and task lifecycle management
- Comments/activity, attachments, and notifications
- Realtime updates and full-text search
- API docs via Swagger/OpenAPI at `/docs`

## Quick Start

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
docker compose -f docker/docker-compose.yml up -d
pnpm --filter @taskforge/db migrate
pnpm --filter @taskforge/db seed
pnpm dev
```

If you run invite-only auth (`AUTH_ALLOW_PUBLIC_REGISTER=false`), configure bootstrap admin credentials in `docker/env/common.env` before first start:

```bash
AUTH_BOOTSTRAP_SUPER_ADMIN_EMAIL=admin@example.com
AUTH_BOOTSTRAP_SUPER_ADMIN_PASSWORD=<strong-password>
```

In `NODE_ENV=production`, the API refuses to start until both bootstrap variables are set.

Main local URLs:
- Web: `http://localhost:5173`
- API: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/docs`

## Documentation

User-facing:
- [USAGE.md](USAGE.md)

Developer-facing:
- [.ai/setup.md](.ai/setup.md)
- [.ai/stack.md](.ai/stack.md)
- [.ai/project-structure.md](.ai/project-structure.md)
- [.ai/api-conventions.md](.ai/api-conventions.md)
- [.ai/permissions.md](.ai/permissions.md)

AI/agent routing:
- [AGENTS.md](AGENTS.md)
- [.ai/guidelines.md](.ai/guidelines.md)
- [.opencode/agents/](.opencode/agents)

## Project Status

TaskForge is in active MVP delivery. Requirements and roadmap docs are maintained in `.ai/requirements-*.md` and `.ai/roadmap.md`.

## License

See [LICENSE](LICENSE).
