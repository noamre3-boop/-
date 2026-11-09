import { Search, X } from 'lucide-react';
import {
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/format';

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
  className,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; count?: number }[];
  size?: 'sm' | 'md';
  className?: string;
  label: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn('inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg border border-line bg-raised/50 p-0.5', className)}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-[background-color,color,box-shadow] duration-150',
              size === 'sm' ? 'h-6 px-2 text-2xs' : 'h-7 px-2.5 text-xs',
              active ? 'bg-surface text-fg shadow-card ring-1 ring-line' : 'text-muted hover:text-fg',
            )}
          >
            {o.label}
            {o.count !== undefined && (
              <span className={cn('tnum rounded px-1 text-2xs', active ? 'bg-raised text-muted' : 'text-subtle')}>{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-200',
        checked ? 'border-accent/40 bg-accent' : 'border-line-strong bg-raised',
      )}
    >
      <span
        className={cn(
          'inline-block h-3.5 w-3.5 rounded-full shadow transition-transform duration-200',
          checked ? 'translate-x-[18px] bg-accent-fg' : 'translate-x-[2px] bg-muted',
        )}
      />
    </button>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search',
  className,
  autoFocus,
  onKeyDown,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-subtle" aria-hidden />
      <input
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9 w-full rounded-lg border border-line bg-surface pl-8 pr-8 text-sm text-fg placeholder:text-subtle transition focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/15"
      />
      {value && (
        <button
          aria-label="Clear search"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded text-subtle hover:bg-raised hover:text-fg"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

export interface MenuItem {
  key: string;
  label: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  tone?: 'default' | 'warning' | 'danger';
  onSelect: () => void;
}

/** Accessible dropdown menu rendered in a portal so it never gets clipped by scroll containers. */
export function Menu({
  trigger,
  items,
  header,
  align = 'end',
  width = 240,
}: {
  trigger: (props: { onClick: () => void; 'aria-expanded': boolean; 'aria-haspopup': 'menu' }) => ReactNode;
  items: MenuItem[];
  header?: ReactNode;
  align?: 'start' | 'end';
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLSpanElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const place = useCallback(() => {
    if (!anchor.current) return;
    const r = anchor.current.getBoundingClientRect();
    const left = align === 'end' ? r.right - width : r.left;
    const h = menu.current?.offsetHeight ?? 44 + items.length * 44;
    const top = r.bottom + 6 + h > window.innerHeight ? Math.max(8, r.top - 6 - h) : r.bottom + 6;
    setPos({ top, left: Math.max(8, Math.min(left, window.innerWidth - width - 8)) });
  }, [align, width, items.length]);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (menu.current?.contains(e.target as Node) || anchor.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const btns = [...(menu.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? [])];
        const i = btns.indexOf(document.activeElement as HTMLButtonElement);
        const next = e.key === 'ArrowDown' ? (i + 1) % btns.length : (i - 1 + btns.length) % btns.length;
        btns[next]?.focus();
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    const t = window.setTimeout(() => {
      place();
      menu.current?.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus({ preventScroll: true });
    }, 10);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      window.clearTimeout(t);
    };
  }, [open, place]);

  return (
    <>
      <span ref={anchor} className="inline-flex">
        {trigger({ onClick: () => setOpen((o) => !o), 'aria-expanded': open, 'aria-haspopup': 'menu' })}
      </span>
      {open &&
        createPortal(
          <div
            ref={menu}
            role="menu"
            className="fixed z-[80] animate-scale-in overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-pop"
            style={{ top: pos.top, left: pos.left, width }}
          >
            {header && <div className="px-2.5 pb-1.5 pt-2 text-2xs font-medium uppercase tracking-wider text-subtle">{header}</div>}
            {items.map((it) => (
              <button
                key={it.key}
                role="menuitem"
                disabled={it.disabled}
                onClick={() => {
                  setOpen(false);
                  it.onSelect();
                }}
                className={cn(
                  'flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm outline-none transition-colors',
                  'hover:bg-raised focus-visible:bg-raised disabled:cursor-not-allowed disabled:opacity-40',
                  it.tone === 'danger' ? 'text-danger' : 'text-fg',
                )}
              >
                {it.icon && <span className="mt-0.5 shrink-0 text-muted">{it.icon}</span>}
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{it.label}</span>
                  {it.hint && (
                    <span className={cn('mt-0.5 block text-2xs', it.tone === 'warning' ? 'text-warning' : 'text-subtle')}>
                      {it.hint}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-line bg-raised px-1 font-sans text-2xs font-medium text-subtle">
      {children}
    </kbd>
  );
}
