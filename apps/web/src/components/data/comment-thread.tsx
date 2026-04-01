import type { Comment } from '@/api/comments';
import { CommentBubble } from '@/components/comment-bubble';
import { Avatar } from '@/components/ui/avatar';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

interface CommentThreadProps {
  comments: Comment[];
  currentUserId?: string;
  composer?: ReactNode;
}

function toPlainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatRelative(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CommentThread({ comments, currentUserId, composer }: CommentThreadProps) {
  return (
    <details
      className="group rounded-radius-lg border border-border/20 bg-surface-container-low/40 p-md"
      open
    >
      <summary className="flex cursor-pointer list-none items-center gap-xs text-label font-bold uppercase tracking-widest text-secondary [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
        Comments
      </summary>

      <div className="mt-md space-y-md">
        {composer}

        {comments.length === 0 ? (
          <p className="rounded-radius-md border border-dashed border-border p-sm text-small text-muted">
            No comments yet.
          </p>
        ) : (
          <div className="relative space-y-md pl-lg before:absolute before:bottom-2 before:left-[10px] before:top-2 before:w-px before:bg-border/50">
            {comments.map((comment) => {
              const isOwn = comment.authorId === currentUserId;
              const isReply = Boolean(comment.parentCommentId);

              return (
                <article
                  key={comment.id}
                  className={isReply ? 'relative ml-lg flex gap-sm' : 'relative flex gap-sm'}
                >
                  <span
                    aria-hidden
                    className="absolute -left-[13px] top-2 size-2.5 rounded-full border border-brand-primary/30 bg-surface-container-lowest"
                  />
                  <Avatar
                    name={comment.authorDisplayName}
                    userId={comment.authorId}
                    size="sm"
                    className="mt-0.5 ring-2 ring-surface-container-lowest"
                  />
                  <div className="min-w-0 flex-1 space-y-xs">
                    <div className="flex items-center gap-sm">
                      <p className="text-small font-semibold text-foreground">
                        {comment.authorDisplayName}
                      </p>
                      <p className="text-label text-secondary">
                        {formatRelative(comment.createdAt)}
                      </p>
                    </div>
                    <CommentBubble isOwn={isOwn}>
                      <p className="whitespace-pre-wrap text-body text-foreground">
                        {toPlainText(comment.body)}
                      </p>
                    </CommentBubble>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </details>
  );
}
