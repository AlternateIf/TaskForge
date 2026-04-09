#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker/docker-compose.yml"
UPLOADS_DIR="${ROOT_DIR}/local/uploads"
COMPOSE_CMD=(docker compose -f "${COMPOSE_FILE}")
WAIT_TIMEOUT_SECONDS=180
LOG_TAIL_LINES=80
CORE_SERVICES=(mariadb redis rabbitmq meilisearch)
TEST_SEED_DATABASE_URL="${TEST_SEED_DATABASE_URL:-mysql://taskforge:taskforge@localhost:3306/taskforge}"
DB_CMD_RETRIES="${DB_CMD_RETRIES:-8}"
DB_CMD_RETRY_DELAY_SECONDS="${DB_CMD_RETRY_DELAY_SECONDS:-3}"

# ── CLI option defaults ──────────────────────────────────────
SEED_MODE="reset-and-seed"
SEED_INCLUDE_SAMPLE_DATA="0"
SEED_SKIP_REINDEX="0"

usage() {
  cat <<'HELP'
Usage: test-seed.sh [OPTIONS]

Options:
  --reset-only         Reset infrastructure and DB schema only (no seed data)
  --seed-only          Re-seed an existing DB without recreating infrastructure
  --with-sample-data   Include sample fixtures in addition to core fixtures
  --skip-reindex      Skip Meilisearch reindex and validation
  --help               Show this help message
HELP
}

# ── Parse CLI arguments ──────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --reset-only)
      SEED_MODE="reset-only"
      shift
      ;;
    --seed-only)
      SEED_MODE="seed-only"
      shift
      ;;
    --with-sample-data)
      SEED_INCLUDE_SAMPLE_DATA="1"
      shift
      ;;
    --skip-reindex)
      SEED_SKIP_REINDEX="1"
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      abort "Unknown option: $1. Use --help for usage."
      ;;
  esac
done

# ── Export env vars for seed/validate subprocesses ────────────
export SEED_MODE
export SEED_INCLUDE_SAMPLE_DATA
export SEED_SKIP_REINDEX

log() {
  printf '[test-seed] %s\n' "$1"
}

abort() {
  printf '[test-seed] ERROR: %s\n' "$1" >&2
  print_failure_diagnostics || true
  exit 1
}

print_failure_diagnostics() {
  printf '[test-seed] ---- diagnostics start ----\n' >&2

  if ! command -v docker >/dev/null 2>&1; then
    printf '[test-seed] docker command not available; skipping diagnostics.\n' >&2
    printf '[test-seed] ---- diagnostics end ----\n' >&2
    return
  fi

  if ! docker info >/dev/null 2>&1; then
    printf '[test-seed] Docker daemon not reachable; cannot gather compose diagnostics.\n' >&2
    printf '[test-seed] ---- diagnostics end ----\n' >&2
    return
  fi

  printf '[test-seed] docker compose ps:\n' >&2
  "${COMPOSE_CMD[@]}" ps >&2 || true

  mapfile -t services < <("${COMPOSE_CMD[@]}" config --services 2>/dev/null || true)
  if [[ "${#services[@]}" -eq 0 ]]; then
    printf '[test-seed] no compose services resolved for log collection.\n' >&2
    printf '[test-seed] ---- diagnostics end ----\n' >&2
    return
  fi

  for service in "${services[@]}"; do
    printf '[test-seed] logs (%s, last %s lines):\n' "$service" "$LOG_TAIL_LINES" >&2
    "${COMPOSE_CMD[@]}" logs --tail="$LOG_TAIL_LINES" "$service" >&2 || true
  done

  printf '[test-seed] ---- diagnostics end ----\n' >&2
}

trap 'print_failure_diagnostics || true' ERR

require_cmd() {
  local name="$1"
  command -v "$name" >/dev/null 2>&1 || abort "Required command not found: ${name}"
}

run_db_workspace_cmd() {
  local label="$1"
  shift
  local attempt=1

  while (( attempt <= DB_CMD_RETRIES )); do
    if (
      cd "$ROOT_DIR"
      DATABASE_URL="$TEST_SEED_DATABASE_URL" SEED_MODE="$SEED_MODE" SEED_INCLUDE_SAMPLE_DATA="$SEED_INCLUDE_SAMPLE_DATA" SEED_SKIP_REINDEX="$SEED_SKIP_REINDEX" "$@"
    ); then
      return 0
    fi

    if (( attempt == DB_CMD_RETRIES )); then
      break
    fi

    log "${label} failed (attempt ${attempt}/${DB_CMD_RETRIES}); retrying in ${DB_CMD_RETRY_DELAY_SECONDS}s..."
    sleep "$DB_CMD_RETRY_DELAY_SECONDS"
    attempt=$((attempt + 1))
  done

  return 1
}

check_db_available() {
  local max_retries="${DB_CMD_RETRIES}"
  local delay="${DB_CMD_RETRY_DELAY_SECONDS}"
  local attempt=1

  while (( attempt <= max_retries )); do
    if (
      cd "$ROOT_DIR/packages/db"
      DATABASE_URL="$TEST_SEED_DATABASE_URL" node -e "
        const mysql = require('mysql2/promise');
        (async () => {
          const conn = await mysql.createConnection(process.env.DATABASE_URL);
          await conn.execute('SELECT 1');
          await conn.end();
          process.exit(0);
        })().catch(() => process.exit(1));
      "
    ); then
      log 'Database is available.'
      return 0
    fi

    if (( attempt == max_retries )); then
      break
    fi

    log "Database not available yet (attempt ${attempt}/${max_retries}); retrying in ${delay}s..."
    sleep "$delay"
    attempt=$((attempt + 1))
  done

  abort "Database is not available after ${max_retries} attempts."
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
TaskForge DEV TEST-SEED
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

  log "Seed mode: ${SEED_MODE}"
  log "Include sample data: ${SEED_INCLUDE_SAMPLE_DATA}"
  log "Skip reindex: ${SEED_SKIP_REINDEX}"

  # ── seed-only: fast path that skips infrastructure teardown ──
  if [[ "$SEED_MODE" == "seed-only" ]]; then
    check_db_available

    log 'Truncating seeded tables and re-seeding (seed-only mode)...'
    run_db_workspace_cmd "Database seed (seed-only)" pnpm --filter @taskforge/db seed ||
      abort "Database seed (seed-only) failed after ${DB_CMD_RETRIES} attempts."

    if [[ "$SEED_SKIP_REINDEX" != "1" ]]; then
      log 'Reindexing Meilisearch from seeded DB...'
      (
        cd "$ROOT_DIR"
        pnpm --filter @taskforge/api reindex:search
      )
    else
      log 'Skipping Meilisearch reindex (--skip-reindex).'
    fi

    log 'Running post-seed validation checks...'
    run_db_workspace_cmd "Seed validation" pnpm --filter @taskforge/db seed:validate ||
      abort "Seed validation failed after ${DB_CMD_RETRIES} attempts."

    cat <<'SUMMARY'

[test-seed] Seed-only reset complete.

Developer TODO before UI verification:
- Clear browser cache (or force refresh) to avoid stale frontend assets.

SUMMARY
    return 0
  fi

  # ── Full reset path (reset-and-seed or reset-only) ──────────
  [[ -f "$COMPOSE_FILE" ]] || abort "Compose file not found: ${COMPOSE_FILE}"

  "${COMPOSE_CMD[@]}" config >/dev/null
  docker info >/dev/null 2>&1 || abort 'Docker daemon is not reachable. Start Docker and retry.'

  log 'Destroying compose services and volumes (full local reset)...'
  "${COMPOSE_CMD[@]}" down -v --remove-orphans

  log 'Clearing local uploads...'
  mkdir -p "$UPLOADS_DIR"
  find "$UPLOADS_DIR" -mindepth 1 -delete

  log 'Recreating core infrastructure services...'
  "${COMPOSE_CMD[@]}" up -d "${CORE_SERVICES[@]}"

  log 'Waiting for core infrastructure services to become healthy/running...'
  for service in "${CORE_SERVICES[@]}"; do
    wait_for_service "$service" "$WAIT_TIMEOUT_SECONDS"
  done

  if find "$ROOT_DIR/packages/db/src/migrations" -maxdepth 1 -type f | grep -q .; then
    log 'Running database migrations...'
    run_db_workspace_cmd "Database migrations" pnpm --filter @taskforge/db migrate ||
      abort "Database migrations failed after ${DB_CMD_RETRIES} attempts."
  else
    log 'No SQL migration files found. Running schema sync via drizzle push...'
    run_db_workspace_cmd "Schema push" pnpm --filter @taskforge/db push ||
      abort "Schema push failed after ${DB_CMD_RETRIES} attempts."
  fi

  if [[ "$SEED_MODE" != "reset-only" ]]; then
    log 'Running deterministic database seed...'
    run_db_workspace_cmd "Database seed" pnpm --filter @taskforge/db seed ||
      abort "Database seed failed after ${DB_CMD_RETRIES} attempts."

    if [[ "$SEED_SKIP_REINDEX" != "1" ]]; then
      log 'Reindexing Meilisearch from seeded DB...'
      (
        cd "$ROOT_DIR"
        pnpm --filter @taskforge/api reindex:search
      )
    else
      log 'Skipping Meilisearch reindex (--skip-reindex).'
    fi
  else
    log 'Skipping seed (--reset-only specified).'
  fi

  log 'Starting compose services after schema+seed reset...'
  "${COMPOSE_CMD[@]}" up -d

  log 'Waiting for API and worker after startup...'
  wait_for_service "api" "$WAIT_TIMEOUT_SECONDS"
  wait_for_service "worker" "$WAIT_TIMEOUT_SECONDS"

  if [[ "$SEED_MODE" != "reset-only" ]] && [[ "$SEED_SKIP_REINDEX" != "1" ]]; then
    log 'Running post-seed validation checks...'
    run_db_workspace_cmd "Seed validation" pnpm --filter @taskforge/db seed:validate ||
      abort "Seed validation failed after ${DB_CMD_RETRIES} attempts."
  else
    log 'Skipping seed validation (reset-only or skip-reindex mode).'
  fi

  cat <<'SUMMARY'

[test-seed] Reset complete.

Developer TODO before UI verification:
- Clear browser cache (or force refresh) to avoid stale frontend assets.

See the seed summary output above for fixture counts and dev credentials.

SUMMARY
}

main "$@"