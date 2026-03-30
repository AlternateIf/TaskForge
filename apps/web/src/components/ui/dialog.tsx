import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import {
  type HTMLAttributes,
  type ReactNode,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

interface DialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

function Dialog({ open: controlledOpen, onOpenChange, children }: DialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const handleChange = onOpenChange ?? setUncontrolledOpen;

  return (
    <DialogContext.Provider value={{ open, onOpenChange: handleChange }}>
      {children}
    </DialogContext.Provider>
  );
}

function DialogTrigger({ children, ...props }: HTMLAttributes<HTMLButtonElement>) {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('DialogTrigger must be used within Dialog');

  return (
    <button type="button" onClick={() => ctx.onOpenChange(true)} {...props}>
      {children}
    </button>
  );
}

const DialogOverlay = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('fixed inset-0 z-50 bg-black/30 backdrop-blur-sm', className)}
      {...props}
    />
  ),
);
DialogOverlay.displayName = 'DialogOverlay';

const DialogContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const ctx = useContext(DialogContext);
    if (!ctx) throw new Error('DialogContent must be used within Dialog');
    const contentRef = useRef<HTMLDivElement>(null);

    const handleKeyDown = useCallback(
      (e: KeyboardEvent) => {
        if (e.key === 'Escape') ctx.onOpenChange(false);
      },
      [ctx],
    );

    useEffect(() => {
      if (ctx.open) {
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        const firstFocusable = contentRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        firstFocusable?.focus();
      }
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }, [ctx.open, handleKeyDown]);

    if (!ctx.open) return null;

    return (
      <>
        <DialogOverlay onClick={() => ctx.onOpenChange(false)} />
        <div
          ref={(node) => {
            (contentRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
            if (typeof ref === 'function') ref(node);
            else if (ref) ref.current = node;
          }}
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-full max-w-[512px] -translate-x-1/2 -translate-y-1/2 rounded-radius-xl bg-surface-container-lowest p-lg shadow-3',
            'duration-slow animate-in fade-in-0 zoom-in-95',
            className,
          )}
          {...props}
        >
          {children}
          <button
            type="button"
            onClick={() => ctx.onOpenChange(false)}
            className="absolute right-lg top-lg rounded-radius-sm p-xs text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            aria-label="Close"
          >
            <X className="size-4" strokeWidth={2} />
          </button>
        </div>
      </>
    );
  },
);
DialogContent.displayName = 'DialogContent';

const DialogHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-xs pb-lg', className)} {...props} />
  ),
);
DialogHeader.displayName = 'DialogHeader';

const DialogTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn('text-heading-2 font-semibold text-foreground', className)}
      {...props}
    />
  ),
);
DialogTitle.displayName = 'DialogTitle';

const DialogDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-body text-secondary', className)} {...props} />
  ),
);
DialogDescription.displayName = 'DialogDescription';

const DialogFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex justify-end gap-sm pt-lg', className)} {...props} />
  ),
);
DialogFooter.displayName = 'DialogFooter';

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
};
