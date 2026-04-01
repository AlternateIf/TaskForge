import { CommentBubble } from '@/components/comment-bubble';
import { type TimelineEntry, formatActivityAction } from '@/components/data/task-detail-utils';
import { Avatar } from '@/components/ui/avatar';
import { ChevronRight } from 'lucide-react';

interface ActivityFeedProps {
  items: TimelineEntry[];
}

function toPlainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatTimestamp(createdAt: string) {
  return new Date(createdAt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFieldName(field: string) {
  return field
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return 'None';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return 'Updated';
    }
  }
  return String(value);
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <details className="group rounded-radius-lg border border-border/20 bg-surface-container-low/40 p-md">
      <summary className="flex cursor-pointer list-none items-center gap-xs text-label font-bold uppercase tracking-widest text-secondary [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
        Activity
      </summary>

      <div className="mt-md">
        {items.length === 0 ? (
          <p className="rounded-radius-md border border-dashed border-border p-sm text-small text-muted">
            No activity yet.
          </p>
        ) : (
          <div className="relative space-y-md pl-lg before:absolute before:bottom-2 before:left-[10px] before:top-2 before:w-px before:bg-border/50">
            {items.map((entry) => {
              if (entry.type === 'comment') {
                const comment = entry.payload;
                return (
                  <article key={entry.id} className="relative flex gap-sm">
                    <span
                      aria-hidden
                      className="absolute -left-[13px] top-3 size-2.5 rounded-full border border-brand-primary/30 bg-surface-container-lowest"
                    />
                    <Avatar name={comment.authorDisplayName} userId={comment.authorId} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-small font-semibold text-foreground">
                        {comment.authorDisplayName}
                      </p>
                      <p className="text-label text-secondary">
                        {formatTimestamp(comment.createdAt)}
                      </p>
                      <CommentBubble className="mt-xs">
                        <p className="whitespace-pre-wrap text-body text-foreground">
                          {toPlainText(comment.body)}
                        </p>
                      </CommentBubble>
                    </div>
                  </article>
                );
              }

              return (
                <article
                  key={entry.id}
                  className="relative space-y-xs rounded-radius-md border border-border/20 bg-surface-container-low/40 p-sm"
                >
                  <span
                    aria-hidden
                    className="absolute -left-[13px] top-3 size-2.5 rounded-full border border-brand-primary/30 bg-surface-container-lowest"
                  />
                  <p className="text-small font-semibold text-foreground">
                    {entry.payload.actorDisplay} · {formatActivityAction(entry.payload.action)}
                  </p>
                  <p className="mt-[2px] text-label text-secondary">
                    {formatTimestamp(entry.payload.createdAt)}
                  </p>
                  {entry.payload.changes && Object.keys(entry.payload.changes).length > 0 ? (
                    <dl className="grid gap-xs pt-xs text-small">
                      {Object.entries(entry.payload.changes).map(([field, change]) => (
                        <div
                          key={field}
                          className="rounded-radius-sm border border-border/20 bg-surface-container-lowest/60 px-sm py-xs"
                        >
                          <dt className="font-semibold text-secondary">{formatFieldName(field)}</dt>
                          <dd className="text-foreground">
                            {formatValue(change.before)} {'->'} {formatValue(change.after)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </details>
  );
}
