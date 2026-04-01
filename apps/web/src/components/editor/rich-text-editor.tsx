import './editor-content-styles.css';
import { cn } from '@/lib/utils';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import ImageExtension from '@tiptap/extension-image';
import LinkExtension from '@tiptap/extension-link';
import Mention from '@tiptap/extension-mention';
import Placeholder from '@tiptap/extension-placeholder';
import { Table as TableExtension } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
import { TaskItem } from '@tiptap/extension-task-item';
import { TaskList } from '@tiptap/extension-task-list';
import { type Editor, EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { common, createLowlight } from 'lowlight';
import { useCallback, useRef } from 'react';
import { type MentionUser, createMentionSuggestion } from './mention-suggestion';
import { Toolbar } from './toolbar';

const lowlight = createLowlight(common);

export interface RichTextEditorProps {
  mode: 'comment' | 'description';
  content?: string;
  placeholder?: string;
  onUpdate?: (html: string) => void;
  onBlur?: (html: string) => void;
  fetchMentionUsers?: (query: string) => MentionUser[] | Promise<MentionUser[]>;
  onImageUpload?: (file: File) => Promise<string>;
  className?: string;
  editable?: boolean;
}

export function RichTextEditor({
  mode,
  content = '',
  placeholder,
  onUpdate,
  onBlur,
  fetchMentionUsers,
  onImageUpload,
  className,
  editable = true,
}: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultPlaceholder =
    placeholder ?? (mode === 'comment' ? 'Write a comment...' : 'Add a description...');

  const editor = useEditor({
    editable,
    content,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      Placeholder.configure({
        placeholder: defaultPlaceholder,
      }),
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      ImageExtension.configure({
        inline: true,
        allowBase64: false,
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      TableExtension.configure({
        resizable: false,
      }),
      TableRow,
      TableHeader,
      TableCell,
      ...(fetchMentionUsers
        ? [
            Mention.configure({
              HTMLAttributes: {
                class: 'mention',
              },
              suggestion: createMentionSuggestion(fetchMentionUsers),
            }),
          ]
        : []),
    ],
    onUpdate: ({ editor: e }) => {
      onUpdate?.(e.getHTML());
    },
    onBlur: ({ editor: e }) => {
      onBlur?.(e.getHTML());
    },
    editorProps: {
      handleDrop: (view, event) => {
        if (!onImageUpload) return false;
        const files = event.dataTransfer?.files;
        if (!files?.length) return false;
        const imageFile = Array.from(files).find((f) => f.type.startsWith('image/'));
        if (!imageFile) return false;

        event.preventDefault();
        handleImageFile(imageFile, view.state.selection.from);
        return true;
      },
      handlePaste: (view, event) => {
        if (!onImageUpload) return false;
        const files = event.clipboardData?.files;
        if (!files?.length) return false;
        const imageFile = Array.from(files).find((f) => f.type.startsWith('image/'));
        if (!imageFile) return false;

        event.preventDefault();
        handleImageFile(imageFile, view.state.selection.from);
        return true;
      },
    },
  });

  const handleImageFile = useCallback(
    async (file: File, _pos: number) => {
      if (!onImageUpload || !editor) return;
      const url = await onImageUpload(file);
      editor.chain().focus().setImage({ src: url, alt: file.name }).run();
    },
    [onImageUpload, editor],
  );

  const handleToolbarImageUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback(async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file || !onImageUpload || !editor) return;
    const url = await onImageUpload(file);
    editor.chain().focus().setImage({ src: url, alt: file.name }).run();
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [onImageUpload, editor]);

  if (!editor) return null;

  const minHeightClass = mode === 'comment' ? 'min-h-[120px]' : 'min-h-[120px]';

  return (
    <div
      className={cn(
        'tiptap-content overflow-hidden rounded-radius-lg border border-border-ghost bg-surface-container-low/50 transition-colors',
        'focus-within:border-brand-primary/50',
        className,
      )}
      onMouseDown={(event) => {
        if (!editable) return;
        const target = event.target as HTMLElement;
        if (target.closest('.ProseMirror')) return;
        event.preventDefault();
        editor.chain().focus().run();
      }}
    >
      {editable ? (
        <Toolbar
          editor={editor}
          mode={mode}
          onImageUpload={onImageUpload ? handleToolbarImageUpload : undefined}
        />
      ) : null}
      <EditorContent
        editor={editor}
        className={cn(
          'px-md py-sm text-body text-foreground [&_.ProseMirror]:min-h-[120px]',
          minHeightClass,
        )}
      />
      {onImageUpload ? (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileInputChange}
          aria-hidden="true"
          tabIndex={-1}
        />
      ) : null}
    </div>
  );
}

export function getEditorHTML(editor: Editor | null): string {
  if (!editor) return '';
  return editor.getHTML();
}
