import { staticAlerts } from '../data/calendar';
import { DEMO_TODAY } from '../data/program';
import type { Alert } from '../types';
import type { Issue, Projection } from './degree';

/** Static notifications plus alerts generated from the live plan, newest first. */
export function buildAlerts(issues: Issue[], projection: Projection): Alert[] {
  const planAlerts: Alert[] = issues.map((i) => ({
    id: `plan-${i.id}`,
    date: DEMO_TODAY,
    title: i.title,
    body: i.detail,
    severity: i.severity,
    category: i.kind === 'missing-course' || i.kind === 'missing-credits' ? 'requirement' : 'plan',
    actionLabel: i.courseIds[0] && i.kind === 'missing-course' ? 'Fix in plan' : 'Open plan',
    href: i.courseIds[0] && i.kind === 'missing-course' ? `/plan?focus=${i.courseIds[0]}` : '/plan',
  }));
  if (projection.status === 'delayed') {
    planAlerts.unshift({
      id: `plan-delay-${projection.semester.id}`,
      date: DEMO_TODAY,
      title: `Graduation projected for ${projection.label}`,
      body: `Your plan now finishes ${projection.reason}.`,
      severity: 'warning',
      category: 'plan',
      actionLabel: 'Review plan',
      href: '/plan',
    });
  }
  return [...planAlerts, ...staticAlerts].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}
