import { auditDegree } from './audit';
import { type Core, offeredText } from './core';
import { evaluatePrereq } from './prerequisites';
import { findConflicts } from './schedule';
import type { Plan } from './types';

export type IssueKind =
  | 'missing-course'
  | 'missing-credits'
  | 'missing-rule'
  | 'prerequisite'
  | 'not-offered'
  | 'conflict'
  | 'overload'
  | 'duplicate';

export interface Issue {
  id: string;
  kind: IssueKind;
  /** `critical` issues prevent graduation as planned; `warning` issues need attention. */
  severity: 'critical' | 'warning';
  termId?: string;
  courseIds: string[];
  groupId?: string;
  title: string;
  detail: string;
}

/** Checks a plan against the program rules. Every issue is a fact derived from data, not a guess. */
export function validatePlan(core: Core, plan: Plan): Issue[] {
  const { calendar, catalog, program, history } = core;
  const audit = auditDegree({ program, catalog, calendar, history, plan });
  const issues: Issue[] = [];

  for (const m of audit.missingCourses) {
    const c = catalog.get(m.courseId);
    const rec = history.get(m.courseId);
    issues.push({
      id: `missing-${m.ruleId}`,
      kind: 'missing-course',
      severity: 'critical',
      courseIds: [m.courseId],
      groupId: m.groupId,
      title: m.failedBefore ? `${c.name} must be retaken` : `${c.name} is required but not planned`,
      detail: m.failedBefore
        ? `${c.code} is mandatory. Last attempt: ${rec?.grade} in ${calendar.get(rec!.termId!).label}. Offered ${offeredText(c.offered)}.`
        : `${c.code} (${c.credits} credits) is mandatory and offered ${offeredText(c.offered)}.`,
    });
  }

  for (const g of audit.groups) {
    const ruleIssues = g.rules.filter((r) => r.status === 'missing' && r.rule.type !== 'course');
    for (const r of ruleIssues) {
      issues.push({
        id: `rule-${r.rule.id}`,
        kind: 'missing-rule',
        severity: 'critical',
        courseIds: [],
        groupId: g.group.id,
        title: `${r.label}: not yet covered`,
        detail: `${g.group.name} — ${r.detail}.`,
      });
    }
    const missingMandatory = audit.missingCourses
      .filter((m) => m.groupId === g.group.id)
      .reduce((a, m) => a + catalog.get(m.courseId).credits, 0);
    const extra = g.unplanned - missingMandatory;
    if (extra > 0) {
      issues.push({
        id: `credits-${g.group.id}-${extra}`,
        kind: 'missing-credits',
        severity: 'critical',
        courseIds: [],
        groupId: g.group.id,
        title: `${extra} ${g.group.shortName.toLowerCase()} credits not yet planned`,
        detail: `${g.group.name} needs ${g.group.minCredits} credits. Add courses to cover the remaining ${extra}.`,
      });
    }
  }

  for (const n of audit.notCounted) {
    if (!plan[n.courseId] || calendar.status(plan[n.courseId]) !== 'future') continue;
    issues.push({
      id: `dup-${n.courseId}`,
      kind: 'duplicate',
      severity: 'warning',
      termId: plan[n.courseId],
      courseIds: [n.courseId],
      title: `${catalog.get(n.courseId).name} won’t count`,
      detail: `${n.reason}.`,
    });
  }

  const futureTerms = [...new Set(Object.values(plan))]
    .filter((t) => calendar.status(t) === 'future')
    .sort((a, b) => calendar.compare(a, b));

  for (const termId of futureTerms) {
    const term = calendar.get(termId);
    const ids = Object.keys(plan).filter((id) => plan[id] === termId && catalog.has(id));

    for (const id of ids) {
      const c = catalog.get(id);
      const check = evaluatePrereq(c.prerequisites, { catalog, calendar, history, plan }, termId);
      if (check.state === 'unmet') {
        issues.push({
          id: `prereq-${id}-${termId}`,
          kind: 'prerequisite',
          severity: 'critical',
          termId,
          courseIds: [id],
          title: `Prerequisite not met: ${c.name}`,
          detail: `Requires ${check.missing.join(', ')} before ${term.label}.`,
        });
      }
      if (!c.offered.includes(term.season)) {
        issues.push({
          id: `offered-${id}-${termId}`,
          kind: 'not-offered',
          severity: 'critical',
          termId,
          courseIds: [id],
          title: `${c.name} isn’t offered in ${term.season}`,
          detail: `${c.code} runs ${offeredText(c.offered)}. Move it to a term where it is offered.`,
        });
      }
    }

    for (const cf of findConflicts(ids, catalog)) {
      issues.push({
        id: `conflict-${cf.a}-${cf.b}-${termId}`,
        kind: 'conflict',
        severity: 'warning',
        termId,
        courseIds: [cf.a, cf.b],
        title: `Schedule conflict in ${term.label}`,
        detail: `${catalog.get(cf.a).name} and ${catalog.get(cf.b).name} overlap on ${cf.day} ${cf.start}–${cf.end}.`,
      });
    }

    const credits = ids.reduce((a, id) => a + catalog.get(id).credits, 0);
    const cap = program.maxCreditsPerTerm[term.season];
    if (credits > cap) {
      issues.push({
        id: `overload-${termId}-${credits}`,
        kind: 'overload',
        severity: 'critical',
        termId,
        courseIds: ids,
        title: `${term.label} exceeds the credit limit`,
        detail: `${credits} credits planned; the program allows up to ${cap} in ${term.season} terms without approval.`,
      });
    }
  }

  const rank = { critical: 0, warning: 1 };
  return issues.sort((a, b) => rank[a.severity] - rank[b.severity]);
}
