import { cn } from '@/lib/utils';
import { type HTMLAttributes, forwardRef } from 'react';

interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
}

const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, ...props }, ref) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    return (
      // biome-ignore lint/a11y/useFocusableInteractive: progress bars are read-only indicators, not interactive
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className={cn(
          'relative h-2 w-full overflow-hidden rounded-radius-full bg-surface-container-high',
          className,
        )}
        {...props}
      >
        <div
          className="h-full rounded-radius-full bg-brand-primary transition-all duration-slow ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  },
);
Progress.displayName = 'Progress';

export { Progress };
export type { ProgressProps };
