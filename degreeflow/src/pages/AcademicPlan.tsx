import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  GraduationCap,
  Inbox,
  Lock,
  RotateCcw,
  Sparkles,
  Undo2,
} from 'lucide-react';
import { type DragEvent, useMemo, useState } from 'react';
import { InsightsPanel } from '../components/insights/InsightsPanel';
import { PlanCourseCard } from '../components/plan/PlanCourseCard';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, PageHeader } from '../components/ui/Card';
import { SearchInput, Segmented } from '../components/ui/Controls';
import { ProgressBar } from '../components/ui/Progress';
import { EmptyState } from '../components/ui/States';
import { milestones } from '../data/calendar';
import { courseById, courses } from '../data/courses';
import { program } from '../data/program';
import {
  type SemesterLoad,
  applyMove,
  moveImpact,
  unmetPrerequisites,
  attemptsIn,
  creditLimit,
  isPlannable,
  priorCredits,
  futureSemesters,
} from '../lib/degree';
import { cn, daysUntil, formatDate, plural, relativeDays } from '../lib/format';
import { useRoute } from '../lib/router';
import { useDegree } from '../state/store';
import { useUI } from '../state/ui';

type PoolFilter = 'all' | 'required' | 'elective' | 'fits';

export function AcademicPlan() {
  const { params } = useRoute();
  const focus = params.get('focus');
  const { loads, issues, projection, summary, prefs, placements, canUndo, undo, resetPlan, moveCourse, insights } = useDegree();
  const { setInsightsOpen } = useUI();
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  const past = loads.filter((l) => l.semester.status === 'completed');
  const active = loads.filter(
    (l) =>
      l.semester.status !== 'completed' &&
      (prefs.includeSummer || l.semester.term !== 'summer' || l.courses.length > 0),
  );
  const nextReg = milestones.find((m) => m.type === 'registration' && daysUntil(m.date) >= 0);
  const attention = insights.filter((i) => i.severity === 'critical' || i.severity === 'warning').length;

  const drop = (to: string | null) => (e: DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || dragging;
    setOver(null);
    setDragging(null);
    if (id) moveCourse(id, to);
  };

  const dragProps = {
    onDragStart: (id: string) => setDragging(id),
    onDragEnd: () => {
      setDragging(null);
      setOver(null);
    },
  };

  const gradStatus = {
    'on-track': { tone: 'success' as const, label: 'On track', icon: CheckCircle2 },
    'at-risk': { tone: 'danger' as const, label: 'At risk', icon: AlertTriangle },
    delayed: { tone: 'warning' as const, label: 'Delayed', icon: AlertTriangle },
  }[projection.status];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Planning"
        title="Academic Plan"
        description="Arrange your remaining semesters. Drag courses between semesters, or use a course’s menu to move it."
        actions={
          <>
            <Button size="sm" variant="ghost" icon={Undo2} disabled={!canUndo} onClick={undo}>
              Undo
            </Button>
            <Button size="sm" variant="secondary" icon={RotateCcw} onClick={resetPlan}>
              Reset
            </Button>
            <Button size="sm" variant="secondary" icon={Sparkles} className="xl:hidden" onClick={() => setInsightsOpen(true)}>
              Insights{attention ? ` · ${attention}` : ''}
            </Button>
          </>
        }
      />

      {/* Summary strip */}
      <Card className="grid grid-cols-2 lg:grid-cols-4">
        <div className="border-b border-r border-line p-4 sm:p-5 lg:border-b-0">
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <GraduationCap className="h-3.5 w-3.5" /> Projected graduation
          </p>
          <p className="mt-1.5 text-xl font-semibold tracking-tight text-fg">{projection.label}</p>
          <div className="mt-1.5">
            <Badge tone={gradStatus.tone} icon={gradStatus.icon}>
              {gradStatus.label}
            </Badge>
          </div>
        </div>
        <div className="border-b border-line p-4 sm:p-5 lg:border-b-0 lg:border-r">
          <p className="text-xs text-muted">Credits covered by plan</p>
          <p className="mt-1.5 text-xl font-semibold tracking-tight text-fg">
            {summary.completed + summary.inProgress + summary.planned}
            <span className="text-sm font-normal text-subtle"> / {program.totalCredits}</span>
          </p>
          <ProgressBar
            className="mt-2.5"
            size="sm"
            label="Credits covered by plan"
            value={summary.completed + summary.inProgress + summary.planned}
            max={program.totalCredits}
            tone={summary.unplanned ? 'warning' : 'accent'}
          />
        </div>
        <div className="border-r border-line p-4 sm:p-5">
          <p className="text-xs text-muted">Plan issues</p>
          <p className="mt-1.5 text-xl font-semibold tracking-tight text-fg">{issues.length}</p>
          <p className="mt-1 text-2xs text-subtle">
            {issues.length
              ? `${issues.filter((i) => i.severity === 'critical').length} blocking · ${plural(issues.filter((i) => i.severity === 'warning').length, 'warning')}`
              : 'Everything checks out'}
          </p>
        </div>
        <div className="p-4 sm:p-5">
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <CalendarClock className="h-3.5 w-3.5" /> Next registration
          </p>
          <p className="mt-1.5 text-xl font-semibold tracking-tight text-fg">{nextReg ? formatDate(nextReg.date) : '—'}</p>
          <p className="mt-1 text-2xs text-subtle">{nextReg ? `${relativeDays(nextReg.date)} · ${futureSemesters[0].label}` : 'No upcoming window'}</p>
        </div>
      </Card>

      {attention > 0 && (
        <button
          onClick={() => setInsightsOpen(true)}
          className="flex w-full items-center gap-3 rounded-xl border border-violet/25 bg-violet/5 px-4 py-3 text-left transition hover:bg-violet/10 xl:hidden"
        >
          <Sparkles className="h-4 w-4 shrink-0 text-violet" />
          <span className="min-w-0 flex-1 text-sm text-fg">
            {attention} {attention === 1 ? 'item needs' : 'items need'} attention
            <span className="block truncate text-xs text-muted">{insights[0]?.title}</span>
          </span>
          <span className="text-xs font-medium text-violet">Review</span>
        </button>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <PastSemesters loads={past} />

          <div className="grid gap-4 md:grid-cols-2">
            {active.map((load) => (
              <SemesterColumn
                key={load.semester.id}
                load={load}
                focus={focus}
                dragging={dragging}
                isOver={over === load.semester.id}
                isGraduation={projection.semester.id === load.semester.id && load.courses.length > 0}
                onOver={(v) => setOver(v ? load.semester.id : null)}
                onDrop={drop(load.semester.id)}
                {...dragProps}
              />
            ))}
          </div>

          <CoursePool
            focus={focus}
            dragging={dragging}
            isOver={over === 'pool'}
            onOver={(v) => setOver(v ? 'pool' : null)}
            onDrop={drop(null)}
            placements={placements}
            {...dragProps}
          />
        </div>

        <aside className="hidden xl:block">
          <div className="sticky top-20">
            <Card className="max-h-[calc(100vh-6rem)] overflow-y-auto p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-fg">
                <Sparkles className="h-4 w-4 text-violet" /> DegreeFlow Intelligence
              </h2>
              <p className="mb-4 mt-1 text-xs text-muted">Updates live as you change your plan.</p>
              <InsightsPanel />
            </Card>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ── Semester column ─────────────────────────────────────────────────────────

function SemesterColumn({
  load,
  focus,
  dragging,
  isOver,
  isGraduation,
  onOver,
  onDrop,
  onDragStart,
  onDragEnd,
}: {
  load: SemesterLoad;
  focus: string | null;
  dragging: string | null;
  isOver: boolean;
  isGraduation: boolean;
  onOver: (v: boolean) => void;
  onDrop: (e: DragEvent) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}) {
  const { placements, prefs, issues } = useDegree();
  const { semester, credits, workload } = load;
  const locked = semester.status !== 'future';
  const isCurrent = semester.status === 'current';
  const isNext = semester.id === futureSemesters[0].id;
  const limit = creditLimit(semester.id);

  const impact = useMemo(
    () => (dragging && !locked && placements[dragging] !== semester.id ? moveImpact(placements, dragging, semester.id) : null),
    [dragging, locked, placements, semester.id],
  );

  const loadTone =
    credits > limit ? 'danger' : credits > Math.min(prefs.preferredMaxCredits, limit) ? 'warning' : isCurrent ? 'violet' : 'accent';
  const semIssues = load.issues.filter((i) => i.kind === 'overload');

  return (
    <section
      aria-label={`${semester.label}${locked ? ' (locked)' : ''}`}
      onDragOver={
        locked
          ? undefined
          : (e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              if (!isOver) onOver(true);
            }
      }
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) onOver(false);
      }}
      onDrop={locked ? undefined : onDrop}
      className={cn(
        'card flex flex-col transition-[border-color,background-color,box-shadow] duration-150',
        isOver && !locked && 'border-accent/60 bg-accent/[0.03] shadow-glow',
        dragging && locked && 'opacity-60',
      )}
    >
      <header className="border-b border-line p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
              {semester.label}
              {locked && <Lock className="h-3 w-3 text-subtle" aria-hidden />}
            </h3>
            <p className="mt-0.5 text-2xs text-subtle">
              {formatDate(semester.start)} – {formatDate(semester.end, { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          {isCurrent ? (
            <Badge tone="violet" dot>
              Current
            </Badge>
          ) : isNext ? (
            <Badge tone="accent">Next</Badge>
          ) : semester.term === 'summer' ? (
            <Badge>Summer</Badge>
          ) : null}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <ProgressBar
            size="sm"
            label={`${semester.label} credit load`}
            value={credits}
            max={limit}
            tone={credits === 0 ? 'neutral' : loadTone}
          />
          <span className="tnum shrink-0 text-2xs text-muted">
            <span className="font-medium text-fg">{credits}</span>/{limit} cr
          </span>
        </div>
        <p className="mt-1.5 text-2xs text-subtle">
          {load.courses.length ? `~${workload} h/week estimated` : 'No courses'}
          {workload > prefs.heavyWorkloadHours && <span className="text-warning"> · heavy</span>}
          {isCurrent && ' · add/drop closed'}
        </p>
      </header>

      {impact && (
        <div
          className={cn(
            'mx-3 mt-3 flex items-center gap-2 rounded-lg px-2.5 py-2 text-2xs font-medium',
            impact.delays || impact.problems.length ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success',
          )}
        >
          {impact.delays || impact.problems.length ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          {[impact.delays && `Delays graduation to ${impact.newLabel}`, ...impact.problems].filter(Boolean).join(' · ') || 'Fits — no issues'}
        </div>
      )}

      {semIssues.map((i) => (
        <p key={i.id} className="mx-3 mt-3 flex items-start gap-1.5 rounded-lg bg-danger/10 px-2.5 py-2 text-2xs text-danger">
          <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
          {i.detail}
        </p>
      ))}

      <div className="flex flex-1 flex-col gap-2 p-3">
        {load.courses.map((c) => (
          <PlanCourseCard
            key={c.id}
            courseId={c.id}
            issues={issues}
            focused={focus === c.id}
            dragging={dragging === c.id}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
        {!load.courses.length && (
          <div
            className={cn(
              'flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed px-4 py-5 text-center transition-colors',
              isOver ? 'border-accent/60 text-accent' : 'border-line text-subtle',
            )}
          >
            <Inbox className="mb-2 h-4 w-4" />
            <p className="text-xs">Drop a course here</p>
            <p className="mt-0.5 text-2xs text-subtle">Adding courses here moves graduation to this term</p>
          </div>
        )}
      </div>

      {isGraduation && (
        <div className="mx-3 mb-3 flex items-center gap-2 rounded-lg border border-violet/20 bg-violet/5 px-3 py-2 text-xs text-fg">
          <GraduationCap className="h-3.5 w-3.5 text-violet" />
          Graduation semester
        </div>
      )}
    </section>
  );
}

// ── Completed semesters ─────────────────────────────────────────────────────

function PastSemesters({ loads }: { loads: SemesterLoad[] }) {
  const [open, setOpen] = useState(false);
  const { summary } = useDegree();
  const { openCourse } = useUI();
  const credits = loads.reduce((a, l) => a + l.credits, 0);
  return (
    <Card>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-fg">Completed semesters</span>
          <span className="block text-xs text-muted">
            {loads.length} semesters · {credits + priorCredits} credits{priorCredits ? ` (incl. ${priorCredits} recognized)` : ''} · average{' '}
            {summary.average.toFixed(1)}
          </span>
        </span>
        <ChevronDown className={cn('h-4 w-4 text-subtle transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="grid animate-fade-in gap-3 border-t border-line p-4 sm:grid-cols-2 2xl:grid-cols-3">
          {loads.map((l) => (
            <div key={l.semester.id} className="rounded-xl border border-line p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-fg">{l.semester.label}</span>
                <span className="tnum text-subtle">{l.credits} cr</span>
              </div>
              <ul className="mt-2 space-y-1">
                {attemptsIn(l.semester.id).map((a) => {
                  const failed = a.status === 'graded' && typeof a.grade === 'number' && a.grade < a.course.passingGrade;
                  return (
                    <li key={a.courseId}>
                      <button
                        onClick={() => openCourse(a.courseId)}
                        className="flex w-full items-center justify-between gap-2 rounded-md px-1 py-0.5 text-left text-xs text-muted transition hover:bg-raised hover:text-fg"
                      >
                        <span className="truncate">
                          {a.course.name}
                          {a.course.category === 'preparatory' && <span className="text-subtle"> · not counted</span>}
                        </span>
                        <span className={cn('tnum shrink-0', failed ? 'text-danger' : 'text-fg')}>
                          {a.grade === 'pass' ? 'Pass' : a.grade}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ── Course pool ─────────────────────────────────────────────────────────────

function CoursePool({
  focus,
  dragging,
  isOver,
  onOver,
  onDrop,
  placements,
  onDragStart,
  onDragEnd,
}: {
  focus: string | null;
  dragging: string | null;
  isOver: boolean;
  onOver: (v: boolean) => void;
  onDrop: (e: DragEvent) => void;
  placements: Record<string, string>;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}) {
  const { issues } = useDegree();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<PoolFilter>('all');
  const next = futureSemesters[0];

  const pool = courses.filter((c) => isPlannable(c.id, placements));
  const fitsNext = (id: string) => {
    const c = courseById[id];
    return c.offered.includes(next.term) && unmetPrerequisites(id, next.id, applyMove(placements, id, next.id)).length === 0;
  };
  const term = q.trim().toLowerCase();
  const shown = pool
    .filter((c) =>
      filter === 'required' ? c.mandatory : filter === 'elective' ? c.category === 'elective' : filter === 'fits' ? fitsNext(c.id) : true,
    )
    .filter(
      (c) =>
        !term ||
        c.name.toLowerCase().includes(term) ||
        c.code.toLowerCase().includes(term) ||
        c.topics.some((t) => t.toLowerCase().includes(term)),
    )
    .sort((a, b) => Number(b.mandatory) - Number(a.mandatory));

  const quickAddFor = (id: string) => {
    if (!courseById[id].mandatory) return undefined;
    return futureSemesters.find(
      (s) => courseById[id].offered.includes(s.term) && unmetPrerequisites(id, s.id, applyMove(placements, id, s.id)).length === 0,
    )?.id;
  };

  const draggingPlaced = dragging && placements[dragging];

  return (
    <section
      aria-label="Course pool"
      onDragOver={(e) => {
        if (!draggingPlaced) return;
        e.preventDefault();
        if (!isOver) onOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) onOver(false);
      }}
      onDrop={onDrop}
      className={cn('card transition-[border-color,box-shadow]', isOver && 'border-accent/60 shadow-glow')}
    >
      <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-fg">Course pool</h3>
          <p className="mt-0.5 text-xs text-muted">
            {pool.length} courses not in your plan · drag one into a semester{draggingPlaced ? ', or drop here to unschedule' : ''}
          </p>
        </div>
        <SearchInput value={q} onChange={setQ} placeholder="Search the pool" className="sm:w-56" />
      </div>
      <div className="px-4 pt-3">
        <Segmented
          label="Filter course pool"
          size="sm"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All', count: pool.length },
            { value: 'required', label: 'Required', count: pool.filter((c) => c.mandatory).length },
            { value: 'elective', label: 'Electives', count: pool.filter((c) => c.category === 'elective').length },
            { value: 'fits', label: `Fits ${next.label}`, count: pool.filter((c) => fitsNext(c.id)).length },
          ]}
        />
      </div>
      {shown.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={pool.length === 0 ? 'Every course is in your plan' : 'No courses match'}
          description={pool.length === 0 ? 'Nice — nothing left in the pool.' : 'Try a different search or filter.'}
        />
      ) : (
        <div className="grid gap-2 p-4 sm:grid-cols-2 2xl:grid-cols-3">
          {shown.map((c) => (
            <PlanCourseCard
              key={c.id}
              courseId={c.id}
              issues={issues}
              focused={focus === c.id}
              quickAdd={quickAddFor(c.id)}
              dragging={dragging === c.id}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          ))}
        </div>
      )}
    </section>
  );
}
