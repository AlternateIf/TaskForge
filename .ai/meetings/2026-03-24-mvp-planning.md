# MVP Planning Meeting — 2026-03-24

All relevant personas discuss MVP feature breakdown and implementation order.

---

## Key Decisions

> **Sam (DevOps)**: "Infrastructure first — Docker, CI, base server. Nothing works without this foundation."
> **Marcus (Backend)**: "Database schema and auth next. Everything depends on authenticated users."
> **Nadia (Security)**: "Auth must be rock solid from day one. JWT + refresh + MFA. Don't bolt security on later."
> **Priya (Frontend)**: "I can start the React shell and auth pages in parallel once the API skeleton exists."
> **Sarah (PM)**: "Projects and tasks are the core value prop. Get a full vertical slice working — create a project, create a task, move it across a Kanban board — before adding depth."
> **Kai (Performance)**: "Bundle size checks and monitoring should be in CI from day one. Catching regressions early is free; fixing them later is expensive."
> **Mira (Dashboard)**: "Real-time needs to be baked into the architecture, not bolted on. WebSocket setup early, even if we only use it for notifications initially."
> **Finn (Onboarding)**: "The onboarding flow and sample project should be one of the last MVP features, but don't skip it. First impressions determine whether users stay."
> **Jordan (Team Lead)**: "Roles and permissions early — it's a cross-cutting concern that affects every API endpoint."
> **Derek (Workfront Migrator)**: "Keyboard shortcuts should be built into the UI framework from the start, not retrofitted."

## Implementation Order

Features are numbered MVP-001 through MVP-029. Dependencies are explicit in each feature file. The general order follows these layers:

1. **Infrastructure** (001–003): Monorepo, Docker, CI — can be done in parallel
2. **Backend foundation** (004–005): Database, API server — sequential
3. **Auth** (006–008): Registration, OAuth, MFA — sequential
4. **Core entities** (009–011): Orgs, roles, projects — sequential
5. **Tasks** (012–016): CRUD, subtasks, dependencies, bulk, uploads — mostly sequential
6. **Collaboration** (017–021): Comments, queue, search, notifications, real-time — some parallel
7. **Frontend** (022–028): Shell, views, detail pages, shortcuts, onboarding, real-time — some parallel
8. **Monitoring** (029): Metrics and dashboards — independent

## Feature File Location

All features documented in `.ai/features/mvp/` with filenames `MVP-NNN-short-name.md`.
