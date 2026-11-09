import { type ReactNode, useEffect, useId, useState } from 'react';
import { cn } from '../../lib/format';

/** Animates from 0 to the value on mount, then follows changes smoothly. */
function useAnimatedValue(value: number) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setV(value));
    return () => cancelAnimationFrame(id);
  }, [value]);
  return v;
}

export function ProgressBar({
  value,
  max = 100,
  tone = 'accent',
  size = 'md',
  className,
  label,
}: {
  value: number;
  max?: number;
  tone?: 'accent' | 'violet' | 'success' | 'warning' | 'danger' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const animated = useAnimatedValue(pct);
  const fill = {
    accent: 'bg-accent',
    violet: 'bg-violet',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    neutral: 'bg-subtle',
  }[tone];
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn('w-full overflow-hidden rounded-full bg-line/70', size === 'sm' ? 'h-1' : 'h-1.5', className)}
    >
      <div className={cn('h-full rounded-full transition-[width] duration-700 ease-out', fill)} style={{ width: `${animated}%` }} />
    </div>
  );
}

export interface Segment {
  key: string;
  label: string;
  value: number;
  className: string;
}

/** One whole split into parts (completed / in progress / planned). Thin segmented bar with 2px gaps. */
export function SegmentedBar({
  segments,
  total,
  height = 8,
  className,
  label,
}: {
  segments: Segment[];
  total: number;
  height?: number;
  className?: string;
  label: string;
}) {
  const animated = useAnimatedValue(1);
  const visible = segments.filter((s) => s.value > 0);
  const filled = visible.reduce((a, s) => a + s.value, 0);
  const desc = segments.map((s) => `${s.label}: ${s.value}`).join(', ');
  return (
    <div
      role="img"
      aria-label={`${label}. ${desc}, of ${total}.`}
      className={cn('flex w-full gap-[2px] overflow-hidden rounded-full', className)}
      style={{ height }}
    >
      {visible.map((s) => (
        <div
          key={s.key}
          title={`${s.label}: ${s.value}`}
          className={cn('h-full rounded-full transition-[flex-grow] duration-700 ease-out', s.className)}
          style={{ flexGrow: animated ? s.value : 0.0001, flexBasis: 0 }}
        />
      ))}
      {filled < total && (
        <div className="h-full rounded-full bg-line/70" style={{ flexGrow: total - filled, flexBasis: 0 }} />
      )}
    </div>
  );
}

export function ProgressRing({
  value,
  secondary = 0,
  size = 168,
  stroke = 10,
  children,
}: {
  value: number;
  /** Optional second arc (e.g. in-progress), drawn after the primary arc. */
  secondary?: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const gradId = `ring-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const a = useAnimatedValue(value);
  const b = useAnimatedValue(secondary);
  const gap = 0.012 * c; // small surface gap between arcs
  const primaryLen = (a / 100) * c;
  const secondaryLen = Math.max(0, (b / 100) * c - (b > 0 ? gap : 0));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgb(var(--accent))" />
            <stop offset="100%" stopColor="rgb(var(--chart-1))" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--line))" strokeWidth={stroke} />
        {secondary > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgb(var(--violet))"
            strokeOpacity={0.75}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${secondaryLen} ${c}`}
            strokeDashoffset={-(primaryLen + gap)}
            className="transition-[stroke-dasharray,stroke-dashoffset] duration-1000 ease-out"
          />
        )}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${primaryLen} ${c}`}
          className="transition-[stroke-dasharray] duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
