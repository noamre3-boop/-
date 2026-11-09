import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { type ReactNode, createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { cn } from '../lib/format';

export interface ToastInput {
  title: string;
  description?: string;
  tone?: 'success' | 'warning' | 'info' | 'danger';
  action?: { label: string; onClick: () => void };
  duration?: number;
}

interface ToastItem extends ToastInput {
  id: number;
}

const Ctx = createContext<((t: ToastInput) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);

  const toast = useCallback(
    (t: ToastInput) => {
      const id = ++seq.current;
      setItems((xs) => [...xs.slice(-1), { ...t, id }]);
      window.setTimeout(() => dismiss(id), t.duration ?? (t.action ? 6500 : 4000));
    },
    [dismiss],
  );

  const value = useMemo(() => toast, [toast]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
      >
        {items.map((t) => {
          const Icon = t.tone === 'warning' || t.tone === 'danger' ? AlertTriangle : t.tone === 'success' ? CheckCircle2 : Info;
          return (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto flex w-full max-w-sm animate-scale-in items-start gap-3 rounded-xl border border-line bg-surface/95 p-3.5 shadow-pop backdrop-blur-md"
            >
              <Icon
                className={cn(
                  'mt-0.5 h-4 w-4 shrink-0',
                  t.tone === 'warning' && 'text-warning',
                  t.tone === 'danger' && 'text-danger',
                  t.tone === 'success' && 'text-success',
                  (!t.tone || t.tone === 'info') && 'text-accent',
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-fg">{t.title}</p>
                {t.description && <p className="mt-0.5 text-xs leading-relaxed text-muted">{t.description}</p>}
              </div>
              {t.action && (
                <button
                  className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-accent transition hover:bg-accent/10"
                  onClick={() => {
                    t.action!.onClick();
                    dismiss(t.id);
                  }}
                >
                  {t.action.label}
                </button>
              )}
              <button
                aria-label="Dismiss notification"
                className="shrink-0 rounded-md p-1 text-subtle transition hover:bg-raised hover:text-fg"
                onClick={() => dismiss(t.id)}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
