import {
  AlertTriangle,
  ArrowRight,
  BookMarked,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  GraduationCap,
  type LucideIcon,
  ShieldCheck,
  Sparkles,
  Timer,
} from 'lucide-react';
import { categoryIcon } from '../components/course/meta';
import { Badge } from '../components/ui/Badge';
import { Card, CardHeader } from '../components/ui/Card';
import { ProgressRing, SegmentedBar } from '../components/ui/Progress';
import { milestones } from '../data/calendar';
import { DEMO_TODAY, program } from '../data/program';
import { futureSemesters } from '../lib/degree';
import { cn, daysUntil, formatDate, greeting, relativeDays } from '../lib/format';
import type { NextStep } from '../lib/insights';
import { Link, navigate } from '../lib/router';
import { useDegree } from '../state/store';
import { useUI } from '../state/ui';
import type { MilestoneType } from '../types';

export function Overview() {
  const { firstName } = useDegree();
  return (
    <div className="space-y-6 lg:space-y-8">
      <header>
        <p className="eyebrow">{formatDate(DEMO_TODAY, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-fg sm:text-[2rem] sm:leading-tight">
          {greeting()}, {firstName || 'there'}
        </h1>
        <p className="mt-1.5 text-sm text-muted sm:text-[0.95rem]">Here’s your academic progress and what needs your attention.</p>
      </header>

      <DegreeHero />

      <div className="grid gap-6 lg:grid-cols-12">
        <NextSteps className="lg:col-span-7" />
        <RequirementsOverview className="lg:col-span-5" />
      </div>

      <Milestones />
    </div>
  );
}

// ── Hero ────────────────────────────────────────────────────────────────────

function DegreeHero() {
  const { summary, projection, loads } = useDegree();
  const pct = Math.round(summary.completedPct);
  const inProgressPct = (summary.inProgress / summary.total) * 100;
  const semestersLeft = loads.filter(
    (l) => (l.semester.status === 'current' || l.semester.status === 'future') && l.courses.length > 0,
  ).length;

  const status = {
    'on-track': { label: 'On track', tone: 'success' as const, icon: CheckCircle2 },
    'at-risk': { label: 'At risk', tone: 'danger' as const, icon: AlertTriangle },
    delayed: { label: 'Delayed', tone: 'warning' as const, icon: AlertTriangle },
  }[projection.status];

  const legend = [
    { label: 'Completed', value: summary.completed, swatch: 'bg-accent' },
    { label: 'In progress', value: summary.inProgress, swatch: 'bg-violet' },
    { label: 'Planned', value: summary.planned, swatch: 'hatch bg-line' },
    { label: 'Not planned', value: summary.unplanned, swatch: 'border border-dashed border-line-strong' },
  ];

  return (
    <Card className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl"
        aria-hidden
      />
      <div className="relative grid gap-8 p-6 sm:p-8 md:grid-cols-[auto_1fr] md:items-center md:gap-10">
        <div className="flex justify-center md:justify-start">
          <ProgressRing value={summary.completedPct} secondary={inProgressPct} size={184} stroke={11}>
            <div>
              <p className="text-[2.75rem] font-semibold leading-none tracking-tight text-fg">
                {pct}
                <span className="text-2xl text-muted">%</span>
              </p>
              <p className="mt-1.5 text-xs text-muted">complete</p>
            </div>
          </ProgressRing>
        </div>

        <div className="min-w-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-muted">
                <GraduationCap className="h-3.5 w-3.5" />
                {program.faculty}
              </div>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-fg">{program.name}</h2>
              <p className="mt-3 text-sm text-muted">
                <span className="text-2xl font-semibold tracking-tight text-fg">{summary.completed}</span>
                <span className="text-fg"> / {summary.total}</span> credits completed
              </p>
            </div>
            <Link
              to="/degree"
              className="group shrink-0 rounded-xl border border-line bg-raised/40 px-4 py-3 transition hover:border-line-strong sm:min-w-[11.5rem] sm:text-right"
            >
              <p className="text-2xs text-subtle">Expected graduation</p>
              <p className="mt-0.5 text-lg font-semibold tracking-tight text-fg">{projection.label}</p>
              <div className="mt-1.5 flex sm:justify-end">
                <Badge tone={status.tone} icon={status.icon}>
                  {status.label}
                </Badge>
              </div>
            </Link>
          </div>

          <div className="mt-6">
            <SegmentedBar
              label="Degree credits"
              total={summary.total}
              height={10}
              segments={[
                { key: 'c', label: 'Completed', value: summary.completed, className: 'bg-accent' },
                { key: 'i', label: 'In progress', value: summary.inProgress, className: 'bg-violet' },
                { key: 'p', label: 'Planned', value: summary.planned, className: 'hatch bg-line' },
              ]}
            />
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
              {legend.map((l) => (
                <li key={l.label} className="flex items-center gap-2 text-xs text-muted">
                  <span className={cn('h-2 w-2 rounded-sm', l.swatch)} aria-hidden />
                  {l.label}
                  <span className="tnum font-medium text-fg">{l.value}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 grid grid-cols-3 divide-x divide-line border-t border-line pt-5">
            <HeroStat label="Credits remaining" value={summary.remaining} />
            <HeroStat label="Semesters left" value={semestersLeft} className="pl-4 sm:pl-6" />
            <HeroStat label="Average grade" value={summary.average.toFixed(1)} className="pl-4 sm:pl-6" />
          </div>

          {projection.status !== 'on-track' && (
            <p className="mt-4 flex items-start gap-2 text-xs text-muted">
              <AlertTriangle
                className={cn('mt-px h-3.5 w-3.5 shrink-0', projection.status === 'at-risk' ? 'text-danger' : 'text-warning')}
              />
              <span>
                {projection.reason.charAt(0).toUpperCase() + projection.reason.slice(1)}.{' '}
                <Link to="/plan" className="font-medium text-fg underline-offset-4 hover:underline">
                  Fix in Academic Plan
                </Link>
              </span>
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

function HeroStat({ label, value, className }: { label: string; value: string | number; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="text-lg font-semibold tracking-tight text-fg sm:text-xl">{value}</p>
      <p className="mt-0.5 truncate text-2xs text-subtle sm:text-xs">{label}</p>
    </div>
  );
}

// ── A. Next steps ───────────────────────────────────────────────────────────

const toneStyles: Record<NextStep['tone'], string> = {
  accent: 'text-accent bg-accent/10 border-accent/20',
  warning: 'text-warning bg-warning/10 border-warning/20',
  danger: 'text-danger bg-danger/10 border-danger/20',
  violet: 'text-violet bg-violet/10 border-violet/20',
};

const sourceMeta: Record<NextStep['source'], { label: string; icon: LucideIcon }> = {
  rule: { label: 'Degree rule', icon: ShieldCheck },
  ai: { label: 'AI suggestion', icon: Sparkles },
  calendar: { label: 'Academic calendar', icon: CalendarDays },
};

function NextSteps({ className }: { className?: string }) {
  const { steps, insights } = useDegree();
  const { setInsightsOpen } = useUI();
  const aiCount = insights.filter((i) => i.source === 'ai').length;

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader
        title="Next steps"
        description="Prioritized from your plan and the academic calendar"
        action={
          <button
            onClick={() => setInsightsOpen(true)}
            className="inline-flex h-7 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-violet transition hover:bg-violet/10"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {aiCount} suggestions
          </button>
        }
      />
      <ol className="flex-1 space-y-2 p-3 pt-4">
        {steps.map((s, i) => {
          const src = sourceMeta[s.source];
          return (
            <li key={s.id}>
              <Link
                to={s.href}
                className="group flex items-start gap-4 rounded-xl border border-transparent p-3 transition-colors duration-150 hover:border-line hover:bg-raised/50"
              >
                <span
                  className={cn(
                    'tnum mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border text-xs font-semibold',
                    toneStyles[s.tone],
                  )}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="text-sm font-medium text-fg">{s.title}</p>
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">{s.detail}</p>
                  <div className="mt-2 flex items-center gap-3 text-2xs text-subtle">
                    <span className="font-medium text-muted">{s.tag}</span>
                    <span className="inline-flex items-center gap-1">
                      <src.icon className="h-3 w-3" />
                      {src.label}
                    </span>
                  </div>
                </div>
                <ArrowRight className="mt-1.5 h-4 w-4 shrink-0 text-subtle transition group-hover:translate-x-0.5 group-hover:text-fg" />
              </Link>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

// ── B. Degree requirements ──────────────────────────────────────────────────

function RequirementsOverview({ className }: { className?: string }) {
  const { summary } = useDegree();
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader
        title="Degree requirements"
        description="Credits by requirement group"
        action={
          <Link to="/requirements" className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-xs font-medium text-muted hover:bg-raised hover:text-fg">
            View all <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        }
      />
      <ul className="flex-1 space-y-1 p-3 pt-4">
        {summary.groups.map((g) => {
          const Icon = categoryIcon[g.group.id];
          const done = g.completed >= g.group.requiredCredits;
          const covered = g.unplanned === 0;
          return (
            <li key={g.group.id}>
              <Link
                to={`/requirements?group=${g.group.id}`}
                className="group block rounded-xl px-3 py-2.5 transition-colors hover:bg-raised/50"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-subtle" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-sm text-fg">{g.group.name}</span>
                  <span className="tnum text-xs text-muted">
                    <span className="font-medium text-fg">{g.completed}</span> / {g.group.requiredCredits}
                  </span>
                  <span
                    className={cn(
                      'w-16 text-right text-2xs font-medium',
                      done ? 'text-accent' : covered ? 'text-subtle' : 'text-danger',
                    )}
                  >
                    {done ? 'Complete' : covered ? 'On plan' : `${g.unplanned} missing`}
                  </span>
                </div>
                <div className="mt-2 pl-[1.625rem] pr-[4.75rem]">
                  <SegmentedBar
                    label={g.group.name}
                    total={g.group.requiredCredits}
                    height={6}
                    segments={[
                      { key: 'c', label: 'Completed', value: g.completed, className: 'bg-accent' },
                      { key: 'i', label: 'In progress', value: g.inProgress, className: 'bg-violet' },
                      { key: 'p', label: 'Planned', value: g.planned, className: 'hatch bg-line' },
                    ]}
                  />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

// ── C. Upcoming milestones ──────────────────────────────────────────────────

const milestoneIcon: Record<MilestoneType, LucideIcon> = {
  registration: ClipboardList,
  exam: BookMarked,
  deadline: Timer,
  academic: CalendarDays,
  graduation: GraduationCap,
};

const milestoneLabel: Record<MilestoneType, string> = {
  registration: 'Registration',
  exam: 'Exam',
  deadline: 'Deadline',
  academic: 'Academic',
  graduation: 'Graduation',
};

function Milestones() {
  const { projection } = useDegree();
  const { openCourse } = useUI();
  const upcoming = milestones
    .filter((m) => daysUntil(m.date) >= 0 && m.type !== 'graduation')
    .slice(0, 5)
    .concat({
      id: 'grad',
      date: projection.date,
      title: projection.status === 'on-track' ? 'Expected graduation' : 'Projected graduation',
      description: projection.status === 'on-track' ? 'All requirements covered.' : 'Pending plan fixes.',
      type: 'graduation',
      href: '/degree',
    });

  const open = (m: (typeof upcoming)[number]) => {
    if ('courseId' in m && m.courseId) openCourse(m.courseId);
    else if (m.href) navigate(m.href);
  };

  return (
    <Card>
      <CardHeader
        title="Upcoming milestones"
        description={`Registration, exams and deadlines through ${futureSemesters[0].label}`}
      />
      <ol className="relative grid gap-0 px-5 pb-5 pt-6 sm:px-6 lg:grid-cols-6 lg:gap-4">
        {/* desktop rail */}
        <div className="absolute left-6 right-6 top-[2.05rem] hidden h-px bg-line lg:block" aria-hidden />
        {upcoming.map((m, i) => {
          const Icon = milestoneIcon[m.type];
          const first = i === 0;
          const grad = m.type === 'graduation';
          return (
            <li key={m.id} className="relative">
              {/* mobile rail */}
              {i < upcoming.length - 1 && <div className="absolute bottom-0 left-[0.6875rem] top-6 w-px bg-line lg:hidden" aria-hidden />}
              <button
                onClick={() => open(m)}
                className="group relative flex w-full items-start gap-4 rounded-xl pb-5 text-left lg:flex-col lg:gap-3 lg:pb-0"
              >
                <span
                  className={cn(
                    'relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full border bg-surface transition',
                    first
                      ? 'border-accent text-accent shadow-[0_0_0_4px_rgb(var(--accent)/0.12)]'
                      : grad
                        ? 'border-violet/60 text-violet'
                        : 'border-line-strong text-subtle group-hover:border-muted',
                  )}
                >
                  <Icon className="h-3 w-3" aria-hidden />
                </span>
                <div className="min-w-0 rounded-lg transition lg:-mx-2 lg:px-2 lg:py-1 lg:group-hover:bg-raised/50">
                  <p className="flex items-baseline gap-2 text-xs">
                    <span className="font-medium text-fg">{formatDate(m.date, grad ? { month: 'short', year: 'numeric' } : undefined)}</span>
                    <span className={cn(first ? 'text-accent' : 'text-subtle')}>{relativeDays(m.date)}</span>
                  </p>
                  <p className="mt-1 text-sm leading-snug text-fg group-hover:underline group-hover:decoration-line-strong group-hover:underline-offset-4">
                    {m.title}
                  </p>
                  <p className="mt-1 text-2xs text-subtle">{milestoneLabel[m.type]}</p>
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
