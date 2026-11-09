import { AlertTriangle, ArrowRight, CalendarClock, ChevronDown, Clock, Gauge, Lock, MoveRight, Users } from 'lucide-react';
import { courseById } from '../../data/courses';
import { semesterById } from '../../data/program';
import {
  courseStatus,
  futureSemesters,
  isMovable,
  moveImpact,
  offeredText,
  unlocks,
} from '../../lib/degree';
import { cn } from '../../lib/format';
import { navigate } from '../../lib/router';
import { useDegree } from '../../state/store';
import { useUI } from '../../state/ui';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Menu, type MenuItem } from '../ui/Controls';
import { Drawer, DrawerClose } from '../ui/Overlay';
import { CategoryTag, StatusBadge, StatusDot } from './meta';
import { grades } from '../../data/courses';

export function CourseDrawer() {
  const { courseId, closeCourse, openCourse } = useUI();
  const { placements, issues, moveCourse } = useDegree();
  const course = courseId ? courseById[courseId] : null;

  return (
    <Drawer open={!!course} onClose={closeCourse} title={course ? course.name : 'Course details'}>
      {course && (
        <CourseDetail
          key={course.id}
          courseId={course.id}
          onClose={closeCourse}
          onOpen={openCourse}
          placements={placements}
          issues={issues.filter((i) => i.courseIds[0] === course.id || (i.kind === 'conflict' && i.courseIds.includes(course.id)))}
          moveCourse={moveCourse}
        />
      )}
    </Drawer>
  );
}

function CourseDetail({
  courseId,
  onClose,
  onOpen,
  placements,
  issues,
  moveCourse,
}: {
  courseId: string;
  onClose: () => void;
  onOpen: (id: string) => void;
  placements: Record<string, string>;
  issues: ReturnType<typeof useDegree>['issues'];
  moveCourse: (id: string, to: string | null) => void;
}) {
  const c = courseById[courseId];
  const status = courseStatus(c.id, placements);
  const sem = semesterById[placements[c.id]];
  const movable = isMovable(c.id, placements);
  const grade = status === 'completed' ? grades[c.id] : undefined;
  const unlocked = unlocks(c.id);

  const moveItems: MenuItem[] = [
    ...futureSemesters.map((s) => {
      const impact = moveImpact(placements, c.id, s.id);
      return {
        key: s.id,
        label: s.label,
        disabled: placements[c.id] === s.id,
        tone: impact.delays || impact.problems.length ? ('warning' as const) : ('default' as const),
        hint:
          placements[c.id] === s.id
            ? 'Current placement'
            : [impact.delays && `Delays graduation to ${impact.newLabel}`, ...impact.problems].filter(Boolean).join(' · ') ||
              'No issues',
        onSelect: () => moveCourse(c.id, s.id),
      };
    }),
    ...(placements[c.id]
      ? [
          {
            key: 'none',
            label: 'Remove from plan',
            tone: c.mandatory ? ('warning' as const) : ('default' as const),
            hint: c.mandatory ? 'Required course — graduation at risk' : 'Moves it to unscheduled courses',
            onSelect: () => moveCourse(c.id, null),
          },
        ]
      : []),
  ];

  return (
    <>
      <div className="flex items-start justify-between gap-3 border-b border-line px-6 pb-5 pt-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs text-muted">{c.code}</span>
            <span className="text-line-strong">·</span>
            <CategoryTag category={c.category} />
          </div>
          <h2 className="mt-1.5 text-lg font-semibold leading-snug tracking-tight text-fg">{c.name}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <StatusBadge status={status} mandatory={c.mandatory} />
            <Badge>{c.credits} credits</Badge>
            <Badge tone={c.mandatory ? 'accent' : 'neutral'}>{c.mandatory ? 'Mandatory' : 'Elective'}</Badge>
            {c.highDemand && (
              <Badge tone="warning" icon={Users}>
                High demand
              </Badge>
            )}
          </div>
        </div>
        <DrawerClose onClose={onClose} />
      </div>

      <div className="flex-1 space-y-7 overflow-y-auto px-6 py-6">
        {grade !== undefined && (
          <div className="flex items-center justify-between rounded-xl border border-line bg-raised/40 px-4 py-3">
            <div>
              <p className="text-xs text-muted">Final grade</p>
              <p className="text-xs text-subtle">{sem?.label}</p>
            </div>
            <p className="text-3xl font-semibold tracking-tight text-fg">{grade}</p>
          </div>
        )}

        <p className="text-sm leading-relaxed text-muted">{c.description}</p>

        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line">
          {[
            { icon: Clock, label: 'Est. workload', value: `~${c.workload} h / week` },
            { icon: Gauge, label: 'Difficulty', value: <Difficulty value={c.difficulty} /> },
            { icon: CalendarClock, label: 'Offered', value: offeredText(c).replace(/^./, (x) => x.toUpperCase()) },
            { icon: Users, label: 'Instructor', value: c.instructor },
          ].map((f) => (
            <div key={f.label} className="bg-surface px-4 py-3">
              <dt className="flex items-center gap-1.5 text-2xs text-subtle">
                <f.icon className="h-3 w-3" aria-hidden />
                {f.label}
              </dt>
              <dd className="mt-1 text-sm text-fg">{f.value}</dd>
            </div>
          ))}
        </dl>

        {issues.length > 0 && (
          <section className="space-y-2">
            {issues.map((i) => (
              <div
                key={i.id}
                className={cn(
                  'flex gap-2.5 rounded-xl border px-3.5 py-3 text-sm',
                  i.severity === 'critical' ? 'border-danger/25 bg-danger/5' : 'border-warning/25 bg-warning/5',
                )}
              >
                <AlertTriangle
                  className={cn('mt-0.5 h-4 w-4 shrink-0', i.severity === 'critical' ? 'text-danger' : 'text-warning')}
                />
                <div>
                  <p className="font-medium text-fg">{i.title}</p>
                  <p className="mt-0.5 text-xs text-muted">{i.detail}</p>
                </div>
              </div>
            ))}
          </section>
        )}

        <section>
          <h3 className="eyebrow mb-3">Weekly schedule</h3>
          <ul className="divide-y divide-line rounded-xl border border-line">
            {c.schedule.map((s, i) => (
              <li key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-fg">
                  {s.day} · <span className="tnum">{s.start}–{s.end}</span>
                </span>
                <span className="text-xs text-subtle">{s.kind}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="eyebrow mb-3">Prerequisites</h3>
          {c.prerequisites.length === 0 ? (
            <p className="text-sm text-subtle">None — open to all students in the program.</p>
          ) : (
            <ul className="space-y-1">
              {c.prerequisites.map((p) => {
                const pc = courseById[p];
                const ps = courseStatus(p, placements);
                return (
                  <li key={p}>
                    <button
                      onClick={() => onOpen(p)}
                      className="group flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-raised"
                    >
                      <StatusDot status={ps} mandatory={pc.mandatory} />
                      <span className="min-w-0 flex-1 truncate text-sm text-fg">{pc.name}</span>
                      <span className="text-2xs text-subtle">
                        {ps === 'completed' ? `Completed · ${grades[p]}` : ps === 'in-progress' ? 'In progress' : ps === 'planned' ? semesterById[placements[p]].label : 'Not scheduled'}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-subtle opacity-0 transition group-hover:opacity-100" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {unlocked.length > 0 && (
          <section>
            <h3 className="eyebrow mb-3">Unlocks</h3>
            <div className="flex flex-wrap gap-1.5">
              {unlocked.map((u) => (
                <button
                  key={u.id}
                  onClick={() => onOpen(u.id)}
                  className="rounded-lg border border-line px-2.5 py-1.5 text-xs text-muted transition hover:border-line-strong hover:text-fg"
                >
                  {u.name}
                </button>
              ))}
            </div>
          </section>
        )}

        <section>
          <h3 className="eyebrow mb-3">Topics</h3>
          <div className="flex flex-wrap gap-1.5">
            {c.topics.map((t) => (
              <Badge key={t}>{t}</Badge>
            ))}
          </div>
        </section>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-4">
        <div className="min-w-0 text-xs text-muted">
          {movable ? (
            <span>{sem ? `Planned for ${sem.label}` : 'Not in your plan yet'}</span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-3 w-3" /> {status === 'completed' ? `Completed in ${sem?.label}` : `In progress · ${sem?.label}`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onClose();
              navigate(`/plan?focus=${c.id}`);
            }}
          >
            View in plan
          </Button>
          {movable && (
            <Menu
              header={`Move ${c.code}`}
              width={260}
              items={moveItems}
              trigger={(p) => (
                <Button variant="primary" size="sm" icon={MoveRight} iconRight={ChevronDown} {...p}>
                  {sem ? 'Move' : 'Add to plan'}
                </Button>
              )}
            />
          )}
        </div>
      </div>
    </>
  );
}

function Difficulty({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={cn('h-1.5 w-3 rounded-full', i <= value ? 'bg-fg/70' : 'bg-line')} />
      ))}
    </span>
  );
}
