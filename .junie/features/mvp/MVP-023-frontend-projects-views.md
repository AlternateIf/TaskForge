# MVP-023: Frontend — Projects & Task Views

## Description
Project list page, project detail page with Kanban board and list view, project settings, and org/project switcher.

## Personas
- **Sarah (PM)**: Lives in the Kanban board during sprints
- **Priya (Frontend)**: List view for bulk scanning of tasks
- **Derek (Workfront)**: Expects Kanban + table views at minimum

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

## Acceptance Criteria
- [ ] Project list shows all user's projects with search
- [ ] Create project dialog works and redirects to new project
- [ ] Kanban board renders columns from project workflow
- [ ] Tasks appear as cards in correct columns
- [ ] Drag and drop moves tasks between columns (optimistic + API call)
- [ ] Drag and drop reorders tasks within a column
- [ ] List view renders sortable table with all task fields
- [ ] Filter bar works on both views (status, priority, assignee, label, date)
- [ ] View toggle persists between page loads
- [ ] Quick task creation from column footer
- [ ] Project settings page allows workflow, label, and member management
- [ ] Loading states with skeleton components
- [ ] Empty states with helpful messages
- [ ] Responsive: board scrolls horizontally on mobile; list stacks vertically
- [ ] Accessible drag-and-drop (keyboard support)
- [ ] Unit tests cover component logic, task filtering, and drag-and-drop state management
