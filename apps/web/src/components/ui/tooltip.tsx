import { cn } from '@/lib/utils';
import {
  type HTMLAttributes,
  type ReactNode,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';

interface TooltipContextValue {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
}

const TooltipContext = createContext<TooltipContextValue | null>(null);

function Tooltip({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const onOpen = useCallback(() => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setOpen(true), 300);
  }, []);

  const onClose = useCallback(() => {
    clearTimeout(timeoutRef.current);
    setOpen(false);
  }, []);

  return (
    <TooltipContext.Provider value={{ open, onOpen, onClose, triggerRef }}>
      {children}
    </TooltipContext.Provider>
  );
}

const TooltipTrigger = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ children, ...props }, _ref) => {
    const ctx = useContext(TooltipContext);
    if (!ctx) throw new Error('TooltipTrigger must be used within Tooltip');

    return (
      <div
        ref={ctx.triggerRef as React.RefObject<HTMLDivElement>}
        onMouseEnter={ctx.onOpen}
        onMouseLeave={ctx.onClose}
        onFocus={ctx.onOpen}
        onBlur={ctx.onClose}
        {...props}
      >
        {children}
      </div>
    );
  },
);
TooltipTrigger.displayName = 'TooltipTrigger';

const TooltipContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const ctx = useContext(TooltipContext);
    if (!ctx) throw new Error('TooltipContent must be used within Tooltip');
    if (!ctx.open) return null;

    return (
      <div
        ref={ref}
        role="tooltip"
        className={cn(
          'absolute z-50 rounded-radius-md bg-foreground px-md py-xs text-label text-background shadow-2',
          'animate-in fade-in-0 zoom-in-95',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
TooltipContent.displayName = 'TooltipContent';

export { Tooltip, TooltipTrigger, TooltipContent };
