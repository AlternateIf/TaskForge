# Persona Review Meeting — 2026-03-24

All 22 personas review the current requirements, data model, API conventions, project structure, and roadmap. This document captures what was raised, agreed on, and which documents were updated.

---

## Discussion Summary

### Sarah (PM) + Mira (Dashboard Analyst) — Real-Time Updates
> **Sarah**: "When my team updates tasks during a sprint, I'm refreshing constantly. I need to see changes live."
> **Mira**: "Same for dashboards. If I'm presenting a live dashboard in a meeting and tasks change, it should update automatically — not after a manual refresh."

**Decision**: Add WebSocket/SSE support for real-time push updates on task changes, dashboard widgets, and notification delivery. API serves as source of truth; real-time is a push layer on top.

---

### Derek (Workfront Migrator) — Data Import/Migration
> **Derek**: "None of the docs mention how we get data *into* TaskForge. My org has 5 years of Workfront data — projects, tasks, time entries, custom fields, attachments. Without a migration path, this is a non-starter."
> **Sarah**: "Even for new teams, CSV import for tasks would save hours of manual entry."

**Decision**: Add data import/migration tools — CSV/JSON import for tasks, projects, users, and time entries. Include a Workfront-specific migration adapter. Preserve original timestamps and activity history during import.

---

### Derek (Workfront Migrator) + Sarah (PM) — Keyboard Shortcuts
> **Derek**: "Power users live on keyboard shortcuts. Workfront had them for creating tasks, navigating boards, and changing statuses without touching the mouse."
> **Sarah**: "Yes — quick task creation with a hotkey would save me minutes every day."

**Decision**: Add a keyboard shortcut system — global shortcuts for navigation, quick task creation, status changes, and search. Include a shortcut reference overlay (triggered by `?`).

---

### Anil (QA) — Release Management & Test Cases
> **Anil**: "There's no concept of a release or version in the data model. I can't link bugs to a release or track which tasks ship in v2.3. Also, test case management is completely missing — I still need TestRail on the side."
> **Marcus (Backend Dev)**: "Release entities would also help us link PRs and deployments to a specific version."
> **Sam (DevOps)**: "Agreed — I need to tag deployments to releases too."

**Decision**: Add Release entity (linked to projects, tasks, and issues). Add TestCase and TestRun entities for in-tool test management. Add release sign-off workflow using the existing approval system.

---

### Victor (Sales) + Claire (Executive) — Budget & Cost Tracking
> **Victor**: "I need to see project profitability — billable hours times hourly rates versus project budget. Right now there's no budget field anywhere."
> **Claire**: "At the portfolio level, I need budget burn rate across programs. Without cost data, my board presentations are incomplete."
> **Yuki (Freelancer)**: "For me it's simpler — I need different hourly rates per client so my time reports translate to invoices."

**Decision**: Add budget fields to Project and Portfolio. Add billing rate support (per user, per project, with client-specific overrides). Add cost/revenue reporting capability.

---

### Omar (Integration Dev) — Sandbox, PATs, and SDK
> **Omar**: "Three things missing: (1) I can't develop integrations without a sandbox — I need a test environment that doesn't touch real data. (2) Personal access tokens for scripts and CI — not everything should go through OAuth. (3) An official TypeScript SDK would cut integration time in half."

**Decision**: Add API sandbox mode (separate data, clearly marked). Add personal access tokens (PATs) as an auth method alongside JWT and OAuth. Add an official TypeScript SDK package to the monorepo.

---

### Sam (DevOps) — Health Checks & Deployment
> **Sam**: "The API conventions doc has no health check endpoints. In Docker/Kubernetes, I need `/health` for liveness and `/ready` for readiness. Also, we should define graceful shutdown behavior."
> **Kai (Performance)**: "Health checks should include dependency status — is MariaDB up? Redis? RabbitMQ?"

**Decision**: Add `/health` (liveness) and `/ready` (readiness with dependency checks) endpoints to API conventions. Define graceful shutdown behavior in the API server.

---

### Sam (DevOps) + Marcus (Backend Dev) — GitHub Integration
> **Marcus**: "I want to link PRs and branches to tasks. When I push a commit referencing TASK-123, it should show up in the task's activity log."
> **Sam**: "And when a deployment succeeds or fails, the related tasks should update automatically. GitHub Actions webhook → TaskForge."

**Decision**: Add GitHub integration — PR/branch linking via commit message parsing, deployment event ingestion, and status sync. Implement as a webhook receiver + GitHub App.

---

### Kai (Performance) — Performance Budgets & Caching
> **Kai**: "The non-functional requirements say '<2s page load' and '<300ms API' but there's no enforcement mechanism. We need: (1) bundle size budgets in CI, (2) API response caching with ETags, (3) CDN for static assets, (4) slow query logging thresholds."
> **Dana (Systems Engineer)**: "Connection pooling is mentioned but not the details — pool size, timeout, overflow behavior. And we need database query timeouts."

**Decision**: Add performance budgets (bundle size limits enforced in CI, LCP/FID/CLS targets). Add ETag/Cache-Control support to API conventions. Add CDN strategy for static assets. Add slow query logging and query timeout configuration.

---

### Nadia (Security) — File Uploads, Scanning, Dependency Audit
> **Nadia**: "File uploads are a major attack vector. We need: MIME type validation, file size limits, content scanning for malware. Also, the CI pipeline should include dependency vulnerability scanning."
> **Hana (Compliance)**: "And uploaded files in regulated environments may need virus scanning before they're accessible to other users."

**Decision**: Add file upload validation (MIME type whitelist, max size, extension check). Add optional malware/virus scanning for uploads. Add dependency vulnerability scanning (e.g., npm audit, Snyk) to CI pipeline.

---

### Raj (SEO) — Public Pages
> **Raj**: "Shared dashboards and reports have public URLs. Those pages need proper meta tags, Open Graph tags, and a robots policy. The marketing/landing page (if any) needs full SEO treatment."
> **Lena (UX)**: "The public shared links should also look professional — clean layout, branded, with a clear CTA to sign up."

**Decision**: Add SEO requirements for public-facing pages (shared dashboards/reports, public project views): meta tags, Open Graph, structured data, and robots policy. Shared links get a branded, clean read-only layout.

---

### Hana (Compliance) — Data Residency & Audit Integrity
> **Hana**: "Two critical gaps: (1) Data residency — regulated clients need to know where their data is stored geographically. (2) GDPR right-to-be-forgotten conflicts with immutable audit trails. How do we anonymize a deleted user's audit entries without destroying the trail?"
> **Nadia**: "We anonymize — replace PII with a placeholder like 'Deleted User #123' but keep the audit event intact."

**Decision**: Add data residency awareness (document storage region, configurable per organization in future). Define GDPR anonymization strategy — deleted users are anonymized in audit logs (PII replaced), not erased. Add this to compliance requirements.

---

### Elena (Customer) — Feedback & Satisfaction
> **Elena**: "When a task I submitted is marked Done, I want to confirm it's actually resolved. A simple 'satisfied / not satisfied' feedback would close the loop."
> **Lena (UX)**: "That's a great UX pattern — task completion feedback. Keep it minimal: thumbs up/down + optional comment."

**Decision**: Add task completion feedback for customer-submitted tasks — simple satisfaction rating + optional comment. Visible in reports.

---

### Finn (Onboarding) — Demo Project & Changelog
> **Finn**: "On first login, I'd love a sample project that shows me what a well-organized project looks like — real tasks, comments, labels. Also, when new features are added, a 'What's new' popup would help me discover them."
> **Jordan (Team Lead)**: "Sample project is great for new teams too. We can offer it as optional during org setup."

**Decision**: Add sample/demo project generated on first organization setup (optional, deletable). Add in-app changelog / "What's new" announcements for feature releases.

---

### Priya (Frontend Dev) + Lena (UX) — Design Integration
> **Priya**: "I need Figma links directly on tasks. Right now I'd have to use a custom text field, but a first-class 'design link' field with preview would be way better."
> **Lena**: "And a design review stage in the approval workflow — design sign-off before development starts."

**Decision**: Add a URL/link custom field type with rich preview (unfurling for Figma, Google Docs, etc.). Design review is handled via the existing approval workflow — no separate entity needed, just a workflow template.

---

### Rosa (People Manager) — Burnout Alerts
> **Rosa**: "Utilization trends are in the requirements, but I need proactive alerts — if someone's been over 90% utilization for 3+ weeks, flag it. Don't wait for me to check a chart."
> **Claire (Executive)**: "Same at the team level — alert me if an entire team is overloaded."

**Decision**: Add configurable workload alerts — trigger notifications when utilization exceeds a threshold for a sustained period. Available at individual and team level.

---

### Dana (Systems Engineer) — Monitoring Integration
> **Dana**: "I want Grafana alerts to create issues in TaskForge automatically. A webhook endpoint that accepts Prometheus AlertManager payloads and creates issues."
> **Sam (DevOps)**: "Same for PagerDuty and Opsgenie — alerting tools should be able to push into TaskForge."

**Decision**: Add an incoming webhook/alert endpoint that accepts payloads from monitoring tools (Prometheus AlertManager, Grafana, PagerDuty) and auto-creates issues. Define a generic alert ingestion format with adapter support.

---

### Victor (Sales) — Onboarding & Trial
> **Victor**: "For sales, first impressions matter. New signups need a frictionless trial — no credit card, pre-populated sample data, and a clear upgrade path. The setup wizard should ask 3 questions max before showing value."

**Decision**: Add trial/onboarding flow — frictionless signup, optional sample data, minimal setup wizard (role, team size, first project). Trial tier with feature limits and clear upgrade prompts.

---

## Changes Made

### requirements.md
- Real-time updates (WebSocket/SSE)
- Data import/migration tools
- Keyboard shortcuts
- Release management
- Test case management
- Budget & cost tracking
- API sandbox environment
- Personal access tokens
- Official TypeScript SDK
- Health check endpoints
- GitHub integration (PR/deployment linking)
- Performance budgets & caching (ETags, CDN, slow query logging)
- File upload security (validation, scanning)
- Dependency vulnerability scanning in CI
- SEO for public pages
- Data residency awareness
- GDPR anonymization strategy
- Customer task feedback
- Sample/demo project on first setup
- In-app changelog / "What's new"
- URL/link custom field type with preview
- Workload/burnout alerts
- Alert ingestion endpoint (monitoring tools)
- Trial/onboarding flow

### data-model.md
- Release entity
- ReleaseTask (link table)
- TestCase entity
- TestRun entity
- TestExecution entity
- Budget fields on Project and Portfolio
- BillingRate entity
- PersonalAccessToken entity
- TaskFeedback entity
- AlertIngestion entity

### api-conventions.md
- Health check endpoints (/health, /ready)
- ETag and Cache-Control caching
- SSE/WebSocket conventions
- File upload conventions
- Aggregation endpoint pattern
- Alert ingestion endpoint

### project-structure.md
- packages/sdk (TypeScript SDK)
- WebSocket/SSE gateway in api
- Alert ingestion handler

### roadmap.md
- Redistribute new features across phases
