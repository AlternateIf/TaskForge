# Task Detail: Dedicated Page vs. Overlay Panel

**Date:** 2026-03-29
**Type:** Design decision
**Moderator:** Lena (UX)

**Attendees:** Lena (UX), Ava (Visual Designer), Priya (Frontend), Sarah (PM), Marcus (Backend), Elena (Customer), Derek (Workfront Migrator), Kai (Performance)

---

## Context

MVP-024 currently specifies both a slide-over panel (`task-detail-panel.tsx`) and a full task detail page (`routes/tasks/[taskId].tsx`). The question: do we need both? Is the overlay sufficient? Should we only have a page? Or is the hybrid approach correct?

---

## Discussion

**Lena (UX):** Let me frame this. There are three options on the table:

1. **Overlay only** — task detail is always a slide-over panel, no dedicated route
2. **Page only** — task detail is always a full page with its own URL
3. **Hybrid** — overlay for quick access from board/list, dedicated page for deep work and direct links

Let's hear from everyone. Sarah, you're in tasks all day — what's your workflow?

**Sarah (PM):** I need the overlay. When I'm on the Kanban board doing my morning standup prep, I click through 8-10 tasks quickly — check status, read the latest comment, maybe reassign. If every click navigated me to a whole new page and I had to hit Back to get to the board again, I'd lose my place. The overlay lets me stay in context.

**Sarah:** But — and this is important — sometimes I need to spend 15 minutes on a single task. Writing a detailed description, reviewing all the subtasks, reading through a long comment thread, uploading files. For that, the overlay feels cramped. 640px is not a lot of horizontal space when you have a two-column layout with description, subtasks, checklists, comments, AND a metadata sidebar.

**Ava (Visual Designer):** Sarah just described the exact UX split. The overlay is a *preview* and *quick-edit* surface. The page is the *workspace*. They serve different cognitive modes:

- **Scanning mode** (overlay): "Let me glance at this task, make a small change, move on." Context preservation is critical — the board/list stays visible behind the dimmed backdrop.
- **Working mode** (page): "I'm going to be here a while. Give me all the space." Full viewport, no cramped sidebar, room to breathe.

**Ava:** Visually, the overlay at 640px works for the 80% case — viewing fields, toggling a checkbox, adding a quick comment. But once you're writing a multi-paragraph description in Tiptap, or reviewing a 30-item checklist, or scrolling through 50 comments — you want the full page. The editorial spacing from the styleguide demands room.

**Marcus (Backend):** From an engineer's perspective, I need direct links to tasks. When someone drops a task URL in Slack or a PR description, I click it and expect to land on a page that shows me everything. An overlay anchored to nothing (because I wasn't on a board) would be weird. The page gives tasks a real identity — a URL, a browser tab title, bookmarkability.

**Marcus:** Also, when I'm deep in a task writing up API specs in the description and reviewing OpenAPI snippets in the comments, I want the full screen. The overlay would make me feel like I'm working in a sidebar.

**Priya (Frontend):** From an implementation standpoint, the hybrid is cleaner than it sounds. The task detail *content* — header, description, subtasks, comments, sidebar — is the same set of components regardless of whether they render inside a `<Sheet>` (overlay) or a `<main>` (page). The layout wrapper changes, not the guts.

```
TaskDetailContent (shared)
├── Rendered inside <Sheet> → overlay mode
└── Rendered inside <PageLayout> → page mode
```

One component tree, two containers. The routing is straightforward too: `/projects/:projectId/tasks/:taskId` is the page route. The overlay is triggered by clicking a task on the board/list and uses a search param or state to open the sheet without a navigation. Both can coexist.

**Priya:** The only complexity is the transition: if someone is in the overlay and wants to "expand" to the full page, we need a smooth handoff — ideally an "Open in full page" button in the overlay header that navigates to the page route. And vice versa — if you land on the page via a direct link and then navigate to the board, clicking a task should open the overlay, not navigate away.

**Elena (Customer):** I don't use the Kanban board much. I usually go to my project, see a list of tasks, and click one. I need to see the full details — what's the status, what did the team say in comments, can I add a file. A page feels more natural to me. I don't want to feel like I'm peeking through a slit. But I also don't want clicking a task to feel "heavy" — like loading a whole new page with a flash of white.

**Lena:** That's a good point about perceived performance. Priya, can we make the page transition feel as light as the overlay?

**Priya:** Yes. With TanStack Router's prefetching and React transitions, navigating to the task page can be nearly instant. The data is probably already in the TanStack Query cache from the list/board fetch. We show a skeleton for at most 100-200ms. It won't feel like a full page reload.

**Derek (Workfront):** In Workfront, tasks have their own page — always. It's a full URL, it's the primary way you interact with a task. The overlay/preview pattern is something Workfront added later as a "quick peek" on hover, and honestly it was one of their better UX additions. Being able to hover over a task in a list and see a summary without leaving the page was a productivity win.

**Derek:** But every serious interaction — writing updates, managing subtasks, running approvals — happened on the full task page. If TaskForge only had an overlay, my teams would feel like the tool is a toy. Enterprise users expect tasks to be first-class entities with their own URL and full-screen presence.

**Derek:** So: hybrid. Quick peek via overlay for the board/list workflow, full page for the URL/deep-work workflow.

**Kai (Performance):** The hybrid has a performance benefit too. The overlay doesn't trigger a route navigation, so there's no route-level code splitting overhead, no URL change causing a full re-render of the layout. It's just mounting a panel with data that's already cached. That makes the scanning workflow (Sarah's 8-10 tasks) extremely fast. The page route loads the same components but through a proper route, which is fine for the deep-work case where the user expects a brief load.

**Kai:** What I'd warn against: don't fetch different data for the overlay vs. the page. Same API call, same cache key, same components. If the overlay fetches a "summary" and the page fetches "full detail," you've doubled your API surface and created a cache sync problem.

**Lena:** Agreed. Same data, same components, different layout container. Let me summarize the emerging consensus.

**Ava:** One more thing — the overlay should have a clear "expand" affordance. I'd put a small `Maximize2` icon (Lucide) in the top-right of the overlay header, next to the close X. Clicking it navigates to the full page. And on the full page, there's no "minimize" — you just navigate back to the board/list via breadcrumbs or the sidebar.

**Lena:** Good. And the overlay should update the URL with a query parameter (like `?task=abc123`) so that if someone copies the URL while the overlay is open, the recipient lands on the full task page — not a board with nothing open.

**Priya:** That's easy to implement. The overlay opens with `?task=:taskId` appended. If someone navigates to that URL cold (no board loaded), we redirect to the full page route instead.

**Elena:** I like that. If someone shares a link with me, I get the full page. If I'm browsing the list and click, I get the quick overlay. Best of both.

---

## Decision

**Hybrid approach: overlay panel + dedicated page.** Unanimous.

### Overlay Panel (Quick Access)
- Triggered by clicking a task from Kanban board or list view
- 640px slide-over from right, dimmed backdrop
- Shows all task detail content (same components as page)
- URL updates to `?task=:taskId` (shareable, but resolves to full page for cold navigation)
- "Open in full page" button (`Maximize2` icon) in overlay header
- Close with X, Escape, or clicking backdrop
- Stays mounted while user interacts — board/list visible behind backdrop

### Dedicated Page (Deep Work)
- Route: `/projects/:projectId/tasks/:taskId`
- Full viewport, proper page layout with breadcrumbs
- Same task detail components, more spacious layout (no 640px constraint)
- Used for: direct links (Slack, PRs, bookmarks, email notifications), deep editing, long comment threads
- Browser tab title: "Task Title | Project Name | TaskForge"

### Shared Implementation
- Single `TaskDetailContent` component tree used by both overlay and page
- Same API calls, same TanStack Query cache keys
- No "summary" vs. "full" data split — always fetch complete task data
- Components adapt layout via a `variant` prop (`panel` | `page`) for spacing/width differences

### Navigation Rules
| From | Action | Result |
|---|---|---|
| Kanban board | Click task card | Opens overlay |
| List view | Click task row | Opens overlay |
| Overlay | Click "Open in full page" | Navigates to task page |
| Direct URL (`/projects/.../tasks/...`) | Load | Opens task page |
| URL with `?task=...` (cold load) | Load | Redirects to task page |
| Task page | Click browser Back / breadcrumb | Returns to board/list |
| Notification link | Click | Opens task page |
| Search result | Click | Opens task page |

---

## Action Items

| Owner | Action |
|---|---|
| Priya | Implement shared `TaskDetailContent` with `variant` prop |
| Priya | Add `?task=:taskId` URL sync for overlay, with cold-load redirect to page |
| Ava | Add `Maximize2` expand button to overlay header design |
| Lena | Update MVP-024 acceptance criteria to reflect hybrid decision |
