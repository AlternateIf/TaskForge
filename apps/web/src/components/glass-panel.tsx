import { cn } from '@/lib/utils';
import { type HTMLAttributes, forwardRef } from 'react';

const GlassPanel = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'bg-surface-container-low/80 backdrop-blur-[12px]',
        'motion-reduce:backdrop-blur-none motion-reduce:bg-surface-container-low',
        className,
      )}
      {...props}
    />
  ),
);
GlassPanel.displayName = 'GlassPanel';

export { GlassPanel };
