# Pre-Implementation Meeting: MVP-045 Dev Test-Seed Full Reset — 2026-04-02

## Attendees
- **Marcus (Backend Developer)** — deterministic fixture design, migration/seed ordering
- **Sam (DevOps Engineer)** — compose reset safety, service readiness, local-only blast radius
- **Dana (Systems Engineer)** — health checks, infra-state reset guarantees
- **Anil (QA / Tester)** — repeatability, fixture clarity, automated validation
- **Finn (Onboarding User)** — quick local setup with known credentials
- **Jordan (Team Lead / Admin)** — governance baseline, role/permission confidence

---

## Discussion

### 1. Safety and Blast Radius

**Sam:** This command must be obviously destructive and local-only. We should gate on `NODE_ENV=development` and fail hard otherwise.

**Dana:** Also validate Docker daemon and compose file before touching anything. If compose cannot run, fail fast with actionable hints.

**Decision:**
1. `pnpm test-seed` is marked **DEV ONLY** and **DANGEROUS** in banner output.
2. Hard environment gate: `NODE_ENV` must equal `development`.
3. Preflight checks include required tools (`docker`, `pnpm`), compose file presence, and Docker daemon reachability.

---

### 2. Reset Coverage Expectations

**Jordan:** “Everything local” should mean all compose volumes, not only DB/search.

**Dana:** Use `docker compose down -v --remove-orphans` to ensure all volume-backed state is wiped (MariaDB, Redis, RabbitMQ, Meilisearch, Grafana/Prometheus/Loki state).

**Sam:** We also need filesystem reset for uploaded files.

**Decision:**
1. Reset via compose teardown with volumes for full local state wipe.
2. Explicitly clear `local/uploads` during the same flow.
3. Recreate services via compose and wait for health before migration/seed.

---

### 3. Reseed Determinism and Breadth

**Marcus:** Existing seed uses random UUIDs and minimal fixtures. We need fixed IDs and broad entities so QA can run realistic scenarios.

**Anil:** Include enough linked records to validate dependencies, mentions, notifications, and search indexes after every reset.

**Finn:** Known credentials must be printed every run so new contributors can log in immediately.

**Decision:**
1. Replace random fixture generation in main seed with fixed IDs/slugs and stable relationships.
2. Seed breadth includes users/orgs/memberships, governance roles + permissions, projects/workflows/statuses, tasks across all priorities/states, labels/task-label links, watchers, dependencies, checklists/items, comments/mentions, activity log, notifications/preferences, sessions/verification/oauth records.
3. Seed at least two organizations and multiple projects/users.
4. Print deterministic fixture summary + known credentials in command output.

---

### 4. MVP-044 Governance Baseline

**Jordan:** MVP-045 must not reintroduce legacy broad permission domains.

**Marcus:** We can seed permission tuples exactly from the MVP-044 catalog and map them to the fixed role baseline.

**Decision:**
1. Governance seeding uses only MVP-044 catalog entries (`resource/action/scope` tuples from feature doc).
2. Baseline role mapping seeded exactly as:
   - Global Super Admin
   - Global Admin
   - Organization Owner
   - Organization Admin
   - Organization Member
3. No task/project/comment/attachment/notification permissions are seeded in this governance set.

---

### 5. Validation and Developer Feedback

**Anil:** The script should verify post-seed counts and key relationships, not just print “done”.

**Sam:** Also validate Meilisearch availability from seeded DB after reindex.

**Decision:**
1. Add a deterministic validation step executed as part of `pnpm test-seed`.
2. Validation checks include minimum entity counts, relationship integrity (dependencies/watchers/mentions/checklists), and Meilisearch document availability for tasks/projects/comments.
3. Command exits non-zero on validation failure with clear remediation hints.

---

## Final Decisions Summary

1. `pnpm test-seed` is a guarded dev-only destructive orchestration command.
2. Reset path wipes compose volumes and `local/uploads`.
3. Full sequence: preflight -> destroy -> recreate -> wait healthy -> migrate -> deterministic seed -> reindex -> validate -> fixture summary.
4. Seed dataset is deterministic and broad across core MVP entities.
5. Governance seeding follows only MVP-044 permission catalog and fixed role baseline.
6. Automated validation is mandatory and blocks success output when checks fail.
