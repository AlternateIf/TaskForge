# MVP-020: Notifications

## Description
In-app notification center, email notifications for key events, and user notification preferences. Notifications are created asynchronously via RabbitMQ.

## Personas
- **Sarah (PM)**: Needs to know when tasks change status
- **Elena (Customer)**: Wants updates on submitted tasks
- **Finn (Onboarding)**: Notifications shouldn't be overwhelming

## Dependencies
- MVP-018 (RabbitMQ & worker)
- MVP-012 (task events to trigger notifications)
- MVP-017 (comment @mentions)

## Scope

### API Endpoints
| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/notifications` | List current user's notifications (paginated) |
| PATCH | `/api/v1/notifications/:id/read` | Mark as read |
| POST | `/api/v1/notifications/read-all` | Mark all as read |
| GET | `/api/v1/notifications/unread-count` | Get unread count |
| GET | `/api/v1/notification-preferences` | Get user's preferences |
| PATCH | `/api/v1/notification-preferences` | Update preferences |

### Files to create
```
apps/api/src/
├── routes/notifications/
│   ├── notifications.routes.ts
│   ├── notifications.handlers.ts
│   └── notifications.schemas.ts
├── services/
│   └── notification.service.ts
├── queues/handlers/
│   ├── notification.handler.ts    # Create in-app notifications
│   └── email.handler.ts           # Send emails via Nodemailer
packages/email-templates/src/templates/
├── task-assigned.tsx
├── task-status-changed.tsx
├── mention.tsx
├── deadline-reminder.tsx
└── welcome.tsx
```

### Notification events (MVP)
| Event | In-App | Email | Trigger |
|---|---|---|---|
| task.assigned | yes | yes | Task assigned to user |
| task.status_changed | yes | optional | Task the user watches/is assigned changes status |
| comment.mentioned | yes | yes | User @mentioned in a comment |
| task.deadline_approaching | yes | yes | Task due within 24 hours (scheduled job) |
| user.welcome | no | yes | User registers |

### Notification creation flow
1. API service publishes event to RabbitMQ (e.g., `notification.task_assigned`)
2. `notification.handler.ts` receives event, checks recipient's preferences
3. If `in_app` enabled: insert Notification record in DB
4. If `email` enabled: publish `email.send` event
5. `email.handler.ts` receives email event, renders react-email template, sends via Nodemailer

### Notification preferences
```json
{
  "task_assigned": { "in_app": true, "email": true },
  "task_status_changed": { "in_app": true, "email": false },
  "comment_mentioned": { "in_app": true, "email": true },
  "task_deadline_approaching": { "in_app": true, "email": true }
}
```
- Defaults: all in_app enabled, all email enabled
- User can toggle per event per channel

### Email configuration
- SMTP via Nodemailer
- Dev: Mailpit (localhost:1025)
- Templates: react-email JSX components
- From address configurable via env

### Deadline reminder
- Scheduled job (cron via worker): runs hourly
- Finds tasks due within 24 hours where assignee hasn't been notified yet
- Creates notification + email

## Acceptance Criteria
- [x] Notifications are created asynchronously via RabbitMQ
- [x] User preferences are checked before creating notifications
- [x] In-app notifications can be listed, marked read, and bulk-marked read
- [x] Unread count endpoint works
- [x] Email notifications use react-email templates
- [x] Emails are sent via Nodemailer (Mailpit in dev)
- [x] Deadline reminder runs on schedule and notifies once per task
- [x] Notification preferences can be read and updated
- [x] Disabling a channel prevents that notification type
- [x] Tests cover notification creation, preference checks, email sending
