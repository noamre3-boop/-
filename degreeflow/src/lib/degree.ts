import { courseById, courses } from '../data/courses';
import { engine } from '../data/demo';
import { program, requirementGroups, semesterById, semesterFor, semesters } from '../data/program';
import {
  type Audit,
  type ConditionResult,
  type CourseRecord,
  type Issue as EngineIssue,
  type Plan,
  type PlanningPrefs,
  type RecommendationSet,
  type RiskReport,
  type RuleResult,
  findConflicts as engineConflicts,
  offeredText as engineOfferedText,
} from '../engine';
import type { Course, CourseStatus, RequirementGroup, Semester } from '../types';
import { monthYear } from './format';

/**
 * UI adapter over the academic engine (src/engine).
 *
 * The UI works with "placements": one term per course, covering history (the term a course was
 * passed/failed/taken) and the student's plan (future terms). The engine works with an
 * immutable student record plus a plan of future placements; this module translates between them.
 */

/** courseId → semesterId. Courses not in the map are unscheduled. */
export type Placements = Record<string, string>;

export interface PlanPrefs {
  /** Soft cap used for "heavy semester" recommendations. */
  preferredMaxCredits: number;
  /** Estimated weekly hours above which a semester is flagged as heavy. */
  heavyWorkloadHours: number;
  includeSummer: boolean;
}

export const defaultPrefs: PlanPrefs = { preferredMaxCredits: 20, heavyWorkloadHours: 45, includeSummer: true };

const toEnginePrefs = (p: PlanPrefs): PlanningPrefs => ({
  maxCredits: p.preferredMaxCredits,
  heavyWorkloadHours: p.heavyWorkloadHours,
  includeSummer: p.includeSummer,
});

const { history, catalog, calendar } = engine;

export const semesterIndex = Object.fromEntries(semesters.map((s, i) => [s.id, i])) as Record<string, number>;
export const futureSemesters = semesters.filter((s) => s.status === 'future');
export const currentSemester = semesters.find((s) => s.status === 'current')!;
export const nextSemester = futureSemesters[0];

export const isEditableSemester = (id: string | undefined | null) => !!id && semesterById[id]?.status === 'future';

/** The engine plan: future placements of courses that aren't already completed or in progress. */
export function toPlan(placements: Placements): Plan {
  const plan: Plan = {};
  for (const [id, sem] of Object.entries(placements)) {
    if (!catalog.has(id) || calendar.status(sem) !== 'future') continue;
    const rec = history.get(id);
    if (rec && (rec.status === 'passed' || rec.status === 'exempt' || rec.status === 'transfer' || rec.status === 'in-progress')) continue;
    plan[id] = sem;
  }
  return plan;
}

// ── Course status ───────────────────────────────────────────────────────────

/** Courses no program group accepts (e.g. preparatory courses). */
const outsideProgram = new Set(
  catalog.courses
    .filter((c) => !engine.program.groups.some((g) => catalog.matches(c.id, g.pool) || g.rules.some((r) => r.type === 'course' && (r.course === c.id || r.alternatives?.includes(c.id)))))
    .map((c) => c.id),
);

export function courseRecord(courseId: string): CourseRecord | undefined {
  return history.get(courseId);
}

export function courseStatus(courseId: string, placements: Placements): CourseStatus {
  const rec = history.get(courseId);
  const planned = !!placements[courseId] && semesterById[placements[courseId]]?.status === 'future';
  if (rec) {
    switch (rec.status) {
      case 'passed':
        return outsideProgram.has(courseId) ? 'not-counted' : 'completed';
      case 'exempt':
      case 'transfer':
        return 'exempt';
      case 'duplicate':
        return 'not-counted';
      case 'in-progress':
        return 'in-progress';
      case 'failed':
        return planned ? 'planned' : 'failed';
      case 'withdrawn':
        return planned ? 'planned' : 'unscheduled';
    }
  }
  return planned ? 'planned' : 'unscheduled';
}

/** Display grade for a course: number, "Pass", "Exempt", "Recognized" or null. */
export function gradeLabel(courseId: string): string | null {
  const rec = history.get(courseId);
  if (!rec) return null;
  if (rec.status === 'exempt') return 'Exempt';
  if (rec.status === 'transfer') return 'Recognized';
  if (rec.grade === 'pass') return 'Pass';
  if (rec.grade === 'fail') return 'Fail';
  return typeof rec.grade === 'number' ? String(rec.grade) : null;
}

export function coursesIn(semesterId: string, placements: Placements): Course[] {
  return courses.filter((c) => placements[c.id] === semesterId);
}

/** Every graded or in-progress attempt in a term (including failed attempts that were later retaken). */
export function attemptsIn(semesterId: string) {
  return engine.student.attempts
    .filter((a) => a.termId === semesterId && catalog.has(a.courseId))
    .map((a) => ({ ...a, course: courseById[a.courseId] }));
}

/** Credits recognized without a term (prior studies). */
export const priorCredits = [...history.records.values()]
  .filter((r) => (r.status === 'transfer' || r.status === 'exempt') && !r.termId)
  .reduce((a, r) => a + r.credits, 0);

/** True when this course or an equivalent already earned credit, so taking it would not count. */
export function alreadyCovered(courseId: string) {
  return [...catalog.equivalenceClass(courseId)].some((id) => {
    const r = history.get(id);
    return !!r && (r.status === 'passed' || r.status === 'transfer' || r.status === 'exempt');
  });
}

/** Courses a student could still add to the plan: not taken (or failed), part of the program, not redundant. */
export function isPlannable(courseId: string, placements: Placements) {
  const s = courseStatus(courseId, placements);
  return (s === 'unscheduled' || s === 'failed') && !outsideProgram.has(courseId) && !alreadyCovered(courseId);
}

export const isMovable = (courseId: string, placements: Placements) => {
  const status = courseStatus(courseId, placements);
  return status === 'planned' || status === 'unscheduled' || status === 'failed';
};

// ── Progress ────────────────────────────────────────────────────────────────

export interface GroupProgress {
  group: RequirementGroup;
  /** Display values, capped at the group requirement. */
  completed: number;
  inProgress: number;
  planned: number;
  unplanned: number;
  remaining: number;
  completedPct: number;
  courses: Course[];
  rules: RuleResult[];
  satisfied: boolean;
  covered: boolean;
}

export interface DegreeSummary {
  total: number;
  completed: number;
  inProgress: number;
  planned: number;
  unplanned: number;
  remaining: number;
  completedPct: number;
  average: number;
  completedCourses: number;
  inProgressCourses: number;
  plannedCourses: number;
  groups: GroupProgress[];
  conditions: ConditionResult[];
  eligible: boolean;
  projectedEligible: boolean;
  notCounted: Audit['notCounted'];
}

export function audit(placements: Placements): Audit {
  return engine.audit(toPlan(placements));
}

export function summarize(placements: Placements): DegreeSummary {
  const a = audit(placements);
  const groups = a.groups.map<GroupProgress>((g) => {
    const req = g.group.minCredits;
    const completed = Math.min(g.completed, req);
    const inProgress = Math.min(g.inProgress, req - completed);
    const planned = Math.min(g.planned, req - completed - inProgress);
    return {
      group: requirementGroups.find((r) => r.id === g.group.id)!,
      completed,
      inProgress,
      planned,
      unplanned: g.unplanned,
      remaining: g.remaining,
      completedPct: (completed / req) * 100,
      courses: courses.filter((c) => catalog.matches(c.id, g.group.pool)),
      rules: g.rules,
      satisfied: g.satisfied,
      covered: g.covered,
    };
  });

  const count = (s: CourseStatus) => courses.filter((c) => courseStatus(c.id, placements) === s).length;

  return {
    total: a.totals.required,
    completed: a.totals.completed,
    inProgress: a.totals.inProgress,
    planned: a.totals.planned,
    unplanned: a.totals.unplanned,
    remaining: a.totals.remaining,
    completedPct: (a.totals.completed / a.totals.required) * 100,
    average: history.average ?? 0,
    completedCourses: count('completed') + count('exempt'),
    inProgressCourses: count('in-progress'),
    plannedCourses: count('planned'),
    groups,
    conditions: a.conditions,
    eligible: a.eligible,
    projectedEligible: a.projectedEligible,
    notCounted: a.notCounted,
  };
}

// ── Rule checks ─────────────────────────────────────────────────────────────

export type IssueKind = EngineIssue['kind'];
export type Issue = EngineIssue & { semesterId?: string };

export function offeredText(c: Course) {
  return engineOfferedText(c.offered);
}

export function findConflicts(courseIds: string[]) {
  return engineConflicts(courseIds, catalog);
}

/** Human-readable unmet prerequisites for taking `courseId` in `semesterId` (empty when allowed). */
export function unmetPrerequisites(courseId: string, semesterId: string, placements: Placements): string[] {
  const check = engine.prerequisites(courseId, semesterId, toPlan(placements));
  return check.state === 'unmet' ? check.missing : [];
}

export function checkPlan(placements: Placements): Issue[] {
  return engine.validate(toPlan(placements)).map((i) => ({ ...i, semesterId: i.termId }));
}

// ── Graduation projection ───────────────────────────────────────────────────

export interface Projection {
  status: 'on-track' | 'at-risk' | 'delayed';
  /** Term the plan (or, if the plan is incomplete, the earliest feasible schedule) finishes in. */
  semester: Semester;
  label: string;
  date: string;
  target: Semester;
  semestersLate: number;
  reason: string;
  /** Earliest feasible graduation from the forecast engine, independent of the plan's gaps. */
  earliest?: { label: string; date: string } | null;
}

export function nextOffering(courseId: string, afterSemesterId: string): { label: string; end: string } {
  const t = calendar.nextOffering(afterSemesterId, catalog.get(courseId).offered);
  return t ? { label: t.label, end: t.end } : { label: 'a later term', end: semesterFor(afterSemesterId).end };
}

/** Last term with an in-progress or planned course. */
function lastActiveTerm(placements: Placements) {
  let last = currentSemester.id;
  for (const sem of Object.values(placements)) {
    if (calendar.status(sem) === 'future' && calendar.isBefore(last, sem)) last = sem;
  }
  return last;
}

function termsBetween(a: string, b: string) {
  let n = 0;
  let t = a;
  while (calendar.isBefore(t, b) && n < 30) {
    t = calendar.next(t).id;
    n++;
  }
  return n;
}

export function project(placements: Placements, issues = checkPlan(placements), prefs: PlanPrefs = defaultPrefs, withForecast = true): Projection {
  const target = semesterFor(program.targetGraduation);
  const blocking = issues.filter((i) => i.severity === 'critical');
  const lastId = lastActiveTerm(placements);
  const late = calendar.isBefore(target.id, lastId) ? termsBetween(target.id, lastId) : 0;

  if (blocking.length) {
    const forecast = withForecast ? engine.forecast(toPlan(placements), toEnginePrefs(prefs)) : null;
    const end = forecast?.term ?? null;
    const semester = semesterFor(end?.id ?? lastId);
    const unplanned = audit(placements).totals.unplanned;
    return {
      status: 'at-risk',
      semester,
      label: monthYear(semester.end),
      date: semester.end,
      target,
      semestersLate: calendar.isBefore(target.id, semester.id) ? termsBetween(target.id, semester.id) : 0,
      reason:
        unplanned > 0
          ? `${unplanned} required credits are not yet in your plan`
          : `${blocking.length} plan ${blocking.length === 1 ? 'issue needs' : 'issues need'} attention`,
      earliest: end ? { label: monthYear(end.end), date: end.end } : null,
    };
  }
  const semester = semesterFor(lastId);
  if (late > 0) {
    return {
      status: 'delayed',
      semester,
      label: monthYear(semester.end),
      date: semester.end,
      target,
      semestersLate: late,
      reason: `${late} ${late === 1 ? 'term' : 'terms'} later than your ${monthYear(target.end)} target`,
    };
  }
  return {
    status: 'on-track',
    semester,
    label: monthYear(semester.end),
    date: semester.end,
    target,
    semestersLate: 0,
    reason: 'All requirements are covered by your plan',
  };
}

// ── Recommendations & risks ─────────────────────────────────────────────────

export function recommendNext(placements: Placements, prefs: PlanPrefs, termId?: string): RecommendationSet {
  return engine.recommend(toPlan(placements), toEnginePrefs(prefs), termId);
}

export function riskReport(placements: Placements, prefs: PlanPrefs): RiskReport {
  return engine.risks(toPlan(placements), toEnginePrefs(prefs));
}

// ── Semester load ───────────────────────────────────────────────────────────

export interface SemesterLoad {
  semester: Semester;
  courses: Course[];
  /** Credits earned (completed terms) or attempted (current and future terms). */
  credits: number;
  workload: number;
  issues: Issue[];
}

function creditsIn(c: Course, semester: Semester) {
  if (semester.status !== 'completed') return c.credits;
  const rec = history.get(c.id);
  return rec && rec.status === 'passed' && rec.termId === semester.id && !outsideProgram.has(c.id) ? rec.credits : 0;
}

export function semesterLoads(placements: Placements, issues: Issue[]): SemesterLoad[] {
  return semesters.map((semester) => {
    const list = coursesIn(semester.id, placements);
    return {
      semester,
      courses: list,
      credits: list.reduce((a, c) => a + creditsIn(c, semester), 0),
      workload: list.reduce((a, c) => a + c.workload, 0),
      issues: issues.filter((i) => i.semesterId === semester.id),
    };
  });
}

/** Credit cap for a semester (summer terms have a lower limit). */
export function creditLimit(semesterId: string) {
  return engine.program.maxCreditsPerTerm[calendar.get(semesterId).season];
}

export function applyMove(placements: Placements, courseId: string, to: string | null): Placements {
  const next = { ...placements };
  if (to) next[courseId] = to;
  else {
    // A failed course returns to its failed term; anything else leaves the plan.
    const rec = history.get(courseId);
    if (rec?.termId && calendar.status(rec.termId) !== 'future') next[courseId] = rec.termId;
    else delete next[courseId];
  }
  return next;
}

export interface MoveImpact {
  delays: boolean;
  newLabel: string;
  problems: string[];
}

/** What would happen if `courseId` moved to `to`? Used for drop-target hints and move menus. */
export function moveImpact(placements: Placements, courseId: string, to: string | null): MoveImpact {
  const next = applyMove(placements, courseId, to);
  const before = project(placements, undefined, defaultPrefs, false);
  const after = project(next, undefined, defaultPrefs, false);
  const problems: string[] = [];
  if (to) {
    const c = courseById[courseId];
    const sem = semesterFor(to);
    if (!c.offered.includes(sem.term)) problems.push(`Not offered in ${sem.term}`);
    const unmet = unmetPrerequisites(courseId, to, next);
    if (unmet.length) problems.push(`Requires ${unmet[0]}`);
    const ids = coursesIn(to, next).map((x) => x.id);
    if (findConflicts(ids).some((cf) => cf.a === courseId || cf.b === courseId)) problems.push('Time conflict');
    const credits = ids.reduce((a, id) => a + courseById[id].credits, 0);
    if (credits > creditLimit(to)) problems.push(`${credits} credits — over the ${creditLimit(to)}-credit limit`);
    const broken = catalog
      .dependents(courseId)
      .filter((d) => next[d.id] && calendar.status(next[d.id]) === 'future' && !calendar.isBefore(to, next[d.id]));
    if (broken.length) problems.push(`Breaks prerequisite for ${broken[0].name}`);
    const rec = history.get(courseId);
    if (rec && (rec.status === 'passed' || rec.status === 'duplicate')) problems.push('Already passed');
  } else if (courseById[courseId].mandatory) {
    problems.push('Required course');
  }
  return {
    delays: after.date > before.date,
    newLabel: after.label,
    problems,
  };
}

export function prerequisiteChain(courseId: string): string[] {
  const seen = new Set<string>();
  const walk = (id: string) => {
    for (const p of courseById[id].prerequisites) {
      if (!seen.has(p)) {
        seen.add(p);
        walk(p);
      }
    }
  };
  walk(courseId);
  return [...seen];
}

export function unlocks(courseId: string): Course[] {
  return catalog.dependents(courseId).map((d) => courseById[d.id]);
}
