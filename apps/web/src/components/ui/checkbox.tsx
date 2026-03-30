import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { type InputHTMLAttributes, forwardRef } from 'react';

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({ className, ...props }, ref) => {
  return (
    <label className={cn('relative inline-flex cursor-pointer items-center', className)}>
      <input type="checkbox" ref={ref} className="peer sr-only" {...props} />
      <div className="flex size-4 shrink-0 items-center justify-center rounded-radius-sm border border-border bg-surface-container-lowest transition-colors peer-checked:border-brand-primary peer-checked:bg-brand-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
        <Check className="hidden size-3 text-white peer-checked:block" strokeWidth={3} />
      </div>
    </label>
  );
});
Checkbox.displayName = 'Checkbox';

export { Checkbox };
