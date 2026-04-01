import { cn } from '@/lib/utils';
import { AlertTriangle, ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { type HTMLAttributes, type ReactNode, forwardRef } from 'react';

type Priority = 'critical' | 'high' | 'medium' | 'low' | 'none';

const priorityConfig: Record<
  Priority,
  { icon: ReactNode; dotColor: string; bgClass: string; label: string }
> = {
  critical: {
    icon: <AlertTriangle className="size-3.5" strokeWidth={2} />,
    dotColor: 'bg-priority-critical',
    bgClass: 'bg-priority-critical-bg text-priority-critical',
    label: 'Critical',
  },
  high: {
    icon: <ArrowUp className="size-3.5" strokeWidth={2} />,
    dotColor: 'bg-priority-high',
    bgClass: 'bg-priority-high-bg text-priority-high',
    label: 'High',
  },
  medium: {
    icon: <Minus className="size-3.5" strokeWidth={2} />,
    dotColor: 'bg-priority-medium',
    bgClass: 'bg-priority-medium-bg text-priority-medium',
    label: 'Medium',
  },
  low: {
    icon: <ArrowDown className="size-3.5" strokeWidth={2} />,
    dotColor: 'bg-priority-low',
    bgClass: 'bg-priority-low-bg text-priority-low',
    label: 'Low',
  },
  none: {
    icon: <Minus className="size-3.5" strokeWidth={2} />,
    dotColor: 'bg-priority-none',
    bgClass: 'bg-priority-none-bg text-priority-none',
    label: 'None',
  },
};

interface PriorityBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  priority: Priority;
  showLabel?: boolean;
  showDot?: boolean;
}

const PriorityBadge = forwardRef<HTMLSpanElement, PriorityBadgeProps>(
  ({ priority, showLabel = true, showDot = false, className, ...props }, ref) => {
    const config = priorityConfig[priority];
    const dotOnly = showDot && !showLabel;

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1 text-label font-medium',
          !dotOnly && 'rounded-radius-sm px-sm py-0.5',
          !dotOnly && config.bgClass,
          className,
        )}
        {...props}
      >
        {showDot ? <span className={cn('size-2 rounded-full', config.dotColor)} /> : config.icon}
        {showLabel ? config.label : null}
      </span>
    );
  },
);
PriorityBadge.displayName = 'PriorityBadge';

export { PriorityBadge, priorityConfig };
export type { Priority };
