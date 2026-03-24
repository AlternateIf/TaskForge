# TaskForge — Feature Roadmap

This document defines the phasing of features from [requirements.md](requirements.md). Each phase builds on the previous one. A phase is complete when all its features pass acceptance criteria and have ≥ 80% test coverage.

---

## MVP — Foundation

The minimum viable product: core task management with auth, projects, a functional UI, and real-time updates.

### Auth & Users
- JWT-based registration and login
- OAuth 2.0 / OIDC login (Google, GitHub)
- User profile management
- MFA support
- Session invalidation on password change

### Organizations & Multi-Tenancy
- Organization creation and membership
- Organization-level isolation
- Trial signup flow (no credit card, minimal setup wizard)

### Roles & Permissions
- Built-in roles: Super Admin, Admin, Project Manager, Team Member, Guest
- Role-based access at organization and project level

### Projects
- Create, edit, archive, delete projects
- Customizable status workflows per project
- Labels and categories

### Tasks
- Full CRUD with title, description, assignee, due date, priority, status
- Subtasks and checklists
- Task dependencies (blocked by / blocks)
- Drag-and-drop reordering
- Bulk actions
- Undo for accidental actions
- Keyboard shortcuts (quick create, status change, navigation, search)
- Keyboard shortcut reference overlay (`?`)

### Views
- Kanban board (columns by status)
- List view (sortable, filterable table)

### Comments & Activity
- Threaded comments with @mentions
- Rich text and file attachments
- Activity log per task and project
- File upload validation (MIME type whitelist, extension check, max size)

### Search & Filtering
- Full-text search (Meilisearch)
- Filtering by status, priority, assignee, label, date range
- Saved filter presets

### Notifications
- In-app notification center
- Email notifications for assignments, status changes, mentions, deadlines
- User notification preferences

### Real-Time Updates
- WebSocket/SSE push for task, comment, and status changes
- Real-time notification delivery
- Fallback to polling when WebSocket unavailable

### Personalized Dashboard
- Assigned tasks, upcoming deadlines, project progress
- Guided onboarding for first-time users
- Sample/demo project on first org setup (optional, deletable)

### API (v1)
- Full CRUD endpoints for users, organizations, projects, tasks, comments
- Consistent response format, error handling, cursor-based pagination
- Rate limiting with documented headers
- ETag and Cache-Control support
- Health check endpoints (`/health`, `/ready`)
- Auto-generated OpenAPI/Swagger docs
- Graceful shutdown behavior

### Infrastructure
- Docker Compose setup (all services)
- GitHub Actions CI pipeline (lint, test, build, bundle size check, dependency audit)
- Prometheus + Grafana + Loki monitoring

---

## Phase 2 — Collaboration & Visibility

Richer collaboration, reporting, time tracking, enterprise features, and integrations.

### Issues & Bug Tracking
- Separate issue type linked to tasks and releases
- Severity, priority, steps to reproduce, resolution tracking
- Screenshot and file attachments

### Release Management
- Release/version entities linked to projects
- Assign tasks and issues to releases
- Release timeline and milestone tracking
- Release notes generation from linked tasks/issues

### Gantt Chart View
- Interactive timeline with dependencies and milestones
- Critical path highlighting

### Calendar View
- Tasks and deadlines on a calendar grid

### Custom Fields
- User-defined fields on tasks, projects, and issues
- URL/link field type with rich preview (Figma, Google Docs unfurling)
- Usable in filters, reports, and dashboards
- Required fields per project or workflow stage

### Custom Dashboards
- Dashboard builder with grid layout and widgets
- Widget types: task clusters, charts, metrics cards, activity feeds
- Custom grouping/clustering by any field combination
- Dashboard-level and per-widget filters
- Conditional formatting
- Widget drill-down (click to see underlying data)
- Dashboard cloning
- Sharing and public read-only links
- Real-time auto-refresh via WebSocket/SSE
- Dashboard templates

### Custom Reports
- Report builder with data source, column, filter, and grouping selection
- Aggregation endpoints and calculated fields
- Chart types: bar, line, pie, stacked, burndown, table
- Cross-project reporting
- Scheduled delivery (email, in-app)
- Export to PDF, CSV, Excel
- Saved/shared reports and report templates

### Time Tracking
- Start/stop timer and manual entry
- Time logged against tasks with notes
- Timesheet views (daily, weekly)
- Time reports per project, client, or team member

### Approval Workflows
- Multi-stage approval chains on tasks, documents, and releases
- Serial and parallel approver sequences
- Approve, reject, request changes with comments
- Release sign-off workflow

### Automations
- Trigger-based workflow rules (field changes, status transitions, due date thresholds)
- Actions: update fields, assign users, move tasks, send notifications, trigger webhooks
- Automation execution log

### Webhooks
- Granular event subscriptions
- Delivery signatures and retries with exponential backoff
- Delivery logs

### Personal Access Tokens
- User-generated tokens for scripts and CI
- Scoped permissions and expiration
- Last-used tracking

### GitHub Integration
- PR/branch linking via commit message parsing
- PR status in task activity log
- Deployment event ingestion

### Notifications (Enhanced)
- Notification digest (daily/weekly summary)
- Granular per-event-type opt-in/opt-out

### Customer Access
- External customer role with restricted access to whitelisted projects
- Simplified customer-facing UI
- Task completion feedback (satisfied/not satisfied + comment)

### Real-Time (Enhanced)
- Presence indicators (who is viewing/editing a task)
- Channel-based subscriptions (per project, per task, per user)

### Data Import
- CSV and JSON import for tasks, projects, users, time entries
- Column mapping UI with preview and validation
- Import job tracking with progress and error log

### In-App Changelog
- "What's new" announcements for feature releases

---

## Phase 3 — Enterprise & Scale

Portfolio management, advanced resource planning, compliance, ecosystem, and scale features.

### Portfolio & Program Management
- Group projects into programs and portfolios
- Portfolio dashboards with health, budget, and progress rollups
- Budget tracking at project and portfolio level (planned vs. actual)
- Executive summary views with drill-down

### Resource & Workload Management
- Workload view weighted by estimated effort
- Capacity planning calendar (PTO, on-call, part-time)
- Utilization tracking with trend charts
- Skill tagging and skill-based assignment suggestions
- Configurable workload/burnout alerts (threshold + sustained period)

### Billing Rates
- Configurable rates per user, project, or client
- Cost/revenue reports (time × billing rate)
- Exportable time data for invoicing

### Baseline & Variance Tracking
- Snapshot project plans as baselines
- Actual vs. baseline comparison with variance indicators
- Multiple baselines per project

### Scenario Planner
- What-if analysis for timelines and resource allocation
- Side-by-side scenario comparison

### Test Case Management
- Test cases linked to tasks and releases
- Test plans and test run execution
- Pass/fail/blocked status with evidence
- CI pipeline test result ingestion via API
- Test coverage and regression trend reporting

### Document Management & Proofing
- Inline annotation and markup on documents and images
- Document approval cycles
- Version history on uploaded files
- Optional malware/virus scanning for uploads

### Work Intake
- Custom request queues with intake forms
- Auto-routing based on queue and form data
- SLA-based due date assignment

### Timesheets (Enhanced)
- Timesheet approval workflows
- Exportable time data for invoicing/billing

### Compliance & Audit
- Immutable audit trail with before/after values (append-only)
- Bulk audit log export (CSV, PDF)
- Access review reports
- Configurable data retention policies with automatic archival and deletion
- GDPR data export and deletion (anonymization strategy: PII replaced, audit events preserved)
- Data residency awareness (configurable per organization)

### Alert Ingestion
- Incoming webhook endpoint for monitoring tools (Prometheus AlertManager, Grafana, PagerDuty, Opsgenie)
- Auto-creates issues with configurable severity mapping
- Deduplication to prevent duplicate issues

### OAuth Application Management
- Self-service developer portal for OAuth app registration
- Redirect URI, scope, and IP allowlist configuration
- Client credential management

### API Sandbox
- Isolated test environment with synthetic data
- Full API parity with production
- Self-service sandbox provisioning

### Official TypeScript SDK
- Published npm package (`@taskforge/sdk`)
- Type-safe methods for all endpoints
- Built-in auth handling (JWT, OAuth, PAT)
- WebSocket/SSE client for real-time subscriptions

### API (v2)
- API versioning with deprecation window
- Granular per-resource scopes
- Changelog and migration guide

### Workfront Migration Adapter
- Workfront-specific import mapping (entities, custom fields, activity history)
- Preserve original timestamps during migration

### Multi-Workspace (Freelancer)
- Multiple client workspaces within a single account
- Cross-workspace personal dashboard
- Public read-only sharing links with organization branding

### Project Templates
- Reusable project and task templates
- Template library with pre-built starting points

### Recurring Tasks
- Configurable recurrence schedules

### SEO & Public Pages
- Meta tags, Open Graph, structured data for public shared links
- Branded read-only layout with sign-up CTA
- Robots policy for public content

### Contextual Help
- In-app contextual tooltips per screen
- Progressive feature discovery

### Security Hardening
- Content Security Policy (CSP) headers
- IP allowlisting for OAuth applications
- Dependency vulnerability scanning enforced in CI (fail on high/critical)
