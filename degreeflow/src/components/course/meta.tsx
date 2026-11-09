import {
  BadgeCheck,
  BookOpenText,
  CheckCircle2,
  CircleDashed,
  CircleDot,
  CircleMinus,
  CircleX,
  Cpu,
  Layers,
  FlagTriangleRight,
  type LucideIcon,
  Shapes,
  Sigma,
  Timer,
} from 'lucide-react';
import { requirementGroups } from '../../data/program';
import { cn } from '../../lib/format';
import type { CategoryId, CourseStatus } from '../../types';
import { Badge, type Tone } from '../ui/Badge';

/** Categories are identified by glyph + label (not color), keeping the palette calm. */
export const categoryIcon: Record<CategoryId, LucideIcon> = {
  core: Cpu,
  math: Sigma,
  elective: Shapes,
  project: FlagTriangleRight,
  general: BookOpenText,
  preparatory: Layers,
};

export const categoryLabel = {
  ...Object.fromEntries(requirementGroups.map((g) => [g.id, g.shortName])),
  preparatory: 'Not in program',
} as Record<CategoryId, string>;

export const statusMeta: Record<CourseStatus, { label: string; tone: Tone; icon: LucideIcon }> = {
  completed: { label: 'Completed', tone: 'accent', icon: CheckCircle2 },
  'in-progress': { label: 'In progress', tone: 'violet', icon: Timer },
  planned: { label: 'Planned', tone: 'neutral', icon: CircleDot },
  unscheduled: { label: 'Not scheduled', tone: 'neutral', icon: CircleDashed },
  failed: { label: 'Failed', tone: 'danger', icon: CircleX },
  exempt: { label: 'Exempt', tone: 'success', icon: BadgeCheck },
  'not-counted': { label: 'Not counted', tone: 'neutral', icon: CircleMinus },
};

export function StatusBadge({ status, mandatory }: { status: CourseStatus; mandatory?: boolean }) {
  const m = statusMeta[status];
  const tone: Tone = status === 'unscheduled' && mandatory ? 'danger' : m.tone;
  return (
    <Badge tone={tone} icon={m.icon}>
      {status === 'unscheduled' && mandatory ? 'Missing' : m.label}
    </Badge>
  );
}

export function CategoryTag({ category, className }: { category: CategoryId; className?: string }) {
  const Icon = categoryIcon[category];
  return (
    <span className={cn('inline-flex items-center gap-1 text-2xs text-subtle', className)}>
      <Icon className="h-3 w-3" aria-hidden />
      {categoryLabel[category]}
    </span>
  );
}

/** Small status glyph used inside dense lists. */
export function StatusDot({ status, mandatory }: { status: CourseStatus; mandatory?: boolean }) {
  return (
    <span
      className={cn(
        'inline-block h-2 w-2 shrink-0 rounded-full',
        (status === 'completed' || status === 'exempt') && 'bg-accent',
        status === 'failed' && 'bg-danger',
        status === 'not-counted' && 'border border-subtle bg-transparent',
        status === 'in-progress' && 'bg-violet',
        status === 'planned' && 'border border-muted bg-transparent',
        status === 'unscheduled' && (mandatory ? 'border border-dashed border-danger' : 'border border-dashed border-subtle'),
      )}
      aria-hidden
    />
  );
}
