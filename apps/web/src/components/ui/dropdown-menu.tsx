import { cn } from '@/lib/utils';
import {
  type ButtonHTMLAttributes,
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

interface DropdownMenuContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(null);

function DropdownMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <DropdownMenuContext.Provider value={{ open, onOpenChange: setOpen, triggerRef }}>
      <div className="relative inline-block">{children}</div>
    </DropdownMenuContext.Provider>
  );
}

const DropdownMenuTrigger = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ children, ...props }, ref) => {
    const ctx = useContext(DropdownMenuContext);
    if (!ctx) throw new Error('DropdownMenuTrigger must be used within DropdownMenu');

    return (
      <button
        ref={(node) => {
          (ctx.triggerRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        type="button"
        aria-expanded={ctx.open}
        aria-haspopup="menu"
        onClick={() => ctx.onOpenChange(!ctx.open)}
        {...props}
      >
        {children}
      </button>
    );
  },
);
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger';

const DropdownMenuContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const ctx = useContext(DropdownMenuContext);
    if (!ctx) throw new Error('DropdownMenuContent must be used within DropdownMenu');
    const contentRef = useRef<HTMLDivElement>(null);

    const handleClickOutside = useCallback(
      (e: MouseEvent) => {
        if (
          contentRef.current &&
          !contentRef.current.contains(e.target as Node) &&
          !ctx.triggerRef.current?.contains(e.target as Node)
        ) {
          ctx.onOpenChange(false);
        }
      },
      [ctx],
    );

    const handleKeyDown = useCallback(
      (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          ctx.onOpenChange(false);
          ctx.triggerRef.current?.focus();
        }
      },
      [ctx],
    );

    useEffect(() => {
      if (ctx.open) {
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
      }
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }, [ctx.open, handleClickOutside, handleKeyDown]);

    if (!ctx.open) return null;

    return (
      <div
        ref={(node) => {
          (contentRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        role="menu"
        className={cn(
          'absolute right-0 z-50 mt-xs min-w-[8rem] overflow-hidden rounded-radius-lg bg-surface-container-lowest p-xs shadow-2',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
DropdownMenuContent.displayName = 'DropdownMenuContent';

const DropdownMenuItem = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, onClick, ...props }, ref) => {
    const ctx = useContext(DropdownMenuContext);

    return (
      <button
        ref={ref}
        type="button"
        role="menuitem"
        className={cn(
          'flex w-full items-center gap-sm rounded-radius-md px-sm py-xs text-body text-foreground transition-colors hover:bg-surface-container-low focus-visible:bg-surface-container-low focus-visible:outline-none',
          className,
        )}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) {
            ctx?.onOpenChange(false);
          }
        }}
        {...props}
      />
    );
  },
);
DropdownMenuItem.displayName = 'DropdownMenuItem';

const DropdownMenuSeparator = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('-mx-xs my-xs h-px bg-border', className)} {...props} />
  ),
);
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator';

const DropdownMenuLabel = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('px-sm py-xs text-small font-semibold text-foreground', className)}
      {...props}
    />
  ),
);
DropdownMenuLabel.displayName = 'DropdownMenuLabel';

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
};
