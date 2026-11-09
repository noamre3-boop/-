import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  BellOff,
  CheckCheck,
  CheckCircle2,
  Circle,
  Info,
  type LucideIcon,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card, PageHeader } from '../components/ui/Card';
import { Segmented } from '../components/ui/Controls';
import { EmptyState } from '../components/ui/States';
import { cn, formatDate, relativeDays } from '../lib/format';
import { navigate } from '../lib/router';
import { useDegree } from '../state/store';
import type { Severity } from '../types';

type Filter = 'all' | 'unread' | 'action' | 'deadline';

const severityMeta: Record<Severity, { icon: LucideIcon; className: string }> = {
  critical: { icon: AlertOctagon, className: 'bg-danger/10 text-danger border-danger/20' },
  warning: { icon: AlertTriangle, className: 'bg-warning/10 text-warning border-warning/20' },
  info: { icon: Info, className: 'bg-accent/10 text-accent border-accent/20' },
  success: { icon: CheckCircle2, className: 'bg-success/10 text-success border-success/20' },
};

const categoryLabel = {
  deadline: 'Deadline',
  requirement: 'Requirement',
  grade: 'Grades',
  plan: 'Academic plan',
  system: 'System',
};

export function Alerts() {
  const { alerts, unreadAlerts, markRead, markUnread, dismissAlert, restoreAlerts, notifications } = useDegree();
  const [filter, setFilter] = useState<Filter>('all');

  const isAction = (s: Severity) => s === 'critical' || s === 'warning';
  const counts = {
    all: alerts.length,
    unread: unreadAlerts,
    action: alerts.filter((a) => isAction(a.severity)).length,
    deadline: alerts.filter((a) => a.category === 'deadline').length,
  };
  const shown = alerts.filter((a) =>
    filter === 'unread' ? !a.read : filter === 'action' ? isAction(a.severity) : filter === 'deadline' ? a.category === 'deadline' : true,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Notifications"
        title="Alerts"
        description="Deadlines, requirement changes and issues detected in your plan."
        actions={
          <Button size="sm" icon={CheckCheck} disabled={!unreadAlerts} onClick={() => markRead(alerts.map((a) => a.id))}>
            Mark all as read
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="border-b border-line p-4">
          <Segmented
            label="Filter alerts"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All', count: counts.all },
              { value: 'unread', label: 'Unread', count: counts.unread },
              { value: 'action', label: 'Needs action', count: counts.action },
              { value: 'deadline', label: 'Deadlines', count: counts.deadline },
            ]}
          />
        </div>

        {shown.length === 0 ? (
          <EmptyState
            icon={BellOff}
            title={filter === 'all' ? 'You’re all caught up' : 'Nothing here'}
            description={
              filter === 'all'
                ? 'New deadlines and plan issues will appear here.'
                : 'No alerts match this filter right now.'
            }
            action={
              filter === 'all' ? (
                <Button size="sm" onClick={restoreAlerts}>
                  Restore dismissed alerts
                </Button>
              ) : (
                <Button size="sm" onClick={() => setFilter('all')}>
                  Show all alerts
                </Button>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {shown.map((a) => {
              const meta = severityMeta[a.severity];
              const muted = a.category === 'plan' && !notifications.planIssues;
              return (
                <li
                  key={a.id}
                  className={cn('group relative flex gap-4 px-4 py-4 transition-colors hover:bg-raised/40 sm:px-5', !a.read && 'bg-accent/[0.025]')}
                >
                  <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg border', meta.className)}>
                    <meta.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <p className={cn('text-sm', a.read ? 'text-fg/85' : 'font-medium text-fg')}>{a.title}</p>
                      {!a.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-label="Unread" />}
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted">{a.body}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-subtle">
                      <span>{categoryLabel[a.category]}</span>
                      <span title={formatDate(a.date, { month: 'long', day: 'numeric', year: 'numeric' })}>{relativeDays(a.date)}</span>
                      {muted && <span>Notifications off for plan issues</span>}
                      {a.href && a.actionLabel && (
                        <button
                          onClick={() => {
                            markRead([a.id]);
                            navigate(a.href!);
                          }}
                          className="inline-flex items-center gap-1 font-medium text-accent hover:underline hover:underline-offset-4"
                        >
                          {a.actionLabel}
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-start gap-0.5 sm:opacity-60 sm:transition sm:group-hover:opacity-100">
                    <button
                      onClick={() => (a.read ? markUnread(a.id) : markRead([a.id]))}
                      aria-label={a.read ? 'Mark as unread' : 'Mark as read'}
                      title={a.read ? 'Mark as unread' : 'Mark as read'}
                      className="grid h-8 w-8 place-items-center rounded-lg text-subtle transition hover:bg-raised hover:text-fg"
                    >
                      {a.read ? <Circle className="h-3.5 w-3.5" /> : <CheckCheck className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => dismissAlert(a.id)}
                      aria-label="Dismiss alert"
                      title="Dismiss"
                      className="grid h-8 w-8 place-items-center rounded-lg text-subtle transition hover:bg-raised hover:text-fg"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
