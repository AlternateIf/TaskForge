# TaskForge — Junie Guidelines

## Project Context

Before starting any task, read the following documents located in this `.junie/` directory:

1. **[Requirements](requirements.md)** — project purpose, core features, technical stack, and non-functional requirements.
2. **[Stack](stack.md)** — technology choices, libraries, and Docker Compose services.
3. **[Design Principles](design-principles.md)** — guiding principles for design, architecture, and implementation decisions.
3. **Personas** (in `personas/` subdirectory) — user personas that define who we are building for:
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

## Working Principles

- **Persona-driven decisions**: When making UX, API, or architecture choices, consider how each relevant persona would be affected.
- **Requirements-first**: All features and changes must trace back to a requirement in `requirements.md`.
- **Consistency**: Follow existing code style, naming conventions, and project structure.
- **Minimal changes**: Make the smallest change that correctly solves the issue.
- **Test coverage**: Write or update tests for any logic changes.
