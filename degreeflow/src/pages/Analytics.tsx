import { type ColumnDatum, ChartCard, ColumnChart, Legend, LineChart, type LinePoint } from '../components/charts/Charts';
import { Card, PageHeader } from '../components/ui/Card';
import { courseById } from '../data/courses';
import { program } from '../data/program';
import { attemptsIn, priorCredits } from '../lib/degree';
import { useDegree } from '../state/store';

const termShort: Record<string, string> = { Fall: 'Fall', Spring: 'Spr', Summer: 'Sum' };
const shortLabel = (label: string) => {
  const [term, year] = label.split(' ');
  return `${termShort[term] ?? term} ’${year.slice(2)}`;
};

const statusFill = {
  completed: 'rgb(var(--chart-1))',
  current: 'rgb(var(--chart-2))',
  future: 'rgb(var(--chart-3))',
};
const statusName = { completed: 'Completed', current: 'In progress', future: 'Planned' };

export function Analytics() {
  const { loads, summary, prefs } = useDegree();
  const active = loads.filter((l) => l.courses.length > 0);
  const completed = active.filter((l) => l.semester.status === 'completed');
  const regular = completed.filter((l) => l.semester.term !== 'summer');

  // Cumulative credits: actual through the last completed semester, projected after.
  let running = priorCredits;
  const cumulative: LinePoint[] = active.map((l) => {
    running += l.credits;
    return { label: l.semester.label, short: shortLabel(l.semester.label), value: running, projected: l.semester.status !== 'completed' };
  });

  // Term average over every numeric grade received that term (failed attempts included), credit-weighted.
  const semesterAvg = completed
    .map((l) => {
      const graded = attemptsIn(l.semester.id).filter(
        (a) => typeof a.grade === 'number' && courseById[a.courseId].category !== 'preparatory',
      );
      const cr = graded.reduce((a, x) => a + x.course.credits, 0);
      const pts = graded.reduce((a, x) => a + x.course.credits * (x.grade as number), 0);
      return { label: l.semester.label, short: shortLabel(l.semester.label), value: cr ? Math.round((pts / cr) * 10) / 10 : NaN };
    })
    .filter((p) => !Number.isNaN(p.value));
  const best = [...semesterAvg].sort((a, b) => b.value - a.value)[0];

  const credits: ColumnDatum[] = active.map((l) => ({
    label: l.semester.label,
    short: shortLabel(l.semester.label),
    value: l.credits,
    fill: statusFill[l.semester.status],
    status: statusName[l.semester.status],
  }));
  const workload: ColumnDatum[] = active.map((l) => ({
    label: l.semester.label,
    short: shortLabel(l.semester.label),
    value: l.workload,
    fill: statusFill[l.semester.status],
    status: statusName[l.semester.status],
  }));

  const statusLegend = (
    <Legend
      items={[
        { label: 'Completed', swatch: 'bg-chart-1' },
        { label: 'In progress', swatch: 'bg-chart-2' },
        { label: 'Planned', swatch: 'bg-chart-3' },
      ]}
    />
  );

  const tiles = [
    { label: 'Weighted average', value: summary.average.toFixed(1), hint: best ? `Best: ${best.label} · ${best.value}` : '' },
    { label: 'Credits completed', value: summary.completed, hint: `${Math.round(summary.completedPct)}% of ${program.totalCredits}` },
    { label: 'Courses completed', value: summary.completedCourses, hint: `${summary.inProgressCourses} in progress now` },
    {
      label: 'Average load',
      value: (regular.reduce((a, l) => a + l.credits, 0) / Math.max(1, regular.length)).toFixed(1),
      hint: 'credits per completed fall/spring semester',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Insights"
        title="Progress & Analytics"
        description="How your credits, grades and workload have developed — and where your plan takes you next."
      />

      <Card className="grid grid-cols-2 lg:grid-cols-4">
        {tiles.map((t, i) => (
          <div
            key={t.label}
            className={[
              'p-5',
              i % 2 === 0 ? 'border-r border-line' : '',
              i < 2 ? 'border-b border-line lg:border-b-0' : '',
              i === 1 ? 'lg:border-r' : '',
            ].join(' ')}
          >
            <p className="text-xs text-muted">{t.label}</p>
            <p className="mt-1.5 text-3xl font-semibold tracking-tight text-fg">{t.value}</p>
            <p className="mt-1 truncate text-xs text-subtle">{t.hint}</p>
          </div>
        ))}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Cumulative credits"
          description={`Earned so far, and where your plan reaches by ${active[active.length - 1]?.semester.label}`}
          legend={
            <Legend
              items={[
                { label: 'Earned', swatch: 'bg-chart-1', shape: 'line' },
                { label: 'Projected from plan', swatch: 'border-chart-2', shape: 'dashed' },
              ]}
            />
          }
          table={{ columns: ['Semester', 'Credits', 'Type'], rows: cumulative.map((p) => [p.label, p.value, p.projected ? 'Projected' : 'Earned']) }}
        >
          <LineChart
            points={cumulative}
            max={program.totalCredits}
            unit="credits"
            reference={{ value: program.totalCredits, label: `${program.totalCredits} required`, align: 'start' }}
          />
        </ChartCard>

        <ChartCard
          title="Average grade by semester"
          description="Credit-weighted average of completed courses"
          table={{ columns: ['Semester', 'Average'], rows: semesterAvg.map((p) => [p.label, p.value.toFixed(1)]) }}
        >
          <LineChart
            points={semesterAvg}
            min={70}
            max={100}
            reference={{ value: Math.round(summary.average * 10) / 10, label: `Overall ${summary.average.toFixed(1)}` }}
            format={(v) => (Number.isInteger(v) ? String(v) : v.toFixed(1))}
          />
        </ChartCard>

        <ChartCard
          title="Credits per semester"
          description={`Program limit is ${program.maxCreditsPerSemester} credits without approval`}
          legend={statusLegend}
          table={{ columns: ['Semester', 'Credits', 'Status'], rows: credits.map((d) => [d.label, d.value, d.status]) }}
        >
          <ColumnChart data={credits} unit="credits" threshold={{ value: program.maxCreditsPerSemester, label: 'Limit' }} />
        </ChartCard>

        <ChartCard
          title="Estimated weekly workload"
          description="Lecture and self-study hours, estimated from course data"
          legend={statusLegend}
          table={{ columns: ['Semester', 'Hours / week', 'Status'], rows: workload.map((d) => [d.label, d.value, d.status]) }}
        >
          <ColumnChart data={workload} unit="h / week" threshold={{ value: prefs.heavyWorkloadHours, label: `Heavy · ${prefs.heavyWorkloadHours}h` }} />
        </ChartCard>
      </div>
    </div>
  );
}
