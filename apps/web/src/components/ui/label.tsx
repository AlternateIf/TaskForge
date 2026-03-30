import { cn } from '@/lib/utils';
import { type LabelHTMLAttributes, forwardRef } from 'react';

const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => {
    return (
      // biome-ignore lint/a11y/noLabelWithoutControl: Label receives htmlFor via props at usage site
      <label
        ref={ref}
        className={cn(
          'text-small font-medium text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
          className,
        )}
        {...props}
      />
    );
  },
);
Label.displayName = 'Label';

export { Label };
