import { BarChart3, Table2 } from 'lucide-react';
import { type MouseEvent as ReactMouseEvent, type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { cn } from '../../lib/format';
import { Card } from '../ui/Card';

/**
 * Small dependency-free SVG charts. Marks follow one spec everywhere: ≤24px columns with
 * 4px rounded data-ends, 2px lines, ≥8px markers with a surface ring, hairline solid gridlines,
 * text in text tokens (never in series colors), a hover layer, and a table view.
 */

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

function niceTicks(max: number, count = 4) {
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 3, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const top = Math.ceil(max / step) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
}

export interface LegendItem {
  label: string;
  swatch: string;
  shape?: 'square' | 'line' | 'dashed';
}

export function Legend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5 text-2xs text-muted">
          {i.shape === 'line' ? (
            <span className={cn('h-0.5 w-3 rounded-full', i.swatch)} />
          ) : i.shape === 'dashed' ? (
            <span className={cn('w-3 border-t-2 border-dashed', i.swatch)} />
          ) : (
            <span className={cn('h-2 w-2 rounded-[3px]', i.swatch)} />
          )}
          {i.label}
        </li>
      ))}
    </ul>
  );
}

export function ChartCard({
  title,
  description,
  legend,
  table,
  children,
  className,
}: {
  title: string;
  description?: string;
  legend?: ReactNode;
  table: { columns: string[]; rows: (string | number)[][] };
  children: ReactNode;
  className?: string;
}) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  return (
    <Card className={cn('flex flex-col p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight text-fg">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
        </div>
        <div className="flex shrink-0 rounded-lg border border-line p-0.5" role="group" aria-label="Chart view">
          {(['chart', 'table'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              aria-pressed={view === v}
              aria-label={v === 'chart' ? 'Chart view' : 'Table view'}
              className={cn(
                'grid h-6 w-7 place-items-center rounded-md transition',
                view === v ? 'bg-raised text-fg' : 'text-subtle hover:text-fg',
              )}
            >
              {v === 'chart' ? <BarChart3 className="h-3.5 w-3.5" /> : <Table2 className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      </div>
      {legend && view === 'chart' && <div className="mt-3">{legend}</div>}
      <div className="mt-4 flex-1">
        {view === 'chart' ? (
          children
        ) : (
          <div className="max-h-[240px] overflow-y-auto rounded-lg border border-line">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-surface text-2xs uppercase tracking-wider text-subtle">
                <tr>
                  {table.columns.map((c, i) => (
                    <th key={c} className={cn('border-b border-line px-3 py-2 font-medium', i ? 'text-right' : 'text-left')}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {table.rows.map((r, i) => (
                  <tr key={i}>
                    {r.map((cell, j) => (
                      <td key={j} className={cn('tnum px-3 py-2', j ? 'text-right text-fg' : 'text-muted')}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}

function Tooltip({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  const w = 156;
  const left = Math.max(0, Math.min(width - w, x - w / 2));
  return (
    <div
      className="pointer-events-none absolute z-10 rounded-lg border border-line bg-surface/95 px-3 py-2 text-xs shadow-pop backdrop-blur"
      style={{ left, top: Math.max(0, y - 64), width: w }}
    >
      {children}
    </div>
  );
}

const M = { top: 10, right: 8, bottom: 26, left: 32 };

// ── Column chart ────────────────────────────────────────────────────────────

export interface ColumnDatum {
  label: string;
  short: string;
  value: number;
  fill: string; // CSS color
  status: string;
}

export function ColumnChart({
  data,
  height = 200,
  unit,
  threshold,
}: {
  data: ColumnDatum[];
  height?: number;
  unit: string;
  threshold?: { value: number; label: string };
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.value), threshold?.value ?? 0) * 1.05;
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  const iw = Math.max(0, width - M.left - M.right);
  const ih = height - M.top - M.bottom;
  const band = iw / Math.max(1, data.length);
  const bw = Math.min(24, band * 0.56);
  const y = (v: number) => M.top + ih - (v / top) * ih;
  const r = 4;
  const showEvery = band < 34 ? 2 : 1;

  return (
    <div ref={ref} className="relative" onMouseLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Column chart">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} stroke="rgb(var(--line))" strokeWidth={1} />
              <text x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="tnum fill-subtle text-[10px]">
                {t}
              </text>
            </g>
          ))}
          {threshold && (
            <g>
              <line
                x1={M.left}
                x2={width - M.right}
                y1={y(threshold.value)}
                y2={y(threshold.value)}
                stroke="rgb(var(--warning))"
                strokeOpacity={0.7}
                strokeWidth={1}
              />
              <text
                x={width - M.right}
                y={y(threshold.value) < M.top + 14 ? y(threshold.value) + 13 : y(threshold.value) - 5}
                textAnchor="end"
                className="fill-muted text-[10px]"
              >
                {threshold.label}
              </text>
            </g>
          )}
          {data.map((d, i) => {
            const cx = M.left + band * i + band / 2;
            const h = Math.max(0, y(0) - y(d.value));
            const x0 = cx - bw / 2;
            const yTop = y(d.value);
            const rr = Math.min(r, h);
            // Rounded data-end, square at the baseline.
            const path = `M${x0},${y(0)} V${yTop + rr} Q${x0},${yTop} ${x0 + rr},${yTop} H${x0 + bw - rr} Q${x0 + bw},${yTop} ${x0 + bw},${yTop + rr} V${y(0)} Z`;
            return (
              <g key={d.label}>
                <rect
                  x={M.left + band * i}
                  y={M.top}
                  width={band}
                  height={ih}
                  fill={hover === i ? 'rgb(var(--raised))' : 'transparent'}
                  opacity={0.6}
                  onMouseEnter={() => setHover(i)}
                />
                {h > 0 && <path d={path} fill={d.fill} opacity={hover === null || hover === i ? 1 : 0.55} className="pointer-events-none transition-opacity" />}
                {i % showEvery === 0 && (
                  <text x={cx} y={height - 8} textAnchor="middle" className="fill-subtle text-[10px]">
                    {d.short}
                  </text>
                )}
              </g>
            );
          })}
          <line x1={M.left} x2={width - M.right} y1={y(0)} y2={y(0)} stroke="rgb(var(--line-strong))" strokeWidth={1} />
        </svg>
      )}
      {hover !== null && data[hover] && (
        <Tooltip x={M.left + band * hover + band / 2} y={y(data[hover].value)} width={width}>
          <p className="font-medium text-fg">{data[hover].label}</p>
          <p className="mt-0.5 flex items-center justify-between text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-[3px]" style={{ background: data[hover].fill }} />
              {data[hover].status}
            </span>
            <span className="tnum text-fg">
              {data[hover].value} {unit}
            </span>
          </p>
        </Tooltip>
      )}
    </div>
  );
}

// ── Line chart ──────────────────────────────────────────────────────────────

export interface LinePoint {
  label: string;
  short: string;
  value: number;
  projected?: boolean;
}

export function LineChart({
  points,
  height = 200,
  min = 0,
  max,
  unit,
  reference,
  format = (v: number) => String(v),
}: {
  points: LinePoint[];
  height?: number;
  min?: number;
  max?: number;
  unit?: string;
  reference?: { value: number; label: string };
  format?: (v: number) => string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const areaId = `area-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const hi = max ?? Math.max(...points.map((p) => p.value), reference?.value ?? 0);
  const ticks = niceTicks(hi - min).map((t) => t + min);
  const top = ticks[ticks.length - 1];
  const iw = Math.max(0, width - M.left - M.right);
  const ih = height - M.top - M.bottom;
  const pad = 18; // keep end labels and markers inside the plot
  const step = (iw - pad * 2) / Math.max(1, points.length - 1);
  const x = (i: number) => M.left + pad + step * i;
  const y = (v: number) => M.top + ih - ((v - min) / (top - min)) * ih;
  const firstProjected = points.findIndex((p) => p.projected);
  const solid = firstProjected === -1 ? points : points.slice(0, firstProjected);
  const dashed = firstProjected === -1 ? [] : points.slice(firstProjected - 1);
  const toPath = (pts: LinePoint[], offset: number) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(i + offset)},${y(p.value)}`).join(' ');
  const area = solid.length
    ? `${toPath(solid, 0)} L${x(solid.length - 1)},${y(min)} L${x(0)},${y(min)} Z`
    : '';
  const showEvery = step < 34 ? 2 : 1;

  const onMove = (e: ReactMouseEvent<SVGRectElement>) => {
    const rect = (e.currentTarget as SVGRectElement).getBoundingClientRect();
    const i = Math.round((e.clientX - rect.left - pad) / step);
    setHover(Math.max(0, Math.min(points.length - 1, i)));
  };

  return (
    <div ref={ref} className="relative" onMouseLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Line chart">
          <defs>
            <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--chart-1))" stopOpacity={0.16} />
              <stop offset="100%" stopColor="rgb(var(--chart-1))" stopOpacity={0} />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} stroke="rgb(var(--line))" strokeWidth={1} />
              <text x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="tnum fill-subtle text-[10px]">
                {format(t)}
              </text>
            </g>
          ))}
          {reference && (
            <g>
              <line x1={M.left} x2={width - M.right} y1={y(reference.value)} y2={y(reference.value)} stroke="rgb(var(--muted))" strokeOpacity={0.5} strokeWidth={1} />
              <text
                x={width - M.right}
                y={y(reference.value) < M.top + 14 ? y(reference.value) + 13 : y(reference.value) - 5}
                textAnchor="end"
                className="fill-muted text-[10px]"
              >
                {reference.label}
              </text>
            </g>
          )}
          {area && <path d={area} fill={`url(#${areaId})`} />}
          <path d={toPath(solid, 0)} fill="none" stroke="rgb(var(--chart-1))" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {dashed.length > 1 && (
            <path
              d={toPath(dashed, firstProjected - 1)}
              fill="none"
              stroke="rgb(var(--chart-2))"
              strokeWidth={2}
              strokeDasharray="4 4"
              strokeLinecap="round"
            />
          )}
          {/* end-point markers */}
          {[...new Set([solid.length - 1, points.length - 1])].map((i) =>
            i >= 0 ? (
              <circle
                key={i}
                cx={x(i)}
                cy={y(points[i].value)}
                r={4.5}
                fill={points[i].projected ? 'rgb(var(--chart-2))' : 'rgb(var(--chart-1))'}
                stroke="rgb(var(--surface))"
                strokeWidth={2}
              />
            ) : null,
          )}
          {points.map((p, i) =>
            i % showEvery === 0 || i === points.length - 1 ? (
              <text key={p.label} x={x(i)} y={height - 8} textAnchor="middle" className="fill-subtle text-[10px]">
                {p.short}
              </text>
            ) : null,
          )}
          {hover !== null && (
            <g className="pointer-events-none">
              <line x1={x(hover)} x2={x(hover)} y1={M.top} y2={y(min)} stroke="rgb(var(--line-strong))" strokeWidth={1} />
              <circle
                cx={x(hover)}
                cy={y(points[hover].value)}
                r={5}
                fill={points[hover].projected ? 'rgb(var(--chart-2))' : 'rgb(var(--chart-1))'}
                stroke="rgb(var(--surface))"
                strokeWidth={2}
              />
            </g>
          )}
          <rect x={M.left} y={M.top} width={iw} height={ih} fill="transparent" onMouseMove={onMove} />
        </svg>
      )}
      {hover !== null && points[hover] && (
        <Tooltip x={x(hover)} y={y(points[hover].value)} width={width}>
          <p className="font-medium text-fg">{points[hover].label}</p>
          <p className="mt-0.5 flex items-center justify-between text-muted">
            <span>{points[hover].projected ? 'Projected' : 'Actual'}</span>
            <span className="tnum text-fg">
              {format(points[hover].value)}
              {unit ? ` ${unit}` : ''}
            </span>
          </p>
        </Tooltip>
      )}
    </div>
  );
}
