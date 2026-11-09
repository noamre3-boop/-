import { auditDegree } from './audit';
import { prereqCourses } from './catalog';
import { type Core, creditCap, offeredText, planBefore } from './core';
import { isComplete } from './history';
import { evaluatePrereq } from './prerequisites';
import { conflictsWith } from './schedule';
import type { Plan, PlanningPrefs, Term } from './types';

/**
 * Next-term course recommendations.
 *
 * Candidates are only courses the student still needs: missing mandatory courses (including
 * retakes of failed ones), and courses that fill an uncovered elective/credit or count rule.
 * Each candidate is checked for offering, prerequisites, credit cap and time conflicts, then
 * ranked; every pick carries the concrete reasons it was chosen.
 */

export interface Recommendation {
  courseId: string;
  termId: string;
  kind: 'required' | 'retake' | 'elective';
  groupId: string | null;
  score: number;
  reasons: string[];
  /** Prerequisites still in progress that must be passed first. */
  conditionalOn: string[];
  inPlan: boolean;
}

export interface Excluded {
  courseId: string;
  reason: string;
}

export interface RecommendationSet {
  term: Term;
  picks: Recommendation[];
  /** Eligible candidates that were not picked, with the reason. */
  alternatives: (Recommendation & { notPicked: string })[];
  /** Needed courses that can't be taken this term. */
  blocked: Excluded[];
  credits: number;
  workload: number;
  cap: number;
  heavy: boolean;
}

export interface RecommendOptions {
  /** Courses that cannot be taken in this term (what-if: missed registration). */
  unavailable?: Set<string>;
  /** What-if: treat these courses as failed. */
  assumeFailed?: Set<string>;
  /** The student's own plan, used only to prefer courses they already chose. */
  preferred?: Plan;
}

export function recommendForTerm(
  core: Core,
  plan: Plan,
  prefs: PlanningPrefs,
  termId: string,
  opts: RecommendOptions = {},
): RecommendationSet {
  const { calendar, catalog, program, history } = core;
  const term = calendar.get(termId);
  const base = planBefore(core, plan, termId);
  const assumeFailed = opts.assumeFailed;
  const audit = auditDegree({ program, catalog, calendar, history, plan: base, assumeFailed });
  const env = { catalog, calendar, history, plan: base, assumeFailed };
  const cap = creditCap(core, termId, prefs);
  const preferred = opts.preferred ?? plan;

  // Courses already taken, in progress, or planned earlier are not candidates.
  const taken = (id: string) => {
    const rec = history.get(id);
    if (isComplete(rec) || rec?.status === 'duplicate') return true;
    if (rec?.status === 'in-progress' && !assumeFailed?.has(id)) return true;
    return !!base[id];
  };
  const earned = new Set(
    catalog.courses.filter((c) => taken(c.id)).flatMap((c) => [...catalog.equivalenceClass(c.id)]),
  );

  // ── Needs ────────────────────────────────────────────────────────────────
  type Need = { courseId: string; kind: Recommendation['kind']; groupId: string | null; reasons: string[]; base: number; optional: boolean };
  const needs = new Map<string, Need>();
  const neededIds = new Set<string>();

  for (const m of audit.missingCourses) {
    // Prefer the option the student can actually take this term.
    const options = m.failedBefore ? [m.courseId, ...m.options.filter((o) => o !== m.courseId)] : m.options;
    for (const o of options) neededIds.add(o);
    const pick =
      options.find((o) => catalog.get(o).offered.includes(term.season) && evaluatePrereq(catalog.get(o).prerequisites, env, termId).state !== 'unmet') ??
      m.courseId;
    const group = program.groups.find((g) => g.id === m.groupId)!;
    const rec = history.get(pick);
    needs.set(pick, {
      courseId: pick,
      kind: m.failedBefore ? 'retake' : 'required',
      groupId: m.groupId,
      base: 100,
      optional: false,
      reasons: [
        m.failedBefore
          ? `Mandatory — last attempt ${rec?.grade} didn’t pass, so it must be retaken`
          : `Mandatory ${group.shortName.toLowerCase()} course you haven’t taken yet`,
      ],
    });
  }

  const groupNeed = new Map<string, number>();
  type CountNeed = { label: string; left: number; unit: 'count' | 'credits'; test: (id: string) => boolean };
  const countNeed = new Map<string, CountNeed>();
  for (const g of audit.groups) {
    const mandatoryCredits = audit.missingCourses
      .filter((m) => m.groupId === g.group.id)
      .reduce((a, m) => a + catalog.get(m.courseId).credits, 0);
    const left = g.unplanned - mandatoryCredits;
    if (left > 0) groupNeed.set(g.group.id, left);
    for (const r of g.rules) {
      if (r.rule.type === 'course' || r.status !== 'missing') continue;
      const rule = r.rule;
      const have =
        rule.type === 'count'
          ? r.satisfiedBy.length
          : r.satisfiedBy.reduce((a, id) => a + catalog.get(id).credits, 0);
      countNeed.set(rule.id, {
        label: rule.label,
        left: rule.min - have,
        unit: rule.type,
        test: (id) => catalog.matches(id, rule.from),
      });
    }
  }

  for (const c of catalog.courses) {
    if (needs.has(c.id) || taken(c.id) || earned.has(c.id)) continue;
    const group = program.groups.find((g) => catalog.matches(c.id, g.pool) && groupNeed.has(g.id));
    const counts = [...countNeed.values()].filter((n) => n.left > 0 && n.test(c.id));
    if (!group && !counts.length) continue;
    const reasons: string[] = [];
    if (group) reasons.push(`Covers ${Math.min(c.credits, groupNeed.get(group.id)!)} of the ${groupNeed.get(group.id)} credits still needed in ${group.name.toLowerCase()}`);
    for (const n of counts) reasons.push(`Counts toward “${n.label}”`);
    const rec = history.get(c.id);
    const retake = rec?.status === 'failed';
    if (retake && program.retakePolicy === 'latest' && program.failedGradesInAverage) {
      reasons.push(`Passing it replaces your failing grade (${rec.grade}) in the average`);
    }
    needs.set(c.id, {
      courseId: c.id,
      kind: retake ? 'retake' : 'elective',
      groupId: group?.id ?? null,
      base: 30 + counts.length * 25 + (retake ? 10 : 0),
      reasons,
      optional: true,
    });
    neededIds.add(c.id);
  }

  // ── Evaluate candidates ──────────────────────────────────────────────────
  const blocked: Excluded[] = [];
  const candidates: Recommendation[] = [];
  const dependentsNeeded = (id: string) => catalog.dependents(id).filter((d) => neededIds.has(d.id) && d.id !== id);

  for (const need of needs.values()) {
    const c = catalog.get(need.courseId);
    if (opts.unavailable?.has(c.id)) {
      blocked.push({ courseId: c.id, reason: 'No seat available this term' });
      continue;
    }
    if (!c.offered.includes(term.season)) {
      const next = calendar.nextOffering(termId, c.offered);
      blocked.push({ courseId: c.id, reason: `Not offered in ${term.season} — next run ${next?.label ?? 'unknown'}` });
      continue;
    }
    const check = evaluatePrereq(c.prerequisites, env, termId);
    if (check.state === 'unmet') {
      blocked.push({ courseId: c.id, reason: `Requires ${check.missing.join(', ')}` });
      continue;
    }

    let score = need.base;
    const reasons = [...need.reasons];
    if (c.offered.length === 1) {
      const next = calendar.nextOffering(termId, c.offered);
      score += need.kind === 'elective' ? 5 : 30;
      if (need.kind !== 'elective') reasons.push(`Offered only in ${c.offered[0]} — the next run after this is ${next?.label}`);
    }
    const deps = dependentsNeeded(c.id);
    if (deps.length) {
      score += 12 * deps.length;
      reasons.push(`Prerequisite for ${deps.map((d) => d.name).join(', ')}`);
    }
    if (preferred[c.id] === termId) {
      score += 15;
      reasons.push(`Already in your plan for ${term.label}`);
    }
    const prereqGrades = prereqCourses(c.prerequisites)
      .map((p) => ({ p, g: history.get(p)?.grade }))
      .filter((x): x is { p: string; g: number } => typeof x.g === 'number');
    const strong = prereqGrades.filter((x) => x.g >= 85);
    if (strong.length) {
      score += 4;
      reasons.push(`Builds on ${strong.map((x) => `${catalog.get(x.p).name} (${x.g})`).join(', ')}`);
    }
    if (check.state === 'expected') {
      reasons.push(`Assumes you pass ${check.pending.map((p) => catalog.get(p).name).join(', ')} first`);
    }
    if (c.highDemand) {
      score += 3;
      reasons.push('High-demand course — register as soon as registration opens');
    }
    score -= c.workload * 0.8;
    candidates.push({
      courseId: c.id,
      termId,
      kind: need.kind,
      groupId: need.groupId,
      score,
      reasons,
      conditionalOn: check.pending,
      inPlan: preferred[c.id] === termId,
    });
  }

  candidates.sort((a, b) => b.score - a.score);

  // ── Select within credit cap, without conflicts, only as much as needed ──
  const picks: Recommendation[] = [];
  const alternatives: RecommendationSet['alternatives'] = [];
  let credits = 0;
  const groupLeft = new Map(groupNeed);
  const countLeft = new Map([...countNeed].map(([k, v]) => [k, v.left]));

  for (const cand of candidates) {
    const c = catalog.get(cand.courseId);
    if (needs.get(cand.courseId)!.optional) {
      const fillsGroup = cand.groupId ? (groupLeft.get(cand.groupId) ?? 0) > 0 : false;
      const fillsCount = [...countNeed].some(([k, n]) => (countLeft.get(k) ?? 0) > 0 && n.test(c.id));
      if (!fillsGroup && !fillsCount) {
        alternatives.push({ ...cand, notPicked: 'Requirement already covered by other picks' });
        continue;
      }
    }
    if (credits + c.credits > cap) {
      alternatives.push({ ...cand, notPicked: `Would exceed ${cap} credits` });
      continue;
    }
    const clash = conflictsWith(c.id, picks.map((p) => p.courseId), catalog)[0];
    if (clash) {
      const other = clash.a === c.id ? clash.b : clash.a;
      alternatives.push({ ...cand, notPicked: `Time conflict with ${catalog.get(other).name} (${clash.day} ${clash.start}–${clash.end})` });
      continue;
    }
    picks.push(cand);
    credits += c.credits;
    if (cand.groupId && groupLeft.has(cand.groupId)) groupLeft.set(cand.groupId, groupLeft.get(cand.groupId)! - c.credits);
    for (const [k, n] of countNeed) if (n.test(c.id)) countLeft.set(k, (countLeft.get(k) ?? 0) - (n.unit === 'count' ? 1 : c.credits));
  }

  if (picks.length > 1) {
    for (const p of picks) p.reasons.push('No time conflicts with the other recommended courses');
  }

  const workload = picks.reduce((a, p) => a + catalog.get(p.courseId).workload, 0);
  return { term, picks, alternatives, blocked, credits, workload, cap, heavy: workload > prefs.heavyWorkloadHours };
}

export { offeredText };
