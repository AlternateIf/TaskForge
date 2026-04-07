# TaskForge — Style Guide (Extended)

This extended document is intentionally detailed. Load it only for branding-heavy, bespoke visual, iconography/logo, or advanced view-specific design work.

This document complements `styleguide-core.md` with deep visual, branding, and view-specific detail. Use it when tasks require this extended specificity.

---

# The Design System: Precision & Flow

## 1. Overview & Creative North Star
### The Creative North Star: "The Architectural Ledger"
The design system for this enterprise project management suite is built on the philosophy of **Architectural Ledgering**. In an industry crowded with cluttered dashboards and rigid tables, we differentiate through intentional whitespace and tonal depth. We move away from "software-as-a-grid" and toward "software-as-a-workspace."

By utilizing high-contrast typography scales and overlapping surface layers, we create an editorial experience that feels authoritative yet remarkably fast. We break the "template" look by using asymmetric layouts—placing high-density data visualization against expansive, breathable headers. This system doesn't just manage tasks; it curates them.

---

## 2. Colors: Tonal Architecture
We move beyond flat hex codes to a tiered system of environmental layers.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning. Sectioning must be achieved through background shifts. For example, a sidebar should be `surface-container-low` (#eff4ff) resting against a `surface` (#f8f9ff) main stage. Boundaries are felt, not seen.

### Surface Hierarchy & Nesting
Treat the UI as physical layers of fine paper.
*   **Base:** `surface` (#f8f9ff)
*   **Lowered Sections:** `surface-container-low` (#eff4ff) for subtle grouping.
*   **Standard Cards:** `surface-container-lowest` (#ffffff) to provide "lift" from the background.
*   **High Prominence:** `surface-container-highest` (#d3e4fe) for active states or focused side-panels.

### The Glass & Gradient Rule
To ensure a premium feel, floating elements (modals, popovers) must use **Glassmorphism**.
*   **Token:** `surface_container_low` at 80% opacity with a `backdrop-blur: 12px`.
*   **Signature Textures:** Main CTAs should not be flat. Apply a subtle linear gradient from `primary` (#004ac6) to `primary_container` (#2563eb) at a 135-degree angle to add "soul" and depth.

### Semantic Color Tokens

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

### Priority Colors (Consistent Across Views)

| Priority | Color | Badge BG (light) | Badge BG (dark) |
|---|---|---|---|
| Critical | red-600 | red-50 | red-950 |
| High | orange-500 | orange-50 | orange-950 |
| Medium | amber-500 | amber-50 | amber-950 |
| Low | blue-400 | blue-50 | blue-950 |
| None | slate-400 | slate-100 | slate-800 |

All colors must meet WCAG 2.1 AA contrast ratios (4.5:1 for normal text, 3:1 for large text). Never convey information through color alone — always pair with icons or text labels.

---

## 3. Typography: The Editorial Scale
We use **Inter** not as a system default, but as a Swiss-inspired tool for clarity.

*   **Display Scale (`display-lg` to `display-sm`):** Reserved for high-level project insights and "Welcome" moments. These use tight letter-spacing (-0.02em) to feel architectural.
*   **Headline & Title (`headline-lg` to `title-sm`):** Used for navigation and section headers. These provide the "authoritative" voice.
*   **Body & Labels:** Optimized for speed. `body-md` (0.875rem) is our workhorse for task descriptions, while `label-sm` (0.6875rem) handles the metadata (tags, dates).

**Hierarchy Principle:** Always pair a `display-md` headline with a `body-sm` secondary description to create a high-contrast, editorial aesthetic that guides the eye instantly to the primary action.

### Concrete Typography Scale

| Element | Size | Weight | Line Height | Tracking |
|---|---|---|---|---|
| Page title (h1) | 24px / 1.5rem | 700 (bold) | 1.3 | -0.02em |
| Section heading (h2) | 20px / 1.25rem | 600 (semibold) | 1.35 | -0.01em |
| Card title (h3) | 16px / 1rem | 600 (semibold) | 1.4 | 0 |
| Body text | 14px / 0.875rem | 400 (regular) | 1.5 | 0 |
| Small / meta text | 12px / 0.75rem | 400 (regular) | 1.5 | 0.01em |
| Code / monospace | 13px / 0.8125rem | 400 | 1.6 | 0 |
| Button text | 14px / 0.875rem | 500 (medium) | 1 | 0.01em |

Inter variable font only — single file, ~100KB. Load via `font-display: swap`. Subset to latin + latin-ext. Defined as Tailwind CSS theme extensions (`text-heading-1`, `text-body`, etc.).

---

## 4. Elevation & Depth: Tonal Layering
Traditional shadows are often "muddy." We use **Ambient Lighting** and **Tonal Stacking**.

### The Layering Principle
Instead of a shadow, place a `surface-container-lowest` card on a `surface-container-low` background. The slight shift in hue (from #eff4ff to #ffffff) creates a natural, soft lift that is easier on the eyes for long-term enterprise use.

### Ambient Shadows
When a "floating" effect is required (Level 3 - Modals):
*   **Shadow:** `0px 20px 40px rgba(11, 28, 48, 0.06)`.
*   **Tint:** Notice the shadow is not grey; it is a semi-transparent version of `on_surface` (#0b1c30), ensuring it feels integrated into the environment.

### Shadow Levels

| Level | Shadow | Usage |
|---|---|---|
| 0 | none | Flat surfaces, table rows |
| 1 | `0 1px 3px rgba(0,0,0,0.08)` | Cards, sidebar |
| 2 | `0 4px 12px rgba(0,0,0,0.1)` | Dropdowns, popovers, floating panels |
| 3 | `0 8px 24px rgba(0,0,0,0.12)` | Modals, slide-over panels |
| 4 | `0 16px 48px rgba(0,0,0,0.16)` | Command palette, full overlays |

Dark mode shadows use `rgba(0,0,0,0.3)` base (stronger to maintain depth perception on dark backgrounds).

### The "Ghost Border" Fallback
If accessibility requires a container boundary:
*   **Rule:** Use `outline_variant` (#c3c6d7) at **15% opacity**. High-contrast, 100% opaque borders are strictly forbidden.

---

## 5. Spacing & Layout Grid

4px base grid. All spacing is multiples of 4:

| Token | Value | Usage |
|---|---|---|
| `xs` | 4px | Inline icon gaps, tight padding |
| `sm` | 8px | Input padding, badge padding |
| `md` | 12px | Card inner padding, form gaps |
| `lg` | 16px | Section padding, card gaps |
| `xl` | 24px | Page padding, major sections |
| `2xl` | 32px | Page section separators |
| `3xl` | 48px | Page top/bottom margin |

### App Shell Dimensions

- Sidebar width: 240px expanded, 64px collapsed (icon-only)
- Header height: 56px
- Main content max-width: 1280px, centered with `xl` padding
- Mobile breakpoint: sidebar becomes off-canvas drawer at < 768px

### Border Radius

| Token | Value | Usage |
|---|---|---|
| `sm` | 4px | Badges, small chips |
| `md` | 6px | Buttons, inputs |
| `lg` | 8px | Cards, panels |
| `xl` | 12px | Modals, large cards |
| `full` | 9999px | Avatars, circular elements |

---

## 6. Components: The Primitive Set

### Buttons (The "Precision Click")

| Variant | Usage | Style |
|---|---|---|
| Primary | Main CTA (Create task, Save) | Linear gradient (`primary` to `primary_container`), 8px (`lg`) radius, `label-md` uppercase text with 0.05em tracking |
| Secondary | Alternative actions (Cancel, Back) | No background. `ghost-border` (15% opacity) with `primary` text |
| Ghost | Toolbar actions, icon buttons | Transparent bg, text color, hover bg |
| Destructive | Delete, Remove | Solid `--danger` bg, white text |
| Link | Inline text actions | Underlined `--brand-primary` text |

**Interaction:** On hover, the button should lift using a Level 1 Ambient Shadow and a 2% scale increase.

All buttons: `min-height: 36px`, `padding: 8px 16px`, `border-radius: md`
Icon-only buttons: `36px x 36px` square, `border-radius: md`

### Cards & Lists (The "Fluid Feed")

- **Strict Rule:** No divider lines between list items. Use **Vertical White Space** (`spacing-4` / 0.9rem) or a `surface-dim` background hover state to separate content.
- **Nesting:** Task cards within a project board should use `surface-container-lowest` on a `surface-container-low` board background.

### Inputs & Fields

- **Style:** Minimalist. No bottom border or full box. Use a `surface-container-high` background with an 8px top-radius only, creating a "tab" look that feels like a physical folder.
- **States:** `error` (#ba1a1a) should be used as a text color and a subtle 2px left-accent bar, not a full red border.
- Label above input (not floating — floating labels cause accessibility and usability issues)
- Helper text below input (muted color, 12px)
- Error state: red text + 2px left-accent bar + `aria-describedby` linking
- Required indicator: red asterisk after label, plus `aria-required`
- Max visible character count for limited fields (e.g., "23/100")

### Signature Component: The "Task Stack"
A unique navigation element based on the logo concept. Overlapping cards (`surface-container-lowest`) that expand on hover using a staggered animation, allowing users to peek at sub-tasks without leaving the main view.

### Component States
Every component needs these states styled consistently:
- Default, Hover, Active/Pressed, Focus (visible ring), Disabled, Loading
- Focus ring: 2px `--brand-primary` with 2px offset (visible on all backgrounds)
- Disabled: 50% opacity, `cursor-not-allowed`
- Loading: skeleton shimmer animation (subtle pulse, not aggressive)

### shadcn/ui Components (MVP)

**Core:** Button, Input, Label, Textarea, Select, Checkbox, Radio, Switch, Slider
**Layout:** Card, Separator, Sheet (mobile sidebar), Tabs, Accordion
**Overlay:** Dialog, Popover, DropdownMenu, Tooltip, AlertDialog, Command (command palette)
**Feedback:** Toast/Sonner, Badge, Skeleton, Progress, Alert
**Data:** Table, Avatar, Calendar, DatePicker

---

## 7. Rich Text Editor (Tiptap)

### Default Toolbar (task descriptions, comments)
Bold | Italic | Strikethrough | --- | Bullet List | Ordered List | --- | Code (inline) | Code Block | --- | Link | @Mention | Image (paste/upload)

### Full Toolbar (available via "more" button)
Heading (H1-H3) | Blockquote | Horizontal Rule | Table | Task List (checkboxes)

### Styling Rules
- Toolbar: fixed at top of editor, `--neutral-surface` background, icon buttons (Ghost variant)
- Editor area: `min-height: 120px` for descriptions, `min-height: 80px` for comments
- Placeholder text in muted color: "Add a description..." / "Write a comment..."
- Markdown shortcuts supported: `**bold**`, `*italic*`, `` `code` ``, `- list`, `1. list`, `> quote`, `# heading`
- Paste from clipboard preserves basic formatting (bold, italic, lists)
- Image paste/drop inline with auto-upload to attachment API

### @Mention Popup
- Triggered by typing `@` followed by characters
- Dropdown below cursor showing matching project members
- Shows: avatar + display name + email (truncated)
- Navigate with arrow keys, select with Enter/click
- Dismissable with Escape
- Maximum 8 visible results with scroll

---

## 8. Do's and Don'ts

### Do:
*   **Use Asymmetry:** Place a large `display-md` title on the left and a small `label-md` metadata cluster on the right.
*   **Embrace Space:** If a section feels crowded, increase the spacing from `spacing-4` to `spacing-8`.
*   **Check Contrast:** Ensure `on_surface_variant` is used for non-essential text to maintain a clear visual hierarchy.

### Don't:
*   **No Boxes in Boxes:** Do not put a bordered card inside a bordered section. Use tonal shifts.
*   **No Pure Blacks:** Avoid #000000. Use `on_background` (#0b1c30) for deep shadows and text to keep the UI "organic."
*   **No Standard Icons:** Ensure all Lucide icons use the 2px stroke weight to match the Inter SemiBold font weight. Consistency in "line-weight" is key to a premium feel.

---

## 9. Icon Library

### Library: Lucide React

Lucide React is the default icon library. It is the native library for shadcn/ui, tree-shakeable, and renders as inline SVGs that inherit `currentColor`.

```tsx
import { Check, ChevronDown, Plus } from 'lucide-react';
```

### Icon Usage Guidelines

| Context | Size | Stroke Width | Notes |
|---|---|---|---|
| Sidebar navigation | 20px | 2px | Paired with text label |
| Header actions (bell, search, user) | 20px | 2px | Icon-only buttons, 36px hit area |
| Button with text | 16px | 2px | Left of text, 4px gap |
| Button icon-only | 20px | 2px | 36x36px button, tooltip required |
| Table row actions | 16px | 2px | Hover-reveal on row |
| Badge/tag prefix | 14px | 2px | Inside badges |
| Empty state illustration accent | 48px | 1.5px | Centered, `--text-muted` color |
| Toast notification | 20px | 2px | Left of message |
| Status indicators | 16px | 2px | Colored by status |

### Icon-Only Button Requirements
1. `aria-label` describing the action (e.g., `aria-label="Open notifications"`)
2. A tooltip on hover/focus showing the same label
3. Visible focus ring (2px brand-primary)

### Icon Map

#### Navigation
| Element | Lucide Name |
|---|---|
| Dashboard | `LayoutDashboard` |
| Projects | `FolderKanban` |
| Settings | `Settings` |
| Search | `Search` |
| Notifications | `Bell` |
| User menu | `CircleUser` |
| Sidebar collapse | `ChevronsLeft` |
| Sidebar expand | `ChevronsRight` |

#### Task Actions
| Element | Lucide Name |
|---|---|
| Create task/project | `Plus` |
| Edit | `Pencil` |
| Delete | `Trash2` |
| Archive | `Archive` |
| Duplicate | `Copy` |
| Move | `ArrowRightLeft` |
| Assign | `UserPlus` |
| Unassign | `UserMinus` |

#### Task Properties
| Element | Lucide Name |
|---|---|
| Status | `CircleDot` |
| Priority: Critical | `AlertTriangle` |
| Priority: High | `ArrowUp` |
| Priority: Medium | `Minus` |
| Priority: Low | `ArrowDown` |
| Due date | `Calendar` |
| Labels | `Tag` |
| Assignee | `User` |
| Watchers | `Eye` |

#### Task Features
| Element | Lucide Name |
|---|---|
| Subtasks | `ListTree` |
| Checklist | `CheckSquare` |
| Dependencies | `GitBranch` |
| Comments | `MessageSquare` |
| Activity log | `Clock` |
| Attachments | `Paperclip` |

#### File Types
| Type | Lucide Name |
|---|---|
| Image file | `Image` |
| PDF | `FileText` |
| Document (doc/docx) | `File` |
| Spreadsheet | `Sheet` |
| Code file | `FileCode` |
| Generic file | `File` |
| Upload | `CloudUpload` |
| Download | `Download` |

#### Status & Feedback
| Element | Lucide Name |
|---|---|
| Success / Done | `CheckCircle2` |
| Warning | `AlertTriangle` |
| Error | `XCircle` |
| Info | `Info` |
| Loading | `Loader2` (animated spin) |
| Empty state | `Inbox` |

#### Views & Layout
| Element | Lucide Name |
|---|---|
| Kanban view | `Columns3` |
| List view | `List` |
| Filter | `Filter` |
| Sort | `ArrowUpDown` |
| Group by | `Layers` |

#### Auth & Profile
| Element | Lucide Name |
|---|---|
| Email | `Mail` |
| Password | `Lock` |
| MFA / 2FA | `ShieldCheck` |
| Google OAuth | Custom SVG (Google logo) |
| GitHub OAuth | Custom SVG (GitHub logo) |
| Logout | `LogOut` |
| Dark mode | `Moon` |
| Light mode | `Sun` |

#### Real-Time & Connection
| Element | Lucide Name |
|---|---|
| Connected | `Wifi` |
| Reconnecting | `WifiOff` |
| Offline | `CloudOff` |
| Online presence | `Circle` (green fill) |

### Custom SVGs (Non-Lucide)

| Element | Notes |
|---|---|
| Google logo | Download from Google branding page, 20px |
| GitHub logo | Use `github-mark.svg`, 20px |
| TaskForge logo | See Logo section below |
| Priority dots | 8px circles, CSS `border-radius: 50%` |
| Project color indicators | CSS-rendered, user-selected color |

Custom SVGs go in `apps/web/src/assets/icons/` and are imported as React components via Vite's SVG plugin.

---

## 10. TaskForge Logo

### Chosen Concept: "TF Monogram"

Interlocked T and F in a geometric style, inside a rounded square container. Clean, enterprise-appropriate, scales well from favicon (16px) to auth page (48px).

### Logo Specifications

| Spec | Value |
|---|---|
| Format | SVG (primary), PNG exports at 1x/2x/3x |
| Color: primary | `--brand-primary` (#2563EB light / #3B82F6 dark) |
| Color: on dark bg | White (#FFFFFF) |
| Color: monochrome | Single-color version for favicons |
| Min size | Recognizable at 16x16px (favicon) |
| Favicon sizes | 16, 32, 48, 180 (apple-touch), 192, 512 (manifest) |
| Clear space | Minimum 25% of logo width on all sides |
| Wordmark | "TaskForge" in Inter Bold, tracking -0.02em |
| Wordmark pairing | Logo mark left, wordmark right, vertically centered |
| No-go | Never stretch, rotate, apply effects, change colors outside spec |

### Logo Variants

| Variant | Usage |
|---|---|
| Mark only (square) | Favicon, app icon, avatar fallback |
| Mark + wordmark (horizontal) | Sidebar header, auth pages, email header |
| Wordmark only | Loading screen, marketing (Phase 3) |
| Monochrome mark | Very small sizes, single-color contexts |
| White-on-dark mark | Dark mode sidebar, dark backgrounds |

### Logo Files

```
apps/web/
├── public/
│   ├── favicon.ico              # Multi-size ICO (16+32)
│   ├── favicon.svg              # SVG favicon (modern browsers)
│   ├── apple-touch-icon.png     # 180x180 for iOS
│   ├── icon-192.png             # PWA manifest
│   ├── icon-512.png             # PWA manifest
│   └── og-image.png             # 1200x630 Open Graph default
├── src/
│   └── assets/
│       ├── logo-mark.svg        # Square mark only
│       ├── logo-full.svg        # Mark + wordmark horizontal
│       └── logo-wordmark.svg    # Wordmark only
```

The logo SVG should be inlined in HTML for instant display (no network request).

---

## 11. Illustrations & Empty States

### Illustration Style: "Outlined Mono"
- Single stroke weight: 1.5px
- Two colors only: `--brand-primary` (accent strokes) + `--text-muted` (structural strokes)
- No fills, no gradients, no shadows
- Geometric shapes with slight rounded corners
- Consistent 48px viewbox for empty state icons, 120px for onboarding illustrations
- All illustrations are SVG, inlined as React components
- Professional tone — not cartoonish, not childish

### Empty State Illustrations

| View | Illustration Concept | Text |
|---|---|---|
| No projects | Folder with plus sign, dotted outline | "Create your first project to get started" |
| Empty Kanban | Three empty columns with ghost card outline | "Add a task to get started" |
| Empty task list | Clipboard with empty checklist | "No tasks yet" |
| No search results | Magnifying glass with question mark | "No results for '{query}'" |
| No notifications | Bell with checkmark | "You're all caught up!" |
| No comments | Two speech bubbles, empty | "Start the conversation" |
| No attachments | Cloud with up arrow | "Drop files here or click to upload" |
| No activity | Clock with empty timeline | "No activity yet" |
| Error page (404) | Compass with broken needle | "Page not found" |
| Error page (500) | Wrench and gear | "Something went wrong" |
| Offline | Cloud with X | "You're offline" |

### Onboarding Illustrations

| Step | Illustration Concept | Size |
|---|---|---|
| Welcome | Waving hand + task cards flowing in | 120px |
| Org setup | Building blocks forming a structure | 120px |
| Invite team | Three people with connecting lines | 120px |
| Sample project | Kanban board with colorful cards | 120px |
| Complete | Checkmark with confetti lines | 120px |

---

## 12. Avatar System

### Sizes

| Size | Pixels | Usage |
|---|---|---|
| `xs` | 20px | Kanban card, inline mentions |
| `sm` | 24px | Comment thread, table rows |
| `md` | 32px | Header user menu, task detail sidebar |
| `lg` | 40px | User profile, onboarding |
| `xl` | 64px | Profile settings page |

### Fallback System

When no avatar image is uploaded:

1. **Initials:** First letter of first name + first letter of last name, white text on colored background
2. **Color:** Deterministic from user ID hash — pick from a curated set of 12 colors that all meet contrast requirements against white text:

```
#2563EB (blue), #7C3AED (violet), #DB2777 (pink), #DC2626 (red),
#EA580C (orange), #D97706 (amber), #65A30D (lime), #16A34A (green),
#0D9488 (teal), #0891B2 (cyan), #4F46E5 (indigo), #9333EA (purple)
```

3. **Generic fallback:** If no name available, show `User` icon from Lucide in a grey circle

### Avatar Component Interface
```tsx
<Avatar
  src={user.avatarUrl}       // Image URL (nullable)
  name={user.displayName}    // For initials fallback
  userId={user.id}           // For deterministic color
  size="sm"                  // xs | sm | md | lg | xl
  showPresence={true}        // Green dot for online
/>
```

Avatar images should be lazy-loaded with a low-quality placeholder. The initials fallback renders instantly with zero network cost.

---

## 13. Dark Mode

- Toggle in header user menu or user settings
- System preference detection via `prefers-color-scheme`
- Persisted in localStorage (overrides system)
- Applied via Tailwind `dark:` variant (class strategy, not media)
- All component variants tested in both modes
- Shadows are heavier in dark mode (as defined in elevation tokens)
- Borders are more prominent in dark mode (`--neutral-border` lighter relative to surface)
- No pure white (#FFF) text on dark backgrounds — use `--text-primary` tokens

---

## 14. Animations & Transitions

Motion principles:
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

All animations must use `transform` and `opacity` only (GPU-composited, no layout thrashing). `prefers-reduced-motion` replaces all with `duration: 0ms`.

---

## 15. Real-Time Visual Indicators

| Event | Visual Treatment |
|---|---|
| Task moved by another user | Card briefly glows `--brand-primary` (1.5s fade), smoothly animates to new column |
| New comment on open task | Comment slides in, subtle slide-down animation |
| New notification | Bell icon bumps (scale 1.2 → 1.0, 200ms), count badge updates |
| User comes online | Green dot appears next to avatar (fade in, 300ms) |
| Connection lost | Yellow bar below header: "Reconnecting..." (slide down) |
| Connection restored | Green flash on bar, slide up after 2s |
| Task updated while viewing | Changed fields briefly highlighted in `--brand-primary` bg (2s fade) |

---

## 16. Responsive & Mobile

### Breakpoints

| Breakpoint | Width | Layout Changes |
|---|---|---|
| `sm` | 640px | Mobile: single column, off-canvas sidebar |
| `md` | 768px | Tablet: sidebar visible, simplified views |
| `lg` | 1024px | Desktop: full layout |
| `xl` | 1280px | Wide desktop: max-width content |

### Key Responsive Behaviors
- Sidebar: off-canvas drawer on mobile, icon-only toggle on tablet, full on desktop
- Kanban: horizontal scroll, min 2 columns visible, cards stack tighter
- List view: hide low-priority columns (labels, due date) on mobile, keep title + status + assignee
- Task detail: full-screen on mobile, sidebar becomes accordion
- Dashboard: single-column stack on mobile
- Dialogs: full-screen sheets on mobile, centered modals on desktop
- Search: full-screen overlay on mobile
- Notifications: full-screen list on mobile

---

## 17. Accessibility (WCAG 2.1 AA)

Non-negotiable requirements:

1. **Keyboard navigation:** Every interactive element reachable via Tab. Visible focus indicators on all elements.
2. **Screen readers:** Proper heading hierarchy (h1-h6), ARIA labels on icon-only buttons, live regions for toast notifications and real-time updates.
3. **Color contrast:** 4.5:1 minimum for normal text, 3:1 for large text and UI elements. Verified for both light and dark mode.
4. **Motion:** `prefers-reduced-motion` media query disables all animations. Replaced with instant transitions.
5. **Focus management:** On modal open → focus first focusable element. On modal close → focus trigger element. On route change → focus main content heading.
6. **Skip links:** "Skip to main content" link visible on Tab at top of page.
7. **Error identification:** Form errors linked via `aria-describedby`, announced by screen readers immediately.
8. **Touch targets:** Minimum 44px x 44px on mobile.

---

## 18. SEO Fundamentals (MVP)

- Proper `<title>` tags per route: "Dashboard | TaskForge", "Project Name | TaskForge"
- Meta description on auth pages: "TaskForge — Collaborative project management for teams"
- Canonical URLs
- `robots.txt` blocking authenticated app routes
- `manifest.json` for PWA basics (name, icons, theme color)
- `og:theme-color` set to `--brand-primary`

---

## 19. Performance Budget

| Metric | Target |
|---|---|
| First Contentful Paint | < 1.5s |
| Largest Contentful Paint | < 2.5s |
| Time to Interactive | < 3.0s |
| Total JS bundle (initial) | < 200KB gzipped |
| Total CSS (initial) | < 30KB gzipped |
| Route chunk (lazy) | < 50KB gzipped each |
| Image/avatar load | Lazy, placeholder < 1KB |

### Strategies
- Route-based code splitting via `React.lazy` + `Suspense`
- Tree-shake shadcn/ui (only import used components)
- Tiptap: lazy-load editor only when user interacts with text area
- @dnd-kit: lazy-load drag-and-drop only on board view
- Virtualized lists for long task lists (TanStack Virtual or similar)
- Font: Inter variable, subset, preloaded via `<link rel="preload">`

---

## 20. i18n Preparation

Architecture for future translation (not translated in MVP):

- All user-facing strings go through a string map (no hardcoded English in JSX)
- Use `react-intl` or `i18next` setup with English as default
- Date/time formatting via `Intl.DateTimeFormat` (respects locale)
- Number formatting via `Intl.NumberFormat`
- RTL-ready layout: use `start`/`end` instead of `left`/`right` in CSS
- No string concatenation for sentences (use ICU message format for plurals, gender)

---

## 21. View-Specific Design

### Kanban Board

Card layout:
```
┌─────────────────────────────────┐
│ [Priority dot] Task title...     │
│                                  │
│ [Tag] [Tag]                     │
│                                  │
│ [Avatar] Name  ·  Mar 28  !    │
└─────────────────────────────────┘
```

- Card width: fills column (column width: 280px min, flexible)
- Card padding: `md` (12px), background: `surface-container-lowest`, on `surface-container-low` board
- Priority: colored dot (4px circle), not a full bar
- Labels: small badges, max 3 visible + "+2 more"
- Due date: amber if within 3 days, red if overdue
- Avatar: 20px circle of assignee
- Hover: shadow level 1 → 2
- Dragging: shadow level 3, slight rotation (2deg), origin column dims
- Column header: status name (semibold) + task count badge
- "Add task" button at bottom: Ghost button, opens inline title input
- Drop indicator: 2px `--brand-primary` line between cards
- Keyboard: `Space` to pick up, arrow keys to move, `Space` to drop

### List View

| Column | Width | Sortable |
|---|---|---|
| Checkbox | 40px fixed | No |
| Title | flex-grow | Yes |
| Status | 120px | Yes |
| Priority | 100px | Yes |
| Assignee | 140px | Yes |
| Due date | 120px | Yes |
| Labels | 160px | No |

- Row height: 44px
- Row hover: subtle `--neutral-surface` background
- Active sort column: header text in `--brand-primary` with arrow
- Selected rows: light blue tint (`--brand-primary` at 5% opacity)
- Bulk action bar above table when rows selected

### Task Detail Panel

- Slide-over panel from right, 640px wide on desktop, full-screen on mobile
- Animation: slide from right, 200ms ease-out, backdrop dims to 30% black
- Header: editable title (h2) + status dropdown + close button
- Two-column on desktop: content left (60%), metadata right (40%)
- Single column on mobile: metadata collapses into accordion
- Sticky header when scrolling

### Dashboard

```
┌──────────────────────────────────────────────────┐
│ [Welcome banner — dismissible, first-time only]  │
├──────────────────────────┬───────────────────────┤
│ My Tasks (assigned)      │ Overdue Tasks          │
├──────────────────────────┴───────────────────────┤
│ Upcoming This Week                                │
├──────────────────────────────────────────────────┤
│ Project Progress                                  │
│ [Proj A ████░░ 62%] [Proj B ██████░ 85%]         │
└──────────────────────────────────────────────────┘
```

- Widget cards: `--neutral-surface` bg, `lg` border-radius, shadow level 1
- Progress bars: colored segments by status
- Max 5 tasks per section, "View all" link

### Auth Pages

- Split layout: brand panel (60%) dark gradient `--brand-primary` → violet, form panel (40%) clean surface
- Mobile: form only (brand panel hidden)
- TF logo at top of form panel
- Social login: outlined buttons with provider icon, full width
- Divider: "or continue with email"
- Password strength indicator: colored bar (red → amber → green)
- Password requirements checklist always visible, items check green as met
