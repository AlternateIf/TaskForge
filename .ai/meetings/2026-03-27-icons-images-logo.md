# Icons, Images & Logo Meeting

**Date:** 2026-03-27
**Type:** Design decision
**Led by:** Ava (Visual Designer)

**Attendees:** Ava (Visual Designer), Lena (UX), Priya (Frontend), Kai (Performance), Hiro (SEO), Finn (Onboarding), Elena (Customer)

---

## 1. Icon Library Selection

### Options Evaluated

**Ava (Visual Designer):** I've evaluated three libraries against our requirements:

| Criteria | Lucide React | Heroicons | Phosphor Icons |
|---|---|---|---|
| Style | Clean, minimal stroke | Tailwind-native, two weights | 6 weights (thin → fill) |
| React support | First-class, tree-shakeable | First-class, tree-shakeable | First-class, tree-shakeable |
| Icon count | ~1,500 | ~300 | ~1,200+ |
| Customizable | Size, color, stroke width | Size, color | Size, color, weight |
| Bundle impact | ~0.3KB per icon (tree-shaken) | ~0.3KB per icon | ~0.4KB per icon |
| Consistency | Very consistent stroke weight | Very consistent | Consistent within weight |
| License | ISC (permissive) | MIT | MIT |
| shadcn/ui default | Yes (used by shadcn/ui) | No | No |

### Decision

**Priya (Frontend):** Lucide React is the clear winner. It's already the default icon library for shadcn/ui, so every component we install expects Lucide icons. Using anything else means overriding icon imports in every shadcn/ui component.

**Ava:** Agreed. Lucide's stroke style is clean and professional — 24px grid, 2px stroke weight, rounded caps. It matches the design system tone we defined (minimal, no-nonsense, enterprise-appropriate).

**Kai (Performance):** Tree-shaking is critical. With Lucide, we import individual icons:
```tsx
import { Check, ChevronDown, Plus } from 'lucide-react';
```
Only the icons we actually use end up in the bundle. At ~0.3KB per icon, even 100 icons across the app is only ~30KB uncompressed (~8KB gzipped). Well within our performance budget.

**Lena (UX):** Lucide icons render as inline SVGs, which means they inherit `currentColor` by default. That's essential for accessibility — icons automatically match text color in both light and dark mode without any extra work.

**Decision: Lucide React** — unanimous.

### Icon Usage Guidelines

**Ava:** Rules for consistent icon usage:

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

**Lena (UX):** Every icon-only button MUST have:
1. `aria-label` describing the action (e.g., `aria-label="Open notifications"`)
2. A tooltip on hover/focus showing the same label
3. Visible focus ring (2px brand-primary)

**Elena (Customer):** Don't use icons I wouldn't understand without a label. The notification bell is universal, but obscure icons like a gear for settings need a text label — at least in the sidebar.

**Ava:** Agreed. Sidebar always shows icon + text when expanded. When collapsed (icon-only mode), tooltips appear on hover.

---

## 2. Icon Mapping

**Ava:** Here's the definitive icon map for MVP. All icons are from Lucide:

### Navigation
| Element | Icon | Lucide Name |
|---|---|---|
| Dashboard | Grid layout | `LayoutDashboard` |
| Projects | Folder | `FolderKanban` |
| Settings | Gear | `Settings` |
| Search | Magnifying glass | `Search` |
| Notifications | Bell | `Bell` |
| User menu | User circle | `CircleUser` |
| Sidebar collapse | Chevrons left | `ChevronsLeft` |
| Sidebar expand | Chevrons right | `ChevronsRight` |

### Task Actions
| Element | Icon | Lucide Name |
|---|---|---|
| Create task/project | Plus | `Plus` |
| Edit | Pencil | `Pencil` |
| Delete | Trash | `Trash2` |
| Archive | Archive box | `Archive` |
| Duplicate | Copy | `Copy` |
| Move | Arrow right-left | `ArrowRightLeft` |
| Assign | User plus | `UserPlus` |
| Unassign | User minus | `UserMinus` |

### Task Properties
| Element | Icon | Lucide Name |
|---|---|---|
| Status | Circle dot | `CircleDot` |
| Priority: Critical | Alert triangle | `AlertTriangle` |
| Priority: High | Arrow up | `ArrowUp` |
| Priority: Medium | Minus | `Minus` |
| Priority: Low | Arrow down | `ArrowDown` |
| Priority: None | — | (no icon, just text) |
| Due date | Calendar | `Calendar` |
| Labels | Tag | `Tag` |
| Assignee | User | `User` |
| Watchers | Eye | `Eye` |

### Task Features
| Element | Icon | Lucide Name |
|---|---|---|
| Subtasks | List tree | `ListTree` |
| Checklist | Check square | `CheckSquare` |
| Dependencies | Git branch | `GitBranch` |
| Comments | Message square | `MessageSquare` |
| Activity log | Clock | `Clock` |
| Attachments | Paperclip | `Paperclip` |

### File Types
| Type | Icon | Lucide Name |
|---|---|---|
| Image file | Image | `Image` |
| PDF | File text | `FileText` |
| Document (doc/docx) | File | `File` |
| Spreadsheet | Sheet | `Sheet` |
| Code file | File code | `FileCode` |
| Generic file | File | `File` |
| Upload | Upload cloud | `CloudUpload` |
| Download | Download | `Download` |

### Status & Feedback
| Element | Icon | Lucide Name |
|---|---|---|
| Success / Done | Check circle | `CheckCircle2` |
| Warning | Alert triangle | `AlertTriangle` |
| Error | X circle | `XCircle` |
| Info | Info | `Info` |
| Loading | Loader | `Loader2` (animated spin) |
| Empty state | Inbox | `Inbox` |

### Views & Layout
| Element | Icon | Lucide Name |
|---|---|---|
| Kanban view | Columns | `Columns3` |
| List view | List | `List` |
| Filter | Filter | `Filter` |
| Sort | Arrow up-down | `ArrowUpDown` |
| Group by | Layers | `Layers` |

### Auth & Profile
| Element | Icon | Lucide Name |
|---|---|---|
| Email | Mail | `Mail` |
| Password | Lock | `Lock` |
| MFA / 2FA | Shield check | `ShieldCheck` |
| Google OAuth | — | Custom SVG (Google logo) |
| GitHub OAuth | — | Custom SVG (GitHub logo) |
| Logout | Log out | `LogOut` |
| Dark mode | Moon | `Moon` |
| Light mode | Sun | `Sun` |

### Real-Time & Connection
| Element | Icon | Lucide Name |
|---|---|---|
| Connected | Wifi | `Wifi` |
| Reconnecting | Wifi off | `WifiOff` |
| Offline | Cloud off | `CloudOff` |
| Online presence | Circle (filled) | `Circle` (green fill) |

---

## 3. Custom SVGs (Non-Lucide)

**Ava:** A few things can't come from Lucide and need custom SVGs:

| Element | Why Custom | Notes |
|---|---|---|
| Google logo | Brand guidelines require official logo | Download from Google branding page, 20px |
| GitHub logo | Brand guidelines require Invertocat | Use `github-mark.svg`, 20px |
| TaskForge logo | Our own branding | See section 4 |
| Priority dots | Simple colored circles | 8px circles, not an icon — CSS `border-radius: 50%` |
| Project color indicators | Colored squares/circles | CSS-rendered, user-selected color |

**Priya:** Custom SVGs go in `apps/web/src/assets/icons/` and are imported as React components via Vite's SVG plugin (`vite-plugin-svgr` or `?react` suffix).

---

## 4. TaskForge Logo

### Logo Concept

**Ava:** The logo needs to work at multiple sizes — favicon (16px), sidebar header (32px), auth pages (48px), and email headers. It should convey: structure, progress, collaboration.

**Concept: Stacked Forge Anvil + Checkmark**

The mark combines a simplified anvil shape (the "Forge") with a checkmark (task completion). The anvil's flat top becomes the base for an upward checkmark, suggesting building/crafting tasks to completion.

```
Design A: "Forge Check"
┌─────────────────┐
│                  │
│      ╱           │
│    ╱             │
│  ╱    ╲          │
│        ╲         │
│  ┌──────┐        │
│  │▓▓▓▓▓▓│        │
│  └──────┘        │
│                  │
└─────────────────┘

Simplified: checkmark sitting on a solid block/anvil base
```

**Design B: "TF Monogram"**

Interlocked T and F in a geometric style, inside a rounded square container.

```
Design B: "TF Mark"
┌─────────────────┐
│  ╭─────────╮    │
│  │ ▀▀█▀▀   │    │
│  │   █ ▀▀▀ │    │
│  │   █ █▀  │    │
│  │   █ █   │    │
│  ╰─────────╯    │
└─────────────────┘

Geometric T overlapping F in rounded square
```

**Design C: "Task Block"**

Abstract representation of stacked task cards with the top card having a checkmark, forming a "T" silhouette.

```
Design C: "Task Block"
┌─────────────────┐
│    ┌────────┐   │
│    │ ✓      │   │
│   ┌┤────────│   │
│  ┌┤│        │   │
│  ││└────────┘   │
│  │└─────────┘   │
│  └──────────┘   │
└─────────────────┘

Three stacked cards, top card with checkmark
```

### Discussion

**Finn (Onboarding):** Design C feels most intuitive to me — I can immediately tell it's a task management tool. The stacked cards are a universal visual language.

**Claire (Executive, via proxy):** The TF monogram (B) is the most "enterprise" feeling. It would look authoritative on invoices, email headers, and enterprise sales decks.

**Hiro (SEO):** For favicons and small sizes, simpler is better. Design A and B both reduce to recognizable shapes at 16px. Design C might lose the stacking detail at favicon size.

**Elena (Customer):** I like Design C — it's friendly and approachable. B feels too corporate.

**Kai (Performance):** Whatever we pick, the logo should be a single SVG with no gradients and minimal paths for fast rendering. Inline it in the HTML for instant display (no network request for the logo).

**Ava:** Let me address the practical requirements:

### Logo Specifications

**Agreed approach: Develop both Design B (TF Monogram) and Design C (Task Block) to final vector, then A/B test with target users. For now, define the specs both must meet:**

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

### Logo Variants Needed

| Variant | Usage |
|---|---|
| Mark only (square) | Favicon, app icon, avatar fallback |
| Mark + wordmark (horizontal) | Sidebar header, auth pages, email header |
| Wordmark only | Loading screen, marketing (Phase 3) |
| Monochrome mark | Very small sizes, single-color contexts |
| White-on-dark mark | Dark mode sidebar, dark backgrounds |

### File Organization

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

---

## 5. Illustrations & Empty States

### Illustration Style

**Ava:** We decided in the frontend kickoff meeting that illustrations should be simple line art — not complex scenes, not cartoons. Here's the refined spec:

**Style: "Outlined Mono"**
- Single stroke weight: 1.5px
- Two colors only: `--brand-primary` (accent strokes) + `--text-muted` (structural strokes)
- No fills, no gradients, no shadows
- Geometric shapes with slight rounded corners
- Consistent 48px viewbox for empty state icons, 120px for onboarding illustrations
- All illustrations are SVG, inlined as React components

**Lena (UX):** Illustrations are supplementary, never the primary communication. They sit above the text message and CTA. A user should understand the empty state from the text alone — the illustration adds visual polish.

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

**Finn (Onboarding):** The onboarding illustrations should feel slightly more expressive than empty states — they're setting the tone. But still not cartoonish. Think "professional welcome," not "kindergarten."

---

## 6. Avatar System

**Ava:** User avatars appear everywhere — sidebar, Kanban cards, comments, mentions, task detail. We need a consistent system:

### Avatar Specifications

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

### Avatar Component Props
```tsx
<Avatar
  src={user.avatarUrl}       // Image URL (nullable)
  name={user.displayName}    // For initials fallback
  userId={user.id}           // For deterministic color
  size="sm"                  // xs | sm | md | lg | xl
  showPresence={true}        // Green dot for online
/>
```

**Priya:** We'll use shadcn/ui's `Avatar` component as the base and extend it with the initials fallback and presence dot.

**Kai (Performance):** Avatar images should be lazy-loaded with a low-quality placeholder. For lists with many avatars (Kanban board, member list), use `loading="lazy"` on the `<img>` tag. The initials fallback renders instantly with zero network cost — that's the ideal default.

---

## Action Items

| Owner | Action | Target |
|---|---|---|
| Ava | Create final logo vectors (Design B + C) for team review | Before MVP-041 |
| Ava | Create SVG illustration set for all empty states | MVP-041 |
| Ava | Create onboarding step illustrations | MVP-027 |
| Priya | Install `lucide-react`, configure tree-shaking in Vite | MVP-041 |
| Priya | Create `Avatar` component with initials fallback + presence | MVP-041 |
| Priya | Set up `src/assets/icons/` for custom SVGs (Google, GitHub logos) | MVP-022 |
| Hiro | Prepare favicon and OG image specs from chosen logo | MVP-041 |
| Lena | Audit icon map for accessibility (all icon-only buttons have labels) | MVP-022 |

---

**Meeting adjourned.** Logo finalists to be reviewed in async thread before MVP-041 begins.