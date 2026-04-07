# MVP-045: Dev Test-Seed Full Reset and Deterministic Reseed

## Description
Create a single dev-only command (`pnpm test-seed`) that destroys local development data across infrastructure services, then re-applies migrations and seeds deterministic demo data (including Meilisearch indexing) so teams can always reset to a known baseline quickly and safely.

## Planning Context

### Persona Meeting
- Meeting note: `../../meetings/2026-04-02-mvp-045-dev-test-seed-planning.md`
- Required before implementation.

### Personas (Planning)
- Backend Developer - Marcus
- DevOps Engineer - Sam
- Systems Engineer - Dana
- QA / Tester - Anil
- Onboarding User - Finn
- Team Lead / Admin - Jordan

### Documents (Planning)
- `../../requirements-mvp.md`
- `../../roadmap.md`
- `../../project-structure.md`
- `../../setup.md`
- Existing feature docs: MVP-002, MVP-004, MVP-018, MVP-019, MVP-029, MVP-044

## Implementation Context

### Personas (Implementation)
- Start with Quick Cards for all listed personas.
- Expand full persona sections only for directly impacted roles.

### Documents (Implementation)
- `../../project-structure.md`
- `../../setup.md`
- Existing feature docs: MVP-002, MVP-004, MVP-018, MVP-019, MVP-029, MVP-044
- `../../../docker/docker-compose.yml`

## Dependencies
- MVP-002 (Docker Compose)
- MVP-004 (Database setup and seed)
- MVP-018 (RabbitMQ worker foundation)
- MVP-019 (Search and Meilisearch indexing)
- MVP-029 (Monitoring stack in local compose)
- MVP-044 (Invite-only access + RBAC v2 governance model)

## Scope

### Command and safety model
- Add root command `pnpm test-seed`.
- Command is explicitly marked as **DEV ONLY** and **DANGEROUS** in script banner and docs.
- Data-loss warning must clearly state this command destroys local data and should never be used against non-development infrastructure.
- Safety gate is environment-based (`NODE_ENV=development` required); command aborts otherwise.

### Execution model
- Implement as a Docker Compose wrapper flow (single orchestrator script invoked by `pnpm test-seed`).
- Fail fast with actionable guidance if required local services are not available.
- Orchestration sequence:
1. Preflight checks (environment + required tools + compose project).
2. Destroy local compose state (core stores and local tooling state).
3. Recreate services and wait for healthy status.
4. Run DB migration.
5. Run deterministic database seed.
6. Run Meilisearch reindex from seeded DB.
7. Run validation checks and print fixture summary (users/orgs/projects/tasks and known credentials).

### Reset coverage (destructive)
- Must clear data from:
  - MariaDB
  - Meilisearch
  - Redis
  - RabbitMQ (including dead-letter queues)
- Must also clear local dev tool state from the same compose environment (monitoring/mail/local runtime data) according to the "everything local" reset mode.
- Must clear local uploaded files (`local/uploads`) so DB attachment metadata and filesystem contents cannot drift.

### Deterministic reseed dataset
- Seed must be deterministic across repeated runs (fixed IDs/slugs and predictable fixture relationships).
- Seed breadth is broad MVP coverage, including:
  - Users, organizations, memberships
  - Roles and permissions
  - Projects, workflows, statuses
  - Tasks across multiple workflow states and all priority levels
  - Labels, task-label links, watchers, dependencies
  - Checklists and checklist items
  - Comments and mentions
  - Activity log
  - Notification preferences and notifications
  - Auth/session-related records needed for realistic local QA scenarios
- Include multiple organizations with different users and cross-team role patterns.
- Use fixed known dev credentials for seeded users and print them in command output.

### MVP-044 fixed permission set (authoritative for this feature)
This feature must use only the MVP-044 governance permission domain below. No task/project/comment/attachment/notification permissions are in scope for this set.

#### Permission catalog
| Permission key | Resource | Action | Scope | Purpose |
|---|---|---|---|---|
| `organization.create.global` | `organization` | `create` | `global` | Create organizations |
| `organization.read.org` | `organization` | `read` | `organization` | Read organization profile |
| `organization.update.org` | `organization` | `update` | `organization` | Update organization profile |
| `organization.delete.org` | `organization` | `delete` | `organization` | Soft-delete organization |
| `organization.settings.read.org` | `organization_settings` | `read` | `organization` | Read org settings |
| `organization.settings.update.org` | `organization_settings` | `update` | `organization` | Update org settings |
| `organization.auth_settings.read.org` | `organization_auth_settings` | `read` | `organization` | Read org auth policy |
| `organization.auth_settings.update.org` | `organization_auth_settings` | `update` | `organization` | Update org auth policy |
| `organization.features.read.org` | `organization_features` | `read` | `organization` | Read org feature flags |
| `organization.features.update.org` | `organization_features` | `update` | `organization` | Update org feature flags |
| `invitation.create.org` | `invitation` | `create` | `organization` | Create invitation drafts |
| `invitation.read.org` | `invitation` | `read` | `organization` | Read invitations |
| `invitation.update.org` | `invitation` | `update` | `organization` | Resend/edit invitations |
| `invitation.delete.org` | `invitation` | `delete` | `organization` | Revoke invitations |
| `membership.create.org` | `membership` | `create` | `organization` | Add members |
| `membership.read.org` | `membership` | `read` | `organization` | List/view members |
| `membership.update.org` | `membership` | `update` | `organization` | Change member assignments |
| `membership.delete.org` | `membership` | `delete` | `organization` | Remove members |
| `role.create.org` | `role` | `create` | `organization` | Create org-scoped roles |
| `role.read.org` | `role` | `read` | `organization` | Read org-scoped roles |
| `role.update.org` | `role` | `update` | `organization` | Update org-scoped roles |
| `role.delete.org` | `role` | `delete` | `organization` | Delete org-scoped roles |
| `permission.read.org` | `permission` | `read` | `organization` | Read role permission grants |
| `permission.update.org` | `permission` | `update` | `organization` | Modify role permission grants |
| `global_role_assignment.create` | `global_role_assignment` | `create` | `global` | Assign global roles to users |
| `global_role_assignment.read` | `global_role_assignment` | `read` | `global` | View global role assignments |
| `global_role_assignment.update` | `global_role_assignment` | `update` | `global` | Change global role assignments |
| `global_role_assignment.delete` | `global_role_assignment` | `delete` | `global` | Remove global role assignments |

#### Fixed baseline role mapping (MVP-044)
- `Global Super Admin`: all permission keys above.
- `Global Admin`: all global-scope permissions except super-admin invariants.
- `Organization Owner`: all organization-scope permissions for assigned organizations.
- `Organization Admin`: organization read/update/settings/auth/features + invitation + membership read/update + role/permission read.
- `Organization Member`: organization read + membership read (self-visible) only.

## Acceptance Criteria
- [x] `pnpm test-seed` exists at root and executes a documented destructive reset + reseed flow.
- [x] Command aborts outside development environment.
- [x] Script output includes explicit dev-only and data-loss warning text.
- [x] Local data in MariaDB, Meilisearch, Redis, RabbitMQ, and compose-local tool state is reset.
- [x] `local/uploads` is cleared during reset flow.
- [x] DB migration is executed before reseeding.
- [x] Seed data is deterministic across repeated runs.
- [x] Seed contains multiple organizations, multiple users, multiple projects, and tasks across different workflows/priorities.
- [x] Meilisearch is reindexed from seeded DB as part of the same command.
- [x] MVP-044 permission catalog in this file is treated as the fixed set for governance seeding in this feature.
- [x] Automated checks verify post-seed counts/relationships and search availability.

## Post-Implementation Updates (Required)
- [x] Acceptance criteria checked in this file (`- [x]`)
- [x] Corresponding roadmap entry updated in `../../roadmap.md`
