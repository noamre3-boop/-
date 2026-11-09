import type { Calendar } from './calendar';
import type { Catalog } from './catalog';
import { type CourseRecord, type History, isComplete } from './history';
import type { ConditionDef, Plan, ProgramDef, RequirementGroupDef, Rule } from './types';

/**
 * Degree audit: evaluates every requirement group, every rule and every graduation condition
 * separately, in three layers — completed, in progress and planned.
 *
 * Credit allocation: each course earns credit in exactly one requirement group. A course that a
 * group names explicitly (as a mandatory course or alternative) goes to that group; otherwise to
 * the first group whose pool includes it and still has room under its `maxCredits`. Courses that
 * fit no group, or exceed a group's cap, don't count toward the degree.
 */

export type Layer = 'completed' | 'inProgress' | 'planned';
export type RuleStatus = 'met' | 'in-progress' | 'planned' | 'missing';
export type ConditionStatus = RuleStatus | 'failing';

export interface RuleResult {
  rule: Rule;
  label: string;
  status: RuleStatus;
  detail: string;
  /** Course ids that satisfy (or will satisfy) the rule. */
  satisfiedBy: string[];
  have?: number;
  need?: number;
}

export interface GroupAudit {
  group: RequirementGroupDef;
  completed: number;
  inProgress: number;
  planned: number;
  /** Credits still needed beyond completed ones. */
  remaining: number;
  /** Credits still needed beyond completed + in progress + planned. */
  unplanned: number;
  /** Fully satisfied by completed work. */
  satisfied: boolean;
  /** Will be satisfied if in-progress and planned courses are passed. */
  covered: boolean;
  rules: RuleResult[];
  courseIds: string[];
}

export interface ConditionResult {
  def: ConditionDef;
  status: ConditionStatus;
  detail: string;
}

export interface MissingCourse {
  ruleId: string;
  groupId: string;
  /** The option to suggest: the primary course, or the one the student already attempted. */
  courseId: string;
  options: string[];
  failedBefore: boolean;
}

export interface AuditInput {
  program: ProgramDef;
  catalog: Catalog;
  calendar: Calendar;
  history: History;
  plan: Plan;
  /** What-if: treat these in-progress or planned courses as failed. */
  assumeFailed?: Set<string>;
}

export interface Audit {
  groups: GroupAudit[];
  conditions: ConditionResult[];
  totals: { required: number; completed: number; inProgress: number; planned: number; remaining: number; unplanned: number };
  /** Every condition is met by completed work. */
  eligible: boolean;
  /** Every condition will be met if in-progress and planned courses are passed. */
  projectedEligible: boolean;
  missingCourses: MissingCourse[];
  /** Where each counted course's credits went (null: not counted toward the degree). */
  allocation: Map<string, { groupId: string | null; credits: number; layer: Layer }>;
  /** Courses taken or planned that earn no degree credit, with the reason. */
  notCounted: { courseId: string; reason: string }[];
}

const RANK: Record<RuleStatus, number> = { met: 0, 'in-progress': 1, planned: 2, missing: 3 };
const worst = (xs: RuleStatus[]) => xs.reduce<RuleStatus>((w, s) => (RANK[s] > RANK[w] ? s : w), 'met');

export function auditDegree(input: AuditInput): Audit {
  const { program, catalog, calendar, history, plan, assumeFailed } = input;

  // ── Build credit units per layer, without double counting ────────────────
  type Unit = { courseId: string; credits: number; layer: Layer };
  const units: Unit[] = [];
  const earnedClasses = new Set<string>();
  const classKey = (id: string) => [...catalog.equivalenceClass(id)].sort().join('|');
  const notCounted: Audit['notCounted'] = [];

  const recs = [...history.records.values()].sort((a, b) =>
    !a.termId ? -1 : !b.termId ? 1 : calendar.compare(a.termId, b.termId),
  );
  for (const r of recs) {
    if (r.credits > 0) {
      units.push({ courseId: r.courseId, credits: r.credits, layer: 'completed' });
      earnedClasses.add(classKey(r.courseId));
    } else if (r.outsideProgram && r.status === 'passed') {
      notCounted.push({ courseId: r.courseId, reason: 'Not part of this program’s requirements' });
    } else if (r.status === 'duplicate') {
      notCounted.push({ courseId: r.courseId, reason: `Equivalent to ${catalog.get(r.duplicateOf!).name}, which already earned the credit` });
    }
  }

  const inProgressIds = new Set<string>();
  for (const r of recs) {
    if (r.status !== 'in-progress' || assumeFailed?.has(r.courseId)) continue;
    const key = classKey(r.courseId);
    if (earnedClasses.has(key)) continue;
    earnedClasses.add(key);
    inProgressIds.add(r.courseId);
    units.push({ courseId: r.courseId, credits: catalog.get(r.courseId).credits, layer: 'inProgress' });
  }

  const plannedIds = new Set<string>();
  const planEntries = Object.entries(plan)
    .filter(([id, t]) => catalog.has(id) && calendar.status(t) === 'future')
    .sort((a, b) => calendar.compare(a[1], b[1]));
  for (const [id] of planEntries) {
    const rec = history.get(id);
    // A course in progress counts as in progress, unless a what-if treats it as failed (then a planned retake counts).
    if (isComplete(rec) || (rec?.status === 'in-progress' && !assumeFailed?.has(id))) continue;
    const key = classKey(id);
    if (earnedClasses.has(key)) {
      notCounted.push({ courseId: id, reason: 'An equivalent course already counts toward the degree' });
      continue;
    }
    earnedClasses.add(key);
    plannedIds.add(id);
    units.push({ courseId: id, credits: catalog.get(id).credits, layer: 'planned' });
  }

  // ── Allocate units to groups ──────────────────────────────────────────────
  const namedIn = (g: RequirementGroupDef, id: string) =>
    g.rules.some(
      (r) => r.type === 'course' && [r.course, ...(r.alternatives ?? [])].some((o) => catalog.equivalenceClass(o).has(id)),
    );
  const used = new Map(program.groups.map((g) => [g.id, 0]));
  const allocation: Audit['allocation'] = new Map();

  for (const u of units) {
    const candidates = [
      ...program.groups.filter((g) => namedIn(g, u.courseId)),
      ...program.groups.filter((g) => !namedIn(g, u.courseId) && catalog.matches(u.courseId, g.pool)),
    ];
    if (!candidates.length) {
      allocation.set(u.courseId, { groupId: null, credits: 0, layer: u.layer });
      notCounted.push({ courseId: u.courseId, reason: 'Not part of this program’s requirements' });
      continue;
    }
    const room = (g: RequirementGroupDef) => (g.maxCredits ?? Infinity) - used.get(g.id)!;
    const target = candidates.find((g) => room(g) >= u.credits) ?? candidates.find((g) => room(g) > 0);
    if (!target) {
      allocation.set(u.courseId, { groupId: null, credits: 0, layer: u.layer });
      notCounted.push({ courseId: u.courseId, reason: `Above the ${candidates[0].name.toLowerCase()} credit cap` });
      continue;
    }
    const credits = Math.min(u.credits, room(target));
    used.set(target.id, used.get(target.id)! + credits);
    allocation.set(u.courseId, { groupId: target.id, credits, layer: u.layer });
    if (credits < u.credits) {
      notCounted.push({ courseId: u.courseId, reason: `${u.credits - credits} credits above the ${target.name.toLowerCase()} cap` });
    }
  }

  // ── Rules ─────────────────────────────────────────────────────────────────
  const stateOf = (id: string): RuleStatus => {
    const rec = history.get(id);
    if (isComplete(rec) || rec?.status === 'duplicate') return 'met';
    if (inProgressIds.has(id) || (rec?.status === 'in-progress' && !assumeFailed?.has(id))) return 'in-progress';
    if (plannedIds.has(id)) return 'planned';
    return 'missing';
  };

  const describeRecord = (rec: CourseRecord | undefined): string => {
    if (!rec) return 'Not taken yet';
    switch (rec.status) {
      case 'passed': {
        const g = rec.grade === 'pass' ? 'Pass' : rec.grade;
        return rec.attempts.filter((a) => a.status === 'graded').length > 1 ? `Passed on retake (${g})` : `Passed (${g})`;
      }
      case 'exempt':
        return `Exempt — ${rec.exemption?.source}`;
      case 'transfer':
        return `Recognized — ${rec.exemption?.source}`;
      case 'duplicate':
        return `Passed (credit counted under ${catalog.get(rec.duplicateOf!).name})`;
      case 'in-progress':
        return rec.counted ? `Retaking (previous grade ${rec.grade})` : 'In progress';
      case 'failed':
        return `Failed (${rec.grade}) — must be retaken`;
      default:
        return 'Withdrawn';
    }
  };

  const missingCourses: MissingCourse[] = [];

  const evalRule = (rule: Rule, group: RequirementGroupDef): RuleResult => {
    if (rule.type === 'course') {
      const options = [rule.course, ...(rule.alternatives ?? [])];
      const expanded = [...new Set(options.flatMap((o) => [...catalog.equivalenceClass(o)]))];
      const states = expanded.map((id) => ({ id, s: stateOf(id) }));
      const best = states.reduce((b, x) => (RANK[x.s] < RANK[b.s] ? x : b));
      const names = options.map((o) => catalog.get(o).name);
      const label = names.length > 1 ? `${names[0]} (or ${names.slice(1).join(', ')})` : names[0];
      if (best.s === 'missing') {
        const failed = expanded.find((id) => history.get(id)?.status === 'failed');
        missingCourses.push({ ruleId: rule.id, groupId: group.id, courseId: failed ?? rule.course, options, failedBefore: !!failed });
        return { rule, label, status: 'missing', detail: describeRecord(failed ? history.get(failed) : undefined), satisfiedBy: [] };
      }
      const detail =
        best.s === 'met'
          ? describeRecord(history.get(best.id))
          : best.s === 'in-progress'
            ? describeRecord(history.get(best.id))
            : `Planned for ${calendar.get(plan[best.id]).label}`;
      const via = best.id !== rule.course ? ` via ${catalog.get(best.id).name}` : '';
      return { rule, label, status: best.s, detail: detail + via, satisfiedBy: [best.id] };
    }

    // count / credits rules
    const ids = catalog.courses.map((c) => c.id).filter((id) => catalog.matches(id, rule.from));
    const sum = (s: RuleStatus) =>
      ids
        .filter((id) => stateOf(id) === s && history.get(id)?.status !== 'duplicate')
        .reduce((a, id) => a + (rule.type === 'count' ? 1 : catalog.get(id).credits), 0);
    const c = sum('met');
    const i = sum('in-progress');
    const p = sum('planned');
    const status: RuleStatus = c >= rule.min ? 'met' : c + i >= rule.min ? 'in-progress' : c + i + p >= rule.min ? 'planned' : 'missing';
    const unit = rule.type === 'count' ? 'courses' : 'credits';
    return {
      rule,
      label: rule.label,
      status,
      detail: `${c} of ${rule.min} ${unit} completed${i ? ` · ${i} in progress` : ''}${p ? ` · ${p} planned` : ''}`,
      satisfiedBy: ids.filter((id) => stateOf(id) !== 'missing'),
      have: c,
      need: rule.min,
    };
  };

  // ── Groups ────────────────────────────────────────────────────────────────
  const groups: GroupAudit[] = program.groups.map((group) => {
    const mine = [...allocation.entries()].filter(([, a]) => a.groupId === group.id);
    const layer = (l: Layer) => mine.filter(([, a]) => a.layer === l).reduce((s, [, a]) => s + a.credits, 0);
    const completed = layer('completed');
    const inProgress = layer('inProgress');
    const planned = layer('planned');
    const rules = group.rules.map((r) => evalRule(r, group));
    const ruleStates = rules.map((r) => r.status);
    return {
      group,
      completed,
      inProgress,
      planned,
      remaining: Math.max(0, group.minCredits - completed),
      unplanned: Math.max(0, group.minCredits - completed - inProgress - planned),
      satisfied: completed >= group.minCredits && ruleStates.every((s) => s === 'met'),
      covered: completed + inProgress + planned >= group.minCredits && !ruleStates.includes('missing'),
      rules,
      courseIds: mine.map(([id]) => id),
    };
  });

  const sumLayer = (l: Layer) => [...allocation.values()].filter((a) => a.layer === l).reduce((s, a) => s + a.credits, 0);
  const completed = sumLayer('completed');
  const inProgress = sumLayer('inProgress');
  const planned = sumLayer('planned');
  const required = program.totalCredits;
  const totals = {
    required,
    completed,
    inProgress,
    planned,
    remaining: Math.max(0, required - completed),
    unplanned: Math.max(
      groups.reduce((a, g) => a + g.unplanned, 0),
      required - completed - inProgress - planned,
      0,
    ),
  };

  // ── Graduation conditions ─────────────────────────────────────────────────
  const conditions: ConditionResult[] = program.conditions.map((def) => {
    switch (def.type) {
      case 'total-credits': {
        const status: ConditionStatus =
          completed >= def.min ? 'met' : completed + inProgress >= def.min ? 'in-progress' : completed + inProgress + planned >= def.min ? 'planned' : 'missing';
        return { def, status, detail: `${completed} of ${def.min} completed · ${inProgress + planned} in progress or planned` };
      }
      case 'average': {
        const avg = history.average;
        if (avg === null) return { def, status: 'missing', detail: 'No graded courses yet' };
        return {
          def,
          status: avg >= def.min ? 'met' : 'failing',
          detail: `Current average ${avg.toFixed(1)} (minimum ${def.min})`,
        };
      }
      case 'groups': {
        const states = groups.map((g) => (g.satisfied ? 'met' : g.covered ? (g.inProgress ? 'in-progress' : 'planned') : 'missing') as RuleStatus);
        const done = groups.filter((g) => g.satisfied).length;
        return { def, status: worst(states), detail: `${done} of ${groups.length} requirement groups complete` };
      }
      case 'exemption': {
        const ex = history.exemptions.find((e) => e.key === def.key);
        return ex
          ? { def, status: 'met', detail: `Exempt — ${ex.source}` }
          : { def, status: 'missing', detail: 'Required before graduation' };
      }
    }
  });

  return {
    groups,
    conditions,
    totals,
    eligible: conditions.every((c) => c.status === 'met'),
    projectedEligible: conditions.every((c) => c.status !== 'missing' && c.status !== 'failing'),
    missingCourses,
    allocation,
    notCounted,
  };
}
