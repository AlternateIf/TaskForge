# MVP-025: Frontend — Search, Notifications & Dashboard

## Description
Global search bar, notification center dropdown, and the personalized dashboard page showing assigned tasks, upcoming deadlines, and project progress.

## Personas
- **Sarah (PM)**: Dashboard is her morning standup prep
- **Derek (Workfront)**: Expects a rich personal overview
- **Finn (Onboarding)**: Dashboard is the first thing a new user sees
- **Ava (Visual Designer)**: Dashboard widgets, charts, and notification dropdown must be visually cohesive and data-dense without clutter

## Dependencies
- MVP-022 (app shell — search bar in header, notification bell in header)
- MVP-019 (search API)
- MVP-020 (notifications API)
- MVP-012 (task API for dashboard data)

## Scope

### Files to create
```
apps/web/src/
├── api/
│   ├── search.ts              # useSearch hook
│   └── notifications.ts       # useNotifications, useUnreadCount, useMarkRead
├── routes/
│   └── dashboard/
│       └── index.tsx           # Dashboard page
├── components/
│   ├── layout/
│   │   ├── search-bar.tsx      # Global search in header with results dropdown
│   │   └── notification-bell.tsx  # Bell icon with unread badge + dropdown
│   ├── data/
│   │   ├── notification-list.tsx    # Notification items in dropdown
│   │   ├── notification-item.tsx    # Single notification with icon, text, timestamp
│   │   ├── dashboard-my-tasks.tsx   # Assigned tasks list
│   │   ├── dashboard-upcoming.tsx   # Tasks due within 7 days
│   │   ├── dashboard-overdue.tsx    # Overdue tasks
│   │   └── dashboard-projects.tsx   # Project progress cards
```

### Global search
- Input in header, triggered by clicking or pressing `/` shortcut
- Debounced (300ms) search as you type
- Results dropdown grouped by type: Tasks, Projects, Comments
- Each result: title, project name, status badge
- Click result → navigate to entity
- Enter → full search results page (optional, basic list)

### Notification center
- Bell icon in header with unread count badge
- Click → dropdown showing recent notifications
- Each notification: icon (by type), text, relative timestamp, read/unread indicator
- Click notification → navigate to related entity, mark as read
- "Mark all as read" button
- Empty state: "You're all caught up"

### Dashboard page
Sections (top to bottom):

1. **Welcome banner** (first-time only): "Welcome to TaskForge! Here's what you can do..."
2. **My Tasks** (assigned to me, not done): sorted by due date, grouped by project
3. **Overdue** (due date passed, not done): highlighted in red
4. **Upcoming this week** (due within 7 days): sorted by date
5. **Project progress**: cards for each project showing task count by status (mini progress bar)

### Data fetching
- Dashboard uses multiple TanStack Query hooks in parallel
- `useTasks({ assigneeId: 'me', status: ['open', 'in_progress'] })` for my tasks
- `useTasks({ assigneeId: 'me', dueDateTo: 'today', status: ['open', 'in_progress'] })` for overdue
- `useProjects()` + task aggregation for project progress

### Responsive
- Dashboard sections stack vertically on mobile
- Search results dropdown becomes full-screen on mobile
- Notification dropdown becomes full-screen on mobile

## Acceptance Criteria
- [ ] Global search input in header, accessible via `/` shortcut
- [ ] Search results appear as you type (debounced)
- [ ] Results grouped by type with navigation on click
- [ ] Notification bell shows unread count badge
- [ ] Notification dropdown lists recent notifications
- [ ] Clicking notification navigates and marks as read
- [ ] "Mark all as read" works
- [ ] Dashboard shows my tasks grouped by project
- [ ] Dashboard shows overdue tasks highlighted
- [ ] Dashboard shows upcoming deadlines
- [ ] Dashboard shows project progress cards
- [ ] Welcome banner shows on first visit (dismissible)
- [ ] Loading states with skeletons
- [ ] Empty states with helpful messages
- [ ] Responsive on mobile
- [ ] Unit tests cover component logic, search debounce behavior, and notification state management
