# TaskForge — Junie Guidelines

## Project Context

The following documents are available in this `.junie/` directory. **Do not load all of them upfront.** Only read the documents and personas that are directly relevant to the current task or feature being worked on. Each feature file (in `features/`) lists its dependencies and relevant personas — use those as your guide for what to load.

### Documents
1. **[Requirements](requirements.md)** — project purpose, core features, and non-functional requirements.
2. **[Stack](stack.md)** — technology choices, libraries, and Docker Compose services.
3. **[Roadmap](roadmap.md)** — feature phasing (MVP, Phase 2, Phase 3).
4. **[Data Model](data-model.md)** — core entities, attributes, and relationships.
5. **[API Conventions](api-conventions.md)** — REST API standards, response format, error handling, and authentication.
6. **[Project Structure](project-structure.md)** — monorepo layout, folder conventions, and service communication.
7. **[Design Principles](design-principles.md)** — guiding principles for design, architecture, and implementation decisions.
8. **[Setup](setup.md)** — environment setup, common commands, and troubleshooting.

### Personas (in `personas/` subdirectory)
Only load personas listed in the feature file or directly relevant to the discussion:
- [Project Manager — Sarah](personas/project-manager.md)
- [Team Lead / Admin — Jordan](personas/team-lead.md)
- [Frontend Developer — Priya](personas/frontend-developer.md)
- [Backend Developer — Marcus](personas/backend-developer.md)
- [UX Expert — Lena](personas/ux-expert.md)
- [DevOps Engineer — Sam](personas/devops-engineer.md)
- [Systems Engineer — Dana](personas/systems-engineer.md)
- [SEO Expert — Raj](personas/seo-expert.md)
- [Security Expert — Nadia](personas/security-expert.md)
- [Performance Specialist — Kai](personas/performance-specialist.md)
- [Customer — Elena](personas/customer.md)
- [Evaluation Expert — Tomás](personas/evaluation-expert.md)
- [Sales — Victor](personas/sales.md)
- [Workfront Migrator — Derek](personas/workfront-migrator.md)
- [Dashboard Analyst — Mira](personas/dashboard-analyst.md)
- [Executive — Claire](personas/executive.md)
- [QA / Tester — Anil](personas/qa-tester.md)
- [Onboarding User — Finn](personas/onboarding-user.md)
- [Freelancer — Yuki](personas/freelancer.md)
- [Integration Developer — Omar](personas/integration-developer.md)
- [Compliance Auditor — Hana](personas/compliance-auditor.md)
- [People Manager — Rosa](personas/people-manager.md)
- [SCM Integrator — Niko](personas/scm-integrator.md)

### Token Usage Rule
**Load only what you need.** When working on a feature or task:
1. Read the feature file first (e.g., `features/mvp/MVP-012-tasks-crud.md`)
2. Load only the documents referenced in its Dependencies section
3. Load only the personas listed in its Personas section
4. Load additional documents only if you hit a question that requires them

## Working Principles

- **Persona-driven decisions**: When making UX, API, or architecture choices, consider how each relevant persona would be affected.
- **Requirements-first**: All features and changes must trace back to a requirement in `requirements.md`.
- **Roadmap-aware**: Check which phase a feature belongs to before implementing. MVP features take priority.
- **API conventions**: All endpoints must follow the standards in `api-conventions.md`.
- **Project structure**: Place files according to `project-structure.md`. Do not introduce new top-level directories without discussion.
- **Consistency**: Follow existing code style, naming conventions, and project structure.
- **Minimal changes**: Make the smallest change that correctly solves the issue.
- **Test coverage**: Write or update tests for any logic changes.
- **Meetings update docs**: All persona meetings and planning discussions must result in updates to the relevant `.junie/` markdown files (requirements, roadmap, data model, etc.). Meeting notes are optional artifacts — the source-of-truth documents must always reflect the latest decisions.
- **Keep guidelines current**: After any change that affects project structure, personas, documents, or working principles, update this `guidelines.md` file immediately. This file is the entry point — it must always reflect the current state of the project.
- **Model selection**: Use Opus 4.6 for all planning, architecture, and design tasks. For coding/implementation, use whichever model is best suited for the task.
