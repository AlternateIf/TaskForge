# Pre-Implementation Meeting: MVP-043 Command Palette — 2026-03-30

## Attendees
- **Derek** (Workfront Power User) — keyboard-driven workflow, power-user expectations
- **Marcus** (Backend Developer) — VS Code command palette user, API integration concerns
- **Priya** (Frontend Developer) — component architecture, implementation approach
- **Ava** (Visual Designer) — overlay design, token usage, motion
- **Sarah** (Project Manager) — quick-access actions, discoverability

---

## Discussion

### 1. Trigger and Scope

**Derek**: In Workfront I relied heavily on global search. What I really need is Cmd+K to work from *anywhere* — even when a modal is open or a rich text editor has focus. It should intercept at the document level.

**Marcus**: Same expectation as VS Code — Cmd+K is muscle memory. It should toggle (second press closes it), not just open.

**Priya**: Global `keydown` listener on `document`. We'll need to `preventDefault` to stop browser address-bar behavior. Tiptap listens on its own container so we need the document-level listener to fire first — that works since Tiptap uses `keydown` on its editor element, not document.

**Decision**: Global `document` `keydown` listener for `(metaKey || ctrlKey) && key === 'k'`. Toggle open/close. Listener registered via `useCommandPalette` hook.

---

### 2. No External Library (cmdk)

**Priya**: The spec says "uses shadcn/ui Command component (cmdk-based)", but our existing components (dialog, mention list, etc.) are all hand-rolled without Radix or cmdk. Adding cmdk would be the first external UI primitive in the project. I'd rather stay consistent.

**Ava**: As long as the visual output is identical to the spec, I don't care what's underneath. What matters is: 560px wide, max-height 400px, shadow level 4, correct token usage.

**Marcus**: From a bundle-size perspective, avoiding cmdk (~15KB) is better. The CI pipeline fails over 500KB gzipped — we should stay lean.

**Decision**: Hand-rolled implementation following the dialog.tsx pattern. No cmdk dependency.

---

### 3. Result Groups and Content

**Sarah**: The default view (no query) must show recent pages and the four quick actions. I need "Create task" to be immediately reachable — it's the most common action. Can it be first?

**Derek**: In Workfront's global search, recency comes first, then actions. That's the muscle memory. Keep Recent above Actions.

**Marcus**: Fine, but when there's a query, hide Recent and show Tasks/Projects/People below Actions. Actions should always be visible since you might want "Create task" even while searching.

**Decision**:
- Default (no query): Recent (up to 5) → Actions
- With query: Actions → Tasks → Projects → People (Results from `onSearch` prop)
- Actions always visible regardless of query

**Sarah**: What about the "Create task" action — does it navigate to `/tasks/new` or open a modal?

**Priya**: The command palette closes and calls `onNavigate('/tasks/new')`. The parent decides what happens. For now, navigation is fine since create-task pages aren't built yet.

**Decision**: All actions call `onNavigate(path)` + close the palette. Modal behavior deferred to when create flows are implemented.

---

### 4. Search Integration (MVP-019 Dependency)

**Marcus**: The search API (MVP-019) is marked complete in the roadmap. But the frontend `onSearch` hook isn't wired up yet since we don't have the API client layer. How do we handle this in the component?

**Priya**: The component takes `onSearch?: (query: string) => Promise<SearchResults>` as a prop. When wired into the app shell, the parent passes the real API call. For now the command palette works with the default (no `onSearch` = no search results, only Recent + Actions).

**Decision**: `onSearch` is an optional prop. If not provided, only Recent and Actions show. This makes the component fully functional today and searchable when the API client is wired.

---

### 5. Keyboard Navigation

**Derek**: Arrow keys must move across groups without stopping. If I'm at the last Action and press Down, I should land on the first Task result.

**Marcus**: And wrap-around? In VS Code, ArrowUp from the first item wraps to the last.

**Priya**: I'll make it stop at the bounds (no wrap) for the initial implementation. Wrap is a nice-to-have and easy to add later. Keeping it simple reduces edge cases in tests.

**Derek**: That's acceptable. Also — Tab should not cycle through items. Tab should close the palette and let normal focus flow continue. The palette is modal, not a tab-stop chain.

**Decision**: ArrowUp/Down navigate within a flat list of all items, clamped at bounds (no wrap). Tab key not intercepted (default browser behavior closes focus to nothing since the overlay has `overflow:hidden`; Escape explicitly closes). Enter executes selected item.

---

### 6. Design Tokens and Visual

**Ava**: I've confirmed the tokens from the spec:
- Background: `bg-surface-container-lowest`
- Border: `border-outline-variant/15`
- Shadow: `shadow-4` (level 4)
- Backdrop: `bg-black/50`
- Selected item: `bg-brand-primary/10`
- Width: `max-w-[560px]`
- Max-height: 400px (60px header + 340px scrollable results)
- Positioned at `top-[20%]` (not dead center — higher feels more intentional)
- Border radius: `rounded-radius-xl` (matches modals)

**Ava**: Section headers must be clearly de-emphasized — `text-label text-muted`. No heavy separators, just the label. Clean.

**Ava**: The search input area gets a bottom border (`border-b border-outline-variant/15`) to separate it from results. No extra chrome.

**Priya**: Animation: `animate-in fade-in-0 duration-[200ms]` — same class pattern as dialog. That covers the 200ms fade-in from the spec.

**Decision**: All tokens confirmed above. No hardcoded colors anywhere.

---

### 7. Accessibility

**Priya**: I'll use `role="dialog"` + `aria-modal="true"` on the outer container. The input gets `role="combobox"`, `aria-expanded`, `aria-controls` pointing to the results `role="listbox"`. Each item: `role="option"` + `aria-selected`. `aria-activedescendant` on the input tracks the active item id.

**Priya**: An `aria-live="polite"` region will announce result counts for screen readers.

**Derek**: Focus return is important — when I close the palette, focus must go back to wherever I was before opening it.

**Decision**: Focus saved to `previousFocusRef` on open, restored on close. Full ARIA implementation per above.

---

### 8. Recent Pages Persistence

**Sarah**: If I open the palette and my recent pages are gone, that's confusing. They should persist across sessions.

**Priya**: `localStorage` with key `tf:recent-pages`, up to 5 entries, serialized as JSON. The `useCommandPalette` hook reads on mount and writes on `addRecentPage`. Try/catch around all localStorage ops.

**Decision**: `localStorage` persistence. The hook exports `addRecentPage(page)` for the router to call on navigation.

---

## Decisions Summary

| Topic | Decision |
|---|---|
| Library | No cmdk — hand-rolled, matching dialog.tsx pattern |
| Trigger | Global `document` keydown, toggle on Cmd+K / Ctrl+K |
| Groups order (no query) | Recent → Actions |
| Groups order (with query) | Actions → Tasks → Projects → People |
| Actions behavior | `onNavigate(path)` + close |
| Search | Optional `onSearch` prop; noop if absent |
| Keyboard nav | Flat list, clamped bounds, no wrap |
| Selected highlight | `bg-brand-primary/10` |
| Animation | `animate-in fade-in-0 duration-[200ms]` |
| ARIA | combobox + listbox pattern, aria-activedescendant |
| Focus return | `previousFocusRef` saved on open, restored on close |
| Recent persistence | `localStorage` key `tf:recent-pages`, max 5 |
| File location | `apps/web/src/components/shortcuts/` |
