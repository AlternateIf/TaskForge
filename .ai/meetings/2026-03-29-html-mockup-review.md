# HTML Mockup Review Meeting — 2026-03-29

## Attendees
- **Ava** (Visual Designer) — design system fidelity, token consistency, visual polish
- **Lena** (UX Expert) — usability, accessibility, responsive behavior
- **Priya** (Frontend Developer) — component architecture, implementation feasibility
- **Sarah** (PM) — feature completeness, workflow coverage
- **Marcus** (Backend Developer) — data mapping, API alignment
- **Finn** (Onboarding Specialist) — first-run experience, auth flow warmth
- **Derek** (Workfront Power User) — power-user features, keyboard-driven workflow
- **Kai** (Performance Engineer) — bundle impact, animation performance

## Files Reviewed

| File | Page | Viewport | Theme |
|------|------|----------|-------|
| `auth-desktop-dark.html` | Auth (Login) | Desktop | Dark |
| `auth-desktop-light.html` | Auth (Login) | Desktop | Dark (mislabeled) |
| `auth-mobile-dark.html` | Auth (Login) | Mobile | Dark |
| `dashboard-desktop-light.html` | Dashboard | Desktop | Light |
| `dashboard-desktop-dark.html` | Dashboard | Desktop | Dark |
| `dashboard-mobile-dark.html` | Auth page (duplicate content) | Mobile | Dark |
| `task-list-desktop-light.html` | Task List | Desktop | Light |
| `task-list-mobile-light.html` | Task List | Mobile | Light |
| `kanban-list-desktop-light.html` | Kanban Board | Desktop | Light |
| `kanban-list-desktop-dark.html` | Kanban Board | Desktop | Dark |
| `kanban-list-mobile-dark.html` | Kanban Board | Mobile | Dark |
| `task-detail-overlay-desktop-dark.html` | Task Detail Overlay | Desktop | Dark |
| `task-detail-overlay-desktop-light.html` | Task Detail Overlay | Desktop | Light |
| `task-detail-overlay-mobile-dark.html` | Task Detail Overlay | Mobile | Dark |
| `task-detail-page-desktop-dark.html` | Task Detail Page | Desktop | Dark |
| `task-detail-page-desktop-light.html` | Task Detail Page | Desktop | Light |
| `task-detail-page-mobile-dark.html` | Task Detail Page | Mobile | Dark |
| `task-detail-page-mobile-light.html` | Task Detail Page | Mobile | Light |

---

## Discussion

### 1. File-Level Issues

**Ava**: Before we review individual screens, I want to flag three file-level problems.

1. **`auth-desktop-light.html` is actually dark-themed** — it has `class="dark"` on `<html>` and uses the dark color palette. This appears to be a duplicate of the dark version.
2. **`dashboard-mobile-dark.html` contains the auth page**, not the dashboard. It's the same content as `auth-mobile-dark.html`.
3. We're **missing** a light-mode mobile auth page (`auth-mobile-light.html`), a light-mode dashboard mobile (`dashboard-mobile-light.html`), and a light-mode kanban mobile (`kanban-list-mobile-light.html`).

**Priya**: Those are draft-only issues — we'll implement both themes from one component using Tailwind dark mode classes, so we don't need separate HTML files for light and dark. But the mislabeled files mean we don't have a light auth desktop reference to validate against.

**Decision**: The two mislabeled/duplicate files are acknowledged as draft errors. Implementation will use a single component with `dark:` Tailwind variants. Missing light mobile variants will be derived from the desktop light and mobile dark references.

---

### 2. Design Token Inconsistency

**Ava**: Every HTML file has its own Tailwind config with slightly different color values. The **dark mode files** diverge significantly — `auth-desktop-dark.html` defines `background: "#0f172a"` and `primary: "#2563eb"`, while `task-detail-overlay-desktop-dark.html` defines `background: "#f8f9ff"` (a light color!) with `primary: "#004ac6"`. The dark overlay then uses hardcoded classes like `bg-[#0F172A]` and `border-[#334155]` directly in the HTML.

**Priya**: This is because the Tailwind configs in the dark files are defining the _light mode_ token values, and the body class is overriding them with hardcoded hex values. The light-mode files have a consistent token set (`primary: "#004ac6"`, `background: "#f8f9ff"`, etc.) that matches our styleguide. The dark-mode files use a different approach — the auth pages define a dark-native token set (`primary: "#2563eb"`, `background: "#0f172a"`), while the task-detail overlay dark files use the light tokens but hardcode dark colors in classes.

**Ava**: This is exactly what we need to fix. We need ONE canonical token set. Light mode tokens go in the Tailwind config. Dark mode tokens go in CSS custom properties that swap when `dark` class is applied. No hardcoded hex values in component markup. The styleguide already defines this.

**Decision**: Implementation will use a single unified token system from `.ai/styleguide.md`. All color references in components will use semantic token names (`bg-background`, `text-on-surface`, etc.), never hardcoded hex values. Dark mode will use CSS custom properties that swap under the `.dark` class. This is MVP-041's responsibility.

---

### 3. Icon Library

**Lena**: Every draft uses Material Symbols Outlined. The styleguide specifies **Lucide React** as our icon library.

**Priya**: Correct — Lucide React is the default for shadcn/ui, tree-shakeable, and 2px stroke weight. We'll map the Material Symbols used in drafts to their Lucide equivalents during implementation. Most have direct 1:1 mappings.

**Decision**: All Material Symbols Outlined references are treated as placeholder icons. Implementation will use Lucide React exclusively. MVP-041 will document the icon mapping.

---

### 4. Border Radius

**Ava**: The drafts all use `borderRadius: {"DEFAULT": "0.125rem", "lg": "0.25rem", "xl": "0.5rem", "full": "0.75rem"}`. These are tiny — `0.125rem` is 2px! Our styleguide specifies `sm: 4px, md: 6px, lg: 8px, xl: 12px, full: 9999px`. The draft values make everything look too sharp.

**Decision**: Implementation will use styleguide border radius values, not the draft values.

---

### 5. Auth Pages (MVP-022)

**Finn**: The auth desktop layout is great — split layout with brand panel left, form right. The hero text ("The architect of your digital workflow") sets a professional tone. The social proof element ("Over 2,400+ Teams") is a nice touch. The form is clean with clear labels and inline icons.

**Lena**: I like the mobile auth approach with bottom tab navigation (Sign In / Join / Help). That's a good mobile pattern. But the tabs should be more prominent — they're competing with the form for attention.

**Sarah**: The registration page is missing from the drafts. We need to see password strength indicator and requirements checklist per MVP-022 acceptance criteria.

**Ava**: The auth pages correctly use the brand gradient (`linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #7c3aed 100%)`) on the left panel. The glass-panel effect on the mobile version is also correct. A few issues:
- The "Keep me logged in for 30 days" checkbox is fine but should use our component library's checkbox, not a raw input
- The Google icon is an external image — we should use an inline SVG for the social auth icons
- The GitHub button uses `terminal` Material Symbol — should be the GitHub SVG mark

**Derek**: I don't see a way to submit the form via keyboard (Enter key). The "Sign In to TaskForge" button should be a `type="submit"` — it is, good.

**Approved elements**: Split layout, brand gradient panel, hero text, social proof, form structure, "forgot password" placement, social auth buttons pattern, mobile tab navigation.

**Missing from drafts**:
- Registration page (password strength, requirements checklist)
- MFA page (6-digit TOTP)
- Forgot/reset password pages
- Verify email page
- Light mode desktop auth (file is mislabeled)
- Light mode mobile auth

---

### 6. Dashboard (MVP-022 shell + MVP-025)

**Sarah**: The light desktop dashboard is solid — welcome banner, My Tasks grouped by project, Overdue section with red indicators, Upcoming This Week grid, and Project Progress bars. This covers all the MVP-025 acceptance criteria sections.

**Ava**: The dark desktop dashboard takes a different approach — a bento grid layout with a stats card (84% velocity), "Focused Stack" task cards, and glassmorphism deadline cards. I like the bento concept better for data density, but it should coexist with the simpler light-mode layout. Actually, since we need one component that renders both themes, we should pick one layout approach.

**Priya**: I'd say go with the light mode's section-based layout as the canonical structure, since it maps directly to the MVP-025 spec (My Tasks, Overdue, Upcoming, Project Progress). The bento grid is visually interesting but would require a different component architecture.

**Lena**: Agreed. The section-based layout is more predictable for screen readers and keyboard navigation. The bento grid requires complex ARIA landmarks.

**Decision**: Use the light mode's section-based layout as the canonical dashboard structure. Apply dark theme via token swap only (background, text, card colors). The bento grid concepts (velocity stat card, glassmorphism deadline cards) are noted as Phase 2 enhancements.

**Approved elements**: Welcome banner, My Tasks section grouped by project, Overdue section with red left-border indicator, Upcoming This Week 7-day grid, Project Progress gradient bars, sidebar navigation.

**Missing from drafts**:
- Dashboard mobile layout (file contains auth page content)
- Empty state (no tasks assigned)
- First-time welcome banner with dismiss

---

### 7. Task List View (MVP-023)

**Sarah**: The desktop task list is comprehensive — sortable columns, bulk action bar with checkboxes, pagination, and sidebar stats (velocity chart, milestone progress, priority distribution). This exceeds the MVP spec in a good way.

**Marcus**: Pagination uses page numbers, but our API conventions specify cursor-based pagination. The frontend should use infinite scroll or "load more" rather than page numbers.

**Priya**: The mobile task list has a nice pattern — checkbox-toggle drawer sidebar and responsive column hiding. The bulk action bar moves to the bottom on mobile which is thumb-friendly.

**Ava**: The velocity chart and priority distribution in the sidebar are nice touches. But for MVP we should keep the right sidebar simple — just filters. Charts can come in Phase 2.

**Lena**: The table headers should have `aria-sort` attributes to announce sort state to screen readers. The draft doesn't show this but we'll add it in implementation.

**Derek**: The bulk action bar is essential — I need to be able to select multiple tasks and change status/assignee/priority in one operation.

**Decision**: Implement the table layout from the light desktop draft. Use cursor-based pagination (load more / infinite scroll) instead of numbered pages. Sidebar charts (velocity, milestone, priority distribution) deferred to Phase 2. Keep filter bar and bulk actions as shown.

**Approved elements**: Sortable column headers, bulk selection checkboxes, bulk action toolbar, filter bar, column visibility (responsive hiding on mobile), task row layout (priority dot, title, status badge, assignee avatar, due date, labels).

**Missing from drafts**:
- Task list dark mode desktop
- Task list dark mode mobile
- Empty state (no tasks matching filters)
- Sort direction indicators in headers

---

### 8. Kanban Board (MVP-023)

**Sarah**: Both desktop drafts show 4 columns with task cards. The light version has a clean look with glass-panel column backgrounds. The dark version uses an "editorial" header with large project title, which I like.

**Ava**: The dark Kanban draft shows a nice pattern — cards have drag indicators (grip dots) on hover, and one card shows an image preview. I like the card design: priority dot top-left, labels below title, assignee avatar bottom-right, due date with calendar icon. The WIP count in column headers is good.

**Priya**: The drag-and-drop drop indicator (2px brand-primary line at drop position) is shown in the light version. Both drafts use glass-panel backgrounds for columns. The FAB (floating action button) for quick task creation is present in both.

**Lena**: The mobile Kanban uses CSS scroll-snap for horizontal swiping between columns. That's the right approach. The bottom nav bar has proper spacing for the FAB above it. The off-canvas sidebar via checkbox toggle is clever for the draft but we'll use a proper Sheet component.

**Derek**: I don't see a "Add task" input at the bottom of each column in all versions. The light desktop has it, the dark doesn't show it explicitly.

**Decision**: Use glass-panel column backgrounds, card design with priority dot + labels + avatar + due date, grip dots on hover for drag indication, 2px drop indicator line, column header with task count. FAB for quick task creation. Mobile uses horizontal scroll-snap. Add "quick add" input at column bottom across all views.

**Approved elements**: 4-column layout (maps to workflow statuses), glass-panel column backgrounds, card design (priority dot, title, labels max 3, assignee avatar, due date), drag grip dots on hover, 2px drop indicator line, column header with count, FAB for quick add, mobile horizontal scroll-snap, bottom navigation bar on mobile.

**Missing from drafts**:
- Kanban light mode mobile
- Empty column state ("No tasks in this column")
- Column overflow scrolling indicator
- Accessible drag-and-drop keyboard instructions

---

### 9. Task Detail Overlay (MVP-024)

**Ava**: We have three overlay variants — desktop dark, desktop light, and mobile dark. The **desktop dark** uses a 60/40 split (content left, metadata right) within a 640px slide-over panel. The **desktop light** uses a 60/40 grid (6/10 and 4/10 columns) with nicer visual treatment — comment timeline with a vertical line connector, subtask progress bar in the sidebar, and a sticky footer with Save/Cancel buttons.

**Lena**: The light version has a better UX — the breadcrumb row below the title (project name + created date), the status pill with dropdown chevron, and the comment timeline with dot indicators. The dark version is simpler but lacks some of these refinements.

**Priya**: Both follow our hybrid decision: slide-over overlay from board/list click. But neither shows the "Open in full page" button (`Maximize2` icon) from MVP-024 acceptance criteria. We need to add that.

**Marcus**: The dark overlay has `contenteditable="true"` on the title, which matches inline editing spec. The comment input has @mention and file attachment buttons. But I don't see subtasks or checklists in the dark overlay — only in the light version's sidebar (subtask progress bar). The MVP-024 spec requires both.

**Sarah**: The light overlay has a sticky footer with "Cancel" and "Save Changes" buttons. But the spec says all edits are optimistic and save immediately. There shouldn't be explicit Save/Cancel — changes apply on blur/selection.

**Ava**: The mobile overlay correctly goes full-screen with a sticky bottom comment input. The metadata section collapses into an accordion (checkbox toggle pattern). Attachments are shown as horizontal scroll thumbnails. Good mobile adaptations.

**Decision**: Use the light desktop overlay as the canonical layout (better hierarchy, timeline, progress bar). Remove the explicit Save/Cancel footer — all changes are optimistic. Add the "Open in full page" (`Maximize2`) button in the header. Ensure subtasks, checklists, and dependencies sections are present. Mobile uses full-screen with metadata accordion.

**Approved elements**: 640px slide-over panel, backdrop blur overlay, 60/40 content/sidebar split, inline editable title, Tiptap description editor with toolbar, comment timeline with vertical connector, comment input with @mention + attach + emoji buttons, metadata sidebar (assignee, priority, due date, project, labels with add button), attachment list with file icons, drag-and-drop upload zone, subtask progress bar, mobile metadata accordion, mobile sticky bottom comment input.

**Missing from drafts**:
- "Open in full page" (Maximize2) button in header
- Subtask list with checkboxes
- Checklist section
- Dependency list (blocked by / blocks)
- Activity feed (separate from comments)
- Threaded comment replies (comments shown flat, not threaded)
- Mobile light overlay
- Upload progress indicator

---

### 10. Task Detail Page (MVP-024)

**Ava**: The full page variants have more room to work with. The **dark desktop** has a dedicated sidebar with nav, breadcrumbs, a 4xl extrabold title, activity feed with comments interleaved with system events, and a "Linked Sub-tasks" section with a nice stacked card design. The **light desktop** is similar but adds more whitespace and cleaner separation.

**Priya**: The dark desktop page uses hardcoded Tailwind colors (`bg-slate-800/40`, `border-slate-700`, etc.) extensively. Almost no design tokens used. This is the most token-inconsistent file of all 18.

**Lena**: The mobile page variants are well-structured — back arrow, metadata grid (2 columns for priority + due date), collapsible description, activity feed with sticky bottom comment input, and bottom navigation bar. The light mobile version has an elegant timeline with dot indicators.

**Sarah**: I notice the dark desktop page shows "Points" (value: 8) in the metadata. That's not in our data model. We should remove it or add it to the data model as story points.

**Marcus**: The "Reporter" field is also shown in the dark page version but not in our task entity. We have `createdBy` which serves the same purpose. Implementation should map `createdBy` to a "Created by" label.

**Derek**: The dark page shows "View History" as a button, which presumably opens the activity feed. That should be a section on the page, not a separate action.

**Ava**: The dark page has a code block in the description with syntax highlighting (amber for keys, emerald for values). That's a nice detail we should keep for the Tiptap code block extension.

**Decision**: Use the light desktop page as the canonical layout. Keep the activity feed as a section, not behind a button. Map "Reporter" to "Created by". Remove "Points" unless we add story points to the data model (defer). Keep code block syntax highlighting in Tiptap. Mobile versions use stacked layout with metadata grid, bottom nav, and sticky comment input.

**Approved elements**: Full page with sidebar navigation, breadcrumb trail, large editorial title, status + priority badges, Tiptap description with code block syntax highlighting, activity feed timeline with system events interleaved, comment input with @mention + emoji + attach, metadata sidebar (assignee, due date, project, labels with add), attachment list with icons and upload dropzone, mobile 2-column metadata grid, mobile bottom nav, mobile sticky comment input.

**Missing from drafts**:
- Subtask list with progress
- Checklist section
- Dependency list (blocked by / blocks)
- Watchers section
- Threaded comment replies
- File download/delete actions (only shown in overlay, not page)
- "Created by" / reporter information in light version

---

### 11. Cross-Cutting Observations

**Ava**: Several patterns are consistent across drafts and should become reusable components:
1. **Glass panel**: `backdrop-filter: blur(12px)` with semi-transparent background — used in column headers, mobile drawers, sticky headers
2. **Brand gradient button**: `bg-gradient-to-br from-primary to-primary-container` — used for primary CTAs everywhere
3. **Comment bubble**: rounded-2xl with `rounded-tl-none` for the "chat tail" effect — used in all comment sections
4. **Label micro-text**: `text-[10px] font-bold uppercase tracking-widest` — used for all metadata labels
5. **Upload dropzone**: dashed border with cloud upload icon, hover state with primary border — used in overlay and page sidebar
6. **Priority indicator**: colored dot or filled icon with text — consistent pattern across cards and metadata

**Priya**: These map directly to our component library in MVP-041. I'll create:
- `GlassPanel` wrapper component
- Button variants (primary gradient, ghost, destructive) in shadcn/ui
- `CommentBubble` component
- `MetadataLabel` component
- `FileDropzone` component
- `PriorityBadge` component

**Kai**: On performance — the drafts load two copies of Material Symbols Outlined (duplicate link tags in every file). Obviously a draft issue. With Lucide React we get tree-shaking. The glassmorphism `backdrop-filter: blur()` can be expensive on mobile — we should test and potentially disable on low-power devices or behind `prefers-reduced-motion`.

**Lena**: Accessibility gaps across all drafts:
- No `aria-label` on icon-only buttons
- No skip-to-content link
- No `aria-live` regions for real-time updates
- Comment inputs use `<textarea>` without `<label>` associations
- Kanban columns lack ARIA landmarks for drag-and-drop
- Mobile bottom nav lacks `aria-current` for active state

These are expected for HTML drafts and will be addressed in implementation.

---

## Summary of Decisions

| # | Decision | Affects |
|---|----------|---------|
| 1 | Single unified token system from styleguide.md, no hardcoded hex in components | MVP-041 |
| 2 | Lucide React for all icons, Material Symbols are placeholders | MVP-041 |
| 3 | Styleguide border radius values, not draft values | MVP-041 |
| 4 | Auth split layout approved; registration/MFA/forgot pages to be built from spec | MVP-022/042 |
| 5 | Section-based dashboard layout (light mode canonical); bento grid deferred to Phase 2 | MVP-025 |
| 6 | Cursor-based pagination, not numbered pages | MVP-023 |
| 7 | Sidebar charts (velocity, milestone) deferred to Phase 2 | MVP-023 |
| 8 | Glass-panel Kanban columns, card design with priority/labels/avatar/date approved | MVP-023 |
| 9 | Light overlay as canonical layout; remove Save/Cancel footer; add Maximize2 button | MVP-024 |
| 10 | All inline editing is optimistic, no explicit save | MVP-024 |
| 11 | Light page as canonical; activity feed is a section, not behind a button | MVP-024 |
| 12 | Remove "Points" field; map "Reporter" to "Created by" | MVP-024 |
| 13 | Six reusable component patterns identified (glass panel, gradient button, comment bubble, metadata label, dropzone, priority badge) | MVP-041 |
| 14 | Glassmorphism `backdrop-filter` performance test needed for mobile | MVP-041 |
| 15 | Mislabeled files (`auth-desktop-light`, `dashboard-mobile-dark`) are noted; not blockers | N/A |

---

## Files Missing / Needed for Full Coverage

| Missing File | Priority | Workaround |
|---|---|---|
| `auth-desktop-light.html` (actual light content) | Low | Derive from dark version + light tokens |
| `auth-mobile-light.html` | Low | Derive from dark mobile + light tokens |
| `dashboard-mobile-dark.html` (actual dashboard) | Medium | Derive from desktop dark + mobile patterns |
| `dashboard-mobile-light.html` | Low | Derive from desktop light + mobile patterns |
| `task-list-desktop-dark.html` | Low | Derive from light + dark tokens |
| `task-list-mobile-dark.html` | Low | Derive from light mobile + dark tokens |
| `kanban-list-mobile-light.html` | Low | Derive from dark mobile + light tokens |
| `task-detail-overlay-mobile-light.html` | Low | Derive from dark mobile + light tokens |
| Registration page (any variant) | Medium | Build from MVP-022 spec |
| MFA page (any variant) | Medium | Build from MVP-022 spec |

All missing variants are **low priority** because implementation uses single components with dark mode class toggling. The key layouts and patterns are all covered by existing drafts.
