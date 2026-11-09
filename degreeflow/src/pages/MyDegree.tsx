import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Circle,
  CircleDashed,
  GitBranch,
  ListChecks,
  ShieldCheck,
  Target,
} from 'lucide-react';
import { useState } from 'react';
import { CourseTable } from '../components/course/CourseTable';
import { StatusBadge, StatusDot, categoryIcon } from '../components/course/meta';
import { Badge } from '../components/ui/Badge';
import { Card, CardHeader, PageHeader } from '../components/ui/Card';
import { Segmented } from '../components/ui/Controls';
import { SegmentedBar } from '../components/ui/Progress';
import { courseById, courses, grades } from '../data/courses';
import { program, semesterById } from '../data/program';
import { courseStatus, unmetPrerequisites } from '../lib/degree';
import { cn } from '../lib/format';
import { Link } from '../lib/router';
import { useDegree } from '../state/store';
import { useUI } from '../state/ui';

export function MyDegree() {
  const { summary } = useDegree();

  const stats = [
    { label: 'Total required', value: summary.total, hint: 'credits to graduate' },
    { label: 'Completed', value: summary.completed, hint: `${Math.round(summary.completedPct)}% of your degree` },
    { label: 'In progress', value: summary.inProgress, hint: `${summary.inProgressCourses} courses this semester` },
    {
      label: 'Remaining',
      value: summary.remaining,
      hint: summary.unplanned ? `${summary.unplanned} not yet planned` : 'all planned',
      alert: summary.unplanned > 0,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${program.name} · ${program.catalogYear}`}
        title="My Degree"
        description="Everything that stands between you and graduation, in one place."
      />

      <Card className="grid grid-cols-2 divide-line md:grid-cols-4 md:divide-x">
        {stats.map((s, i) => (
          <div key={s.label} className={cn('p-5', i < 2 && 'border-b border-line md:border-b-0', i % 2 === 1 && 'border-l border-line md:border-l-0')}>
            <p className="text-xs text-muted">{s.label}</p>
            <p className="mt-1.5 text-3xl font-semibold tracking-tight text-fg">{s.value}</p>
            <p className={cn('mt-1 text-xs', s.alert ? 'text-danger' : 'text-subtle')}>{s.hint}</p>
          </div>
        ))}
      </Card>

      <div className="grid gap-6 lg:grid-cols-12">
        <WhatRemains className="lg:col-span-7 xl:col-span-8" />
        <GraduationChecklist className="lg:col-span-5 xl:col-span-4" />
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <CourseLists className="lg:col-span-7 xl:col-span-8" />
        <Prerequisites className="lg:col-span-5 xl:col-span-4" />
      </div>
    </div>
  );
}

function WhatRemains({ className }: { className?: string }) {
  const { summary, placements } = useDegree();
  const { openCourse } = useUI();

  return (
    <Card className={className}>
      <CardHeader icon={Target} title="What’s left to graduate" description="Remaining credits by requirement, and how each is covered" />
      <div className="space-y-2 p-5">
        {summary.groups.map((g) => {
          const Icon = categoryIcon[g.group.id];
          const remainingCourses = g.courses.filter((c) => {
            const s = courseStatus(c.id, placements);
            return s === 'in-progress' || s === 'planned' || (s === 'unscheduled' && c.mandatory);
          });
          const complete = g.remaining === 0;
          return (
            <div key={g.group.id} className="rounded-xl border border-line">
              <div className="flex items-center gap-3 px-4 py-3">
                <Icon className="h-4 w-4 shrink-0 text-subtle" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-fg">{g.group.name}</p>
                  <p className="text-2xs text-subtle">{g.group.description}</p>
                </div>
                {complete ? (
                  <Badge tone="accent" icon={CheckCircle2}>
                    Complete
                  </Badge>
                ) : (
                  <span className="tnum shrink-0 text-xs text-muted">
                    <span className="font-semibold text-fg">{g.remaining}</span> credits left
                  </span>
                )}
              </div>
              <div className="px-4 pb-3">
                <SegmentedBar
                  label={g.group.name}
                  total={g.group.requiredCredits}
                  height={4}
                  segments={[
                    { key: 'c', label: 'Completed', value: g.completed, className: 'bg-accent' },
                    { key: 'i', label: 'In progress', value: g.inProgress, className: 'bg-violet' },
                    { key: 'p', label: 'Planned', value: g.planned, className: 'hatch bg-line' },
                  ]}
                />
              </div>
              {!complete && (
                <ul className="divide-y divide-line border-t border-line">
                  {remainingCourses.map((c) => {
                    const s = courseStatus(c.id, placements);
                    return (
                      <li key={c.id}>
                        <button
                          onClick={() => openCourse(c.id)}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-raised/50"
                        >
                          <StatusDot status={s} mandatory={c.mandatory} />
                          <span className="min-w-0 flex-1 truncate text-sm text-fg">{c.name}</span>
                          <span className="hidden text-2xs text-subtle sm:inline">
                            {s === 'unscheduled' ? 'Not in any semester' : semesterById[placements[c.id]].label}
                          </span>
                          <span className="tnum w-10 text-right text-xs text-muted">{c.credits} cr</span>
                        </button>
                      </li>
                    );
                  })}
                  {g.unplanned - remainingCourses.filter((c) => courseStatus(c.id, placements) === 'unscheduled').reduce((a, c) => a + c.credits, 0) > 0 && (
                    <li>
                      <Link
                        to={`/requirements?group=${g.group.id}&status=unscheduled`}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-danger transition hover:bg-raised/50"
                      >
                        <CircleDashed className="h-3 w-3" />
                        <span className="flex-1">Choose courses for the remaining credits</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </li>
                  )}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function GraduationChecklist({ className }: { className?: string }) {
  const { summary, placements } = useDegree();
  const mandatory = courses.filter((c) => c.mandatory);
  const mandatoryDone = mandatory.filter((c) => courseStatus(c.id, placements) === 'completed').length;
  const mandatoryMissing = mandatory.filter((c) => !placements[c.id]).length;
  const electives = summary.groups.find((g) => g.group.id === 'elective')!;
  const project = summary.groups.find((g) => g.group.id === 'project')!;
  const english = courseStatus('GEN101', placements) === 'completed';

  type State = 'done' | 'progress' | 'missing';
  const items: { label: string; detail: string; state: State }[] = [
    {
      label: `${program.totalCredits} credits`,
      detail: `${summary.completed} completed · ${summary.inProgress + summary.planned} in progress or planned`,
      state: summary.completed >= program.totalCredits ? 'done' : summary.unplanned ? 'missing' : 'progress',
    },
    {
      label: 'All mandatory courses',
      detail: `${mandatoryDone} of ${mandatory.length} completed${mandatoryMissing ? ` · ${mandatoryMissing} not planned` : ''}`,
      state: mandatoryDone === mandatory.length ? 'done' : mandatoryMissing ? 'missing' : 'progress',
    },
    {
      label: `${electives.group.requiredCredits} elective credits`,
      detail: `${electives.completed} completed · ${electives.inProgress + electives.planned} on plan`,
      state: electives.remaining === 0 ? 'done' : electives.unplanned ? 'missing' : 'progress',
    },
    {
      label: 'Final project approved',
      detail: project.completed ? 'Approved' : 'Part A in progress · Part B planned',
      state: project.remaining === 0 ? 'done' : project.unplanned ? 'missing' : 'progress',
    },
    {
      label: `Weighted average ≥ ${program.minAverage}`,
      detail: `Current average ${summary.average.toFixed(1)}`,
      state: summary.average >= program.minAverage ? 'done' : 'missing',
    },
    {
      label: 'English proficiency — Advanced',
      detail: english ? `Completed via Academic English (${grades.GEN101})` : 'Required before graduation',
      state: english ? 'done' : 'missing',
    },
  ];

  const done = items.filter((i) => i.state === 'done').length;

  return (
    <Card className={cn('flex flex-col lg:self-start', className)}>
      <CardHeader
        icon={ListChecks}
        title="Graduation requirements"
        description="Official conditions for awarding the degree"
        action={<span className="tnum text-xs text-muted">{done}/{items.length} met</span>}
      />
      <ul className="flex-1 space-y-1 p-3 pt-4">
        {items.map((i) => (
          <li key={i.label} className="flex items-start gap-3 rounded-lg px-2 py-2.5">
            {i.state === 'done' ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-label="Met" />
            ) : i.state === 'progress' ? (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-violet" aria-label="In progress" />
            ) : (
              <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-label="Not yet covered" />
            )}
            <div className="min-w-0">
              <p className={cn('text-sm', i.state === 'done' ? 'text-muted' : 'text-fg')}>{i.label}</p>
              <p className="mt-0.5 text-xs text-subtle">{i.detail}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mx-5 mb-5 flex items-start gap-2 rounded-lg bg-raised/50 px-3 py-2.5 text-2xs leading-relaxed text-subtle">
        <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0" />
        Requirements reflect the sample {program.catalogYear}. Confirm final eligibility with your faculty’s student office.
      </p>
    </Card>
  );
}

function CourseLists({ className }: { className?: string }) {
  const { placements } = useDegree();
  const [tab, setTab] = useState<'mandatory' | 'electives'>('mandatory');
  const [showCompleted, setShowCompleted] = useState(false);
  const order = { 'in-progress': 0, planned: 1, unscheduled: 2, completed: 3 } as const;
  const list = courses
    .filter((c) => (tab === 'mandatory' ? c.mandatory : !c.mandatory && placements[c.id]))
    .sort((a, b) => order[courseStatus(a.id, placements)] - order[courseStatus(b.id, placements)]);
  const completedCount = list.filter((c) => courseStatus(c.id, placements) === 'completed').length;
  const visible = showCompleted ? list : list.filter((c) => courseStatus(c.id, placements) !== 'completed');
  const options = courses.filter((c) => c.category === 'elective' && !placements[c.id]).length;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader
        title={tab === 'mandatory' ? 'Mandatory courses' : 'Electives & general studies'}
        description={tab === 'mandatory' ? 'Courses every student must complete' : 'Courses you’ve chosen toward elective and additional credits'}
        action={
          <Segmented
            label="Course list"
            size="sm"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'mandatory', label: 'Mandatory' },
              { value: 'electives', label: 'Electives' },
            ]}
          />
        }
      />
      <CourseTable className="mt-4" courses={visible} placements={placements} />
      {completedCount > 0 && (
        <button
          onClick={() => setShowCompleted((v) => !v)}
          className="flex w-full items-center justify-center gap-1.5 border-t border-line px-5 py-3 text-xs font-medium text-muted transition hover:bg-raised/50 hover:text-fg"
        >
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showCompleted && 'rotate-180')} />
          {showCompleted ? 'Hide completed courses' : `Show ${completedCount} completed ${completedCount === 1 ? 'course' : 'courses'}`}
        </button>
      )}
      {tab === 'electives' && (
        <Link
          to="/requirements?group=elective&status=unscheduled"
          className="flex items-center justify-between border-t border-line px-5 py-3 text-xs text-muted transition hover:bg-raised/50 hover:text-fg"
        >
          {options} more electives available in your program
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </Card>
  );
}

function Prerequisites({ className }: { className?: string }) {
  const { placements } = useDegree();
  const { openCourse } = useUI();
  const remaining = courses.filter((c) => {
    const s = courseStatus(c.id, placements);
    return (s === 'planned' || (s === 'unscheduled' && c.mandatory)) && c.prerequisites.length > 0;
  });

  return (
    <Card className={cn('flex flex-col lg:self-start', className)}>
      <CardHeader icon={GitBranch} title="Prerequisites" description="For your upcoming and missing courses" />
      <ul className="flex-1 space-y-3 p-5">
        {remaining.map((c) => {
          const sem = placements[c.id];
          const unmet = sem ? unmetPrerequisites(c.id, sem, placements) : [];
          const ready = unmet.length === 0;
          return (
            <li key={c.id} className="rounded-xl border border-line p-3">
              <button onClick={() => openCourse(c.id)} className="flex w-full items-center justify-between gap-2 text-left">
                <span className="truncate text-sm font-medium text-fg hover:underline hover:underline-offset-4">{c.name}</span>
                {sem ? (
                  <Badge tone={ready ? 'success' : 'danger'}>{ready ? 'Ready' : 'Blocked'}</Badge>
                ) : (
                  <StatusBadge status="unscheduled" mandatory />
                )}
              </button>
              <ul className="mt-2.5 space-y-1.5 border-l border-line pl-3">
                {c.prerequisites.map((p) => {
                  const ps = courseStatus(p, placements);
                  return (
                    <li key={p} className="flex items-center gap-2 text-xs">
                      <StatusDot status={ps} />
                      <button onClick={() => openCourse(p)} className="min-w-0 flex-1 truncate text-left text-muted hover:text-fg">
                        {courseById[p].name}
                      </button>
                      <span className="shrink-0 text-2xs text-subtle">
                        {ps === 'completed' ? 'Done' : ps === 'in-progress' ? 'In progress' : ps === 'planned' ? semesterById[placements[p]].label : 'Missing'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
