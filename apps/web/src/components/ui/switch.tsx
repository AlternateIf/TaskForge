import { cn } from '@/lib/utils';
import { type InputHTMLAttributes, forwardRef } from 'react';

type SwitchProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

const Switch = forwardRef<HTMLInputElement, SwitchProps>(({ className, ...props }, ref) => {
  return (
    <label className={cn('relative inline-flex cursor-pointer items-center', className)}>
      <input type="checkbox" ref={ref} className="peer sr-only" {...props} />
      <div className="h-5 w-9 rounded-radius-full bg-surface-container-high transition-colors peer-checked:bg-brand-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring peer-disabled:cursor-not-allowed peer-disabled:opacity-50" />
      <div className="absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow-1 transition-transform peer-checked:translate-x-4" />
    </label>
  );
});
Switch.displayName = 'Switch';

export { Switch };
