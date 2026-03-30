import { cn } from '@/lib/utils';
import { type VariantProps, cva } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { type ButtonHTMLAttributes, forwardRef } from 'react';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-xs whitespace-nowrap text-button font-medium tracking-[0.01em] transition-all duration-normal ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-gradient-to-br from-brand-primary to-brand-primary-container text-white shadow-1 hover:shadow-2 hover:scale-[1.02] active:scale-[0.98]',
        secondary:
          'border border-border-ghost bg-transparent text-brand-primary hover:bg-surface-container-low active:scale-[0.98]',
        ghost: 'bg-transparent text-foreground hover:bg-surface-container-low active:scale-[0.98]',
        destructive:
          'bg-danger text-white shadow-1 hover:shadow-2 hover:scale-[1.02] active:scale-[0.98]',
        link: 'text-brand-primary underline-offset-4 hover:underline p-0 h-auto min-h-0',
      },
      size: {
        default: 'h-9 min-h-[36px] px-lg py-sm rounded-radius-md',
        sm: 'h-8 min-h-[32px] px-md py-xs rounded-radius-md text-small',
        lg: 'h-11 min-h-[44px] px-xl py-sm rounded-radius-md',
        icon: 'h-9 w-9 min-h-[36px] rounded-radius-md',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? <Loader2 className="size-4 animate-spin-slow" /> : null}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
export type { ButtonProps };
