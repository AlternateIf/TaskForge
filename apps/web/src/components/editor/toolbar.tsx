import { cn } from '@/lib/utils';
import type { Editor } from '@tiptap/react';
import {
  Bold,
  Code,
  CodeSquare,
  Heading1,
  Heading2,
  Heading3,
  Image,
  Italic,
  Link,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  Quote,
  Strikethrough,
  Table,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  'aria-label': string;
  children: ReactNode;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  'aria-label': ariaLabel,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={active}
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-radius-md text-secondary transition-colors',
        'hover:bg-surface-container-low hover:text-foreground',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        'disabled:pointer-events-none disabled:opacity-50',
        active && 'bg-brand-primary/10 text-brand-primary',
      )}
    >
      {children}
    </button>
  );
}

function ToolbarSeparator() {
  return <div className="mx-xs h-5 w-px bg-border" />;
}

interface ToolbarProps {
  editor: Editor;
  mode: 'comment' | 'description';
  onImageUpload?: () => void;
}

export function Toolbar({ editor, mode, onImageUpload }: ToolbarProps) {
  const [showMore, setShowMore] = useState(false);
  const inlineCodeActive = editor.isActive('code');

  function handleInlineCodeToggle() {
    if (editor.state.selection.empty) {
      if (inlineCodeActive) {
        editor.chain().focus().unsetCode().run();
      } else {
        editor.chain().focus().setCode().run();
      }
      return;
    }

    editor.chain().focus().toggleCode().run();
  }

  return (
    <div
      className="flex flex-wrap items-center gap-0.5 border-b border-border bg-surface px-sm py-xs"
      role="toolbar"
      aria-label="Text formatting"
    >
      {/* Basic formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        aria-label="Bold"
      >
        <Bold className="size-4" strokeWidth={2} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        aria-label="Italic"
      >
        <Italic className="size-4" strokeWidth={2} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive('strike')}
        aria-label="Strikethrough"
      >
        <Strikethrough className="size-4" strokeWidth={2} />
      </ToolbarButton>

      <ToolbarSeparator />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')}
        aria-label="Bullet list"
      >
        <List className="size-4" strokeWidth={2} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')}
        aria-label="Ordered list"
      >
        <ListOrdered className="size-4" strokeWidth={2} />
      </ToolbarButton>

      <ToolbarSeparator />

      {/* Code */}
      <ToolbarButton
        onClick={handleInlineCodeToggle}
        active={inlineCodeActive}
        aria-label="Inline code toggle"
      >
        <Code className="size-4" strokeWidth={2} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        active={editor.isActive('codeBlock')}
        aria-label="Code block"
      >
        <CodeSquare className="size-4" strokeWidth={2} />
      </ToolbarButton>

      <ToolbarSeparator />

      {/* Link */}
      <ToolbarButton
        onClick={() => {
          const url = window.prompt('Enter URL');
          if (url) {
            editor.chain().focus().setLink({ href: url }).run();
          }
        }}
        active={editor.isActive('link')}
        aria-label="Insert link"
      >
        <Link className="size-4" strokeWidth={2} />
      </ToolbarButton>

      {/* Image */}
      {onImageUpload ? (
        <ToolbarButton onClick={onImageUpload} aria-label="Insert image">
          <Image className="size-4" strokeWidth={2} />
        </ToolbarButton>
      ) : null}

      {/* Description mode: expandable section */}
      {mode === 'description' ? (
        <>
          <ToolbarSeparator />
          <ToolbarButton
            onClick={() => setShowMore((v) => !v)}
            active={showMore}
            aria-label={showMore ? 'Hide more options' : 'Show more options'}
          >
            <span className="text-[11px] font-medium">More</span>
          </ToolbarButton>

          {showMore ? (
            <>
              <ToolbarSeparator />
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                active={editor.isActive('heading', { level: 1 })}
                aria-label="Heading 1"
              >
                <Heading1 className="size-4" strokeWidth={2} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                active={editor.isActive('heading', { level: 2 })}
                aria-label="Heading 2"
              >
                <Heading2 className="size-4" strokeWidth={2} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                active={editor.isActive('heading', { level: 3 })}
                aria-label="Heading 3"
              >
                <Heading3 className="size-4" strokeWidth={2} />
              </ToolbarButton>

              <ToolbarSeparator />

              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                active={editor.isActive('blockquote')}
                aria-label="Blockquote"
              >
                <Quote className="size-4" strokeWidth={2} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
                aria-label="Horizontal rule"
              >
                <Minus className="size-4" strokeWidth={2} />
              </ToolbarButton>

              <ToolbarSeparator />

              <ToolbarButton
                onClick={() =>
                  editor
                    .chain()
                    .focus()
                    .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                    .run()
                }
                aria-label="Insert table"
              >
                <Table className="size-4" strokeWidth={2} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleTaskList().run()}
                active={editor.isActive('taskList')}
                aria-label="Task list"
              >
                <ListTodo className="size-4" strokeWidth={2} />
              </ToolbarButton>
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
