# TaskForge — Junie Guidelines

This file is the entry router. Keep it small and load additional context intentionally.

## 1) Start Here (Always)
1. Read the target feature file first (`.ai/features/...`) when available.
2. Choose mode:
- **Planning Mode**: feature discovery/spec updates, scope decisions, and delivery planning.
- **Implementation Mode**: coding, bug fixes, tests, refactors.
3. Load only the docs needed by that mode.

## 2) Context Loading Rules

### Planning Mode
- Load broad docs only when required for planning decisions:
  - scope/priorities: `requirements-mvp.md`, `requirements-future.md`, `roadmap.md`
  - architecture: `project-structure.md`, `stack.md`, `design-principles.md`
  - contracts/data: `api-conventions.md`, `data-model-mvp.md`, `data-model-future.md`
  - frontend/design: `styleguide-core.md`, then `styleguide-extended.md` only if needed

### Implementation Mode
- Load docs by task type:
  - API/Backend: `api-conventions.md`, `project-structure.md`, `data-model-mvp.md`
  - Frontend/UI: `styleguide-core.md`, `project-structure.md`
  - Design-heavy frontend: add `styleguide-extended.md`
  - Infra/runtime/setup: `stack.md`, `setup.md`
- Do not load roadmap/requirements unless resolving scope or acceptance ambiguity.

## 3) Feature Workflow (Required)
When implementing any MVP/Phase feature:
1. For new feature specs, start from `features/FEATURE_TEMPLATE.md`.
2. **Update the target feature markdown before/during implementation** with agreed scope/acceptance details.
3. Implement and test.
4. **Post-implementation docs update**:
- check off acceptance criteria in the feature markdown (`- [x]`)
- update corresponding status in `roadmap.md`

## 4) Split-Doc Entry Points
Use these smaller docs first:
- Requirements: `requirements-mvp.md`, `requirements-future.md`
- Data model: `data-model-mvp.md`, `data-model-future.md`
- Design system: `styleguide-core.md`, `styleguide-extended.md`
