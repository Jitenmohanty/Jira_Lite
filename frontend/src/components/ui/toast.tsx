'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { setToastHandler, type ToastInput, type ToastVariant } from '@/lib/toast-bus';

interface Toast extends ToastInput {
  id: number;
}

interface ToastContextValue {
  toast: (t: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const ICONS: Record<ToastVariant, ReactNode> = {
  default: <Info size={16} className="text-muted" />,
  success: <CheckCircle2 size={16} className="text-success" />,
  error: <AlertCircle size={16} className="text-danger" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { ...input, id }]);
      window.setTimeout(() => remove(id), 4000);
    },
    [remove],
  );

  // Bridge the module-level bus to this provider so hooks can raise toasts.
  useEffect(() => {
    setToastHandler(toast);
    return () => setToastHandler(null);
  }, [toast]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="animate-slide-up pointer-events-auto flex items-start gap-2.5 rounded-lg border border-border bg-surface-elevated px-3.5 py-3 shadow-xl"
            role="status"
          >
            <span className="mt-0.5">{ICONS[t.variant ?? 'default']}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t.title}</p>
              {t.description && <p className="mt-0.5 text-xs text-muted">{t.description}</p>}
            </div>
            <button
              onClick={() => remove(t.id)}
              className={cn(
                'shrink-0 rounded p-0.5 text-faint transition-colors hover:bg-surface-hover hover:text-foreground',
              )}
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
