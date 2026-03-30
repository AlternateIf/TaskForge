import { cn } from '@/lib/utils';
import { type InputHTMLAttributes, forwardRef } from 'react';

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-t-radius-lg bg-surface-container-high px-md py-sm text-body text-foreground transition-colors',
          'placeholder:text-muted',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'aria-[invalid=true]:border-l-2 aria-[invalid=true]:border-l-danger',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
