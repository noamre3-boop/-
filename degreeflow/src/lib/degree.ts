import { courseById, courses, grades } from '../data/courses';
import { program, requirementGroups, semesterById, semesters } from '../data/program';
import type { CategoryId, Course, CourseStatus, RequirementGroup, Semester, Term } from '../types';
import { fromMinutes, monthYear, toMinutes } from './format';

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

const semesterIndex = Object.fromEntries(semesters.map((s, i) => [s.id, i])) as Record<string, number>;
export const futureSemesters = semesters.filter((s) => s.status === 'future');
export const currentSemester = semesters.find((s) => s.status === 'current')!;
export const nextSemester = futureSemesters[0];

export const isEditableSemester = (id: string | undefined | null) => !!id && semesterById[id]?.status === 'future';

// ── Course status ───────────────────────────────────────────────────────────

export function courseStatus(courseId: string, placements: Placements): CourseStatus {
  const sem = semesterById[placements[courseId]];
  if (!sem) return 'unscheduled';
  if (sem.status === 'completed') return 'completed';
  if (sem.status === 'current') return 'in-progress';
  return 'planned';
}

export function coursesIn(semesterId: string, placements: Placements): Course[] {
  return courses.filter((c) => placements[c.id] === semesterId);
}

export const isMovable = (courseId: string, placements: Placements) => {
  const status = courseStatus(courseId, placements);
  return status === 'planned' || status === 'unscheduled';
};

// ── Progress ────────────────────────────────────────────────────────────────

export interface GroupProgress {
  group: RequirementGroup;
  completed: number;
  inProgress: number;
  planned: number;
  /** Credits still needed that are not yet in any semester. */
  unplanned: number;
  /** Credits still needed before the requirement is complete (in progress + planned + unplanned). */
  remaining: number;
  completedPct: number;
  courses: Course[];
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
}

export function summarize(placements: Placements): DegreeSummary {
  const groups = requirementGroups.map<GroupProgress>((group) => {
    const groupCourses = courses.filter((c) => c.category === group.id);
    let completed = 0;
    let inProgress = 0;
    let planned = 0;
    for (const c of groupCourses) {
      const s = courseStatus(c.id, placements);
      if (s === 'completed') completed += c.credits;
      else if (s === 'in-progress') inProgress += c.credits;
      else if (s === 'planned') planned += c.credits;
    }
    // Credits beyond what the group requires don't reduce other groups' needs.
    const req = group.requiredCredits;
    const cCompleted = Math.min(completed, req);
    const cInProgress = Math.min(inProgress, req - cCompleted);
    const cPlanned = Math.min(planned, req - cCompleted - cInProgress);
    const unplanned = Math.max(0, req - cCompleted - cInProgress - cPlanned);
    return {
      group,
      completed: cCompleted,
      inProgress: cInProgress,
      planned: cPlanned,
      unplanned,
      remaining: req - cCompleted,
      completedPct: (cCompleted / req) * 100,
      courses: groupCourses,
    };
  });

  const sum = (k: 'completed' | 'inProgress' | 'planned' | 'unplanned') => groups.reduce((a, g) => a + g[k], 0);
  const completed = sum('completed');
  const inProgress = sum('inProgress');
  const planned = sum('planned');
  const unplanned = sum('unplanned');

  let gradeCredits = 0;
  let gradePoints = 0;
  for (const [id, g] of Object.entries(grades)) {
    if (courseStatus(id, placements) !== 'completed') continue;
    gradeCredits += courseById[id].credits;
    gradePoints += courseById[id].credits * g;
  }

  const count = (s: CourseStatus) => courses.filter((c) => courseStatus(c.id, placements) === s).length;

  return {
    total: program.totalCredits,
    completed,
    inProgress,
    planned,
    unplanned,
    remaining: program.totalCredits - completed,
    completedPct: (completed / program.totalCredits) * 100,
    average: gradeCredits ? gradePoints / gradeCredits : 0,
    completedCourses: count('completed'),
    inProgressCourses: count('in-progress'),
    plannedCourses: count('planned'),
    groups,
  };
}

// ── Rule checks ─────────────────────────────────────────────────────────────

export type IssueKind = 'missing-course' | 'missing-credits' | 'prerequisite' | 'not-offered' | 'conflict' | 'overload';

export interface Issue {
  id: string;
  kind: IssueKind;
  severity: 'critical' | 'warning';
  semesterId?: string;
  courseIds: string[];
  groupId?: CategoryId;
  title: string;
  detail: string;
}

const termLabel: Record<Term, string> = { fall: 'fall', spring: 'spring', summer: 'summer' };

export function offeredText(c: Course) {
  if (c.offered.length === 3) return 'every term';
  const terms = c.offered.map((t) => termLabel[t]);
  return c.offered.length === 1 ? `${terms[0]} only` : terms.join(' & ');
}

export interface Conflict {
  a: string;
  b: string;
  day: string;
  start: string;
  end: string;
}

export function findConflicts(courseIds: string[]): Conflict[] {
  const out: Conflict[] = [];
  for (let i = 0; i < courseIds.length; i++) {
    for (let j = i + 1; j < courseIds.length; j++) {
      const a = courseById[courseIds[i]];
      const b = courseById[courseIds[j]];
      for (const sa of a.schedule) {
        for (const sb of b.schedule) {
          if (sa.day !== sb.day) continue;
          const start = Math.max(toMinutes(sa.start), toMinutes(sb.start));
          const end = Math.min(toMinutes(sa.end), toMinutes(sb.end));
          if (start < end) out.push({ a: a.id, b: b.id, day: sa.day, start: fromMinutes(start), end: fromMinutes(end) });
        }
      }
    }
  }
  return out;
}

/** Prerequisites that are not completed or scheduled strictly before `semesterId`. */
export function unmetPrerequisites(courseId: string, semesterId: string, placements: Placements): string[] {
  const idx = semesterIndex[semesterId];
  return courseById[courseId].prerequisites.filter((p) => {
    const at = placements[p];
    return at === undefined || semesterIndex[at] >= idx;
  });
}

export function checkPlan(placements: Placements): Issue[] {
  const issues: Issue[] = [];
  const summary = summarize(placements);

  // Mandatory courses missing from the plan.
  for (const c of courses) {
    if (c.mandatory && !placements[c.id]) {
      issues.push({
        id: `missing-${c.id}`,
        kind: 'missing-course',
        severity: 'critical',
        courseIds: [c.id],
        groupId: c.category,
        title: `${c.name} is required but not planned`,
        detail: `${c.code} (${c.credits} credits) is mandatory and offered ${offeredText(c)}.`,
      });
    }
  }

  // Requirement groups whose credits are not fully covered by mandatory gaps above.
  for (const g of summary.groups) {
    const missingMandatory = courses
      .filter((c) => c.category === g.group.id && c.mandatory && !placements[c.id])
      .reduce((a, c) => a + c.credits, 0);
    const extra = g.unplanned - missingMandatory;
    if (extra > 0) {
      issues.push({
        id: `credits-${g.group.id}-${extra}`,
        kind: 'missing-credits',
        severity: 'critical',
        courseIds: [],
        groupId: g.group.id,
        title: `${extra} ${g.group.shortName.toLowerCase()} credits not yet planned`,
        detail: `${g.group.name} needs ${g.group.requiredCredits} credits. Add courses to cover the remaining ${extra}.`,
      });
    }
  }

  for (const sem of semesters) {
    if (sem.status !== 'future') continue;
    const ids = coursesIn(sem.id, placements).map((c) => c.id);

    for (const id of ids) {
      const c = courseById[id];
      const unmet = unmetPrerequisites(id, sem.id, placements);
      if (unmet.length) {
        issues.push({
          id: `prereq-${id}-${sem.id}`,
          kind: 'prerequisite',
          severity: 'critical',
          semesterId: sem.id,
          courseIds: [id, ...unmet],
          title: `Prerequisite not met: ${c.name}`,
          detail: `Requires ${unmet.map((p) => courseById[p].name).join(', ')} in an earlier semester.`,
        });
      }
      if (!c.offered.includes(sem.term)) {
        issues.push({
          id: `offered-${id}-${sem.id}`,
          kind: 'not-offered',
          severity: 'critical',
          semesterId: sem.id,
          courseIds: [id],
          title: `${c.name} isn’t offered in ${sem.term}`,
          detail: `${c.code} runs ${offeredText(c)}. Move it to a semester where it is offered.`,
        });
      }
    }

    for (const cf of findConflicts(ids)) {
      issues.push({
        id: `conflict-${cf.a}-${cf.b}-${sem.id}`,
        kind: 'conflict',
        severity: 'warning',
        semesterId: sem.id,
        courseIds: [cf.a, cf.b],
        title: `Schedule conflict in ${sem.label}`,
        detail: `${courseById[cf.a].name} and ${courseById[cf.b].name} overlap on ${cf.day} ${cf.start}–${cf.end}.`,
      });
    }

    const credits = ids.reduce((a, id) => a + courseById[id].credits, 0);
    if (credits > program.maxCreditsPerSemester) {
      issues.push({
        id: `overload-${sem.id}-${credits}`,
        kind: 'overload',
        severity: 'critical',
        semesterId: sem.id,
        courseIds: ids,
        title: `${sem.label} exceeds the credit limit`,
        detail: `${credits} credits planned; the program allows up to ${program.maxCreditsPerSemester} without approval.`,
      });
    }
  }

  const rank = { critical: 0, warning: 1 };
  return issues.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

// ── Graduation projection ───────────────────────────────────────────────────

export interface Projection {
  status: 'on-track' | 'at-risk' | 'delayed';
  /** Semester the plan finishes in. */
  semester: Semester;
  label: string;
  date: string;
  target: Semester;
  /** Semesters later than the target (0 when on time). */
  semestersLate: number;
  reason: string;
}

/** Semesters beyond the planning horizon, used to estimate the next offering of a course. */
export function nextOffering(courseId: string, afterSemesterId: string): { label: string; end: string } {
  const c = courseById[courseId];
  const last = semesterById[afterSemesterId];
  const order: Term[] = ['spring', 'summer', 'fall'];
  let term = last.term;
  let year = last.year;
  for (let i = 0; i < 9; i++) {
    const idx = order.indexOf(term);
    term = order[(idx + 1) % 3];
    if (term === 'spring') year += 1;
    if (c.offered.includes(term)) {
      const known = semesters.find((s) => s.term === term && s.year === year);
      if (known) return { label: known.label, end: known.end };
      const end = term === 'spring' ? `${year}-06-25` : term === 'summer' ? `${year}-09-10` : `${year + 1}-02-04`;
      return { label: `${term[0].toUpperCase()}${term.slice(1)} ${year}`, end };
    }
  }
  return { label: 'a later term', end: last.end };
}

export function project(placements: Placements, issues = checkPlan(placements)): Projection {
  const target = semesterById[program.targetGraduation];
  let lastIdx = semesterIndex[currentSemester.id];
  for (const [, semId] of Object.entries(placements)) {
    lastIdx = Math.max(lastIdx, semesterIndex[semId] ?? -1);
  }
  const semester = semesters[lastIdx];
  const blocking = issues.filter((i) => i.severity === 'critical');
  const late = Math.max(0, lastIdx - semesterIndex[target.id]);

  if (blocking.length) {
    const unplanned = summarize(placements).unplanned;
    return {
      status: 'at-risk',
      semester,
      label: monthYear(semester.end),
      date: semester.end,
      target,
      semestersLate: late,
      reason:
        unplanned > 0
          ? `${unplanned} required credits are not yet in your plan`
          : `${blocking.length} plan ${blocking.length === 1 ? 'issue needs' : 'issues need'} attention`,
    };
  }
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

// ── Semester load ───────────────────────────────────────────────────────────

export interface SemesterLoad {
  semester: Semester;
  courses: Course[];
  credits: number;
  workload: number;
  issues: Issue[];
}

export function semesterLoads(placements: Placements, issues: Issue[]): SemesterLoad[] {
  return semesters.map((semester) => {
    const list = coursesIn(semester.id, placements);
    return {
      semester,
      courses: list,
      credits: list.reduce((a, c) => a + c.credits, 0),
      workload: list.reduce((a, c) => a + c.workload, 0),
      issues: issues.filter((i) => i.semesterId === semester.id),
    };
  });
}

export function applyMove(placements: Placements, courseId: string, to: string | null): Placements {
  const next = { ...placements };
  if (to) next[courseId] = to;
  else delete next[courseId];
  return next;
}

export interface MoveImpact {
  delays: boolean;
  newLabel: string;
  problems: string[];
}

/** What would happen if `courseId` moved to `to`? Used for drop-target hints and move menus. */
export function moveImpact(placements: Placements, courseId: string, to: string | null): MoveImpact {
  const before = project(placements);
  const next = applyMove(placements, courseId, to);
  const after = project(next);
  const problems: string[] = [];
  if (to) {
    const c = courseById[courseId];
    const sem = semesterById[to];
    if (!c.offered.includes(sem.term)) problems.push(`Not offered in ${sem.term}`);
    if (unmetPrerequisites(courseId, to, next).length) problems.push('Prerequisite not met');
    const ids = coursesIn(to, next).map((x) => x.id);
    if (findConflicts(ids).some((cf) => cf.a === courseId || cf.b === courseId)) problems.push('Time conflict');
    const credits = ids.reduce((a, id) => a + courseById[id].credits, 0);
    if (credits > program.maxCreditsPerSemester) problems.push(`${credits} credits — over limit`);
    const broken = courses.filter(
      (d) => d.prerequisites.includes(courseId) && next[d.id] && semesterIndex[next[d.id]] <= semesterIndex[to],
    );
    if (broken.length) problems.push(`Breaks prerequisite for ${broken[0].name}`);
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
  return courses.filter((c) => c.prerequisites.includes(courseId));
}

export { semesterIndex };
