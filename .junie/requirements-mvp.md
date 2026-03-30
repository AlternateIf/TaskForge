# TaskForge — Requirements (MVP)

This document defines requirements that drive implementation in the MVP phase.

## Product Goal (MVP)
Deliver a reliable collaborative task management platform with authentication, organizations/projects/tasks, comments/activity, search, notifications, and realtime UX foundations.

## MVP Functional Requirements

### Auth, Identity, and Access
- Email/password auth, OAuth login, MFA support.
- Organization-aware role-based access control with built-in roles.
- Session controls including invalidation on sensitive auth changes.

### Organization and Project Foundations
- Multi-tenant organization model with membership.
- Project CRUD with workflows/statuses and labels.
- Organization/project permission boundaries enforced in API and UI.

### Task Management Core
- Task CRUD with assignee, priority, status, dates, and soft delete.
- Subtasks/checklists.
- Task dependencies (blocked by / blocks).
- Bulk actions and undo flows.
- Keyboard shortcuts for fast task operations.

### Views and Frontend Foundation
- App shell and authenticated routing.
- Kanban and list views over the same task data.
- Task detail view (description, comments, activity, metadata).
- Design system foundation (tokens, shared components, accessibility baseline).
- Rich text editor for descriptions/comments with mentions and markdown shortcuts.

### Collaboration
- Threaded comments with @mentions.
- Activity timeline with important task/project events.
- Internal vs external visibility constraints where required.

### Search and Filtering
- Full-text search for key entities.
- Multi-filter support (status/priority/assignee/labels/date ranges).
- Saved filter presets.

### Notifications and Realtime
- In-app notification center with unread state.
- Email notifications for key events.
- Per-user notification preferences.
- Realtime updates for task/comment/status/notification events.
- Polling fallback when realtime channel is unavailable.

### API and Platform Baseline
- Versioned REST API (`/api/v1`) with consistent response/error envelopes.
- Cursor pagination and standard filtering/sorting conventions.
- Health/readiness endpoints.
- ETag/Cache-Control behavior on applicable endpoints.
- OpenAPI/Swagger generation.

### Infrastructure and Delivery
- Monorepo setup with shared packages.
- CI pipeline for lint/test/build/security checks.
- Docker-based local runtime for required services.
- Database schema/migrations/seeding for MVP entities.
- Async worker + queue foundations for background processing.

## MVP Non-Functional Requirements
- Security-first defaults (input validation, least privilege, secret handling).
- Performance targets suitable for day-to-day team use.
- Accessibility baseline (WCAG 2.1 AA) for core flows.
- Maintainability: strict typing, test coverage on changed logic, consistent conventions.
