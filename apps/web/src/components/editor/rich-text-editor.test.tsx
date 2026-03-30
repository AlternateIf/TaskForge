import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Mock tiptap modules since they need DOM APIs not available in jsdom
vi.mock('@tiptap/react', () => {
  const mockEditor = {
    getHTML: () => '<p>Hello <strong>world</strong></p>',
    isActive: (name: string) => name === 'bold',
    chain: () => ({
      focus: () => ({
        toggleBold: () => ({ run: vi.fn() }),
        toggleItalic: () => ({ run: vi.fn() }),
        toggleStrike: () => ({ run: vi.fn() }),
        toggleBulletList: () => ({ run: vi.fn() }),
        toggleOrderedList: () => ({ run: vi.fn() }),
        toggleCode: () => ({ run: vi.fn() }),
        toggleCodeBlock: () => ({ run: vi.fn() }),
        setLink: () => ({ run: vi.fn() }),
        setImage: () => ({ run: vi.fn() }),
        toggleHeading: () => ({ run: vi.fn() }),
        toggleBlockquote: () => ({ run: vi.fn() }),
        setHorizontalRule: () => ({ run: vi.fn() }),
        insertTable: () => ({ run: vi.fn() }),
        toggleTaskList: () => ({ run: vi.fn() }),
      }),
    }),
    on: vi.fn(),
    off: vi.fn(),
    destroy: vi.fn(),
    isDestroyed: false,
  };

  return {
    useEditor: () => mockEditor,
    EditorContent: ({ className }: { editor: unknown; className: string }) => (
      <div data-testid="editor-content" className={className}>
        <p>
          Hello <strong>world</strong>
        </p>
      </div>
    ),
  };
});

vi.mock('@tiptap/starter-kit', () => ({
  default: { configure: () => ({}) },
}));

vi.mock('@tiptap/extension-placeholder', () => ({
  default: { configure: () => ({}) },
}));

vi.mock('@tiptap/extension-link', () => ({
  default: { configure: () => ({}) },
}));

vi.mock('@tiptap/extension-image', () => ({
  default: { configure: () => ({}) },
}));

vi.mock('@tiptap/extension-code-block-lowlight', () => ({
  default: { configure: () => ({}) },
}));

vi.mock('@tiptap/extension-task-list', () => ({
  default: {},
  TaskList: {},
}));

vi.mock('@tiptap/extension-task-item', () => ({
  default: { configure: () => ({}) },
  TaskItem: { configure: () => ({}) },
}));

vi.mock('@tiptap/extension-table', () => ({
  default: { configure: () => ({}) },
  Table: { configure: () => ({}) },
}));

vi.mock('@tiptap/extension-table-row', () => ({
  default: {},
  TableRow: {},
}));

vi.mock('@tiptap/extension-table-header', () => ({
  default: {},
  TableHeader: {},
}));

vi.mock('@tiptap/extension-table-cell', () => ({
  default: {},
  TableCell: {},
}));

vi.mock('lowlight', () => ({
  common: {},
  createLowlight: () => ({}),
}));

// Import after mocks
const { RichTextEditor: ActualEditor } = await import('./rich-text-editor');
const { getEditorHTML } = await import('./rich-text-editor');

describe('RichTextEditor', () => {
  it('renders with comment mode toolbar', () => {
    render(<ActualEditor mode="comment" />);
    expect(screen.getByRole('toolbar', { name: 'Text formatting' })).toBeInTheDocument();
    expect(screen.getByTestId('editor-content')).toBeInTheDocument();
  });

  it('renders with description mode toolbar including More button', () => {
    render(<ActualEditor mode="description" />);
    expect(screen.getByRole('toolbar')).toBeInTheDocument();
    expect(screen.getByLabelText('Show more options')).toBeInTheDocument();
  });

  it('does not show More button in comment mode', () => {
    render(<ActualEditor mode="comment" />);
    expect(screen.queryByLabelText('Show more options')).not.toBeInTheDocument();
  });

  it('applies correct min-height for comment mode', () => {
    render(<ActualEditor mode="comment" />);
    const editorContent = screen.getByTestId('editor-content');
    expect(editorContent.className).toContain('min-h-[80px]');
  });

  it('applies correct min-height for description mode', () => {
    render(<ActualEditor mode="description" />);
    const editorContent = screen.getByTestId('editor-content');
    expect(editorContent.className).toContain('min-h-[120px]');
  });

  it('hides toolbar when not editable', () => {
    render(<ActualEditor mode="comment" editable={false} />);
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
  });

  it('shows image upload button only when onImageUpload is provided', () => {
    const { rerender } = render(<ActualEditor mode="comment" />);
    expect(screen.queryByLabelText('Insert image')).not.toBeInTheDocument();

    rerender(<ActualEditor mode="comment" onImageUpload={async () => 'url'} />);
    expect(screen.getByLabelText('Insert image')).toBeInTheDocument();
  });
});

describe('getEditorHTML', () => {
  it('returns HTML from editor', () => {
    const mockEditor = { getHTML: () => '<p>Hello <strong>world</strong></p>' };
    const html = getEditorHTML(mockEditor as Parameters<typeof getEditorHTML>[0]);
    expect(html).toBe('<p>Hello <strong>world</strong></p>');
  });

  it('returns empty string for null editor', () => {
    expect(getEditorHTML(null)).toBe('');
  });
});
