# MVP-026: Frontend — Keyboard Shortcuts

## Description
Global keyboard shortcut system with a reference overlay. Power users can navigate, create tasks, and change statuses without touching the mouse.

## Personas
- **Derek (Workfront)**: Lives on keyboard shortcuts
- **Sarah (PM)**: Quick task creation saves minutes daily
- **Marcus (Backend)**: Prefers keyboard-driven workflows
- **Ava (Visual Designer)**: Shortcut overlay and command palette must be minimal and elegant — clean grid, readable key caps

## Dependencies
- MVP-022 (app shell)
- MVP-023 (project views — shortcuts operate on them)
- MVP-024 (task detail — shortcuts operate on it)

## Scope

### Files to create
```
apps/web/src/
├── hooks/
│   └── use-shortcuts.ts         # Global shortcut registration and handling
├── components/
│   └── shortcuts/
│       ├── shortcut-overlay.tsx  # Modal showing all shortcuts
│       └── shortcut-provider.tsx # Context provider for shortcut registration
packages/shared/src/constants/
└── shortcuts.ts                  # Shortcut definitions (key, label, scope)
```

### Shortcut definitions (MVP)

**Global (work anywhere)**
| Key | Action |
|---|---|
| `?` | Show shortcut reference overlay |
| `/` | Focus search bar |
| `g d` | Go to dashboard |
| `g p` | Go to projects list |
| `n` | New task (opens create dialog) |
| `Escape` | Close modal/panel/overlay |

**Board/List view (when viewing a project)**
| Key | Action |
|---|---|
| `j` / `k` | Navigate up/down in task list |
| `Enter` | Open selected task detail |
| `1-9` | Set priority (1=critical, 5=none) |

**Task detail (when task panel is open)**
| Key | Action |
|---|---|
| `a` | Assign task (opens assignee picker) |
| `l` | Add label (opens label picker) |
| `s` | Change status (opens status picker) |
| `c` | Focus comment input |
| `e` | Edit description |

### Implementation
- `use-shortcuts.ts`: registers global keydown listener
- Shortcuts are scoped (global, board, task-detail)
- Only active shortcuts for current scope fire
- Disabled when focus is in an input/textarea/contenteditable (except Escape)
- Chord support: `g` then `d` within 500ms → go to dashboard

### Shortcut overlay
- Modal triggered by `?`
- Lists all shortcuts grouped by scope
- Shows currently active scope highlighted
- Searchable (optional, nice-to-have)

### Accessibility
- Shortcuts don't interfere with screen reader hotkeys
- All shortcut-triggered actions are also accessible via click/tap
- Overlay is screen-reader friendly

### HTML Mockup Reference
Per the [HTML mockup review](../../meetings/2026-03-29-html-mockup-review.md):
- No dedicated shortcut overlay HTML draft exists. Design the overlay per styleguide: centered modal, `surface-container-lowest` background, shadow level 4, grouped shortcut list with `MetadataLabel` for section headers, key caps styled with `surface-container-high` background + `outline-variant` border + monospace font.

## Acceptance Criteria
- [ ] `?` opens shortcut reference overlay
- [ ] `/` focuses search bar
- [ ] `g d` and `g p` navigation works
- [ ] `n` opens create task dialog
- [ ] `j`/`k` navigates task list on board/list view
- [ ] `Enter` opens selected task
- [ ] Task detail shortcuts work (a, l, s, c, e)
- [ ] Shortcuts disabled in input fields (except Escape)
- [ ] Chord shortcuts work (`g` + `d` within 500ms)
- [ ] Overlay shows all shortcuts grouped by scope
- [ ] Overlay uses design tokens, no hardcoded hex colors
- [ ] Shortcuts don't conflict with browser/screen reader hotkeys
- [ ] Unit tests cover shortcut registration, chord detection, and scope-based activation logic
