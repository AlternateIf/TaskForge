import { cn } from '@/lib/utils';
import { CheckCircle2, Info, AlertTriangle as WarningIcon, X, XCircle } from 'lucide-react';
import { type ReactNode, createContext, useCallback, useContext, useState } from 'react';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
  action?: ReactNode;
}

interface ToastContextValue {
  toasts: Toast[];
  toast: (toast: Omit<Toast, 'id'>) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = `toast-${++toastCounter}`;
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 5000);
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <section
        className="fixed bottom-xl right-xl z-[100] flex flex-col gap-sm"
        aria-label="Notifications"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </section>
    </ToastContext.Provider>
  );
}

const variantIcons = {
  default: Info,
  success: CheckCircle2,
  warning: WarningIcon,
  error: XCircle,
};

const variantStyles = {
  default: 'text-brand-primary [&>svg]:text-brand-primary',
  success: 'text-success [&>svg]:text-success',
  warning: 'text-warning [&>svg]:text-warning',
  error: 'text-danger [&>svg]:text-danger',
};

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const variant = t.variant ?? 'default';
  const Icon = variantIcons[variant];

  return (
    <div
      className={cn(
        'flex items-start gap-md rounded-radius-lg bg-surface-container-lowest p-md shadow-3 min-w-[300px] max-w-[420px]',
        variantStyles[variant],
      )}
      role="alert"
    >
      <Icon className="mt-0.5 size-5 shrink-0" strokeWidth={2} />
      <div className="flex-1">
        <p className="text-body font-medium text-foreground">{t.title}</p>
        {t.description ? <p className="mt-xs text-small text-secondary">{t.description}</p> : null}
        {t.action ? <div className="mt-sm">{t.action}</div> : null}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(t.id)}
        className="shrink-0 rounded-radius-sm p-xs text-muted hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="size-4" strokeWidth={2} />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
