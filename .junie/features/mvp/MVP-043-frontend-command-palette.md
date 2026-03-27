# MVP-043: Command Palette (Cmd+K)

## Description
A power-user command palette triggered by Cmd+K (Mac) / Ctrl+K (Windows/Linux) for quick navigation, task search, and action execution. Separate from the keyboard shortcuts overlay (`?`) — this is a search-driven action launcher similar to VS Code's command palette or Linear's Cmd+K.

## Personas
- **Derek (Workfront)**: Keyboard-driven workflow, needs fast navigation without mouse
- **Marcus (Backend)**: Expects VS Code-like command palette experience
- **Priya (Frontend)**: Uses shadcn/ui Command component (built on cmdk)
- **Ava (Visual Designer)**: Minimal, elegant overlay — clean search input, grouped results
- **Sarah (PM)**: Quick access to create task, switch project, search across everything

## Dependencies
- MVP-041 (design system)
- MVP-022 (app shell, routing)
- MVP-019 (search API)

## Scope

### Trigger
- `Cmd+K` (Mac) / `Ctrl+K` (Windows/Linux) from anywhere in the app
- Also accessible via search icon click in header

### Result Groups
1. **Recent** (shown by default when no query): last 5 visited pages
2. **Actions** (always shown): "Create task", "Create project", "Go to dashboard", "Go to settings"
3. **Tasks** (on query): search results from Meilisearch API
4. **Projects** (on query): matching projects
5. **People** (on query): matching team members

### Behavior
- Results appear as-you-type (debounced 200ms)
- Arrow keys navigate, Enter selects, Escape closes
- Each result: icon + title + subtitle (project name, email) + optional keyboard hint
- Action results execute immediately (navigate, open dialog)
- Entity results navigate to the entity page

### Design
- Centered overlay, 560px wide, max-height 400px
- Shadow level 4, backdrop dimmed
- Search input at top with magnifying glass icon
- Results grouped with section headers
- Selected item has `--brand-primary` bg at 10% opacity
- Smooth fade-in on open (200ms)
- Uses shadcn/ui Command component (cmdk-based)

## Acceptance Criteria
- [ ] Cmd+K / Ctrl+K opens command palette from anywhere
- [ ] Default view shows recent pages and quick actions
- [ ] Typing queries searches tasks, projects, and people
- [ ] Results are grouped by type with section headers
- [ ] Arrow key navigation works within and across groups
- [ ] Enter navigates to selected result or executes action
- [ ] Escape closes palette
- [ ] Palette is accessible (ARIA roles, screen reader announcements)
- [ ] Search is debounced (200ms) to avoid excessive API calls
- [ ] Unit tests cover keyboard navigation, search debounce, and action execution
