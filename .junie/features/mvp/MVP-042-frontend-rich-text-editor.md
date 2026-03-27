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

## Acceptance Criteria
- [ ] Tiptap editor renders with minimal toolbar for comments
- [ ] Tiptap editor renders with full toolbar (expandable) for descriptions
- [ ] @mention autocomplete triggers on `@` and shows matching members
- [ ] @mention selection inserts styled mention chip into editor
- [ ] Image paste from clipboard uploads and inserts inline
- [ ] Image drag-and-drop uploads and inserts inline
- [ ] All markdown shortcuts work (bold, italic, lists, headings, code, blockquote)
- [ ] Editor content is serializable to HTML for API storage
- [ ] Editor is keyboard accessible (Tab behavior, toolbar navigation)
- [ ] Editor respects prefers-reduced-motion
- [ ] Lazy-loaded: editor JS not included in initial bundle
- [ ] Unit tests cover @mention filtering, markdown shortcut handling, and serialization
