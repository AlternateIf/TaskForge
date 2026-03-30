import { cn } from '@/lib/utils';
import { type VariantProps, cva } from 'class-variance-authority';
import { type HTMLAttributes, forwardRef } from 'react';

const alertVariants = cva(
  'relative flex w-full gap-md rounded-radius-lg p-lg text-body [&>svg]:size-5 [&>svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-surface-container-low text-foreground',
        info: 'bg-brand-primary/10 text-brand-primary [&>svg]:text-brand-primary',
        success: 'bg-success/10 text-success [&>svg]:text-success',
        warning: 'bg-warning/10 text-warning [&>svg]:text-warning',
        destructive: 'bg-danger/10 text-danger [&>svg]:text-danger',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

const Alert = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
));
Alert.displayName = 'Alert';

const AlertTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn('font-semibold text-heading-3', className)} {...props} />
  ),
);
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-body [&_p]:leading-relaxed', className)} {...props} />
  ),
);
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
