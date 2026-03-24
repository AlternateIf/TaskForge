# TaskForge — Data Model

This document defines the core entities, their key attributes, and relationships. It covers all three roadmap phases. Entities are grouped by domain. Implementation details (indexes, constraints, exact column types) are defined in Drizzle schema files.

---

## Authentication & Users

### User
- id, email, password_hash, display_name, avatar_url
- mfa_enabled, mfa_secret
- email_verified_at, last_login_at
- created_at, updated_at, deleted_at (soft delete)
- anonymized_at (nullable — set when GDPR deletion replaces PII with "Deleted User #NNN")

### OAuthAccount
- id, user_id → User
- provider (google, github, etc.), provider_user_id
- access_token, refresh_token, expires_at
- created_at, updated_at

### Session
- id, user_id → User
- token_hash, ip_address, user_agent
- expires_at, created_at

### PersonalAccessToken
- id, user_id → User
- name, token_hash
- scopes (JSON — array of permitted scopes)
- expires_at (nullable)
- last_used_at (nullable)
- revoked_at (nullable)
- created_at

---

## Organizations & Membership

### Organization
- id, name, slug, logo_url
- settings (JSON — defaults, notification preferences)
- data_region (nullable — storage region for data residency)
- trial_expires_at (nullable)
- created_at, updated_at, deleted_at

### OrganizationMember
- id, organization_id → Organization, user_id → User
- role_id → Role
- joined_at, created_at, updated_at

### Role
- id, organization_id → Organization (null for built-in roles)
- name, description, is_system (built-in vs. custom)
- created_at, updated_at

### Permission
- id, role_id → Role
- resource (project, task, comment, etc.), action (create, read, update, delete, manage)
- scope (organization, project)

---

## Projects

### Project
- id, organization_id → Organization
- name, description, slug, color, icon
- status (active, archived, deleted)
- budget_planned, budget_actual, budget_currency (nullable — for cost tracking)
- template_id → ProjectTemplate (nullable)
- created_by → User
- created_at, updated_at, deleted_at

### ProjectMember
- id, project_id → Project, user_id → User
- role_id → Role
- created_at

### ProjectTemplate
- id, organization_id → Organization
- name, description
- workflow_config (JSON), default_labels (JSON), default_custom_fields (JSON)
- created_at, updated_at

### Workflow
- id, project_id → Project
- name, is_default
- created_at, updated_at

### WorkflowStatus
- id, workflow_id → Workflow
- name, color, position (sort order)
- is_initial, is_final
- created_at

### Label
- id, project_id → Project
- name, color
- created_at

---

## Tasks & Issues

### Task
- id, project_id → Project
- title, description (rich text)
- status_id → WorkflowStatus
- priority (none, low, medium, high, critical)
- assignee_id → User (nullable)
- reporter_id → User
- parent_task_id → Task (nullable, for subtasks)
- release_id → Release (nullable)
- due_date, start_date
- estimated_hours, position (sort order)
- recurrence_rule (nullable, iCal RRULE format)
- created_at, updated_at, deleted_at

### TaskDependency
- id, task_id → Task, depends_on_task_id → Task
- type (blocks, blocked_by)
- created_at

### TaskLabel
- task_id → Task, label_id → Label

### TaskWatcher
- task_id → Task, user_id → User

### Checklist
- id, task_id → Task
- title, position
- created_at

### ChecklistItem
- id, checklist_id → Checklist
- title, is_completed, position
- completed_by → User (nullable), completed_at
- created_at, updated_at

### Issue
- id, project_id → Project
- linked_task_id → Task (nullable)
- release_id → Release (nullable)
- title, description
- type (bug, defect, incident, usability)
- severity (cosmetic, minor, major, critical, blocker)
- priority (low, medium, high, critical)
- status (open, in_progress, fixed, verified, closed, wont_fix)
- steps_to_reproduce, expected_behavior, actual_behavior
- environment
- reporter_id → User, assignee_id → User (nullable)
- resolution_notes
- created_at, updated_at, deleted_at

### TaskFeedback
- id, task_id → Task
- submitted_by → User
- rating (satisfied, not_satisfied)
- comment (nullable)
- created_at

---

## Releases

### Release
- id, project_id → Project
- name, description
- version (semver string)
- status (planned, in_progress, testing, released, cancelled)
- target_date, released_at (nullable)
- release_notes (rich text, nullable)
- created_by → User
- created_at, updated_at

---

## Test Management

### TestCase
- id, project_id → Project
- title, description, preconditions
- steps (JSON — ordered array of step descriptions and expected results)
- linked_task_id → Task (nullable)
- priority (low, medium, high, critical)
- type (manual, automated)
- automated_test_id (nullable — external reference for CI-linked tests)
- created_by → User
- created_at, updated_at, deleted_at

### TestPlan
- id, project_id → Project
- release_id → Release (nullable)
- name, description
- status (draft, active, completed)
- created_by → User
- created_at, updated_at

### TestPlanCase
- test_plan_id → TestPlan, test_case_id → TestCase
- position

### TestRun
- id, test_plan_id → TestPlan
- name, status (in_progress, completed, aborted)
- executed_by → User
- started_at, completed_at
- created_at

### TestExecution
- id, test_run_id → TestRun, test_case_id → TestCase
- status (passed, failed, blocked, skipped)
- notes, evidence_attachment_id → Attachment (nullable)
- executed_by → User
- executed_at
- linked_issue_id → Issue (nullable — auto-created issue on failure)
- created_at

---

## Custom Fields

### CustomFieldDefinition
- id, organization_id → Organization
- name, description, field_type (text, number, date, dropdown, multi_select, checkbox, url)
- options (JSON, for dropdown/multi_select)
- url_preview_enabled (boolean, for url type — enables rich unfurling)
- is_required, default_value
- entity_type (task, project, issue)
- created_at, updated_at

### CustomFieldValue
- id, field_definition_id → CustomFieldDefinition
- entity_type, entity_id (polymorphic)
- value (JSON)
- created_at, updated_at

---

## Comments & Activity

### Comment
- id, entity_type, entity_id (polymorphic — task, issue, etc.)
- author_id → User
- body (rich text), parent_comment_id → Comment (nullable, for threads)
- created_at, updated_at, deleted_at

### ActivityLog
- id, organization_id → Organization
- actor_id → User (nullable — null for anonymized users, system actions)
- actor_display (string — denormalized display name, preserved as "Deleted User #NNN" after anonymization)
- entity_type, entity_id (polymorphic)
- action (created, updated, deleted, status_changed, assigned, pr_linked, deployed, alert_received, etc.)
- changes (JSON — before/after values)
- created_at (immutable, append-only)

---

## Notifications

### Notification
- id, user_id → User
- type (task_assigned, status_changed, mentioned, deadline_approaching, approval_requested, workload_alert, etc.)
- title, body
- entity_type, entity_id (polymorphic)
- read_at (nullable)
- created_at

### NotificationPreference
- id, user_id → User
- event_type
- channel (in_app, email, digest)
- enabled
- created_at, updated_at

---

## Time Tracking

### TimeEntry
- id, task_id → Task, user_id → User
- duration_minutes, started_at, ended_at (nullable, for timer-based)
- notes
- billable (boolean, default true)
- timesheet_id → Timesheet (nullable)
- created_at, updated_at

### Timesheet
- id, user_id → User, organization_id → Organization
- period_start, period_end
- status (draft, submitted, approved, rejected)
- approved_by → User (nullable), approved_at
- created_at, updated_at

### BillingRate
- id, organization_id → Organization
- user_id → User (nullable — null for default org rate)
- project_id → Project (nullable — null for default user rate)
- rate_amount, rate_currency
- effective_from, effective_to (nullable)
- created_at, updated_at

---

## Approvals

### ApprovalWorkflow
- id, organization_id → Organization
- name, description
- entity_type (task, document, release)
- created_at, updated_at

### ApprovalStage
- id, workflow_id → ApprovalWorkflow
- name, position (order)
- type (serial, parallel)
- created_at

### ApprovalStageApprover
- id, stage_id → ApprovalStage
- user_id → User

### ApprovalRequest
- id, workflow_id → ApprovalWorkflow
- entity_type, entity_id (polymorphic)
- current_stage_id → ApprovalStage
- status (pending, approved, rejected, cancelled)
- requested_by → User
- created_at, updated_at

### ApprovalDecision
- id, request_id → ApprovalRequest
- stage_id → ApprovalStage
- approver_id → User
- decision (approved, rejected, changes_requested)
- comment
- created_at

---

## Documents & Files

### Attachment
- id, entity_type, entity_id (polymorphic — task, comment, issue, test_execution)
- uploaded_by → User
- filename, mime_type, size_bytes, storage_path
- version (integer, for document versioning)
- scan_status (pending, clean, infected, skipped — for malware scanning)
- created_at

### DocumentAnnotation
- id, attachment_id → Attachment
- author_id → User
- x, y, width, height (annotation coordinates)
- body
- created_at, updated_at

---

## Portfolios & Programs

### Portfolio
- id, organization_id → Organization
- name, description
- owner_id → User
- budget_planned, budget_currency (nullable)
- created_at, updated_at

### Program
- id, portfolio_id → Portfolio
- name, description
- created_at, updated_at

### ProgramProject
- program_id → Program, project_id → Project

---

## Baselines & Scenarios

### Baseline
- id, project_id → Project
- name, snapshot_data (JSON — frozen project plan)
- created_by → User
- created_at

### Scenario
- id, project_id → Project
- name, description
- scenario_data (JSON — modified plan)
- created_by → User
- created_at, updated_at

---

## Resource Management

### UserSkill
- id, user_id → User
- skill_name
- created_at

### UserAvailability
- id, user_id → User
- date, available_hours
- type (pto, on_call, holiday, part_time)
- created_at

### WorkloadAlert
- id, organization_id → Organization
- target_type (user, team)
- target_id (user_id or role_id)
- threshold_percent (e.g., 90)
- sustained_weeks (e.g., 3)
- is_active
- last_triggered_at (nullable)
- created_at, updated_at

---

## Dashboards & Reports

### Dashboard
- id, organization_id → Organization
- owner_id → User
- name, description
- is_shared, public_token (nullable)
- layout (JSON — widget positions and sizes)
- filters (JSON — dashboard-level filters)
- cloned_from_id → Dashboard (nullable)
- created_at, updated_at

### DashboardWidget
- id, dashboard_id → Dashboard
- type (task_cluster, chart, metric, activity_feed, embedded_report)
- config (JSON — data source, grouping, filters, chart type, conditional formatting, drill-down config)
- position_x, position_y, width, height
- created_at, updated_at

### SavedReport
- id, organization_id → Organization
- owner_id → User
- name, description
- config (JSON — data source, columns, filters, groupings, chart type, calculated fields)
- schedule (JSON — nullable, cron expression + delivery config)
- is_shared
- created_at, updated_at

---

## Automations

### AutomationRule
- id, project_id → Project
- name, description, is_enabled
- trigger (JSON — event type, conditions)
- actions (JSON — array of actions to execute)
- created_by → User
- created_at, updated_at

### AutomationLog
- id, rule_id → AutomationRule
- triggered_by_entity_type, triggered_by_entity_id
- status (success, failure)
- result (JSON — actions executed, errors)
- executed_at

---

## Webhooks & OAuth Apps

### Webhook
- id, organization_id → Organization
- url, secret
- events (JSON — array of event types)
- project_id → Project (nullable, for project-scoped)
- is_active
- created_by → User
- created_at, updated_at

### WebhookDelivery
- id, webhook_id → Webhook
- event_type, payload (JSON)
- response_status, response_body
- attempts, next_retry_at
- delivered_at, created_at

### OAuthApp
- id, organization_id → Organization
- name, description
- client_id, client_secret_hash
- redirect_uris (JSON)
- scopes (JSON)
- ip_allowlist (JSON, nullable — restrict by IP)
- created_by → User
- created_at, updated_at

---

## Data Import

### ImportJob
- id, organization_id → Organization
- initiated_by → User
- type (csv, json, workfront)
- entity_type (tasks, projects, users, time_entries, mixed)
- status (pending, validating, previewing, importing, completed, failed, rolled_back)
- source_file_path, column_mapping (JSON)
- total_rows, processed_rows, error_count
- error_log (JSON — per-row errors)
- preserve_timestamps (boolean)
- started_at, completed_at
- created_at, updated_at

---

## Alert Ingestion

### AlertIngestionConfig
- id, organization_id → Organization
- name, source_type (prometheus_alertmanager, grafana, pagerduty, opsgenie, generic)
- target_project_id → Project
- default_assignee_id → User (nullable)
- severity_mapping (JSON — maps external severity to TaskForge issue severity)
- deduplication_key_template (string — template for generating dedup keys from alert payload)
- is_active
- created_at, updated_at

---

## Work Intake

### RequestQueue
- id, project_id → Project
- name, description
- form_fields (JSON — field definitions for intake form)
- auto_assign_to → User (nullable)
- sla_hours (nullable)
- created_at, updated_at

### RequestSubmission
- id, queue_id → RequestQueue
- submitted_by → User
- form_data (JSON)
- resulting_task_id → Task (nullable)
- status (pending, accepted, rejected)
- created_at, updated_at

---

## Search

Meilisearch indexes are derived from the above entities. Primary indexes:

- **tasks**: id, title, description, status, priority, assignee, labels, custom field values, project, release
- **projects**: id, name, description, status
- **comments**: id, body, author, task
- **issues**: id, title, description, severity, status, release
- **test_cases**: id, title, description, priority, type

Indexes are kept in sync via RabbitMQ events on entity changes.

---

## Data Retention

### RetentionPolicy
- id, organization_id → Organization
- entity_type (project, task, etc.)
- archive_after_days, delete_after_days
- is_active
- created_at, updated_at

Retention is enforced by a scheduled worker job that archives and deletes entities based on active policies. GDPR user deletion anonymizes PII in ActivityLog entries rather than deleting them.

---

## Entity Relationship Summary

```
Organization ─┬─ has many ─→ OrganizationMember ─→ User
               ├─ has many ─→ Role ─→ Permission
               ├─ has many ─→ Project ─┬─ has many ─→ Task ─┬─ has many ─→ Comment
               │                       │                     ├─ has many ─→ TaskLabel
               │                       │                     ├─ has many ─→ TaskDependency
               │                       │                     ├─ has many ─→ Checklist ─→ ChecklistItem
               │                       │                     ├─ has many ─→ TimeEntry
               │                       │                     ├─ has many ─→ Attachment
               │                       │                     ├─ has many ─→ TaskFeedback
               │                       │                     └─ has many ─→ Issue
               │                       ├─ has many ─→ Release
               │                       ├─ has many ─→ TestCase
               │                       ├─ has many ─→ TestPlan ─→ TestPlanCase, TestRun ─→ TestExecution
               │                       ├─ has many ─→ Workflow ─→ WorkflowStatus
               │                       ├─ has many ─→ Label
               │                       ├─ has many ─→ ProjectMember
               │                       ├─ has many ─→ AutomationRule ─→ AutomationLog
               │                       └─ has many ─→ RequestQueue ─→ RequestSubmission
               ├─ has many ─→ Portfolio ─→ Program ─→ ProgramProject
               ├─ has many ─→ Dashboard ─→ DashboardWidget
               ├─ has many ─→ SavedReport
               ├─ has many ─→ BillingRate
               ├─ has many ─→ Webhook ─→ WebhookDelivery
               ├─ has many ─→ OAuthApp
               ├─ has many ─→ AlertIngestionConfig
               ├─ has many ─→ ImportJob
               ├─ has many ─→ CustomFieldDefinition ─→ CustomFieldValue
               ├─ has many ─→ WorkloadAlert
               └─ has many ─→ RetentionPolicy

User ─┬─ has many ─→ OAuthAccount
      ├─ has many ─→ Session
      ├─ has many ─→ PersonalAccessToken
      ├─ has many ─→ Notification
      ├─ has many ─→ NotificationPreference
      ├─ has many ─→ TimeEntry
      ├─ has many ─→ Timesheet
      ├─ has many ─→ UserSkill
      └─ has many ─→ UserAvailability

ActivityLog (immutable, append-only) ─→ references any entity via entity_type + entity_id
                                     ─→ actor_display preserved on user anonymization
```
