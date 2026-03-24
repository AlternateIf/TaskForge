### TaskForge — Requirements Document

#### Purpose

TaskForge is a collaborative task and project management application designed to help teams organize, prioritize, and track work efficiently. It aims to provide a streamlined experience for managing tasks across projects, enabling transparency and accountability within teams of all sizes — from solo freelancers to enterprise organizations migrating from tools like Workfront.

---

#### Core Features

##### Task Management
- Create, edit, delete, and assign tasks with titles, descriptions, due dates, priorities, and statuses
- Customizable status workflows per project (e.g., To Do → In Progress → Review → Done)
- Task dependencies (blocked by, blocks) with visual indicators
- Subtasks and checklists within tasks
- Recurring tasks on configurable schedules
- Bulk actions (assign, move, change status, delete) on multiple tasks
- Drag-and-drop reordering and column moves
- Undo support for accidental actions (toast-based undo)
- Keyboard shortcuts for quick task creation, status changes, navigation, and search
- Keyboard shortcut reference overlay (triggered by `?`)

##### Issue & Bug Tracking
- Separate issue type linked to tasks, features, or releases
- Fields: severity, priority, steps to reproduce, expected vs. actual behavior, environment
- Resolution tracking (open, fixed, verified, closed, won't fix)
- Screenshot and file attachment support on issues

##### Release Management
- Release/version entities linked to projects
- Assign tasks and issues to releases
- Release timeline and milestone tracking
- Release sign-off workflow via the approval system
- Release notes generation from linked tasks and issues

##### Test Case Management
- Create and organize test cases linked to tasks, features, or releases
- Test plans grouping related test cases for a release or sprint
- Test run execution with pass/fail/blocked/skipped status and evidence attachments
- Automated test result ingestion via API (CI pipeline integration)
- Test coverage and regression trend reporting

##### Project Organization
- Group tasks into projects with customizable workflows and labels
- Project templates for repeatable processes (e.g., "Website Redesign", "Sprint")
- Project archival and soft-delete with retention policies
- Budget tracking per project (planned budget, actual cost, variance)

##### Portfolio & Program Management
- Group projects into programs (related projects) and portfolios (strategic groupings)
- Portfolio-level dashboards showing health, budget, and progress across projects
- Budget rollup and burn rate at portfolio level
- Executive summary views with drill-down capability

##### Custom Forms & Fields
- User-defined custom fields on tasks, projects, and issues (text, number, date, dropdown, multi-select, checkbox, url)
- URL/link field type with rich preview (unfurling for Figma, Google Docs, etc.)
- Custom fields usable in filters, reports, groupings, and dashboards
- Required fields configurable per project or workflow stage

##### Views
- **Kanban board**: Columns by status, priority, assignee, or any custom field
- **List view**: Sortable, filterable table with configurable columns
- **Gantt chart**: Interactive timeline with task dependencies, milestones, and critical path highlighting
- **Calendar view**: Tasks and deadlines on a calendar grid
- All views reflect the same underlying data and are interchangeable

---

#### Real-Time Updates
- WebSocket/SSE push for live task, comment, and status changes — no manual refresh needed
- Real-time dashboard and widget updates
- Real-time notification delivery
- Presence indicators (who is viewing/editing a task)
- Graceful fallback to polling when WebSocket connection is unavailable

---

#### User Roles & Permissions
- Built-in roles: Super Admin, Admin, Project Manager, Team Member, Guest, Customer
- Custom roles with granular permission configuration
- Role-based access at organization, project, and task levels
- External customer access limited to whitelisted projects with restricted actions
- Audit logging of all permission and role changes

---

#### Approval Workflows
- Multi-stage approval chains on tasks, documents, and deliverables
- Configurable approver sequences (serial or parallel)
- Approve, reject, or request changes with comments
- Notifications at each approval stage
- Approval status visible on task cards and in activity log

---

#### Dashboard & Reporting

##### Personalized Dashboard
- Default dashboard showing assigned tasks, upcoming deadlines, and project progress
- Guided onboarding experience for first-time users (progressive disclosure)

##### Custom Dashboards
- Dashboard builder with grid-based widget layout (add, arrange, resize)
- Widget types: task clusters, charts (bar, pie, line, stacked, burndown, burnup), metrics cards, activity feeds, embedded reports
- Custom grouping and clustering by any field or combination of fields (built-in or custom)
- Dashboard-level filters (date range, project, team) with per-widget overrides
- Conditional formatting (color-coding based on rules)
- Multiple dashboards per user for different purposes
- Real-time auto-refresh via WebSocket/SSE
- Sharing with users, roles, or via public read-only links
- Dashboard cloning
- Widget drill-down (click chart segment to see underlying data)
- Dashboard templates (team overview, project health, personal workload)

##### Custom Reports
- Report builder: select data sources (tasks, projects, users, time entries), columns, filters, sort order, and groupings
- Aggregation functions: count, sum, average, min, max
- Chart types: bar, line, pie, stacked bar, burndown, table
- Calculated/derived fields (e.g., days overdue, completion rate)
- Cross-project and cross-portfolio reporting
- Dynamic filters with relative dates ("last 7 days", "this sprint") and parameterized inputs
- Scheduled report delivery via email or in-app notification
- Export to PDF, CSV, and Excel
- Saved and shared report configurations
- Report templates (velocity, burndown, workload, overdue tasks)
- Cost/revenue reports (time × billing rate per project/client)

##### Compliance Reporting
- Full audit trail export (CSV, PDF) with user, timestamp, and before/after values
- Access review reports (users, roles, project access)
- Data retention policy reports

---

#### Resource & Workload Management
- Workload view showing assigned tasks per team member weighted by estimated effort
- Capacity planning calendar overlaying availability (PTO, on-call, part-time) against commitments
- Utilization tracking (assigned hours vs. available hours) with trend charts
- Drag-and-drop task reassignment from workload view
- Skill tagging on team members for skill-based assignment suggestions
- Configurable workload alerts — notify when utilization exceeds threshold for sustained period (individual and team level)
- Burnout risk indicators based on sustained overutilization

##### Billing Rates
- Configurable billing rates per user, per project, or per client
- Rate overrides for specific project-user combinations
- Time × rate calculations for cost and revenue reporting

##### Baseline & Variance Tracking
- Snapshot a project plan as a baseline
- Compare actual progress vs. baseline with variance indicators
- Multiple baselines per project for re-planning

##### Scenario Planner
- What-if analysis for timeline and resource changes before committing
- Compare scenarios side by side

---

#### Time Tracking
- Start/stop timer on tasks or manual time entry
- Time logged against tasks with notes
- Timesheet views (daily, weekly) with approval workflows
- Time reports per project, client, or team member for billing
- Exportable time data for invoicing

---

#### Document Management & Proofing
- Upload documents and files to tasks
- File upload validation: MIME type whitelist, file extension check, max file size enforcement
- Optional malware/virus scanning for uploads before files are accessible
- Inline annotation, commenting, and markup on documents and images
- Approval cycles on documents (approve, reject, request changes)
- Version history on uploaded files

---

#### Comments & Activity
- Threaded comments on tasks and issues
- @mentions with notifications
- Rich text formatting and file attachments in comments
- Comprehensive activity log per task, project, and organization
- Immutable audit trail: who changed what, when, with before/after values

---

#### Search & Filtering
- Full-text search across tasks, projects, comments, and documents (powered by Meilisearch)
- Filtering by status, priority, assignee, label, date range, custom fields, and any combination
- Saved filter presets

---

#### Notifications
- In-app notification center with read/unread state
- Real-time notification delivery via WebSocket/SSE
- Email notifications for task assignments, status changes, mentions, approaching deadlines, and approval requests
- Configurable notification preferences per user (granular opt-in/opt-out per event type)
- Notification digest option (daily/weekly summary instead of individual emails)
- Workload/burnout threshold alerts

---

#### Automations
- Trigger-based workflow rules (e.g., when status changes to X, assign to Y and notify Z)
- Conditions: field changes, due date thresholds, label additions, status transitions
- Actions: update fields, assign users, move tasks, send notifications, trigger webhooks
- Automation log showing execution history

---

#### Integrations & API

##### REST API
- Full CRUD API for all entities (tasks, projects, users, comments, time entries, custom fields)
- Consistent response format, error handling, and cursor-based pagination
- Rate limiting with documented limits and rate limit headers
- API versioning with deprecation policy and changelog
- Auto-generated OpenAPI/Swagger documentation
- Health check endpoints (`/health` for liveness, `/ready` for readiness with dependency checks)
- ETag and Cache-Control support for response caching
- Aggregation endpoints for reporting queries

##### Real-Time API
- WebSocket/SSE endpoint for subscribing to entity change events
- Channel-based subscriptions (per project, per task, per user)
- Presence API (who is online/viewing)

##### Webhooks
- Subscribe to granular events (task.created, task.status_changed, comment.added, etc.)
- Per-project or organization-wide subscriptions
- Delivery signatures for verification
- Retry with exponential backoff
- Delivery logs for debugging

##### OAuth Application Management
- Self-service OAuth 2.0 app registration (developer portal)
- Configurable redirect URIs and scopes
- Client credential management

##### Personal Access Tokens
- User-generated tokens for scripts, CI pipelines, and personal integrations
- Scoped permissions per token
- Token expiration and revocation
- Last-used tracking for security auditing

##### API Sandbox
- Isolated test environment with synthetic data
- Clearly marked sandbox mode (separate base URL or header)
- Full API parity with production — no feature gaps
- Self-service sandbox provisioning from developer portal

##### Official TypeScript SDK
- Published npm package (`@taskforge/sdk`) wrapping the REST API
- Type-safe methods for all endpoints
- Built-in auth handling (JWT, OAuth, PAT)
- WebSocket/SSE client for real-time subscriptions

##### Third-Party Connectors
- Webhook-based integration with Slack, email, and other tools
- Zapier/Make-friendly OAuth flow and event schemas

##### GitHub & GitLab Integration
- First-class support for both GitHub and GitLab (including self-hosted GitLab) — feature parity between platforms
- GitHub App installation and GitLab OAuth/project token connection
- Link PRs (GitHub) and MRs (GitLab) to tasks via UI, API, or branch naming convention (`feature/TASK-123-*`)
- Commit reference parsing from commit messages (e.g., `TASK-123`)
- CI/CD pipeline status displayed on linked task cards (pass/fail/running, per stage)
- PR/MR review status on tasks (approved, changes requested, pending)
- Deployment event ingestion with environment awareness (staging, production) — update task status on deploy
- Issue import: bulk import GitHub Issues / GitLab Issues into TaskForge preserving labels, assignees, comments, and linked PRs
- Issue export: create GitHub/GitLab issues from TaskForge tasks for external collaborators
- Bidirectional issue sync for transition periods
- CI test result ingestion — auto-create bug issues on test failure, update test case statuses
- Repository browser: view linked repos, recent commits, and open PRs from within a TaskForge project
- Release linking: connect TaskForge releases to GitHub Releases / GitLab tags
- Status automation rules: configurable triggers (e.g., "PR merged → move task to Done")

##### Alert Ingestion
- Incoming webhook endpoint accepting payloads from monitoring tools (Prometheus AlertManager, Grafana, PagerDuty, Opsgenie)
- Auto-creates issues from alerts with configurable mapping (severity, project, assignee)
- Generic alert format with adapter support for specific tools
- Deduplication to prevent duplicate issues from repeated alerts

---

#### Data Import & Migration
- CSV and JSON import for tasks, projects, users, and time entries
- Column mapping UI for matching import fields to TaskForge fields
- Import preview with validation errors before committing
- Preserve original timestamps (created/updated dates) during import
- Import activity history and comments
- Import job tracking with progress, error log, and rollback capability

##### Workfront Import
- API-based import directly from a Workfront instance via OAuth connection
- Comprehensive entity import: projects, tasks, subtasks, custom fields + values, comments, activity history, file attachments, users/roles, time entries, approval chains
- Configurable field mapping (Workfront field names → TaskForge field names)
- Import preview with validation before committing
- Bidirectional sync during transition periods (Phase 3)

##### Data Export
- Export projects, tasks, comments, and associated data to CSV, JSON
- TaskForge-native export format (reimportable into another TaskForge instance)
- Workfront-compatible export format for parallel-running migration scenarios
- Scoped by permissions — users can only export data they have access to
- Bulk export with progress tracking

---

#### Work Intake
- Custom request queues with intake forms
- Configurable custom fields per queue
- Auto-routing to teams based on queue and form data
- SLA-based due date assignment

---

#### Onboarding & Usability
- Guided welcome flow for first-time users
- Sample/demo project generated on first organization setup (optional, deletable)
- Progressive disclosure: simple defaults with advanced features revealed gradually
- Contextual help tooltips within each screen
- In-app changelog / "What's new" announcements for feature releases
- Keyboard shortcut reference overlay
- Responsive design: fully usable on mobile, tablet, and desktop
- WCAG 2.1 AA compliance across all interfaces

##### Trial & Signup
- Frictionless trial signup (no credit card required)
- Minimal setup wizard (role, team size, first project — 3 steps max)
- Optional sample data pre-population
- Clear upgrade path with feature comparison

---

#### Customer Feedback
- Task completion feedback for customer-submitted tasks (satisfied / not satisfied + optional comment)
- Feedback visible in task activity log and reportable in custom reports
- Aggregated satisfaction metrics per project and organization

---

#### Multi-Tenancy & Organization
- Organization-level isolation (multi-tenant)
- Multiple workspaces/clients within a single user account (freelancer support)
- Public read-only sharing links for external stakeholders
- Branded shared links (organization logo, colors)

---

#### SEO & Public Pages
- Public shared dashboard/report links with proper meta tags and Open Graph tags
- Robots policy for public content (indexable landing pages, noindex for shared data views)
- Clean, branded read-only layout for shared links with sign-up CTA
- Structured data (JSON-LD) where applicable

---

#### Security & Compliance
- Input validation and sanitization on all inputs
- CSRF/XSS protection
- Content Security Policy (CSP) headers
- Rate limiting on all endpoints
- Encrypted data in transit (TLS) and at rest
- Multi-factor authentication (MFA) support
- Session invalidation on password change
- Soft-delete with configurable retention periods
- Data retention policies with automatic archival and deletion
- GDPR-compliant data export and deletion on request
- GDPR anonymization strategy: deleted users are anonymized in audit logs (PII replaced with "Deleted User #NNN"), audit events preserved
- Data residency awareness: document storage region, configurable per organization
- Role-based access control at every boundary
- File upload security: MIME type validation, extension whitelist, size limits, optional malware scanning
- Dependency vulnerability scanning in CI pipeline (npm audit or equivalent)
- IP allowlisting for OAuth applications

---

#### Performance & Caching
- Page load under 2 seconds (LCP target)
- API response time under 300 ms for typical operations
- Core Web Vitals targets: LCP < 2s, FID < 100ms, CLS < 0.1
- Frontend bundle size budget enforced in CI (warn at 250KB gzipped, fail at 500KB)
- CDN for static assets (fonts, images, compiled JS/CSS)
- API response caching via ETag and Cache-Control headers
- Redis caching for hot data (user sessions, project config, permission checks)
- Slow query logging: log queries exceeding 100ms, alert on queries exceeding 500ms
- Database query timeout: 5 seconds default, configurable per endpoint
- Database connection pooling with configurable pool size, timeout, and overflow behavior

---

#### Technical Requirements

See **[stack.md](stack.md)** for the full technology stack, libraries, and Docker Compose service definitions.

- **Frontend**: React + TypeScript SPA built with Vite, styled with Tailwind CSS + shadcn/ui.
- **Backend**: Fastify (Node.js + TypeScript) RESTful API with Drizzle ORM.
- **Database**: MariaDB for structured data storage; Redis for caching and sessions.
- **Search**: Meilisearch for full-text search.
- **Messaging**: RabbitMQ for asynchronous job processing.
- **Real-Time**: WebSocket/SSE for push updates.
- **Authentication**: JWT-based auth via @fastify/jwt; OAuth 2.0 and OIDC via openid-client; personal access tokens.
- **API Documentation**: Auto-generated OpenAPI/Swagger specification.
- **Containerization**: Docker Compose for local development and deployment.
- **CI/CD**: GitHub Actions for automated testing, bundle size checks, dependency scanning, and deployment.
- **Monitoring**: Prometheus + Grafana + Loki for metrics, dashboards, and log aggregation.

---

#### Non-Functional Requirements

- **Performance**: See Performance & Caching section above for detailed targets and enforcement.
- **Scalability**: Horizontal scaling support for the API layer; database connection pooling; CDN for static assets.
- **Security**: See Security & Compliance section above for detailed controls.
- **Accessibility**: WCAG 2.1 AA compliance for all user-facing interfaces.
- **Reliability**: 99.9% uptime target; automated health checks (`/health`, `/ready`); graceful error handling and graceful shutdown.
- **Maintainability**: Consistent code style, comprehensive test coverage (≥ 80%), and clear documentation.
