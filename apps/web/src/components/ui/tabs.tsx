import { cn } from '@/lib/utils';
import {
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
  createContext,
  forwardRef,
  useContext,
  useState,
} from 'react';

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

interface TabsProps extends HTMLAttributes<HTMLDivElement> {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
}

function Tabs({
  defaultValue,
  value: controlledValue,
  onValueChange,
  children,
  ...props
}: TabsProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const value = controlledValue ?? uncontrolledValue;
  const handleChange = onValueChange ?? setUncontrolledValue;

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleChange }}>
      <div {...props}>{children}</div>
    </TabsContext.Provider>
  );
}

const TabsList = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="tablist"
      className={cn(
        'inline-flex items-center gap-xs rounded-radius-lg bg-surface-container-low p-xs',
        className,
      )}
      {...props}
    />
  ),
);
TabsList.displayName = 'TabsList';

interface TabsTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

const TabsTrigger = forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, ...props }, ref) => {
    const ctx = useContext(TabsContext);
    if (!ctx) throw new Error('TabsTrigger must be used within Tabs');
    const isActive = ctx.value === value;

    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        aria-selected={isActive}
        onClick={() => ctx.onValueChange(value)}
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap rounded-radius-md px-md py-xs text-body font-medium transition-all',
          isActive
            ? 'bg-surface-container-lowest text-foreground shadow-1'
            : 'text-secondary hover:text-foreground',
          className,
        )}
        {...props}
      />
    );
  },
);
TabsTrigger.displayName = 'TabsTrigger';

interface TabsContentProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
}

const TabsContent = forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, ...props }, ref) => {
    const ctx = useContext(TabsContext);
    if (!ctx) throw new Error('TabsContent must be used within Tabs');
    if (ctx.value !== value) return null;

    return <div ref={ref} role="tabpanel" className={cn('mt-sm', className)} {...props} />;
  },
);
TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent };
