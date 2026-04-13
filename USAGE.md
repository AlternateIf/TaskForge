# TaskForge Usage Guide

This guide explains how to use TaskForge at a product level.

## Core Concepts

- **Organization**: top-level workspace boundary.
- **Project**: execution container inside an organization.
- **Task**: work item inside a project.
- **Role and permission**: access model controlling visible actions.

## Typical Workflow

1. Create or select an organization.
2. Create projects for delivery streams.
3. Invite members and assign roles.
4. Create tasks and assign owners.
5. Track progress in project task views.
6. Use comments, notifications, and realtime updates for coordination.

## Role-Based Access

TaskForge enforces permission-based actions in both API and UI.

Common examples:
- Organization permissions: org setup, member/role administration.
- Project permissions: project lifecycle operations.
- Task permissions: create/read/update/delete task work.

See full permission matrix in [.ai/permissions.md](.ai/permissions.md).

## Notifications And Realtime

- Notifications surface relevant activity and updates.
- Realtime channels keep task/project views current without manual refresh.

## Search

Use global/project search to find tasks and related entities quickly.

## API And Integrations

- Interactive API docs: `http://localhost:3000/docs`
- Contract conventions: [.ai/api-conventions.md](.ai/api-conventions.md)

## Local Development Usage

For setup and seed/reset workflows, use:
- [.ai/setup.md](.ai/setup.md)

## Operational Logging

TaskForge includes built-in log rotation and retention policies for Docker container logs and Loki log aggregation.

### Docker Log Rotation

All 12 services use Docker's `json-file` logging driver with the following policy:

| Setting | Value | Description |
|---------|-------|-------------|
| `max-size` | `10m` | Rotate when log file exceeds 10 MB |
| `max-file` | `5` | Keep up to 5 rotated log files |
| `compress` | `true` | Compress rotated logs with gzip |

These defaults are defined in `docker/docker-compose.yml` via `x-logging-defaults` and can be overridden via environment variables:

- `DOCKER_LOG_MAX_SIZE` (default: `10m`)
- `DOCKER_LOG_MAX_FILE` (default: `5`)
- `DOCKER_LOG_COMPRESS` (default: `true`)

### Loki Log Retention

Loki is configured with the following retention policy:

| Setting | Value | Description |
|---------|-------|-------------|
| `retention_period` | `7d` | Delete logs older than 7 days |
| `retention_enabled` | `true` | Enable the compactor for retention |
| `compactor.working_directory` | `/loki/compactor` | Compactor working directory |

The Loki image is pinned to `grafana/loki:2.9.2`.

#### Pre-Implementation Backup

Before enabling compactor retention (or before upgrading Loki), operators can back up existing Loki data:

```bash
docker run --rm -v taskforge_loki_data:/source -v $(pwd)/local/backups:/backup alpine tar -czf /backup/loki-data-pre-compactor-$(date +%Y%m%d-%H%M%S).tgz -C /source .
```

This creates a timestamped archive in `local/backups/`.

#### Rollback Notes

To disable Loki retention:

1. Revert the Loki image to a version without the compactor enabled.
2. Set `LOKI_RETENTION_PERIOD` to a higher value (e.g., `0` or remove the variable).
3. The compactor will stop processing retention.

Existing rotated Docker logs remain bounded by the `max-size` and `max-file` settings regardless of Loki configuration.

### Accessing Logs

- **Loki**: `http://localhost:3100` (Grafana datasource configured)
- **Grafana**: `http://localhost:3002` (login: `admin`/`admin`)
- **Docker container logs**: `docker compose -f docker/docker-compose.yml logs <service>`
