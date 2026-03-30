# MVP-042: Rich Text Editor (Tiptap) Integration

## Description
Configure Tiptap as the headless WYSIWYG editor for task descriptions and comments. Includes minimal/full toolbar modes, @mention autocomplete with project member search, inline image paste/upload, markdown shortcuts, and consistent styling with the design system.

## Personas
- **Priya (Frontend)**: Tiptap integration, extension configuration, React bindings
- **Ava (Visual Designer)**: Toolbar design, editor chrome, @mention popup styling
- **Lena (UX)**: Editor accessibility, keyboard behavior, @mention interaction design
- **Elena (Customer)**: Needs a simple, non-intimidating text editor for comments
- **Marcus (Backend)**: Expects code blocks and markdown shortcuts

## Dependencies
- MVP-041 (design system — tokens for editor styling)
- MVP-016 (file upload API — for inline image upload)

## Scope

### Editor Modes
- **Comment editor:** minimal toolbar (bold, italic, strikethrough, lists, code, link, @mention)
- **Description editor:** full toolbar with "more" expansion (adds headings, blockquote, table, horizontal rule, task lists)
- Both modes support markdown shortcuts

### @Mention Autocomplete
- Triggered by typing `@` + characters
- Dropdown positioned below cursor via Floating UI
- Shows avatar + display name + email for matching project members
- Arrow key navigation, Enter/click to select, Escape to dismiss
- Max 8 visible results with scroll

### Image Handling
- Paste image from clipboard: auto-upload to attachment API, insert inline
- Drag-and-drop image into editor: same behavior
- Upload progress indicator while uploading
- Click "image" toolbar button: opens file picker

### Markdown Shortcuts
- `**bold**`, `*italic*`, `` `code` ``, `~~strike~~`
- `- ` or `* ` for bullet list, `1. ` for ordered list
- `> ` for blockquote, `# ` through `### ` for headings
- ``` ``` ``` for code block
- `---` for horizontal rule

### Styling
- Toolbar: `--neutral-surface` bg, icon buttons (ghost variant), grouped with separators
- Editor area: min-height 120px (description), 80px (comments)
- Placeholder text in `--text-muted`
- Content styles: headings, lists, blockquotes, code blocks all follow design tokens
- Focus: editor border transitions to `--brand-primary`

### HTML Mockup Reference
Per the [HTML mockup review](../../meetings/2026-03-29-html-mockup-review.md):
- **Description toolbar** (from task-detail-overlay-desktop-light.html): bold, italic, lists, code, link, image — with divider separators between groups
- **Comment toolbar** (from task-detail-overlay-desktop-dark.html): attach file, @mention, emoji buttons below textarea; "Comment" CTA uses gradient button pattern
- **Code blocks** (from task-detail-page-desktop-dark.html): syntax-highlighted with amber for keys, emerald for values, on `inverse-surface` background with `border-l-4 border-primary`
- Editor area uses `surface-container-low/50` background with `outline-variant/10` border, focus state transitions border to `primary/50`

## Acceptance Criteria
- [x] Tiptap editor renders with minimal toolbar for comments
- [x] Tiptap editor renders with full toolbar (expandable) for descriptions
- [x] Toolbar uses ghost icon buttons with divider separators between groups
- [x] @mention autocomplete triggers on `@` and shows matching members
- [x] @mention selection inserts styled mention chip into editor
- [x] Image paste from clipboard uploads and inserts inline
- [x] Image drag-and-drop uploads and inserts inline
- [x] All markdown shortcuts work (bold, italic, lists, headings, code, blockquote)
- [x] Code blocks render with syntax highlighting on inverse-surface background
- [x] Editor content is serializable to HTML for API storage
- [x] Editor is keyboard accessible (Tab behavior, toolbar navigation)
- [x] Editor respects prefers-reduced-motion
- [x] Lazy-loaded: editor JS not included in initial bundle
- [x] Unit tests cover @mention filtering, markdown shortcut handling, and serialization
