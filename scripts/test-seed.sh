#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker/docker-compose.yml"
UPLOADS_DIR="${ROOT_DIR}/local/uploads"
COMPOSE_CMD=(docker compose -f "${COMPOSE_FILE}")
WAIT_TIMEOUT_SECONDS=180

log() {
  printf '[test-seed] %s\n' "$1"
}

abort() {
  printf '[test-seed] ERROR: %s\n' "$1" >&2
  exit 1
}

require_cmd() {
  local name="$1"
  command -v "$name" >/dev/null 2>&1 || abort "Required command not found: ${name}"
}

wait_for_service() {
  local service="$1"
  local timeout_seconds="$2"
  local container_id

  container_id=$("${COMPOSE_CMD[@]}" ps -q "$service")
  if [[ -z "$container_id" ]]; then
    abort "Service '${service}' is not running. Check docker compose logs for startup failures."
  fi

  local elapsed=0
  while (( elapsed < timeout_seconds )); do
    local status
    status=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id" 2>/dev/null || true)

    case "$status" in
      healthy|running)
        log "Service '${service}' is ready (${status})."
        return
        ;;
      starting|created|restarting)
        ;;
      unhealthy|exited|dead)
        abort "Service '${service}' failed with state '${status}'. Run: docker compose -f docker/docker-compose.yml logs ${service}"
        ;;
      "")
        ;;
      *)
        ;;
    esac

    sleep 2
    elapsed=$((elapsed + 2))
  done

  abort "Timed out waiting for service '${service}' to become healthy/running."
}

print_banner() {
  cat <<'BANNER'
===============================================================
TaskForge DEV TEST-SEED RESET
DEV ONLY | DANGEROUS | DESTRUCTIVE

This command destroys LOCAL development data and recreates a
known deterministic baseline.

NEVER run this against non-development infrastructure.
===============================================================
BANNER
}

main() {
  print_banner

  if [[ "${NODE_ENV:-}" != "development" ]]; then
    abort "NODE_ENV must be exactly 'development'. Example: NODE_ENV=development pnpm test-seed"
  fi

  require_cmd docker
  require_cmd pnpm

  [[ -f "$COMPOSE_FILE" ]] || abort "Compose file not found: ${COMPOSE_FILE}"

  "${COMPOSE_CMD[@]}" config >/dev/null
  docker info >/dev/null 2>&1 || abort 'Docker daemon is not reachable. Start Docker and retry.'

  log 'Destroying compose services and volumes (full local reset)...'
  "${COMPOSE_CMD[@]}" down -v --remove-orphans

  log 'Clearing local uploads...'
  mkdir -p "$UPLOADS_DIR"
  find "$UPLOADS_DIR" -mindepth 1 -delete

  log 'Recreating compose services...'
  "${COMPOSE_CMD[@]}" up -d

  log 'Waiting for services to become healthy/running...'
  mapfile -t services < <("${COMPOSE_CMD[@]}" config --services)
  for service in "${services[@]}"; do
    wait_for_service "$service" "$WAIT_TIMEOUT_SECONDS"
  done

  if find "$ROOT_DIR/packages/db/src/migrations" -maxdepth 1 -type f | grep -q .; then
    log 'Running database migrations...'
    (
      cd "$ROOT_DIR"
      pnpm --filter @taskforge/db migrate
    )
  else
    log 'No SQL migration files found. Running schema sync via drizzle push...'
    (
      cd "$ROOT_DIR"
      pnpm --filter @taskforge/db push
    )
  fi

  log 'Running deterministic database seed...'
  (
    cd "$ROOT_DIR"
    pnpm --filter @taskforge/db seed
  )

  log 'Reindexing Meilisearch from seeded DB...'
  (
    cd "$ROOT_DIR"
    pnpm --filter @taskforge/api reindex:search
  )

  log 'Running post-seed validation checks...'
  (
    cd "$ROOT_DIR"
    pnpm --filter @taskforge/db seed:validate
  )

  cat <<'SUMMARY'

[test-seed] Reset complete.

Developer TODO before UI verification:
- Clear browser cache (or force refresh) to avoid stale frontend assets.

Known dev credentials (deterministic fixtures):
- Password for all password-enabled users: Taskforge123!
- Users:
  - owner@acme.taskforge.local
  - admin@acme.taskforge.local
  - member@acme.taskforge.local
  - owner@globex.taskforge.local
  - admin@globex.taskforge.local
  - member@globex.taskforge.local
  - qa@taskforge.local

SUMMARY
}

main "$@"
