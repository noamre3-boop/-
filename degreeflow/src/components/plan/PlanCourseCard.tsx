import { AlertTriangle, Eye, GripVertical, Lock, MoreHorizontal, MoveRight, Plus, Undo2 } from 'lucide-react';
import { type DragEvent, useEffect, useRef } from 'react';
import { courseById } from '../../data/courses';
import { semesterById } from '../../data/program';
import { type Issue, courseStatus, futureSemesters, isMovable, moveImpact } from '../../lib/degree';
import { cn } from '../../lib/format';
import { useDegree } from '../../state/store';
import { useUI } from '../../state/ui';
import { CategoryTag } from '../course/meta';
import { Menu, type MenuItem } from '../ui/Controls';

export function PlanCourseCard({
  courseId,
  issues,
  focused,
  quickAdd,
  onDragStart,
  onDragEnd,
  dragging,
}: {
  courseId: string;
  issues: Issue[];
  focused?: boolean;
  /** Semester to offer a one-click "Add to …" button for (pool cards). */
  quickAdd?: string;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  dragging: boolean;
}) {
  const c = courseById[courseId];
  const { placements, moveCourse } = useDegree();
  const { openCourse } = useUI();
  const status = courseStatus(courseId, placements);
  const movable = isMovable(courseId, placements);
  const ref = useRef<HTMLDivElement>(null);
  const mine = issues.filter((i) =>
    i.kind === 'conflict' ? i.courseIds.includes(courseId) : i.kind !== 'overload' && i.courseIds[0] === courseId,
  );
  const worst = mine.find((i) => i.severity === 'critical') ?? mine[0];

  useEffect(() => {
    if (focused) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focused]);

  const items: MenuItem[] = [
    { key: 'view', label: 'View details', icon: <Eye className="h-3.5 w-3.5" />, onSelect: () => openCourse(courseId) },
    ...futureSemesters
      .filter((s) => s.id !== placements[courseId])
      .map((s) => {
        const impact = moveImpact(placements, courseId, s.id);
        return {
          key: s.id,
          label: `Move to ${s.label}`,
          icon: <MoveRight className="h-3.5 w-3.5" />,
          tone: impact.delays || impact.problems.length ? ('warning' as const) : ('default' as const),
          hint: [impact.delays && `Delays graduation to ${impact.newLabel}`, ...impact.problems].filter(Boolean).join(' · ') || 'No issues',
          onSelect: () => moveCourse(courseId, s.id),
        };
      }),
    ...(placements[courseId]
      ? [
          {
            key: 'remove',
            label: 'Remove from plan',
            icon: <Undo2 className="h-3.5 w-3.5" />,
            tone: c.mandatory ? ('warning' as const) : ('default' as const),
            hint: c.mandatory ? 'Required course' : 'Back to the course pool',
            onSelect: () => moveCourse(courseId, null),
          },
        ]
      : []),
  ];

  const handleDragStart = (e: DragEvent) => {
    e.dataTransfer.setData('text/plain', courseId);
    e.dataTransfer.effectAllowed = 'move';
    onDragStart(courseId);
  };

  return (
    <div
      ref={ref}
      draggable={movable}
      onDragStart={movable ? handleDragStart : undefined}
      onDragEnd={onDragEnd}
      className={cn(
        'group relative rounded-xl border bg-surface p-3 transition-[border-color,box-shadow,opacity,transform] duration-150',
        movable ? 'cursor-grab active:cursor-grabbing' : 'cursor-default',
        dragging && 'opacity-40',
        worst?.severity === 'critical'
          ? 'border-danger/40'
          : worst
            ? 'border-warning/40'
            : 'border-line hover:border-line-strong',
        focused && 'border-accent/60 shadow-glow',
        status === 'in-progress' && 'bg-raised/30',
      )}
    >
      <div className="flex items-start gap-2">
        <span className={cn('mt-0.5 shrink-0 text-subtle', movable ? 'opacity-40 group-hover:opacity-100' : 'opacity-60')} aria-hidden>
          {movable ? <GripVertical className="h-3.5 w-3.5" /> : <Lock className="h-3 w-3" />}
        </span>
        <button
          onClick={() => openCourse(courseId)}
          className="min-w-0 flex-1 text-left"
          aria-label={`${c.name}, ${c.credits} credits. Open details`}
        >
          <span className="flex items-center gap-2">
            <span className="font-mono text-2xs text-subtle">{c.code}</span>
            {status === 'in-progress' && <span className="h-1.5 w-1.5 rounded-full bg-violet" aria-label="In progress" />}
            {c.mandatory && <span className="text-2xs text-subtle">· Required</span>}
          </span>
          <span className="mt-0.5 block text-sm font-medium leading-snug text-fg">{c.name}</span>
          <span className="mt-1.5 flex items-center gap-3">
            <span className="tnum text-2xs text-muted">{c.credits} cr</span>
            <CategoryTag category={c.category} />
            <span className="text-2xs text-subtle">~{c.workload}h/wk</span>
          </span>
        </button>
        {movable && (
          <Menu
            header={c.code}
            width={250}
            items={items}
            trigger={(p) => (
              <button
                {...p}
                aria-label={`Actions for ${c.name}`}
                className="-mr-1 -mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-md text-subtle opacity-70 transition hover:bg-raised hover:text-fg group-hover:opacity-100"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            )}
          />
        )}
      </div>

      {worst && (
        <p
          className={cn(
            'mt-2.5 flex items-start gap-1.5 rounded-lg px-2 py-1.5 text-2xs leading-relaxed',
            worst.severity === 'critical' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning',
          )}
        >
          <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
          <span>
            {worst.kind === 'conflict'
              ? `Time conflict with ${courseById[worst.courseIds.find((id) => id !== courseId) ?? courseId].name}`
              : worst.kind === 'prerequisite'
                ? worst.detail
                : worst.title}
          </span>
        </p>
      )}

      {quickAdd && (
        <button
          onClick={() => moveCourse(courseId, quickAdd)}
          className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-accent/40 py-1.5 text-xs font-medium text-accent transition hover:border-accent hover:bg-accent/10"
        >
          <Plus className="h-3.5 w-3.5" />
          Add to {semesterById[quickAdd].label}
        </button>
      )}
    </div>
  );
}
