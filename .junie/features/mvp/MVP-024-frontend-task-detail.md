# MVP-024: Frontend — Task Detail & Comments

## Description
Task detail panel/page showing all task information, subtasks, checklists, dependencies, comments, activity log, and file attachments.

## Personas
- **Sarah (PM)**: Reviews full task context in one view
- **Marcus (Backend)**: Reads task description and comments for context
- **Elena (Customer)**: Views task status and adds comments
- **Ava (Visual Designer)**: Dense task detail panel must remain scannable — clear hierarchy, consistent spacing, no visual noise

## Dependencies
- MVP-023 (Kanban/list views trigger task detail)
- MVP-013 (subtasks & checklists API)
- MVP-014 (dependencies API)
- MVP-016 (file uploads API)
- MVP-017 (comments & activity API)

## Scope

### Files to create
```
apps/web/src/
├── api/
│   ├── comments.ts            # useComments, useCreateComment
│   ├── checklists.ts          # useChecklists, useToggleItem
│   ├── dependencies.ts        # useDependencies, useAddDependency
│   └── attachments.ts         # useAttachments, useUploadFile
├── routes/
│   └── tasks/
│       └── [taskId].tsx        # Full task detail page
├── components/
│   ├── data/
│   │   ├── task-detail-panel.tsx    # Slide-over panel (from board/list click)
│   │   ├── task-header.tsx          # Title (editable), status, priority, assignee
│   │   ├── task-sidebar.tsx         # Right sidebar: assignee, due date, labels, watchers
│   │   ├── task-description.tsx     # Rich text editor (editable)
│   │   ├── subtask-list.tsx         # List of subtasks with progress bar
│   │   ├── checklist-section.tsx    # Checklists with checkable items
│   │   ├── dependency-list.tsx      # Blocked by / blocks lists
│   │   ├── comment-thread.tsx       # Comments with threading
│   │   ├── comment-input.tsx        # Rich text comment input with @mention autocomplete
│   │   ├── activity-feed.tsx        # Activity log timeline
│   │   ├── attachment-list.tsx      # File list with upload dropzone
│   │   └── file-dropzone.tsx        # Drag-and-drop file upload area
│   └── forms/
│       ├── create-subtask-dialog.tsx
│       └── add-dependency-dialog.tsx
```

### Task detail layout
```
┌──────────────────────────────────────────────────────┐
│ [← Back] Task Title (editable inline)     [Status ▾] │
├────────────────────────────────────┬─────────────────┤
│                                    │ Assignee: [▾]   │
│ Description (rich text, editable)  │ Priority: [▾]   │
│                                    │ Due date: [📅]  │
│ ── Subtasks (2/5) ──────────────   │ Labels: [+]     │
│ □ Subtask 1                        │ Watchers: [+]   │
│ ☑ Subtask 2                        │                 │
│                                    │ Dependencies:   │
│ ── Checklist: QA Steps (1/3) ──    │ Blocked by: (2) │
│ ☑ Test login flow                  │ Blocks: (1)     │
│ □ Test error handling              │                 │
│ □ Cross-browser check              │ Attachments:    │
│                                    │ 📎 design.pdf   │
│ ── Comments ────────────────────   │ 📎 spec.docx    │
│ Sarah: "Looks good, moving to..."  │ [Drop files]    │
│   └── Marcus: "Thanks!"           │                 │
│                                    │                 │
│ [Add comment...]                   │                 │
│                                    │                 │
│ ── Activity ────────────────────   │                 │
│ Sarah changed status → In Progress │                 │
│ Marcus was assigned                │                 │
└────────────────────────────────────┴─────────────────┘
```

### Inline editing
- Title: click to edit, save on blur/Enter
- Description: Tiptap editor with full toolbar (expandable via "more" button), markdown shortcuts, save on blur
- Status, priority, assignee, due date: dropdown/picker, saves immediately
- All changes optimistic with error toast on failure
- Image paste/drop in description editor: auto-upload to attachment API, insert inline

### Comment input
- Tiptap editor with minimal toolbar (bold, italic, strikethrough, lists, code, link, @mention)
- @mention autocomplete: type `@` → Floating UI dropdown of project members (avatar + name + email, max 8 results, arrow key navigation)
- Markdown shortcuts supported: `**bold**`, `*italic*`, `` `code` ``, `- list`, `> quote`
- File attachment button or paste image (auto-upload inline)
- Submit on Ctrl+Enter

### File upload
- Drag-and-drop zone in sidebar
- Click to browse
- Shows upload progress
- Displays thumbnails for images, icons for documents

### Responsive
- On mobile: single column layout, sidebar becomes expandable section
- Panel opens as full-screen on mobile

### HTML Mockup Reference
Per the [HTML mockup review](../../meetings/2026-03-29-html-mockup-review.md):

**Overlay** (canonical: `task-detail-overlay-desktop-light.html`):
- 640px slide-over panel, right-aligned, with backdrop blur (`bg-on-background/10 backdrop-blur-[2px]`)
- Sticky header with task ID (primary color), inline-editable title (`contenteditable`), status pill with dropdown chevron
- Breadcrumb row below title (project name + created date)
- 60/40 content/sidebar split (grid-cols-10: 6 + 4)
- Description: Tiptap editor with toolbar (bold, italic, lists, code, link) in `surface-container-low/50` panel
- Comments: timeline with vertical line connector, avatar with ring, bubble with `rounded-tl-none` chat tail
- Comment input: avatar + textarea with @mention/emoji buttons + gradient "Post Comment" CTA
- Sidebar: metadata rows (assignee with avatar, priority badge, due date, project, labels with add button), attachment list with file icons, FileDropzone, subtask progress bar with gradient fill
- **No Save/Cancel footer** — all edits are optimistic and save immediately (remove the footer shown in light draft)

**Page** (canonical: `task-detail-page-desktop-light.html`):
- Full page with sidebar navigation, breadcrumb trail (Projects > Infrastructure > TF-1024)
- Large editorial title (4xl extrabold), status + priority badges
- Description: Tiptap editor in `surface-container-lowest` card with toolbar
- Activity: timeline with dot indicators, comments + system events interleaved, vertical `border-l-2` connector
- Comment input: avatar + textarea with @mention/emoji/attach buttons + gradient "Comment" CTA
- Sidebar: metadata card in `surface-container-low`, attachment card with FileDropzone, "Subscribe" + "Archive" quick actions
- Code blocks: syntax highlighted on `inverse-surface` background with `border-l-4 border-primary`
- Map "Reporter" to "Created by" (`createdBy` field). Remove "Points" field (not in data model).

**Mobile** (from `task-detail-overlay-mobile-dark.html`, `task-detail-page-mobile-dark.html`, `task-detail-page-mobile-light.html`):
- Overlay: full-screen with sticky header, metadata accordion (checkbox toggle), horizontal scroll attachment thumbnails, sticky bottom comment input
- Page: back arrow header, 2-column metadata grid (priority + due date), description section, activity feed, sticky bottom comment input above bottom nav bar
- Activity timeline with vertical line and dot indicators

## Acceptance Criteria
- [ ] Task detail opens as slide-over overlay panel (640px) from board/list click
- [ ] Overlay has backdrop blur (`backdrop-blur-[2px]`) behind panel
- [ ] Overlay updates URL with `?task=:taskId` query parameter
- [ ] "Open in full page" button (`Maximize2` icon) in overlay header navigates to dedicated page
- [ ] Overlay header shows task ID, inline-editable title, status pill with dropdown, breadcrumb row
- [ ] Dedicated task detail page at `/projects/:projectId/tasks/:taskId` works via direct URL
- [ ] Page shows breadcrumb trail, editorial title (4xl), status + priority badges
- [ ] Cold navigation to `?task=:taskId` URL redirects to dedicated task page
- [ ] Shared `TaskDetailContent` component renders in both overlay (`panel` variant) and page (`page` variant)
- [ ] Notification links and search results navigate to dedicated task page
- [ ] All task fields are displayed and editable inline (no explicit Save/Cancel — all changes optimistic)
- [ ] Description uses Tiptap editor with toolbar (MVP-042)
- [ ] Subtask list shows with progress bar (gradient fill from primary to secondary)
- [ ] Checklists render with checkable items
- [ ] Checking/unchecking items updates immediately (optimistic)
- [ ] Dependencies are displayed (blocked by / blocks)
- [ ] Comments render with timeline connector (vertical line + dot indicators)
- [ ] Comment bubbles use CommentBubble component (rounded-2xl, rounded-tl-none chat tail)
- [ ] Comment input supports rich text and @mentions (MVP-042)
- [ ] @mention autocomplete shows project members
- [ ] Activity feed shows chronological changes interleaved with comments
- [ ] Sidebar shows metadata with MetadataLabel components (assignee, priority, due date, project, labels, watchers)
- [ ] File attachments can be uploaded via FileDropzone component (drag-and-drop or file picker)
- [ ] Uploaded files display with correct icons/thumbnails and download/delete actions
- [ ] Upload progress indicator shown during file upload
- [ ] All edits are optimistic with error toast on failure
- [ ] Mobile overlay opens full-screen with metadata accordion and sticky bottom comment input
- [ ] Mobile page uses stacked layout with 2-column metadata grid and bottom nav
- [ ] All components use design tokens, no hardcoded hex colors
- [ ] Accessible: keyboard navigable, screen reader friendly
- [ ] Unit tests cover component logic, inline editing behavior, and optimistic update handling
