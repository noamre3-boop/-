import { X } from 'lucide-react';
import { type ReactNode, type RefObject, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/format';

let locks = 0;
function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    locks++;
    document.body.style.overflow = 'hidden';
    return () => {
      locks--;
      if (!locks) document.body.style.overflow = '';
    };
  }, [active]);
}

function useEscape(active: boolean, onClose: () => void) {
  const ref = useRef(onClose);
  ref.current = onClose;
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') ref.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);
}

/** Move focus into the panel when it opens and restore it on close. */
function useFocusReturn(active: boolean, panel: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    if (!active) return;
    const prev = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => {
      // Respect autoFocus inside the panel; otherwise focus the panel itself.
      if (!panel.current?.contains(document.activeElement)) panel.current?.focus();
    }, 10);
    return () => {
      window.clearTimeout(t);
      prev?.focus?.();
    };
  }, [active, panel]);
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  width = 'max-w-md',
  side = 'right',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
  side?: 'right' | 'left';
}) {
  const panel = useRef<HTMLDivElement>(null);
  useScrollLock(open);
  useEscape(open, onClose);
  useFocusReturn(open, panel);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 animate-fade-in bg-canvas/60 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          'absolute inset-y-0 flex w-full flex-col border-line bg-surface pb-[env(safe-area-inset-bottom,0px)] pt-[env(safe-area-inset-top,0px)] shadow-pop outline-none',
          width,
          side === 'right' ? 'right-0 animate-slide-in-right border-l' : 'left-0 animate-slide-in-left border-r',
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function DrawerClose({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      aria-label="Close"
      className="grid h-8 w-8 place-items-center rounded-lg text-subtle transition hover:bg-raised hover:text-fg"
    >
      <X className="h-4 w-4" />
    </button>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useScrollLock(open);
  useEscape(open, onClose);
  useFocusReturn(open, panel);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 animate-fade-in bg-canvas/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn('relative w-full max-w-lg animate-scale-in rounded-2xl border border-line bg-surface shadow-pop outline-none', className)}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
