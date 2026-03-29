# MVP-041: Frontend Design System & Theme

## Description
Establish the design token system, Tailwind CSS theme configuration, shadcn/ui component library setup, global styles, dark mode support, and foundational shared components before building any application views. This is the visual and structural foundation for the entire frontend.

## Personas
- **Ava (Visual Designer)**: Defines the design tokens — colors, typography, spacing, elevation
- **Priya (Frontend)**: Implements tokens in Tailwind config, installs and customizes shadcn/ui
- **Lena (UX)**: Accessibility requirements, focus management, reduced motion support
- **Kai (Performance)**: Font loading strategy, CSS bundle size, animation performance
- **Hiro (SEO)**: manifest.json, meta tag defaults, theme-color
- **Finn (Onboarding)**: Ensures the visual tone is welcoming, not intimidating

## Dependencies
- MVP-001 (apps/web exists)

## Scope

### Design Tokens (Tailwind config)
- Color palette: brand primary (blue), accent (violet), success, warning, danger, neutrals
- Light and dark mode token sets via CSS custom properties
- Typography: Inter variable font, heading/body/small/code scales
- Spacing: 4px base grid (xs through 3xl)
- Elevation: 5-level shadow system with dark mode variants
- Border radius: sm, md, lg, xl, full
- Transitions: standard durations and easing functions

### Tailwind Configuration
- Extend theme with all design tokens
- Configure dark mode (class strategy)
- Add custom utility classes for typography scale
- Configure container max-width (1280px)

### shadcn/ui Setup
- Install all MVP-required components (Button, Input, Card, Dialog, Table, etc.)
- Apply design tokens to all component variants
- Configure consistent states: default, hover, active, focus, disabled, loading
- Button variants: primary, secondary, ghost, destructive, link
- Focus ring: 2px brand-primary with 2px offset

### Global Styles
- Inter font loading with font-display: swap
- Skip-to-content link for accessibility
- prefers-reduced-motion support (disable animations)
- Base body styles, scrollbar styling
- CSS custom property definitions for both color schemes

### manifest.json & PWA Basics
- App name, short name, icons, theme color, background color
- Display: standalone

### Accessibility Foundations
- Focus-visible ring styles globally
- Skip link component
- Reduced motion media query integration
- Minimum 44px touch targets on mobile

### Reusable Component Patterns (from HTML mockup review)
Based on the [HTML mockup review meeting](../../meetings/2026-03-29-html-mockup-review.md), the following reusable patterns were identified across all drafts and should be implemented as shared components:

1. **GlassPanel**: `backdrop-filter: blur(12px)` with semi-transparent background — used in Kanban column headers, mobile drawers, sticky headers. Performance note: test on low-power mobile devices; disable behind `prefers-reduced-motion`.
2. **Gradient CTA Button**: `bg-gradient-to-br from-primary to-primary-container` — primary CTA pattern across all views.
3. **CommentBubble**: `rounded-2xl` with `rounded-tl-none` for chat-tail effect — used in all comment sections.
4. **MetadataLabel**: `text-[10px] font-bold uppercase tracking-widest` — used for all metadata section labels (assignee, priority, due date, etc.).
5. **FileDropzone**: dashed border with cloud upload icon, hover state with primary border — used in overlay sidebar and page sidebar.
6. **PriorityBadge**: colored dot or filled icon with text label — consistent across cards and metadata views.

### Token Mapping from HTML Drafts
The HTML drafts use varying Tailwind configs. The canonical token values are defined in `styleguide.md`. Key mappings:
- **Light mode**: `primary: #004ac6`, `background: #f8f9ff`, `surface-container-lowest: #ffffff`, `on-surface: #0b1c30`
- **Dark mode**: `primary: #2563eb`, `background: #0f172a`, `surface-container-lowest: #1e293b`, `on-surface: #f1f5f9`
- **Border radius**: `sm: 4px`, `md: 6px`, `lg: 8px`, `xl: 12px`, `full: 9999px` (NOT the draft values of 0.125/0.25/0.5/0.75rem)
- **Icons**: Lucide React (NOT Material Symbols Outlined used in drafts)

## Acceptance Criteria
- [ ] Tailwind config contains all design tokens (colors, typography, spacing, elevation, radius)
- [ ] Dark mode toggle works (class-based, persisted to localStorage, respects system preference)
- [ ] Dark mode uses CSS custom properties that swap under `.dark` class
- [ ] All shadcn/ui components installed and themed to match design tokens
- [ ] Button variants (primary, secondary, ghost, destructive, link) styled consistently
- [ ] Primary CTA uses gradient pattern (`from-primary to-primary-container`)
- [ ] Inter font loads with swap strategy, no FOIT
- [ ] Skip-to-content link present and functional
- [ ] prefers-reduced-motion disables all animations (including glassmorphism backdrop-filter)
- [ ] manifest.json present with correct metadata
- [ ] Focus indicators visible on all interactive elements
- [ ] CSS bundle < 30KB gzipped
- [ ] All color combinations meet WCAG 2.1 AA contrast ratios
- [ ] Lucide React configured as icon library (tree-shakeable, 2px stroke weight)
- [ ] No hardcoded hex color values in component markup — all references use semantic token names
- [ ] GlassPanel, CommentBubble, MetadataLabel, FileDropzone, PriorityBadge reusable components created
- [ ] Unit tests verify theme token application and dark mode toggle logic
