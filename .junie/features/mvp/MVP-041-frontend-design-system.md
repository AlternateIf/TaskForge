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

## Acceptance Criteria
- [ ] Tailwind config contains all design tokens (colors, typography, spacing, elevation, radius)
- [ ] Dark mode toggle works (class-based, persisted to localStorage, respects system preference)
- [ ] All shadcn/ui components installed and themed to match design tokens
- [ ] Button variants (primary, secondary, ghost, destructive, link) styled consistently
- [ ] Inter font loads with swap strategy, no FOIT
- [ ] Skip-to-content link present and functional
- [ ] prefers-reduced-motion disables all animations
- [ ] manifest.json present with correct metadata
- [ ] Focus indicators visible on all interactive elements
- [ ] CSS bundle < 30KB gzipped
- [ ] All color combinations meet WCAG 2.1 AA contrast ratios
- [ ] Unit tests verify theme token application and dark mode toggle logic
