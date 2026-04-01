import { RichTextEditor, type RichTextEditorProps } from '@/components/editor';
import { ChevronRight } from 'lucide-react';

interface TaskDescriptionProps {
  value: string;
  onSave: (html: string) => void;
  fetchMentionUsers?: RichTextEditorProps['fetchMentionUsers'];
  onImageUpload?: RichTextEditorProps['onImageUpload'];
}

export function TaskDescription({
  value,
  onSave,
  fetchMentionUsers,
  onImageUpload,
}: TaskDescriptionProps) {
  return (
    <details
      className="group rounded-radius-lg border border-border/20 bg-surface-container-low/40 p-md"
      open
    >
      <summary className="flex cursor-pointer list-none items-center gap-xs text-label font-bold uppercase tracking-widest text-secondary [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
        Description
      </summary>
      <div className="mt-md">
        <RichTextEditor
          mode="description"
          content={value}
          placeholder="Add context, implementation details, and acceptance notes..."
          fetchMentionUsers={fetchMentionUsers}
          onImageUpload={onImageUpload}
          onBlur={onSave}
        />
      </div>
    </details>
  );
}
