# TaskForge — Agent Guidelines Router

This file is the secondary routing guide for agents.
Primary entry is `AGENTS.md`.

## 1) Operating Order

1. Read `AGENTS.md` first.
2. Choose mode:
- Planning mode: scope, sequencing, delivery planning.
- Implementation mode: coding, fixes, tests, validation.
3. Load only the minimum docs needed for the current task.

## 2) Context Loading Rules

### Planning Mode
Load broad docs only when needed:
- scope and prioritization: `requirements-mvp.md`, `requirements-future.md`, `roadmap.md`
- architecture and delivery boundaries: `project-structure.md`, `stack.md`, `design-principles.md`
- contracts and data: `api-conventions.md`, `data-model-mvp.md`, `data-model-future.md`
- frontend design: `styleguide-core.md`, then `styleguide-extended.md` only if required

### Implementation Mode
Load docs by scope:
- backend/API: `api-conventions.md`, `project-structure.md`, `data-model-mvp.md`
- frontend/UI: `styleguide-core.md`, `project-structure.md`
- design-heavy frontend: add `styleguide-extended.md`
- infra/runtime setup: `stack.md`, `setup.md`

Default rule:
- Do not load roadmap/requirements unless resolving scope or acceptance ambiguity.

## 3) Execution Workflow (Required)

1. Confirm scope and acceptance criteria from issue/request context.
2. Implement with minimal blast radius.
3. Validate with relevant tests and linting.
4. Update docs/contracts when behavior or API contracts changed.

## 4) Split-Doc Entry Points

Use these compact docs first:
- Requirements: `requirements-mvp.md`, `requirements-future.md`
- Data model: `data-model-mvp.md`, `data-model-future.md`
- Design system: `styleguide-core.md`, `styleguide-extended.md`
- Product/UX principles: `design-principles.md`
