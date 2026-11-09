import { auditDegree } from './audit';
import { type Core, offeredText } from './core';
import { recommendForTerm } from './recommend';
import type { Plan, PlanningPrefs, Term } from './types';

/**
 * Graduation forecast by simulation.
 *
 * Starting after the current term (in-progress courses assumed passed unless told otherwise),
 * the forecaster fills each future term with the recommendation engine — respecting offerings,
 * prerequisites, the credit cap and time conflicts — until every requirement except the grade
 * average is covered. The student's own plan is used as a preference, not as a constraint.
 */

export interface ForecastTerm {
  term: Term;
  courseIds: string[];
  credits: number;
  workload: number;
}

export interface Forecast {
  status: 'eligible' | 'projected' | 'infeasible';
  /** Term in which the last requirement is completed (null when infeasible). */
  term: Term | null;
  schedule: ForecastTerm[];
  /** Why the forecast could not complete within the horizon. */
  blockers: string[];
}

export interface ForecastOptions {
  assumeFailed?: Set<string>;
  /** courseId → termId in which the course can't be taken (e.g. no seat). */
  unavailable?: Map<string, string>;
  horizon?: number;
}

/** True when every graduation condition other than the grade average is covered. */
function covered(core: Core, plan: Plan, assumeFailed?: Set<string>) {
  const a = auditDegree({ ...core, plan, assumeFailed });
  return a.conditions.every((c) => c.def.type === 'average' || (c.status !== 'missing' && c.status !== 'failing'));
}

export function forecastGraduation(core: Core, plan: Plan, prefs: PlanningPrefs, opts: ForecastOptions = {}): Forecast {
  const { calendar, catalog } = core;
  const assumeFailed = opts.assumeFailed;

  const completedOnly = auditDegree({ ...core, plan: {}, assumeFailed });
  if (completedOnly.eligible) return { status: 'eligible', term: null, schedule: [], blockers: [] };

  const anyInProgress = [...core.history.records.values()].some((r) => r.status === 'in-progress' && !assumeFailed?.has(r.courseId));
  if (covered(core, {}, assumeFailed)) {
    return { status: 'projected', term: anyInProgress ? calendar.current : null, schedule: [], blockers: [] };
  }

  const sim: Plan = {};
  const schedule: ForecastTerm[] = [];
  const terms = calendar.after(calendar.current.id, opts.horizon ?? 9, { includeSummer: prefs.includeSummer });
  let lastSet: ReturnType<typeof recommendForTerm> | null = null;

  for (const term of terms) {
    const unavailable = new Set(
      [...(opts.unavailable ?? [])].filter(([, t]) => t === term.id).map(([id]) => id),
    );
    const set = recommendForTerm(core, sim, prefs, term.id, { unavailable, assumeFailed, preferred: plan });
    lastSet = set;
    for (const p of set.picks) sim[p.courseId] = term.id;
    if (set.picks.length) {
      schedule.push({ term, courseIds: set.picks.map((p) => p.courseId), credits: set.credits, workload: set.workload });
    }
    if (covered(core, sim, assumeFailed)) return { status: 'projected', term, schedule, blockers: [] };
  }

  const blockers = (lastSet?.blocked ?? []).map((b) => `${catalog.get(b.courseId).name}: ${b.reason}`);
  return {
    status: 'infeasible',
    term: null,
    schedule,
    blockers: blockers.length ? blockers : ['Remaining requirements can’t be scheduled with the current limits'],
  };
}

// ── What could delay graduation ─────────────────────────────────────────────

export interface Risk {
  id: string;
  kind: 'fail-in-progress' | 'missed-seat' | 'single-offering' | 'heavy-term' | 'average' | 'infeasible';
  courseIds: string[];
  title: string;
  detail: string;
  /** Terms of delay compared with the baseline forecast (0 when the risk isn't a delay). */
  delayTerms: number;
  newTerm?: Term;
}

export interface RiskReport {
  baseline: Forecast;
  risks: Risk[];
}

export function analyzeRisks(core: Core, plan: Plan, prefs: PlanningPrefs): RiskReport {
  const { calendar, catalog, history, program } = core;
  const baseline = forecastGraduation(core, plan, prefs);
  const risks: Risk[] = [];

  if (baseline.status === 'infeasible') {
    risks.push({
      id: 'infeasible',
      kind: 'infeasible',
      courseIds: [],
      title: 'Remaining requirements can’t be scheduled',
      detail: baseline.blockers.join(' · '),
      delayTerms: 0,
    });
    return { baseline, risks };
  }

  const baseTerm = baseline.term ?? calendar.current;
  const termsBetween = (a: Term, b: Term) => {
    let n = 0;
    let t = a;
    while (calendar.isBefore(t.id, b.id) && n < 20) {
      t = calendar.next(t.id, { includeSummer: prefs.includeSummer });
      n++;
    }
    return n;
  };
  const delayOf = (f: ReturnType<typeof forecastGraduation>) => {
    if (f.status === 'infeasible' || !f.term) return { delay: f.status === 'infeasible' ? 99 : 0, term: f.term ?? undefined };
    return { delay: calendar.isBefore(baseTerm.id, f.term.id) ? termsBetween(baseTerm, f.term) : 0, term: f.term };
  };

  // 1. Failing a course that is in progress now.
  for (const r of history.records.values()) {
    if (r.status !== 'in-progress') continue;
    const c = catalog.get(r.courseId);
    const { delay, term } = delayOf(forecastGraduation(core, plan, prefs, { assumeFailed: new Set([c.id]) }));
    if (delay <= 0) continue;
    const blocked = catalog.dependents(c.id).filter((d) => plan[d.id] || baseline.schedule.some((t) => t.courseIds.includes(d.id)));
    const mandatory = program.groups.some((g) =>
      g.rules.some((rule) => rule.type === 'course' && [rule.course, ...(rule.alternatives ?? [])].includes(c.id)),
    );
    const why = mandatory
      ? `It’s mandatory and runs ${offeredText(c.offered)}, so the retake would come later`
      : `You’d need ${c.credits} replacement credits, and no remaining option fits sooner`;
    risks.push({
      id: `fail-${c.id}`,
      kind: 'fail-in-progress',
      courseIds: [c.id],
      title: `Not passing ${c.name} would delay graduation`,
      detail: `${why}${blocked.length ? `; ${blocked.map((d) => d.name).join(', ')} would also have to wait` : ''}. Graduation would move to ${
        term?.label ?? 'an unknown term'
      }.`,
      delayTerms: delay,
      newTerm: term,
    });
  }

  // 2. Not getting into a course scheduled for the next term.
  const first = baseline.schedule[0];
  if (first) {
    for (const id of first.courseIds) {
      const c = catalog.get(id);
      const { delay, term } = delayOf(
        forecastGraduation(core, plan, prefs, { unavailable: new Map([[id, first.term.id]]) }),
      );
      if (delay <= 0) continue;
      risks.push({
        id: `seat-${id}`,
        kind: c.highDemand ? 'missed-seat' : 'single-offering',
        courseIds: [id],
        title: c.highDemand
          ? `Missing a seat in ${c.name} would delay graduation`
          : `${c.name} can’t be postponed without a delay`,
        detail: `${c.name} runs ${offeredText(c.offered)}. Not taking it in ${first.term.label} moves graduation to ${term?.label ?? 'an unknown term'}.${
          c.highDemand ? ' It historically fills quickly — register on the first day.' : ''
        }`,
        delayTerms: delay,
        newTerm: term,
      });
    }
  }

  // 3. Heavy terms in the forecast.
  for (const t of baseline.schedule) {
    if (t.workload <= prefs.heavyWorkloadHours) continue;
    risks.push({
      id: `heavy-${t.term.id}`,
      kind: 'heavy-term',
      courseIds: t.courseIds,
      title: `${t.term.label} would be a heavy term`,
      detail: `About ${t.workload} hours a week across ${t.credits} credits — above your ${prefs.heavyWorkloadHours}-hour threshold. A failed course in a heavy term is the most common cause of delay.`,
      delayTerms: 0,
    });
  }

  // 4. Average close to (or below) the minimum.
  const avgCond = program.conditions.find((c) => c.type === 'average');
  if (avgCond && avgCond.type === 'average' && history.average !== null && history.average < avgCond.min + 3) {
    risks.push({
      id: 'average',
      kind: 'average',
      courseIds: [],
      title: history.average < avgCond.min ? 'Average below the graduation minimum' : 'Average close to the graduation minimum',
      detail: `Your average is ${history.average.toFixed(1)}; the program requires ${avgCond.min}.`,
      delayTerms: 0,
    });
  }

  risks.sort((a, b) => b.delayTerms - a.delayTerms);
  return { baseline, risks };
}
