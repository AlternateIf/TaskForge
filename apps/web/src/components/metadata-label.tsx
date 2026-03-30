import { cn } from '@/lib/utils';
import { type HTMLAttributes, forwardRef } from 'react';

const MetadataLabel = forwardRef<HTMLSpanElement, HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn('text-[10px] font-bold uppercase tracking-widest text-secondary', className)}
      {...props}
    />
  ),
);
MetadataLabel.displayName = 'MetadataLabel';

export { MetadataLabel };
