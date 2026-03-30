import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Suspense, lazy } from 'react';
import type { RichTextEditorProps } from './rich-text-editor';

const LazyRichTextEditor = lazy(() =>
  import('./rich-text-editor').then((m) => ({ default: m.RichTextEditor })),
);

function EditorSkeleton({ mode }: { mode: 'comment' | 'description' }) {
  const minHeight = mode === 'comment' ? 'min-h-[80px]' : 'min-h-[120px]';
  return (
    <div
      className={cn(
        'overflow-hidden rounded-radius-lg border border-border-ghost bg-surface-container-low/50',
      )}
    >
      <div className="flex items-center gap-1 border-b border-border bg-surface px-sm py-xs">
        {Array.from({ length: 6 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
          <Skeleton key={i} className="size-8 rounded-radius-md" />
        ))}
      </div>
      <div className={cn('p-md', minHeight)}>
        <Skeleton className="mb-2 h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

export function RichTextEditor(props: RichTextEditorProps) {
  return (
    <Suspense fallback={<EditorSkeleton mode={props.mode} />}>
      <LazyRichTextEditor {...props} />
    </Suspense>
  );
}

export type { RichTextEditorProps } from './rich-text-editor';
export type { MentionUser } from './mention-suggestion';
