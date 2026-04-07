# TaskForge — Data Model (MVP)

This document captures entities needed for MVP implementation and verification.

## Auth and Identity
- **User**: identity/profile fields, auth flags, lifecycle timestamps.
- **OAuthAccount**: provider identities linked to user.
- **Session**: active session tracking and expiry.
- **Role / Permission** (built-in roles + scoped permissions used in MVP authz flows).

## Organization and Membership
- **Organization**: tenant boundary and settings.
- **OrganizationMember**: user-to-organization membership with role.

## Project and Workflow
- **Project**: top-level work container.
- **ProjectMember**: project-level membership and role.
- **Workflow** and **WorkflowStatus**: configurable status model.
- **Label**: task/project labeling.

## Task Domain
- **Task**: title, description, status, assignee, priority, scheduling, ordering, lifecycle.
- **TaskDependency**: blocked-by / blocks edges.
- **TaskLabel**: task-label join.
- **TaskWatcher**: follow/watch relationship.
- **Checklist** and **ChecklistItem**: structured subtasks/checklists.

## Collaboration and Audit
- **Comment**: threaded comments on entities.
- **ActivityLog**: immutable before/after event history.

## Files and Notifications
- **Attachment**: uploaded files metadata and ownership.
- **Notification**: in-app notification items.
- **NotificationPreference**: per-user channel/event preferences.

## MVP Relationship Notes
- Organization is the tenant root for projects, members, and policy boundaries.
- Projects own workflows/statuses/labels/tasks.
- Tasks connect to comments, checklists, dependencies, watchers, and attachments.
- ActivityLog spans key entities and preserves change history.
