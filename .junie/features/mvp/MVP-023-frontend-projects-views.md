# MVP-023: Frontend — Projects & Task Views

## Description
Project list page, project detail page with Kanban board and list view, project settings, and org/project switcher.

## Personas
- **Sarah (PM)**: Lives in the Kanban board during sprints
- **Priya (Frontend)**: List view for bulk scanning of tasks
- **Derek (Workfront)**: Expects Kanban + table views at minimum
- **Ava (Visual Designer)**: Card elevation, column spacing, drag handles, empty states — Kanban and list views must feel sleek and uncluttered

## Dependencies
- MVP-022 (app shell, routing, API client)
- MVP-011 (project API)
- MVP-012 (task API)

## Scope

### Files to create
```
apps/web/src/
├── api/
│   ├── projects.ts            # useProjects, useProject, useCreateProject, useUpdateProject
│   └── tasks.ts               # useTasks, useCreateTask, useUpdateTask, useMoveTask
├── routes/
│   ├── projects/
│   │   ├── index.tsx           # Project list page
│   │   ├── [projectId]/
│   │   │   ├── index.tsx       # Project detail (routes to board/list)
│   │   │   ├── board.tsx       # Kanban board view
│   │   │   ├── list.tsx        # List/table view
│   │   │   └── settings.tsx    # Project settings (name, workflow, labels, members)
├── components/
│   ├── kanban/
│   │   ├── kanban-board.tsx    # Board container with columns
│   │   ├── kanban-column.tsx   # Status column with task cards
│   │   └── kanban-card.tsx     # Task card (title, assignee avatar, priority badge, due date)
│   ├── data/
│   │   ├── task-table.tsx      # Sortable, filterable table
│   │   ├── task-row.tsx        # Table row component
│   │   └── task-filters.tsx    # Filter bar (status, priority, assignee, label, date)
│   └── forms/
│       ├── create-project-dialog.tsx
│       └── create-task-dialog.tsx
```

### Project list page
- Grid of project cards showing: name, color, task count, member avatars
- Create project button → dialog with name, description, color picker
- Search/filter projects

### Kanban board
- Columns = workflow statuses (from project's workflow)
- Cards = tasks in that status, sorted by position
- **Drag and drop**: drag card between columns → calls `PATCH /tasks/:id/position` with new statusId + position
- Column header shows count
- Click card → opens task detail (MVP-024)
- "Add task" button at bottom of each column → quick create (title only, inherits column's status)

### Drag and drop
- Use `@dnd-kit/core` + `@dnd-kit/sortable` for accessible drag-and-drop
- Optimistic update: move card immediately, revert on API error
- Animate card movement

### List view
- Table columns: checkbox, title, status, priority, assignee, due date, labels
- Sortable by clicking column headers
- Row click → opens task detail
- Filter bar above table (same filters as Kanban)

### View toggle
- Toggle button in project header: Board | List
- Persisted per project per user (localStorage)

### Project settings page
- Edit name, description, color, icon
- Manage workflow: reorder statuses, add/remove, rename
- Manage labels: add/remove, change color
- Manage members: add/remove, change role

### HTML Mockup Reference
Per the [HTML mockup review](../../meetings/2026-03-29-html-mockup-review.md):

**Kanban Board** (from `kanban-list-desktop-light.html`, `kanban-list-desktop-dark.html`, `kanban-list-mobile-dark.html`):
- Columns use GlassPanel background (`backdrop-filter: blur(12px)` with semi-transparent bg)
- Cards show: priority dot (top-left), title, labels (max 3 + "+N" overflow), assignee avatar (bottom-right), due date with calendar icon
- Drag grip dots visible on card hover
- 2px brand-primary drop indicator line at insertion point
- FAB for quick task creation (positioned above bottom nav on mobile)
- Mobile uses CSS scroll-snap for horizontal column swiping
- "Quick add" input at bottom of each column
- Dark desktop uses editorial header with large project title

**Task List** (from `task-list-desktop-light.html`, `task-list-mobile-light.html`):
- Sortable column headers (title, status, priority, assignee, due date, labels)
- Bulk selection checkboxes with floating bulk action toolbar
- Mobile: responsive column hiding, bulk actions move to bottom (thumb-friendly), drawer sidebar via Sheet component
- **Use cursor-based pagination (load more / infinite scroll), not numbered pages** (API uses cursor-based per api-conventions.md)
- Sidebar charts (velocity, milestone, priority distribution) deferred to Phase 2 — keep filter bar only

## Acceptance Criteria
- [ ] Project list shows all user's projects with search
- [ ] Create project dialog works and redirects to new project
- [ ] Kanban board renders columns from project workflow
- [ ] Kanban columns use GlassPanel background component
- [ ] Kanban column headers show task count (visual WIP indicator)
- [ ] Tasks appear as cards in correct columns
- [ ] Kanban card shows: priority dot, title, labels (max 3 + overflow), assignee avatar, due date with overdue indicator
- [ ] Kanban card shows drag grip dots on hover
- [ ] Drag and drop moves tasks between columns (optimistic + API call)
- [ ] Drag and drop reorders tasks within a column
- [ ] Drop indicator: 2px brand-primary line at drop position
- [ ] Quick task creation input at bottom of each Kanban column
- [ ] FAB for quick task creation (positioned above bottom nav on mobile)
- [ ] List view renders sortable table with all task fields
- [ ] List view uses cursor-based pagination (load more / infinite scroll), not numbered pages
- [ ] Bulk action bar appears above table when rows selected (moves to bottom on mobile)
- [ ] Filter bar works on both views (status, priority, assignee, label, date)
- [ ] View toggle persists between page loads
- [ ] Project settings page allows workflow, label, and member management
- [ ] Loading states with skeleton components
- [ ] Empty states with designed illustrations (project list, board, list, filtered-no-results, empty column)
- [ ] Responsive: board uses horizontal scroll-snap on mobile; list stacks vertically with responsive column hiding
- [ ] Accessible drag-and-drop (keyboard: Space to pick up, arrows to move, Space to drop)
- [ ] All components use design tokens, no hardcoded hex colors
- [ ] Unit tests cover component logic, task filtering, and drag-and-drop state management
