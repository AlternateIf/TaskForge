import { cn } from '@/lib/utils';
import { type HTMLAttributes, forwardRef } from 'react';

interface CommentBubbleProps extends HTMLAttributes<HTMLDivElement> {
  isOwn?: boolean;
}

const CommentBubble = forwardRef<HTMLDivElement, CommentBubbleProps>(
  ({ className, isOwn, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl p-md text-body',
        isOwn
          ? 'rounded-tr-none bg-brand-primary/10 text-foreground'
          : 'rounded-tl-none bg-surface-container-low text-foreground',
        className,
      )}
      {...props}
    />
  ),
);
CommentBubble.displayName = 'CommentBubble';

export { CommentBubble };
