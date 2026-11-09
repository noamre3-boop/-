import { ArrowUpRight, CheckCircle2, EyeOff, ShieldCheck, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/format';
import type { Insight } from '../../lib/insights';
import { navigate } from '../../lib/router';
import { useDegree } from '../../state/store';
import { useUI } from '../../state/ui';
import { Button } from '../ui/Button';
import { Segmented } from '../ui/Controls';
import { EmptyState } from '../ui/States';

type Filter = 'all' | 'rule' | 'ai';

const severityText: Record<Insight['severity'], string> = {
  critical: 'text-danger',
  warning: 'text-warning',
  info: 'text-accent',
  success: 'text-success',
};

export function InsightCard({ insight, onAfterAction }: { insight: Insight; onAfterAction?: () => void }) {
  const { moveCourse, swapCourses, dismissInsight } = useDegree();
  const { openCourse } = useUI();
  const ai = insight.source === 'ai';

  const run = () => {
    const a = insight.action;
    if (!a) return;
    if (a.type === 'move') moveCourse(a.courseId, a.to);
    if (a.type === 'swap') swapCourses(a.remove, a.add, a.semesterId);
    if (a.type === 'course') openCourse(a.courseId);
    if (a.type === 'navigate') {
      navigate(a.href);
      onAfterAction?.();
    }
  };

  return (
    <article
      className={cn(
        'group relative rounded-xl p-px transition-transform duration-200',
        ai ? 'bg-gradient-to-br from-violet/45 via-violet/10 to-accent/25' : 'bg-line',
      )}
    >
      <div className={cn('rounded-[11px] p-4', ai ? 'bg-surface/[0.97]' : 'bg-surface')}>
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wider',
              ai ? 'text-violet' : severityText[insight.severity],
            )}
          >
            {ai ? <Sparkles className="h-3 w-3" /> : insight.severity === 'success' ? <CheckCircle2 className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
            {ai ? 'AI suggestion' : 'Confirmed · degree rule'}
          </span>
          {ai && insight.confidence && <span className="text-2xs text-subtle">{insight.confidence} confidence</span>}
        </div>
        <h3 className="mt-2 text-sm font-medium leading-snug text-fg">{insight.title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted">{insight.body}</p>
        {insight.impact && (
          <p className="mt-2.5 flex items-start gap-1.5 text-xs text-fg/80">
            <ArrowUpRight className="mt-px h-3.5 w-3.5 shrink-0 text-subtle" />
            {insight.impact}
          </p>
        )}
        {(insight.action || ai) && (
          <div className="mt-3.5 flex items-center gap-2">
            {insight.action && (
              <Button size="sm" variant={ai ? 'subtle' : 'secondary'} onClick={run}>
                {insight.action.label}
              </Button>
            )}
            {ai && (
              <Button size="sm" variant="ghost" icon={EyeOff} onClick={() => dismissInsight(insight.id)}>
                Dismiss
              </Button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export function InsightsPanel({ onAfterAction, className }: { onAfterAction?: () => void; className?: string }) {
  const { insights, dismissedInsightCount, restoreInsights } = useDegree();
  const [filter, setFilter] = useState<Filter>('all');
  const rules = insights.filter((i) => i.source === 'rule');
  const ai = insights.filter((i) => i.source === 'ai');
  const shown = filter === 'all' ? insights : filter === 'rule' ? rules : ai;

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Filter insights"
          size="sm"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All', count: insights.length },
            { value: 'rule', label: 'Requirements', count: rules.length },
            { value: 'ai', label: 'AI suggestions', count: ai.length },
          ]}
        />
      </div>

      <div className="mt-4 space-y-3">
        {shown.length === 0 ? (
          <EmptyState
            className="py-10"
            icon={filter === 'ai' ? Sparkles : CheckCircle2}
            title={filter === 'ai' ? 'No suggestions right now' : 'Nothing needs attention'}
            description={
              filter === 'ai'
                ? 'Suggestions appear when DegreeFlow spots a better way to plan.'
                : 'Your plan satisfies every degree rule DegreeFlow checks.'
            }
          />
        ) : (
          shown.map((i) => <InsightCard key={i.id} insight={i} onAfterAction={onAfterAction} />)
        )}
      </div>

      <div className="mt-5 space-y-2 rounded-xl border border-dashed border-line px-4 py-3 text-2xs leading-relaxed text-subtle">
        <p className="flex items-start gap-1.5">
          <ShieldCheck className="mt-px h-3 w-3 shrink-0" />
          <span>
            <span className="text-muted">Confirmed</span> items come straight from your program’s degree rules.
          </span>
        </p>
        <p className="flex items-start gap-1.5">
          <Sparkles className="mt-px h-3 w-3 shrink-0" />
          <span>
            <span className="text-muted">AI suggestions</span> are generated from your plan and sample data — review them with
            your advisor before acting.
          </span>
        </p>
        {dismissedInsightCount > 0 && (
          <button onClick={restoreInsights} className="text-accent hover:underline">
            Show {dismissedInsightCount} dismissed {dismissedInsightCount === 1 ? 'suggestion' : 'suggestions'}
          </button>
        )}
      </div>
    </div>
  );
}
