import { milestones } from '../data/calendar';
import { courseById, courses, grades } from '../data/courses';
import { program, requirementGroups, semesterById, semesters } from '../data/program';
import type { Severity } from '../types';
import {
  type Issue,
  type PlanPrefs,
  type Placements,
  type Projection,
  applyMove,
  checkPlan,
  coursesIn,
  findConflicts,
  futureSemesters,
  nextOffering,
  nextSemester,
  offeredText,
  project,
  semesterIndex,
  semesterLoads,
  unmetPrerequisites,
} from './degree';
import { daysUntil, formatDate, monthYear, relativeDays } from './format';

/**
 * The intelligence layer.
 *
 * - `source: 'rule'` insights are confirmed facts derived from the program's degree rules
 *   (missing mandatory courses, prerequisites, offerings, time conflicts, credit limits).
 * - `source: 'ai'` insights are generated recommendations: heuristics over the plan,
 *   workload estimates and sample enrollment history. They are suggestions, not requirements.
 *
 * Everything runs locally on sample data; nothing is sent anywhere.
 */

export type InsightAction =
  | { type: 'move'; label: string; courseId: string; to: string | null }
  | { type: 'swap'; label: string; remove: string; add: string; semesterId: string }
  | { type: 'navigate'; label: string; href: string }
  | { type: 'course'; label: string; courseId: string };

export interface Insight {
  id: string;
  source: 'rule' | 'ai';
  topic: 'requirement' | 'delay' | 'take-soon' | 'planning' | 'workload' | 'schedule' | 'status';
  severity: Severity;
  title: string;
  body: string;
  impact?: string;
  confidence?: 'High' | 'Medium';
  courseIds: string[];
  action?: InsightAction;
}

const firstValidSemester = (courseId: string, placements: Placements) =>
  futureSemesters.find((s) => {
    const c = courseById[courseId];
    if (!c.offered.includes(s.term)) return false;
    const next = applyMove(placements, courseId, s.id);
    return unmetPrerequisites(courseId, s.id, next).length === 0;
  });

function ruleInsight(issue: Issue, placements: Placements): Insight {
  const base = {
    id: `rule-${issue.id}`,
    source: 'rule' as const,
    severity: issue.severity as Severity,
    title: issue.title,
    body: issue.detail,
    courseIds: issue.courseIds,
  };
  switch (issue.kind) {
    case 'missing-course': {
      const id = issue.courseIds[0];
      const sem = firstValidSemester(id, placements);
      return {
        ...base,
        topic: 'requirement',
        body: `${issue.detail} You meet all prerequisites.`,
        action: sem
          ? { type: 'move', label: `Add to ${sem.label}`, courseId: id, to: sem.id }
          : { type: 'course', label: 'View course', courseId: id },
      };
    }
    case 'missing-credits':
      return {
        ...base,
        topic: 'requirement',
        action: { type: 'navigate', label: 'Browse courses', href: `/requirements?group=${issue.groupId}&status=unscheduled` },
      };
    case 'prerequisite':
    case 'not-offered': {
      const id = issue.courseIds[0];
      const others = applyMove(placements, id, null);
      const sem = futureSemesters.find(
        (s) => courseById[id].offered.includes(s.term) && unmetPrerequisites(id, s.id, others).length === 0,
      );
      return {
        ...base,
        topic: 'schedule',
        action: sem
          ? { type: 'move', label: `Move to ${sem.label}`, courseId: id, to: sem.id }
          : { type: 'course', label: 'View course', courseId: id },
      };
    }
    case 'conflict':
      return { ...base, topic: 'schedule', action: { type: 'navigate', label: 'Open plan', href: '/plan' } };
    case 'overload':
      return { ...base, topic: 'workload', action: { type: 'navigate', label: 'Rebalance', href: '/plan' } };
  }
}

/** Find an unscheduled elective that can replace `removeId` in `semesterId` without conflicts. */
function findSwap(removeId: string, semesterId: string, placements: Placements) {
  const removed = courseById[removeId];
  const sem = semesterById[semesterId];
  const without = applyMove(placements, removeId, null);
  const others = coursesIn(semesterId, without).map((c) => c.id);
  return courses.find((c) => {
    if (c.category !== removed.category || placements[c.id] || c.credits < removed.credits) return false;
    if (!c.offered.includes(sem.term)) return false;
    if (unmetPrerequisites(c.id, semesterId, without).length) return false;
    return findConflicts([...others, c.id]).length === 0;
  });
}

function graduationDelayText(courseId: string, semesterId: string) {
  const next = nextOffering(courseId, semesterId);
  return { label: next.label, grad: monthYear(next.end) };
}

export function generateInsights(placements: Placements, prefs: PlanPrefs): Insight[] {
  const issues = checkPlan(placements);
  const projection = project(placements, issues);
  const loads = semesterLoads(placements, issues);
  const out: Insight[] = issues.map((i) => ruleInsight(i, placements));

  // Confirmed: graduation is later than the target.
  if (projection.status === 'delayed') {
    out.unshift({
      id: `rule-delay-${projection.semester.id}`,
      source: 'rule',
      topic: 'delay',
      severity: 'warning',
      title: `Graduation moves to ${projection.label}`,
      body: `Your plan finishes in ${projection.semester.label}, ${projection.reason}.`,
      courseIds: [],
      action: { type: 'navigate', label: 'Review plan', href: '/plan' },
    });
  }

  // AI: courses on the critical path that should be taken soon.
  for (const c of courses) {
    if (!c.mandatory) continue;
    const at = placements[c.id];
    if (!at && c.offered.length === 1) {
      const sem = firstValidSemester(c.id, placements);
      if (!sem) continue;
      const later = graduationDelayText(c.id, sem.id);
      out.push({
        id: `ai-soon-${c.id}`,
        source: 'ai',
        topic: 'take-soon',
        severity: 'warning',
        title: `Take ${c.name} in ${sem.label}`,
        body: `It’s only offered in ${c.offered[0]}. If it slips past ${sem.label}, the next run is ${later.label} — moving graduation to ${later.grad}.`,
        impact: `Taking it in ${sem.label} keeps graduation in ${monthYear(semesterById[program.targetGraduation].end)}`,
        confidence: 'High',
        courseIds: [c.id],
        action: { type: 'course', label: 'Why this matters', courseId: c.id },
      });
    }
    if (at === nextSemester.id && c.highDemand) {
      const reg = milestones.find((m) => m.type === 'registration');
      out.push({
        id: `ai-demand-${c.id}`,
        source: 'ai',
        topic: 'take-soon',
        severity: 'info',
        title: `Register for ${c.name} on day one`,
        body: `In the sample enrollment history this section fills within ~48 hours. It’s mandatory, so a missed seat would push it to ${
          nextOffering(c.id, at).label
        }.`,
        impact: reg ? `Registration opens ${formatDate(reg.date)} · ${relativeDays(reg.date).toLowerCase()}` : undefined,
        confidence: 'High',
        courseIds: [c.id],
        action: { type: 'course', label: 'View course', courseId: c.id },
      });
    }
  }

  // AI: better semester planning — resolve time conflicts with an equivalent elective.
  for (const issue of issues) {
    if (issue.kind !== 'conflict' || !issue.semesterId) continue;
    const candidate = issue.courseIds.map((id) => courseById[id]).find((c) => !c.mandatory);
    if (!candidate) continue;
    const swap = findSwap(candidate.id, issue.semesterId, placements);
    if (!swap) continue;
    const slot = swap.schedule[0];
    out.push({
      id: `ai-swap-${candidate.id}-${swap.id}`,
      source: 'ai',
      topic: 'planning',
      severity: 'info',
      title: `Swap ${candidate.name} for ${swap.name}`,
      body: `${swap.name} (${slot.day} ${slot.start}–${slot.end}) earns the same ${candidate.credits} elective credits and removes the overlap. It builds on topics where your grades are strong.`,
      impact: 'Resolves 1 schedule conflict · graduation unchanged',
      confidence: 'High',
      courseIds: [candidate.id, swap.id],
      action: { type: 'swap', label: 'Apply swap', remove: candidate.id, add: swap.id, semesterId: issue.semesterId },
    });
  }

  // AI: workload forecast.
  const pastLoads = loads.filter((l) => l.semester.status === 'completed' && l.courses.length);
  const avgPast = pastLoads.reduce((a, l) => a + l.workload, 0) / Math.max(1, pastLoads.length);
  for (const load of loads) {
    if (load.semester.status !== 'future' || !load.courses.length) continue;
    const heavy = load.workload > prefs.heavyWorkloadHours || load.credits > prefs.preferredMaxCredits;
    if (!heavy) continue;
    const pct = Math.round(((load.workload - avgPast) / avgPast) * 100);
    // Suggest moving the lightest-impact elective to a later term where it's offered.
    const movable = load.courses
      .filter((c) => !c.mandatory)
      .map((c) => {
        const later = futureSemesters.find(
          (s) =>
            semesterIndex[s.id] > semesterIndex[load.semester.id] &&
            c.offered.includes(s.term) &&
            (prefs.includeSummer || s.term !== 'summer'),
        );
        return later ? { c, later } : null;
      })
      .find(Boolean);
    out.push({
      id: `ai-workload-${load.semester.id}-${load.workload}`,
      source: 'ai',
      topic: 'workload',
      severity: 'warning',
      title: `${load.semester.label} looks heavy`,
      body: `Estimated ~${load.workload} h/week across ${load.credits} credits — ${pct > 0 ? `${pct}% above` : 'close to'} your average completed semester (~${Math.round(avgPast)} h).${
        movable
          ? ` Moving ${movable.c.name} to ${movable.later.label} would bring it to ~${load.workload - movable.c.workload} h/week.`
          : ''
      }`,
      impact: movable
        ? `Trade-off: graduation would move to ${monthYear(movable.later.end)}`
        : 'Consider lighter electives or an earlier start on project work',
      confidence: 'Medium',
      courseIds: load.courses.map((c) => c.id),
      action: movable
        ? { type: 'move', label: `Move to ${movable.later.label}`, courseId: movable.c.id, to: movable.later.id }
        : undefined,
    });
  }

  // AI: recover a delayed graduation by pulling courses back into the target semester or earlier.
  if (projection.status === 'delayed') {
    const targetIdx = semesterIndex[program.targetGraduation];
    const lateCourses = courses.filter((c) => placements[c.id] && semesterIndex[placements[c.id]] > targetIdx);
    for (const c of lateCourses) {
      const into = futureSemesters.find((s) => {
        if (semesterIndex[s.id] > targetIdx || !c.offered.includes(s.term)) return false;
        const next = applyMove(placements, c.id, s.id);
        if (unmetPrerequisites(c.id, s.id, next).length) return false;
        const ids = coursesIn(s.id, next).map((x) => x.id);
        const credits = ids.reduce((a, id) => a + courseById[id].credits, 0);
        return credits <= program.maxCreditsPerSemester && findConflicts(ids).length === 0;
      });
      if (!into) continue;
      out.push({
        id: `ai-recover-${c.id}-${into.id}`,
        source: 'ai',
        topic: 'delay',
        severity: 'info',
        title: `Move ${c.name} back to ${into.label}`,
        body: `${into.label} has room for it without conflicts or prerequisite issues.`,
        impact: `Graduation returns to ${monthYear(into.end)}`,
        confidence: 'High',
        courseIds: [c.id],
        action: { type: 'move', label: `Move to ${into.label}`, courseId: c.id, to: into.id },
      });
      break;
    }
  }

  // AI: elective recommendations when elective credits are short.
  const electiveIssue = issues.find((i) => i.kind === 'missing-credits' && i.groupId === 'elective');
  if (electiveIssue) {
    const pick = courses
      .filter((c) => c.category === 'elective' && !placements[c.id])
      .map((c) => ({ c, sem: firstValidSemester(c.id, placements) }))
      .filter((x) => x.sem && semesterIndex[x.sem.id] <= semesterIndex[program.targetGraduation])
      .sort((a, b) => avgPrereqGrade(b.c.id) - avgPrereqGrade(a.c.id))[0];
    if (pick?.sem) {
      out.push({
        id: `ai-elective-${pick.c.id}`,
        source: 'ai',
        topic: 'planning',
        severity: 'info',
        title: `Consider ${pick.c.name}`,
        body: `It fits ${pick.sem.label} and builds on courses you've done well in.`,
        impact: `+${pick.c.credits} elective credits`,
        confidence: 'Medium',
        courseIds: [pick.c.id],
        action: { type: 'move', label: `Add to ${pick.sem.label}`, courseId: pick.c.id, to: pick.sem.id },
      });
    }
  }

  if (!issues.length && projection.status === 'on-track') {
    out.unshift({
      id: 'rule-ok',
      source: 'rule',
      topic: 'status',
      severity: 'success',
      title: `On track to graduate in ${projection.label}`,
      body: 'Every degree requirement is covered by your plan, with no conflicts or prerequisite issues.',
      courseIds: [],
    });
  }

  const rank: Record<Severity, number> = { critical: 0, warning: 1, info: 2, success: 3 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity] || (a.source === 'rule' ? -1 : 1));
}

function avgPrereqGrade(courseId: string) {
  const g = courseById[courseId].prerequisites.map((p) => grades[p]).filter((x) => x !== undefined);
  return g.length ? g.reduce((a, b) => a + b, 0) / g.length : 80;
}

// ── Next steps (home screen) ────────────────────────────────────────────────

export interface NextStep {
  id: string;
  title: string;
  detail: string;
  tag: string;
  tone: 'accent' | 'warning' | 'danger' | 'violet';
  source: 'rule' | 'ai' | 'calendar';
  href: string;
}

function issueSummary(i: Issue) {
  if (i.kind === 'conflict') {
    const [a, b] = i.courseIds.map((id) => courseById[id].name);
    return `${a} overlaps with ${b}.`;
  }
  return `${i.title}.`;
}

const groupNoun: Record<string, string> = {
  core: 'core',
  math: 'mathematics',
  elective: 'elective',
  project: 'final project',
  general: 'additional',
};

export function nextSteps(placements: Placements, projection: Projection, issues: Issue[]): NextStep[] {
  const steps: (NextStep & { priority: number })[] = [];

  if (projection.status === 'delayed') {
    steps.push({
      id: 'delay',
      priority: 0,
      title: `Bring graduation back to ${monthYear(projection.target.end)}`,
      detail: `Your current plan finishes in ${projection.semester.label}.`,
      tag: 'Graduation',
      tone: 'warning',
      source: 'rule',
      href: '/plan',
    });
  }

  const blocking = issues.filter(
    (i) => i.severity === 'critical' && i.kind !== 'missing-course' && i.kind !== 'missing-credits',
  );
  if (blocking.length) {
    steps.push({
      id: `blocking-${blocking[0].id}`,
      priority: 0,
      title: blocking.length === 1 ? 'Resolve a blocking plan issue' : `Resolve ${blocking.length} blocking plan issues`,
      detail: `${blocking[0].title}. ${blocking[0].detail}`,
      tag: 'Plan issue',
      tone: 'danger',
      source: 'rule',
      href: blocking[0].courseIds[0] ? `/plan?focus=${blocking[0].courseIds[0]}` : '/plan',
    });
  }

  const missing = issues.filter((i) => i.kind === 'missing-course' || i.kind === 'missing-credits');
  for (const m of missing.slice(0, 1)) {
    const course = m.courseIds[0] ? courseById[m.courseIds[0]] : undefined;
    steps.push({
      id: `missing-${m.id}`,
      priority: 1,
      title: `Complete the missing ${groupNoun[m.groupId ?? 'core']} requirement`,
      detail: course
        ? `Add ${course.name} (${course.credits} cr) to your plan — offered ${offeredText(course)}.`
        : m.detail,
      tag: 'Requirement',
      tone: 'danger',
      source: 'rule',
      href: course ? `/plan?focus=${course.id}` : `/requirements?group=${m.groupId}`,
    });
  }

  const reg = milestones.find((m) => m.type === 'registration' && daysUntil(m.date) >= 0);
  const demand = courses.find((c) => c.highDemand && placements[c.id] === nextSemester.id);
  if (demand && reg) {
    steps.push({
      id: `register-${demand.id}`,
      priority: 2,
      title: `Register for ${demand.name}`,
      detail: `Registration opens ${formatDate(reg.date)} · high-demand course on your critical path.`,
      tag: 'Registration',
      tone: 'accent',
      source: 'calendar',
      href: `/requirements?course=${demand.id}`,
    });
  }

  const nextIssues = issues.filter((i) => i.semesterId === nextSemester.id);
  steps.push({
    id: 'review',
    priority: 3,
    title: 'Review next semester’s academic plan',
    detail: nextIssues.length
      ? `${nextSemester.label}: ${issueSummary(nextIssues[0])}${nextIssues.length > 1 ? ` (+${nextIssues.length - 1} more)` : ''}`
      : `${nextSemester.label} looks good — confirm it before registration opens.`,
    tag: 'Planning',
    tone: nextIssues.length ? 'warning' : 'violet',
    source: nextIssues.length ? 'rule' : 'ai',
    href: '/plan',
  });

  const proposal = milestones.find((m) => m.type === 'deadline' && daysUntil(m.date) >= 0);
  if (proposal) {
    steps.push({
      id: proposal.id,
      priority: 4,
      title: 'Submit your final project proposal',
      detail: `Due ${formatDate(proposal.date)} · ${relativeDays(proposal.date).toLowerCase()}.`,
      tag: 'Deadline',
      tone: 'accent',
      source: 'calendar',
      href: proposal.courseId ? `/requirements?course=${proposal.courseId}` : '/plan',
    });
  }

  return steps.sort((a, b) => a.priority - b.priority).slice(0, 3);
}

export const groupById = Object.fromEntries(requirementGroups.map((g) => [g.id, g]));
export const semesterList = semesters;
