# Pre-Implementation Meeting: MVP-024 Frontend Task Detail & Comments — 2026-04-01

## Attendees
- **Sarah (Project Manager)** — complete task context in one place, fast status edits
- **Marcus (Backend Developer)** — API contract alignment and data mapping constraints
- **Elena (Customer)** — clear status visibility, low-friction comments/attachments
- **Ava (Visual Designer)** — hierarchy, density, and token/design fidelity
- **Priya (Frontend Developer)** — implementation plan and architecture

---

## 1. Overlay vs Dedicated Page Behavior

**Sarah:** I want board/list click to open a slide-over so I keep context, but deep links should still work as full pages.

**Priya:** We’ll support both: overlay for in-context editing and a dedicated route for direct navigation and cross-feature links.

**Ava:** Overlay must match the reviewed mock: right-aligned 640px panel on desktop, backdrop blur, no heavy framing, sticky header.

**Decision:**
- Board/list click opens overlay panel and updates URL query to `?task=:taskId`.
- Overlay header includes **Open in full page** action (Maximize icon) to `/projects/:projectId/tasks/:taskId`.
- Dedicated page exists for direct URL and for links from search/notifications.
- On **cold navigation** to board/list URL with `?task=:taskId`, redirect to dedicated page.

---

## 2. Shared Architecture

**Priya:** To avoid divergence, overlay and page should share a single core content component with layout variants.

**Ava:** Agree. Typography and section rhythm must remain consistent while only shell chrome differs.

**Decision:**
- Implement a shared `TaskDetailContent` with `panel` and `page` variants.
- Overlay shell and page shell own only navigation/header/container responsibilities.
- Sections (description, subtasks, checklist, dependencies, comments, activity, sidebar metadata, attachments) render from shared content.

---

## 3. Inline Editing + Optimistic Updates

**Sarah:** No save button. Every change should apply immediately.

**Priya:** We’ll do optimistic UI for all inline field edits and rollback on error with toast.

**Marcus:** Existing API supports task patching, checklist item toggle, comment create, dependency create/list, subtask list/create, and attachments. Use those directly.

**Decision:**
- Inline edits: title, description, status, priority, assignee, due date, labels.
- Optimistic updates required for task field edits and checklist item toggles.
- Errors surface via toast and revert local optimistic state.
- No explicit save/cancel footer.

---

## 4. Comments and Activity Timeline

**Elena:** Commenting should feel simple but rich enough for mentions and formatting.

**Priya:** We’ll use existing Tiptap editor in comment mode and mention suggestion dropdown with member data.

**Ava:** Keep timeline visual language from mock: vertical connector + dot indicators + comment bubbles with chat tail.

**Decision:**
- Comments use rich text editor with markdown shortcuts and `Ctrl+Enter` submit.
- Mention autocomplete uses project/org members with avatar, name, email (max 8, keyboard nav).
- Timeline interleaves comment entries and activity entries in chronological order.
- Comment bubbles use `CommentBubble` style (`rounded-2xl`, `rounded-tl-none`).

---

## 5. Subtasks, Checklists, Dependencies

**Marcus:** API returns subtasks separately and checklist trees separately; dependencies are split into `blockedBy` and `blocking`.

**Sarah:** Display all three in the same view and make checklist toggles instant.

**Decision:**
- Subtasks shown as list with progress bar (gradient primary→accent).
- Checklists rendered with checkable items and optimistic toggle behavior.
- Dependencies shown in two groups: **Blocked by** and **Blocks**.
- Add-dialog hooks are scaffolded for dependency/subtask creation flow.

---

## 6. Sidebar Metadata + Watchers

**Marcus:** API doesn’t currently return a full watcher list endpoint. It supports watch/unwatch for current user.

**Sarah:** For MVP, a watch toggle plus visible metadata is enough.

**Decision:**
- Sidebar shows assignee, priority, due date, project, labels, and **Watch/Unwatch** state for current user.
- “Created by” maps from task reporter (`reporterId`) with best-effort display mapping from loaded members.
- No story points field (explicitly excluded).

---

## 7. Attachments + Upload UX

**Elena:** I need drag/drop and click-to-upload, plus clear status while uploading.

**Priya:** We’ll use `FileDropzone`, show per-file progress, and render thumbnails/icons based on MIME type.

**Decision:**
- Attachments sidebar includes drag/drop and file picker upload.
- Show upload progress and final item actions (download/delete).
- Image files display thumbnail previews; non-images show type icons.

---

## 8. Mobile Behavior

**Ava:** Overlay is full-screen on mobile with sticky top and sticky bottom comment input. Metadata collapses into an accordion section.

**Elena:** Keep the page usable one-handed; key metadata should be easy to scan.

**Decision:**
- Mobile overlay: full-screen panel, sticky header, metadata accordion, sticky bottom comment input.
- Mobile page: stacked layout, metadata in 2-column grid, activity timeline, bottom nav style preserved.

---

## 9. Search + Notifications Task Linking

**Sarah:** Any task result from global search or notifications should open the dedicated task page, not overlay.

**Priya:** We’ll map task hits to `/projects/:projectId/tasks/:taskId` and use entity metadata from notifications.

**Decision:**
- Command palette search task results navigate to dedicated task page route.
- Notification-origin task links navigate to dedicated task page route.
- Overlay remains only board/list contextual affordance.

---

## Final Implementation Decisions Summary

1. Dual entry model: overlay for board/list, dedicated page for deep links.
2. Shared `TaskDetailContent` for both shells.
3. Fully optimistic inline editing, no save footer.
4. Timeline comments/activity with rich text + mentions.
5. Subtasks/checklists/dependencies surfaced together.
6. Sidebar metadata includes watch toggle and created-by mapping; no points.
7. Attachment uploads include progress and typed preview icons.
8. Mobile overlay/page behaviors follow reviewed mock patterns.
9. Search/notification task links resolve to dedicated page route.
