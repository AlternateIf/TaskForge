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

## Acceptance Criteria
- [ ] Task detail opens as slide-over panel from board/list
- [ ] Direct URL to task detail page works
- [ ] All task fields are displayed and editable inline
- [ ] Subtask list shows with progress indicator
- [ ] Checklists render with checkable items
- [ ] Checking/unchecking items updates immediately (optimistic)
- [ ] Dependencies are displayed (blocked by / blocks)
- [ ] Comments render in threaded view
- [ ] Comment input supports rich text and @mentions
- [ ] @mention autocomplete shows project members
- [ ] Activity feed shows chronological changes
- [ ] File attachments can be uploaded via drag-and-drop or file picker
- [ ] Uploaded files display with correct icons/thumbnails
- [ ] Files can be downloaded and deleted
- [ ] All edits are optimistic with error handling
- [ ] Responsive layout works on mobile
- [ ] Accessible: keyboard navigable, screen reader friendly
- [ ] Unit tests cover component logic, inline editing behavior, and optimistic update handling
