import { ArrowDownUp, Check, SearchX } from 'lucide-react';
import { useEffect } from 'react';
import { CourseTable } from '../components/course/CourseTable';
import { categoryIcon } from '../components/course/meta';
import { Button } from '../components/ui/Button';
import { Card, PageHeader } from '../components/ui/Card';
import { Menu, SearchInput, Segmented } from '../components/ui/Controls';
import { SegmentedBar } from '../components/ui/Progress';
import { EmptyState } from '../components/ui/States';
import { courses } from '../data/courses';
import { courseStatus } from '../lib/degree';
import { cn } from '../lib/format';
import { setParams, useRoute } from '../lib/router';
import { useDegree } from '../state/store';
import { useUI } from '../state/ui';
import type { CategoryId, CourseStatus } from '../types';

type StatusFilter = 'all' | CourseStatus;
type SortKey = 'status' | 'code' | 'name' | 'credits';

const sortLabels: Record<SortKey, string> = { status: 'Status', code: 'Course code', name: 'Name', credits: 'Credits' };
const statusOrder: Record<CourseStatus, number> = { 'in-progress': 0, planned: 1, unscheduled: 2, completed: 3 };

export function Requirements() {
  const { params, path } = useRoute();
  const { summary, placements } = useDegree();
  const { openCourse } = useUI();

  const group = (params.get('group') ?? 'all') as CategoryId | 'all';
  const status = (params.get('status') ?? 'all') as StatusFilter;
  const q = params.get('q') ?? '';
  const sort = (params.get('sort') ?? 'status') as SortKey;

  const update = (patch: Record<string, string | null>) => {
    const next: Record<string, string | null> = {
      group: group === 'all' ? null : group,
      status: status === 'all' ? null : status,
      q: q || null,
      sort: sort === 'status' ? null : sort,
      ...patch,
    };
    setParams(path, next);
  };

  // Deep link: /requirements?course=CS320 opens the course panel.
  const deepCourse = params.get('course');
  useEffect(() => {
    if (!deepCourse) return;
    openCourse(deepCourse);
    update({ course: null });
  }, [deepCourse]);

  const term = q.trim().toLowerCase();
  const inGroup = courses.filter((c) => group === 'all' || c.category === group);
  const list = inGroup
    .filter((c) => status === 'all' || courseStatus(c.id, placements) === status)
    .filter(
      (c) =>
        !term ||
        c.name.toLowerCase().includes(term) ||
        c.code.toLowerCase().replace(' ', '').includes(term.replace(' ', '')) ||
        c.topics.some((t) => t.toLowerCase().includes(term)) ||
        c.instructor.toLowerCase().includes(term),
    )
    .sort((a, b) => {
      if (sort === 'code') return a.code.localeCompare(b.code, undefined, { numeric: true });
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'credits') return b.credits - a.credits;
      return statusOrder[courseStatus(a.id, placements)] - statusOrder[courseStatus(b.id, placements)];
    });

  const countFor = (s: StatusFilter) => inGroup.filter((c) => s === 'all' || courseStatus(c.id, placements) === s).length;
  const filtered = status !== 'all' || !!term;
  const totalRequired = summary.groups.reduce((a, g) => a + g.group.requiredCredits, 0);

  const tiles = [
    { id: 'all' as const, name: 'All requirements', completed: summary.completed, required: totalRequired, g: null },
    ...summary.groups.map((g) => ({ id: g.group.id, name: g.group.name, completed: g.completed, required: g.group.requiredCredits, g })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catalog"
        title="Course Requirements"
        description="Every course in your program, organized by requirement. Select a course to see prerequisites, schedule and workload."
      />

      <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <div className="grid min-w-[56rem] grid-cols-6 gap-2">
          {tiles.map((t) => {
            const active = group === t.id;
            const Icon = t.id === 'all' ? null : categoryIcon[t.id];
            return (
              <button
                key={t.id}
                onClick={() => update({ group: t.id === 'all' ? null : t.id })}
                aria-pressed={active}
                className={cn(
                  'rounded-xl border p-3 text-left transition-[border-color,background-color] duration-150',
                  active ? 'border-accent/50 bg-accent/[0.06]' : 'border-line bg-surface hover:border-line-strong',
                )}
              >
                <div className="flex items-center gap-1.5 text-2xs text-muted">
                  {Icon && <Icon className="h-3 w-3" />}
                  <span className="truncate">{t.name}</span>
                </div>
                <p className="mt-1.5 text-sm font-semibold text-fg">
                  {t.completed}
                  <span className="font-normal text-subtle"> / {t.required} cr</span>
                </p>
                <SegmentedBar
                  className="mt-2"
                  height={4}
                  label={t.name}
                  total={t.required}
                  segments={
                    t.g
                      ? [
                          { key: 'c', label: 'Completed', value: t.g.completed, className: 'bg-accent' },
                          { key: 'i', label: 'In progress', value: t.g.inProgress, className: 'bg-violet' },
                          { key: 'p', label: 'Planned', value: t.g.planned, className: 'hatch bg-line' },
                        ]
                      : [
                          { key: 'c', label: 'Completed', value: summary.completed, className: 'bg-accent' },
                          { key: 'i', label: 'In progress', value: summary.inProgress, className: 'bg-violet' },
                          { key: 'p', label: 'Planned', value: summary.planned, className: 'hatch bg-line' },
                        ]
                  }
                />
              </button>
            );
          })}
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
          <Segmented
            label="Filter by status"
            value={status}
            onChange={(v) => update({ status: v === 'all' ? null : v })}
            options={[
              { value: 'all', label: 'All', count: countFor('all') },
              { value: 'completed', label: 'Completed', count: countFor('completed') },
              { value: 'in-progress', label: 'In progress', count: countFor('in-progress') },
              { value: 'planned', label: 'Planned', count: countFor('planned') },
              { value: 'unscheduled', label: 'Not scheduled', count: countFor('unscheduled') },
            ]}
          />
          <div className="flex items-center gap-2">
            <SearchInput
              value={q}
              onChange={(v) => update({ q: v || null })}
              placeholder="Search name, code, topic…"
              className="flex-1 lg:w-64"
            />
            <Menu
              header="Sort by"
              width={200}
              items={(Object.keys(sortLabels) as SortKey[]).map((k) => ({
                key: k,
                label: sortLabels[k],
                icon: <Check className={cn('h-3.5 w-3.5', sort === k ? 'opacity-100' : 'opacity-0')} />,
                onSelect: () => update({ sort: k === 'status' ? null : k }),
              }))}
              trigger={(p) => (
                <Button {...p} variant="secondary" size="md" icon={ArrowDownUp} aria-label={`Sort by ${sortLabels[sort]}`}>
                  <span className="hidden sm:inline">{sortLabels[sort]}</span>
                </Button>
              )}
            />
          </div>
        </div>

        <div className="flex items-center justify-between px-5 py-2.5 text-xs text-muted">
          <span>
            {list.length} {list.length === 1 ? 'course' : 'courses'}
            {group !== 'all' && ` in ${summary.groups.find((g) => g.group.id === group)?.group.name.toLowerCase()}`}
          </span>
          {(filtered || group !== 'all') && (
            <button onClick={() => setParams(path, {})} className="font-medium text-accent hover:underline">
              Clear filters
            </button>
          )}
        </div>

        {list.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="No courses match these filters"
            description="Try another search term, or clear the filters to see every course."
            action={
              <Button size="sm" onClick={() => setParams(path, {})}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <CourseTable courses={list} placements={placements} showCategory={group === 'all'} className="border-t border-line" />
        )}
      </Card>
    </div>
  );
}
