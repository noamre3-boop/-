import { useId } from 'react';
import { cn } from '../../lib/format';

export function LogoMark({ className }: { className?: string }) {
  // Unique per instance: a gradient defined inside a hidden copy (e.g. the desktop sidebar) won't paint elsewhere.
  const id = `df-mark-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <svg viewBox="0 0 32 32" className={cn('h-7 w-7', className)} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgb(var(--accent))" />
          <stop offset="100%" stopColor="rgb(var(--violet))" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="31" height="31" rx="9" fill="rgb(var(--raised))" stroke="rgb(var(--line-strong))" />
      <path
        d="M8 21.5c3.2 0 4.4-11 8.2-11 3.3 0 3.2 6.2 7.8 6.2"
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="24" cy="16.7" r="2.2" fill="rgb(var(--violet))" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="text-[0.95rem] font-semibold tracking-tight text-fg">DegreeFlow</span>
    </span>
  );
}
