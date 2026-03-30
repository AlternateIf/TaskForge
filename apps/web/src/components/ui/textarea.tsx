import { cn } from '@/lib/utils';
import { type TextareaHTMLAttributes, forwardRef } from 'react';

const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-t-radius-lg bg-surface-container-high px-md py-sm text-body text-foreground transition-colors',
          'placeholder:text-muted',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';

export { Textarea };
