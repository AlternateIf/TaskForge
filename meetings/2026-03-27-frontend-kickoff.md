# Frontend Implementation Kickoff Meeting

**Date:** 2026-03-27
**Type:** Pre-implementation planning
**Led by:** Lena (UX), Ava (Visual Designer), Priya (Frontend), Hiro (SEO), Finn (Onboarding), Elena (Customer)

**All attendees:** Lena (UX), Ava (Visual Designer), Priya (Frontend), Hiro (SEO), Finn (Onboarding), Elena (Customer), Sarah (PM), Marcus (Backend), Derek (Workfront Migrator), Kai (Performance), Omar (Integration Developer), Nadia (Security), Claire (Executive), Yuki (Freelancer), Raj (Team Lead), Quinn (QA)

---

## 1. Design System & Visual Foundation

### 1.1 Color Palette

**Ava (Visual Designer):** We need a complete design token system before writing a single component. I'm proposing:

| Token | Light Mode | Dark Mode | Usage |
|---|---|---|---|
| `--brand-primary` | `#2563EB` (blue-600) | `#3B82F6` (blue-500) | Primary actions, active states, links |
| `--brand-primary-hover` | `#1D4ED8` (blue-700) | `#60A5FA` (blue-400) | Hover on primary elements |
| `--accent` | `#8B5CF6` (violet-500) | `#A78BFA` (violet-400) | Highlights, badges, focus rings |
| `--success` | `#16A34A` (green-600) | `#22C55E` (green-500) | Completed, success states |
| `--warning` | `#D97706` (amber-600) | `#F59E0B` (amber-500) | Due soon, caution states |
| `--danger` | `#DC2626` (red-600) | `#EF4444` (red-500) | Overdue, errors, destructive actions |
| `--neutral-bg` | `#FFFFFF` | `#0F172A` (slate-900) | Page background |
| `--neutral-surface` | `#F8FAFC` (slate-50) | `#1E293B` (slate-800) | Cards, panels, sidebar |
| `--neutral-border` | `#E2E8F0` (slate-200) | `#334155` (slate-700) | Dividers, card borders |
| `--text-primary` | `#0F172A` (slate-900) | `#F1F5F9` (slate-100) | Body text |
| `--text-secondary` | `#64748B` (slate-500) | `#94A3B8` (slate-400) | Secondary text, timestamps |
| `--text-muted` | `#94A3B8` (slate-400) | `#64748B` (slate-500) | Placeholders, disabled |

**Priority colors (consistent across views):**
| Priority | Color | Badge BG (light) | Badge BG (dark) |
|---|---|---|---|
| Critical | red-600 | red-50 | red-950 |
| High | orange-500 | orange-50 | orange-950 |
| Medium | amber-500 | amber-50 | amber-950 |
| Low | blue-400 | blue-50 | blue-950 |
| None | slate-400 | slate-100 | slate-800 |

**Lena (UX):** All colors must meet WCAG 2.1 AA contrast ratios (4.5:1 for normal text, 3:1 for large text). No conveying information through color alone — always pair with icons or text labels.

**Hiro (SEO):** For any public-facing pages (shared project links, login, register), we need to ensure brand colors are consistent with Open Graph preview cards. The primary blue should be the og:theme-color.

### 1.2 Typography

**Ava:** Single font family for simplicity and performance. Inter is the recommendation — it's designed for screens, has excellent readability at small sizes, and supports all weights we need.

| Element | Size | Weight | Line Height | Tracking |
|---|---|---|---|---|
| Page title (h1) | 24px / 1.5rem | 700 (bold) | 1.3 | -0.02em |
| Section heading (h2) | 20px / 1.25rem | 600 (semibold) | 1.35 | -0.01em |
| Card title (h3) | 16px / 1rem | 600 (semibold) | 1.4 | 0 |
| Body text | 14px / 0.875rem | 400 (regular) | 1.5 | 0 |
| Small / meta text | 12px / 0.75rem | 400 (regular) | 1.5 | 0.01em |
| Code / monospace | 13px / 0.8125rem | 400 | 1.6 | 0 |
| Button text | 14px / 0.875rem | 500 (medium) | 1 | 0.01em |

**Kai (Performance):** Inter variable font only — single file, ~100KB. Load via `font-display: swap` to avoid FOIT. Subset to latin + latin-ext if possible.

**Priya (Frontend):** We'll define these as Tailwind CSS theme extensions so they're available as utility classes (`text-heading-1`, `text-body`, etc.) and consumed by shadcn/ui components automatically.

### 1.3 Spacing & Layout Grid

**Ava:** 4px base grid. All spacing is multiples of 4:

| Token | Value | Usage |
|---|---|---|
| `xs` | 4px | Inline icon gaps, tight padding |
| `sm` | 8px | Input padding, badge padding |
| `md` | 12px | Card inner padding, form gaps |
| `lg` | 16px | Section padding, card gaps |
| `xl` | 24px | Page padding, major sections |
| `2xl` | 32px | Page section separators |
| `3xl` | 48px | Page top/bottom margin |

**App shell dimensions:**
- Sidebar width: 240px expanded, 64px collapsed (icon-only)
- Header height: 56px
- Main content max-width: 1280px, centered with `xl` padding
- Mobile breakpoint: sidebar becomes off-canvas drawer at < 768px

### 1.4 Elevation & Shadows

| Level | Shadow | Usage |
|---|---|---|
| 0 | none | Flat surfaces, table rows |
| 1 | `0 1px 3px rgba(0,0,0,0.08)` | Cards, sidebar |
| 2 | `0 4px 12px rgba(0,0,0,0.1)` | Dropdowns, popovers, floating panels |
| 3 | `0 8px 24px rgba(0,0,0,0.12)` | Modals, slide-over panels |
| 4 | `0 16px 48px rgba(0,0,0,0.16)` | Command palette, full overlays |

Dark mode shadows use `rgba(0,0,0,0.3)` base (stronger to maintain depth perception on dark backgrounds).

### 1.5 Border Radius

| Token | Value | Usage |
|---|---|---|
| `sm` | 4px | Badges, small chips |
| `md` | 6px | Buttons, inputs |
| `lg` | 8px | Cards, panels |
| `xl` | 12px | Modals, large cards |
| `full` | 9999px | Avatars, circular elements |

---

## 2. Component Standards

### 2.1 shadcn/ui Configuration

**Priya (Frontend):** We'll use shadcn/ui as our component foundation. All components get our theme tokens applied via Tailwind config. Key components to install at MVP:

**Core:** Button, Input, Label, Textarea, Select, Checkbox, Radio, Switch, Slider
**Layout:** Card, Separator, Sheet (mobile sidebar), Tabs, Accordion
**Overlay:** Dialog, Popover, DropdownMenu, Tooltip, AlertDialog, Command (command palette)
**Feedback:** Toast/Sonner, Badge, Skeleton, Progress, Alert
**Data:** Table, Avatar, Calendar, DatePicker

**Ava:** Every component needs these states styled consistently:
- Default, Hover, Active/Pressed, Focus (visible ring), Disabled, Loading
- Focus ring: 2px `--brand-primary` with 2px offset (visible on all backgrounds)
- Disabled: 50% opacity, `cursor-not-allowed`
- Loading: skeleton shimmer animation (subtle pulse, not aggressive)

### 2.2 Button Variants

| Variant | Usage | Style |
|---|---|---|
| Primary | Main CTA (Create task, Save) | Solid `--brand-primary` bg, white text |
| Secondary | Alternative actions (Cancel, Back) | `--neutral-border` outline, dark text |
| Ghost | Toolbar actions, icon buttons | Transparent bg, text color, hover bg |
| Destructive | Delete, Remove | Solid `--danger` bg, white text |
| Link | Inline text actions | Underlined `--brand-primary` text |

All buttons: `min-height: 36px`, `padding: 8px 16px`, `border-radius: md`
Icon-only buttons: `36px x 36px` square, `border-radius: md`

### 2.3 Form Fields

**Lena (UX):** Every form field needs:
- Label above input (not floating — floating labels cause accessibility and usability issues)
- Helper text below input (muted color, 12px)
- Error state: red border + red error message below + `aria-describedby` linking
- Required indicator: red asterisk after label, plus `aria-required`
- Max visible character count for limited fields (e.g., "23/100")

**Elena (Customer):** Keep forms as short as possible. I don't want to fill out 10 fields to create a task. Title + status should be the minimum.

**Finn (Onboarding):** Agreed. Quick task creation should be title-only. Advanced fields in a collapsible "More details" section.

### 2.4 Rich Text Editor (WYSIWYG)

**Priya (Frontend):** Tiptap is the recommendation. It's headless, extensible, works with React, and we can style it to match our design system.

**Ava:** The editor toolbar should be minimal by default:

**Default toolbar (task descriptions, comments):**
Bold | Italic | Strikethrough | --- | Bullet List | Ordered List | --- | Code (inline) | Code Block | --- | Link | @Mention | Image (paste/upload)

**Full toolbar (available via "more" button):**
Heading (H1-H3) | Blockquote | Horizontal Rule | Table | Task List (checkboxes)

**Styling rules:**
- Toolbar: fixed at top of editor, `--neutral-surface` background, icon buttons (Ghost variant)
- Editor area: `min-height: 120px` for descriptions, `min-height: 80px` for comments
- Placeholder text in muted color: "Add a description..." / "Write a comment..."
- Markdown shortcuts supported: `**bold**`, `*italic*`, `` `code` ``, `- list`, `1. list`, `> quote`, `# heading`
- Paste from clipboard preserves basic formatting (bold, italic, lists)
- Image paste/drop inline with auto-upload to attachment API

**Lena (UX):** The @mention popup:
- Triggered by typing `@` followed by characters
- Dropdown below cursor showing matching project members
- Shows: avatar + display name + email (truncated)
- Navigate with arrow keys, select with Enter/click
- Dismissable with Escape
- Maximum 8 visible results with scroll

**Elena (Customer):** I don't need a complicated editor. As long as I can type text and add a link, I'm fine. Don't make the toolbar intimidating.

**Ava:** That's why toolbar is minimal by default. Advanced tools are behind a `...` menu. The comment editor is even simpler — just inline formatting, no headings.

### 2.5 Empty States

**Ava:** Every view needs a designed empty state, not just blank space.

| View | Empty State |
|---|---|
| Project list | Illustration + "Create your first project" CTA |
| Kanban board (no tasks) | Ghost card in first column + "Add a task to get started" |
| Task list (no tasks) | Centered illustration + "No tasks yet" + Create button |
| Task list (filtered, no results) | "No tasks match your filters" + Clear filters link |
| Comments | "No comments yet. Start the conversation." |
| Notifications | Checkmark icon + "You're all caught up!" |
| Search (no results) | "No results for 'X'. Try a different search term." |
| Dashboard (new user) | Welcome banner (see Onboarding section) |
| Attachments | Cloud upload icon + "Drop files here or click to upload" |

**Illustrations:** Simple line art or icon compositions, using `--brand-primary` and `--text-muted` colors. Not complex illustrations — they should load instantly and not feel childish for enterprise users.

**Claire (Executive):** Agreed. Keep it professional. No cartoons, no excessive playfulness. We're targeting enterprise teams migrating from Workfront.

---

## 3. View-Specific Design Decisions

### 3.1 Kanban Board

**Sarah (PM):** This is where I live. The board needs to feel responsive and fast.

**Ava:** Kanban card design:
```
┌─────────────────────────────────┐
│ [Priority dot] Task title...     │
│                                  │
│ [🏷 Bug] [🏷 Feature]           │
│                                  │
│ [Avatar] Sarah  ·  Mar 28  ⚠    │
└─────────────────────────────────┘
```

- Card width: fills column (column width: 280px min, flexible)
- Card padding: `md` (12px)
- Card background: `--neutral-surface`, border: `--neutral-border`
- Priority: colored dot (4px circle) in top-left of card, not a full bar
- Labels: small badges with label color + name, max 3 visible + "+2 more"
- Due date: amber if within 3 days, red if overdue, with warning icon
- Avatar: 20px circle of assignee
- Hover: slight elevation increase (shadow level 1 → 2)
- Dragging: card lifts (shadow level 3), slight rotation (2deg), origin column dims

**Column design:**
- Header: status name (semibold) + task count badge
- Background: transparent (cards provide structure)
- "Add task" button at bottom: Ghost button, `+ Add task`, opens inline title input
- Column scroll: vertical scroll within column body, header stays fixed
- Min 2 columns visible on mobile (horizontal scroll for rest)

**Drag-and-drop:**
- Drop indicator: 2px `--brand-primary` line between cards at drop position
- Cross-column drop: card smoothly animates to new position
- Keyboard: `Space` to pick up, arrow keys to move, `Space` to drop

**Derek (Workfront):** Make sure WIP limits per column are at least visually possible (show count/limit in header). Even if we don't enforce in MVP, show the count.

### 3.2 List View

**Priya (Frontend):** Table design:

| Column | Width | Sortable | Content |
|---|---|---|---|
| Checkbox | 40px fixed | No | Bulk select |
| Title | flex-grow | Yes | Task title, clickable |
| Status | 120px | Yes | Status badge (colored) |
| Priority | 100px | Yes | Priority badge |
| Assignee | 140px | Yes | Avatar + name |
| Due date | 120px | Yes | Date + overdue indicator |
| Labels | 160px | No | Label badges (max 2 + overflow) |

- Row height: 44px (comfortable click target, not too dense)
- Row hover: subtle `--neutral-surface` background
- Active sort column: header text in `--brand-primary` with arrow indicator
- Selected rows (via checkbox): light blue tint (`--brand-primary` at 5% opacity)
- Bulk action bar: appears above table when rows selected ("3 selected: [Assign] [Move] [Delete]")

### 3.3 Task Detail Panel

**Ava:** Slide-over panel from the right, 640px wide on desktop, full-screen on mobile.

- **Animation:** slide from right, 200ms ease-out, backdrop dims to 30% black
- **Header:** Title (editable, `h2` size) + status dropdown + close button
- **Two-column on desktop:** Main content left (60%), metadata sidebar right (40%)
- **Single column on mobile:** metadata section collapses into expandable accordion at top
- **Sections** separated by `--neutral-border` with `lg` spacing
- **Sticky header** when scrolling within the panel

### 3.4 Dashboard

**Sarah (PM):** I need to see at a glance: what's overdue, what's due soon, and how projects are progressing.

**Ava:** Dashboard layout (desktop):
```
┌──────────────────────────────────────────────────┐
│ [Welcome banner — dismissible, first-time only]  │
├──────────────────────────┬───────────────────────┤
│ My Tasks (assigned)      │ Overdue Tasks          │
│ - grouped by project     │ - red indicators       │
│ - sorted by due date     │ - sorted by overdue    │
│ - click to open detail   │   duration             │
├──────────────────────────┴───────────────────────┤
│ Upcoming This Week                                │
│ - horizontal timeline or card list               │
├──────────────────────────────────────────────────┤
│ Project Progress                                  │
│ [Proj A ████░░ 62%] [Proj B ██████░ 85%]         │
└──────────────────────────────────────────────────┘
```

- Widget cards: `--neutral-surface` bg, `lg` border-radius, shadow level 1
- Progress bars: colored segments by status (matches Kanban column colors)
- Task counts next to project name
- Max 5 tasks per section, "View all" link for more

### 3.5 Auth Pages

**Finn (Onboarding):** Auth pages are the first thing users see. They need to feel clean, trustworthy, and fast.

**Ava:** Split layout:
- Left: brand panel (60%) — dark gradient background using `--brand-primary` → violet, with product tagline and a subtle UI preview illustration
- Right: form panel (40%) — clean white/dark surface, centered form, tight copy
- Mobile: form only (brand panel hidden)
- Logo at top of form panel
- Social login buttons (Google, GitHub): outlined with provider icon, full width
- Divider: "or continue with email"
- Form validation: inline errors below each field, as-you-type for password requirements (checklist: 8+ chars, uppercase, lowercase, number)
- Password strength indicator: colored bar below password field (red → amber → green)

**Nadia (Security):** Password requirements should be clearly visible before the user starts typing. Show the checklist always, grey out unchecked items, green the checked ones. Don't surprise users with requirements after they submit.

---

## 4. Onboarding Experience

### 4.1 Role-Based Onboarding Tour

**Finn (Onboarding):** The onboarding wizard (MVP-027) collects the user's role. The tooltip tour that follows should be tailored to that role.

**Lena (UX):** Proposed role-specific tour paths:

**Project Manager** (Sarah):
1. "This is your dashboard — it shows tasks assigned to you and project health." (Dashboard)
2. "Create a project here to organize your team's work." (Sidebar → Projects)
3. "The Kanban board lets you drag tasks between columns." (Board view)
4. "Use the search bar to find anything quickly." (Header search)
5. "Notifications keep you updated on changes." (Bell icon)
6. "Press `?` anytime to see keyboard shortcuts." (Shortcut hint)

**Developer** (Marcus):
1. "Your assigned tasks are here — sorted by due date." (Dashboard → My Tasks)
2. "Click a task to see full details, subtasks, and comments." (Task detail)
3. "Use the list view for a dense overview of all tasks." (List view toggle)
4. "Press `/` to search, `n` to create a task." (Keyboard shortcuts)
5. "Notifications tell you when you're assigned or mentioned." (Bell icon)

**Designer** (Yuki):
1. "Your tasks are on the dashboard, grouped by project." (Dashboard)
2. "Attach design files by dragging them into the task." (Attachment area)
3. "Use @mentions in comments to tag teammates for review." (Comment input)
4. "The Kanban board gives a visual overview of progress." (Board view)

**Executive** (Claire):
1. "The dashboard shows a high-level view of all projects." (Dashboard → Project Progress)
2. "Click a project to see detailed task breakdown." (Project card)
3. "Use filters to focus on specific teams or priorities." (Filter bar)

**Customer** (Elena):
1. "Your projects are listed here." (Sidebar → Projects)
2. "Click a task to view details and add comments." (Task detail)
3. "You'll get notifications when there are updates." (Bell icon)

**Default/Other** (Finn):
1. Standard 5-step tour covering: Dashboard, Projects, Search, Notifications, Shortcuts

### 4.2 Tour Component Design

**Ava:** The tooltip tour component:
- **Highlight:** target element gets a pulsing `--brand-primary` ring (4px, 50% opacity pulse)
- **Backdrop:** everything outside the highlighted element dims to 50% black
- **Tooltip:** attached to highlighted element via Floating UI, arrow pointing to target
  - White/dark surface, shadow level 3
  - Step counter: "2 of 6" in muted text
  - Body: 2-3 sentences max, `text-body` size
  - Buttons: "Skip tour" (ghost) and "Next" (primary), "Got it" on last step
- **Transitions:** tooltip slides in (200ms), highlight ring fades in (150ms)
- **Dismissal:** clicking outside, pressing Escape, or clicking "Skip" all dismiss

### 4.3 First-Run Welcome Banner

**Ava:** Dashboard welcome banner for new users:
```
┌─────────────────────────────────────────────────────────────────┐
│  👋  Welcome to TaskForge, [Name]!                              │
│                                                                  │
│  [Take a tour]  [Create your first project]  [Explore sample]  │
│                                                          [✕]    │
└─────────────────────────────────────────────────────────────────┘
```
- Background: soft gradient (`--brand-primary` at 5% → 10% opacity)
- Dismissible (X button), remembered via localStorage
- Re-triggerable from user settings menu

---

## 5. Responsive & Mobile Strategy

**Lena (UX):** Mobile-first responsive breakpoints:

| Breakpoint | Width | Layout Changes |
|---|---|---|
| `sm` | 640px | Mobile: single column, off-canvas sidebar |
| `md` | 768px | Tablet: sidebar visible, simplified views |
| `lg` | 1024px | Desktop: full layout |
| `xl` | 1280px | Wide desktop: max-width content |

**Key responsive behaviors:**
- Sidebar: off-canvas drawer on mobile, icon-only toggle on tablet, full on desktop
- Kanban: horizontal scroll, min 2 columns visible, cards stack tighter
- List view: hide low-priority columns (labels, due date) on mobile, keep title + status + assignee
- Task detail: full-screen on mobile, sidebar becomes accordion
- Dashboard: single-column stack on mobile
- Dialogs: full-screen sheets on mobile, centered modals on desktop
- Search: full-screen overlay on mobile
- Notifications: full-screen list on mobile

**Kai (Performance):** Mobile users often have slower connections. We need:
- Aggressive code splitting (route-level lazy loading)
- Skeleton loading states everywhere (never show a blank page)
- Image lazy loading with low-quality placeholders for avatars
- Service worker for offline access to cached views (Phase 2, but architect for it now)

---

## 6. Accessibility (WCAG 2.1 AA)

**Lena (UX):** Non-negotiable requirements:

1. **Keyboard navigation:** Every interactive element reachable via Tab. Visible focus indicators on all elements.
2. **Screen readers:** Proper heading hierarchy (h1-h6), ARIA labels on icon-only buttons, live regions for toast notifications and real-time updates.
3. **Color contrast:** 4.5:1 minimum for normal text, 3:1 for large text and UI elements. Verified for both light and dark mode.
4. **Motion:** `prefers-reduced-motion` media query disables: card drag animations, tooltip transitions, skeleton pulse animations. Replaced with instant transitions.
5. **Focus management:** On modal open → focus first focusable element. On modal close → focus trigger element. On route change → focus main content heading.
6. **Skip links:** "Skip to main content" link visible on Tab at top of page.
7. **Error identification:** Form errors linked via `aria-describedby`, announced by screen readers immediately.
8. **Touch targets:** Minimum 44px x 44px on mobile.

**Elena (Customer):** I sometimes use a screen reader. Please don't forget to label buttons that only have icons (like the notification bell and sidebar collapse).

---

## 7. Dark Mode

**Ava:** True dark mode, not just inverted colors:
- Toggle in header user menu or user settings
- System preference detection via `prefers-color-scheme`
- Persisted in localStorage (overrides system)
- Applied via Tailwind `dark:` variant (class strategy, not media)
- All component variants tested in both modes
- Shadows are heavier in dark mode (as defined in elevation tokens)
- Borders are more prominent in dark mode (`--neutral-border` lighter relative to surface)
- No pure white (#FFF) text on dark backgrounds — use `--text-primary` tokens

---

## 8. Animations & Transitions

**Ava:** Motion principles:
- **Purposeful:** animation communicates state change, not decoration
- **Fast:** 150-200ms for UI feedback, 300ms max for panel transitions
- **Consistent:** same easing (`ease-out` for entering, `ease-in` for leaving) everywhere

| Action | Animation | Duration | Easing |
|---|---|---|---|
| Button press | Scale 0.98 + bg darken | 100ms | ease-out |
| Modal open | Fade in + scale from 0.95 | 200ms | ease-out |
| Modal close | Fade out + scale to 0.95 | 150ms | ease-in |
| Slide-over panel | Slide from right | 200ms | ease-out |
| Toast appear | Slide up from bottom | 200ms | ease-out |
| Toast dismiss | Fade out + slide down | 150ms | ease-in |
| Kanban card drag | Lift (shadow increase) + slight rotation | 150ms | ease-out |
| Kanban card drop | Settle into position | 200ms | spring(1, 80, 10) |
| Card hover | Shadow increase | 150ms | ease-out |
| Skeleton loading | Pulse (opacity 0.5 → 1) | 1.5s | ease-in-out, infinite |
| Status badge change | Color crossfade | 200ms | ease-out |
| Real-time card update | Brief highlight glow (`--brand-primary` at 20%, fades out) | 1.5s | ease-out |

**Kai (Performance):** All animations must use `transform` and `opacity` only (GPU-composited, no layout thrashing). The `prefers-reduced-motion` override replaces all with `duration: 0ms`.

---

## 9. SEO & Public Pages

**Hiro (SEO):** MVP doesn't have public-facing pages beyond auth, but we need to lay the groundwork:

**MVP scope:**
- Proper `<title>` tags per route: "Dashboard | TaskForge", "Project Name | TaskForge"
- Meta description on auth pages: "TaskForge — Collaborative project management for teams"
- Canonical URLs
- `robots.txt` blocking authenticated app routes
- `manifest.json` for PWA basics (name, icons, theme color)

**Deferred to Phase 3 (SEO & Public Pages):**
- Open Graph and Twitter Card meta for shared project links
- Structured data (JSON-LD) for public project pages
- Server-side rendering or prerendering for public pages
- Sitemap generation for public content
- Branded read-only layout with sign-up CTA

**Hiro:** I want to make sure the SPA doesn't break basic crawlability. Even if the app is behind auth, the login page, landing page (if we add one), and shared links need to render meta tags server-side. We should consider adding a lightweight SSR layer or prerender for public routes in Phase 3.

---

## 10. Performance Budget

**Kai (Performance):** Hard limits for MVP:

| Metric | Target |
|---|---|
| First Contentful Paint | < 1.5s |
| Largest Contentful Paint | < 2.5s |
| Time to Interactive | < 3.0s |
| Total JS bundle (initial) | < 200KB gzipped |
| Total CSS (initial) | < 30KB gzipped |
| Route chunk (lazy) | < 50KB gzipped each |
| Image/avatar load | Lazy, placeholder < 1KB |

**Strategies:**
- Route-based code splitting via `React.lazy` + `Suspense`
- Tree-shake shadcn/ui (only import used components)
- Tiptap: lazy-load editor only when user interacts with text area
- @dnd-kit: lazy-load drag-and-drop only on board view
- Virtualized lists for long task lists (TanStack Virtual or similar)
- Font: Inter variable, subset, preloaded via `<link rel="preload">`

---

## 11. Internationalization (i18n) Prep

**Lena (UX):** We won't translate in MVP, but we need to architect for it:

- All user-facing strings go through a string map (no hardcoded English in JSX)
- Use `react-intl` or `i18next` setup with English as default
- Date/time formatting via `Intl.DateTimeFormat` (respects locale)
- Number formatting via `Intl.NumberFormat`
- RTL-ready layout: use `start`/`end` instead of `left`/`right` in CSS
- No string concatenation for sentences (use ICU message format for plurals, gender)

**Derek (Workfront):** Our Workfront instance was used by teams in 6 countries. i18n is not optional for enterprise migration.

---

## 12. Real-Time Visual Indicators

**Ava:** When real-time events arrive, the UI needs to communicate changes without being disruptive:

| Event | Visual Treatment |
|---|---|
| Task moved by another user | Card briefly glows `--brand-primary` (1.5s fade), smoothly animates to new column |
| New comment on open task | Comment slides in, subtle slide-down animation |
| New notification | Bell icon bumps (scale 1.2 → 1.0, 200ms), count badge updates |
| User comes online | Green dot appears next to avatar (fade in, 300ms) |
| Connection lost | Yellow bar below header: "Reconnecting..." (slide down) |
| Connection restored | Green flash on bar → slide up after 2s |
| Task updated while viewing | Changed fields briefly highlighted in `--brand-primary` bg (2s fade) |

---

## 13. Review of Existing Frontend Features (MVP-022 through MVP-028)

### Gaps Identified

**MVP-022 (App Shell & Auth):**
- Missing: design token system / theme configuration (Tailwind config with all tokens above)
- Missing: dark mode toggle in user menu
- Missing: password strength indicator on register page
- Missing: explicit `manifest.json` for PWA basics
- Missing: skip-to-content link for accessibility

**MVP-023 (Projects & Views):**
- Missing: empty state designs for all views
- Missing: WIP count in column header (visual only, no enforcement)
- Missing: bulk action bar design when rows selected in list view
- Missing: column resize behavior in list view

**MVP-024 (Task Detail):**
- Missing: Tiptap editor specification for description and comments
- Missing: @mention popup design and behavior spec
- Missing: Markdown shortcut support in editor
- Missing: image paste inline upload behavior

**MVP-025 (Search, Notifications & Dashboard):**
- Missing: command palette (Cmd+K / Ctrl+K) as power-user search alternative
- Missing: notification grouping (multiple updates to same task grouped)

**MVP-026 (Keyboard Shortcuts):**
- Missing: command palette integration (the `?` overlay is separate from Cmd+K search)
- Feature is well-specified, no major gaps

**MVP-027 (Onboarding):**
- Missing: role-based tour paths (added above in section 4.1)
- Missing: tooltip tour component design specification
- Missing: illustration style guidelines for onboarding steps

**MVP-028 (Real-Time):**
- Missing: visual treatment specification for real-time events (added above in section 12)
- Missing: connection status bar design (added above)

---

## 14. New MVP Features

Based on this meeting, the following new MVP features are needed:

### MVP-041: Frontend Design System & Theme

Establish the design token system, Tailwind theme configuration, shadcn/ui setup, and shared component styles before building any views. This is a dependency for all other frontend features.

### MVP-042: Rich Text Editor (Tiptap) Integration

Configure Tiptap as the WYSIWYG editor for task descriptions and comments. Includes @mention autocomplete, inline image upload, markdown shortcuts, and toolbar configuration.

### MVP-043: Command Palette (Cmd+K)

Power-user command palette for quick navigation, task search, and action execution. Separate from keyboard shortcuts overlay (`?`) — this is a search-driven action launcher.

---

## 15. Roadmap Updates (Non-MVP)

The following items were discussed and should be added to later phases:

### Phase 2 additions:
- **Notification grouping** — group multiple updates to the same task into a single notification entry
- **i18n full implementation** — translate all strings, locale-aware formatting, RTL layout support

### Phase 3 additions:
- **PWA & offline mode** — service worker, offline caching, background sync
- **Server-side rendering for public pages** — prerender shared project links for SEO
- **Theming & white-label** — organization-level custom brand colors, logo, favicon
- **Component playground** — internal Storybook or equivalent for design system documentation

---

## Action Items

| Owner | Action | Deadline |
|---|---|---|
| Ava | Finalize design token values and create Figma token file | Before MVP-041 |
| Priya | Set up Tailwind config with all tokens, install shadcn/ui | MVP-041 |
| Priya | Evaluate Tiptap extensions needed, create PoC | MVP-042 |
| Lena | Write accessibility checklist for component review | MVP-022 |
| Hiro | Define meta tag templates for all route types | MVP-022 |
| Finn | Review role-based tour paths with real user scenarios | MVP-027 |
| Kai | Set up Lighthouse CI budget checks in GitHub Actions | MVP-022 |
| Elena | User-test the auth page flow and comment editor mockups | MVP-024 |

---

**Meeting adjourned.** Next sync after MVP-041 (design system) is implemented to review component quality before building views.
