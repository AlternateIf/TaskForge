# TaskForge — Style Guide (Core)

This is the default design reference for frontend implementation.

## 1) Design Intent
- Clear, scannable, low-noise interfaces.
- Visual hierarchy through spacing, typography, and tonal surfaces.
- Accessibility and responsiveness are baseline requirements.

## 2) Core Tokens

### Color Tokens
- `--brand-primary`: primary actions, active states.
- `--brand-primary-hover`: hover/active primary states.
- `--accent`: highlights, focus accents where needed.
- `--success`, `--warning`, `--danger`: semantic status colors.
- `--neutral-bg`, `--neutral-surface`, `--neutral-border`: structural surfaces.
- `--text-primary`, `--text-secondary`, `--text-muted`: text hierarchy.

Rules:
- Meet WCAG 2.1 AA contrast.
- Do not encode meaning by color alone; pair with icon/label.

### Priority Colors
- Critical: red family
- High: orange family
- Medium: amber family
- Low: blue family
- None: slate family

## 3) Typography
- Primary typeface: Inter variable.
- Default content size: 14px (`body`).
- Metadata/supporting text: 12px.
- Heading hierarchy should be explicit and consistent.
- Prefer restrained scale changes over decorative typography.

## 4) Layout and Spacing
- 4px spacing grid.
- Common spacing tokens: 4, 8, 12, 16, 24, 32, 48.
- App shell defaults:
  - sidebar: 240px expanded / 64px collapsed
  - header: 56px
  - content max width: 1280px
- Border radius defaults:
  - small chip: 4px
  - controls: 6px
  - cards/panels: 8px
  - modals: 12px

## 5) Component Primitives

### Buttons
- Variants: primary, secondary, ghost, destructive, link.
- Min height: 36px.
- Icon-only buttons: 36x36.
- Focus states must be clearly visible.

### Inputs
- Label above input.
- Helper/error text below input with proper `aria-describedby` links.
- Required fields must expose both visual and semantic required state.
- Avoid ambiguous/floating-only labels.

### Cards, Lists, and Data Views
- Use spacing and surface contrast for separation.
- Keep dense views readable with clear grouping and alignment.
- Maintain consistent hover/selected/disabled states.

### Rich Text Editor (Tiptap)
- Minimum toolbar supports: bold, italic, strikethrough, lists, code, link, mention.
- Description editors may expose extended formatting via progressive disclosure.
- Mention popup supports keyboard navigation and clear result limits.

## 6) Motion and Feedback
- Motion should communicate state changes, not distract.
- Respect `prefers-reduced-motion` with reduced/disabled animation.
- Use lightweight transitions for overlays, state changes, and feedback.
- Realtime events may include subtle cueing (e.g., brief highlight, notification bump).

## 7) Responsive Rules
- Mobile-first behavior with clear breakpoints (`sm`, `md`, `lg`, `xl`).
- Sidebar becomes off-canvas on mobile.
- Dense tables/lists collapse to essential columns on small screens.
- Task detail patterns: full-screen on mobile, split panel/page on desktop.

## 8) Accessibility Baseline (Non-Negotiable)
- Full keyboard navigation.
- Visible focus indicators on all interactive elements.
- Correct heading hierarchy and ARIA labeling (especially icon-only controls).
- Contrast compliance in light and dark themes.
- Touch targets >= 44x44 on mobile.
- Modal focus trap and focus return behavior.

## 9) Implementation Rule
- Use this core file for almost all frontend implementation.
- Load `styleguide-extended.md` only when the task explicitly requires deeper branding/art direction specifics.
