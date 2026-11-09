import type { Calendar } from './calendar';
import type { Catalog } from './catalog';
import type { History } from './history';
import type { Plan, PrereqExpr } from './types';

/**
 * Prerequisite evaluation for a course taken in a given term.
 *
 * - `met`: satisfied by results already on record before that term.
 * - `expected`: satisfied only if courses in progress or planned for earlier terms are passed.
 * - `unmet`: cannot be satisfied in that term.
 *
 * Passing any course in a leaf's equivalence class satisfies the leaf. Exemptions and
 * recognized credit satisfy a leaf regardless of a minimum grade.
 */

export type PrereqState = 'met' | 'expected' | 'unmet';

export interface PrereqCheck {
  state: PrereqState;
  /** Human-readable reasons for each unmet leaf. */
  missing: string[];
  /** Course ids that must still be passed for an `expected` result. */
  pending: string[];
}

export interface PrereqEnv {
  catalog: Catalog;
  calendar: Calendar;
  history: History;
  plan: Plan;
  /** What-if: treat these in-progress/planned courses as not passed. */
  assumeFailed?: Set<string>;
}

const PASSED_LIKE = new Set(['passed', 'exempt', 'transfer', 'duplicate']);

function leafCourse(courseId: string, minGrade: number | undefined, env: PrereqEnv, termId: string): PrereqCheck {
  const { catalog, calendar, history, plan, assumeFailed } = env;
  const name = catalog.has(courseId) ? catalog.get(courseId).name : courseId;
  let expected: string | null = null;
  let lowGrade: string | null = null;

  for (const opt of catalog.equivalenceClass(courseId)) {
    const rec = history.get(opt);
    if (rec && PASSED_LIKE.has(rec.status) && (!rec.termId || calendar.isBefore(rec.termId, termId))) {
      const waived = rec.status === 'exempt' || rec.status === 'transfer';
      if (waived || minGrade === undefined || rec.grade === 'pass' || (typeof rec.grade === 'number' && rec.grade >= minGrade)) {
        return { state: 'met', missing: [], pending: [] };
      }
      lowGrade = `${name} (grade ${rec.grade}, needs ${minGrade})`;
      continue;
    }
    const inProgressBefore =
      (rec?.status === 'in-progress' || rec?.retaking) && rec.termId && calendar.isBefore(rec.termId, termId) && !assumeFailed?.has(opt);
    const plannedBefore = plan[opt] && calendar.isBefore(plan[opt], termId);
    if (inProgressBefore || plannedBefore) expected = opt;
  }

  if (expected) return { state: 'expected', missing: [], pending: [expected] };
  return {
    state: 'unmet',
    missing: [lowGrade ?? (minGrade !== undefined ? `${name} (min. grade ${minGrade})` : name)],
    pending: [],
  };
}

export function evaluatePrereq(expr: PrereqExpr | undefined, env: PrereqEnv, termId: string): PrereqCheck {
  if (!expr) return { state: 'met', missing: [], pending: [] };

  if ('course' in expr) return leafCourse(expr.course, expr.minGrade, env, termId);

  if ('minCredits' in expr) {
    const earned = env.history.earnedBefore(termId);
    if (earned >= expr.minCredits) return { state: 'met', missing: [], pending: [] };
    // Credits expected from in-progress and planned courses before the term.
    let expectedCredits = earned;
    const pending: string[] = [];
    for (const r of env.history.records.values()) {
      if (r.status === 'in-progress' && r.termId && env.calendar.isBefore(r.termId, termId) && !env.assumeFailed?.has(r.courseId)) {
        expectedCredits += env.catalog.get(r.courseId).credits;
        pending.push(r.courseId);
      }
    }
    for (const [cid, t] of Object.entries(env.plan)) {
      if (env.calendar.isBefore(t, termId) && env.history.get(cid)?.status !== 'passed') {
        expectedCredits += env.catalog.get(cid).credits;
        pending.push(cid);
      }
    }
    if (expectedCredits >= expr.minCredits) return { state: 'expected', missing: [], pending };
    return { state: 'unmet', missing: [`at least ${expr.minCredits} credits completed (${earned} so far)`], pending: [] };
  }

  const parts = ('all' in expr ? expr.all : expr.any).map((e) => evaluatePrereq(e, env, termId));

  if ('all' in expr) {
    if (parts.some((p) => p.state === 'unmet')) {
      return { state: 'unmet', missing: parts.flatMap((p) => p.missing), pending: [] };
    }
    const pending = parts.flatMap((p) => p.pending);
    return { state: pending.length ? 'expected' : 'met', missing: [], pending };
  }

  // any
  if (parts.some((p) => p.state === 'met')) return { state: 'met', missing: [], pending: [] };
  const exp = parts.find((p) => p.state === 'expected');
  if (exp) return exp;
  return { state: 'unmet', missing: [`one of: ${parts.flatMap((p) => p.missing).join(' / ')}`], pending: [] };
}

export function describePrereq(expr: PrereqExpr | undefined, catalog: Catalog, nested = false): string {
  if (!expr) return 'None';
  if ('course' in expr) {
    const name = catalog.has(expr.course) ? catalog.get(expr.course).name : expr.course;
    return expr.minGrade !== undefined ? `${name} (grade ≥ ${expr.minGrade})` : name;
  }
  if ('minCredits' in expr) return `${expr.minCredits}+ credits completed`;
  const list = 'all' in expr ? expr.all : expr.any;
  const text = list.map((e) => describePrereq(e, catalog, true)).join('all' in expr ? ' and ' : ' or ');
  return nested && list.length > 1 ? `(${text})` : text;
}
