import { milestones } from '../data/calendar';
import { courseById, courses } from '../data/courses';
import { engine } from '../data/demo';
import { program, requirementGroups, semesterById, semesters } from '../data/program';
import type { Severity } from '../types';
import {
  type Issue,
  type PlanPrefs,
  type Placements,
  type Projection,
  applyMove,
  checkPlan,
  courseStatus,
  coursesIn,
  creditLimit,
  findConflicts,
  futureSemesters,
  nextOffering,
  nextSemester,
  offeredText,
  project,
  recommendNext,
  riskReport,
  semesterIndex,
  semesterLoads,
  unmetPrerequisites,
} from './degree';
import { daysUntil, formatDate, monthYear, relativeDays } from './format';

/**
 * The intelligence layer, built on the academic engine.
 *
 * - `source: 'rule'` insights are confirmed facts from the program's degree rules: missing
 *   mandatory courses, uncovered rules, prerequisites, offerings, time conflicts, credit limits.
 * - `source: 'ai'` insights are generated suggestions: next-term recommendations, what-if
 *   delay risks from the forecast simulation, workload estimates. They are suggestions, not rules.
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
  /** Concrete reasons behind a recommendation. */
  reasons?: string[];
  impact?: string;
  confidence?: 'High' | 'Medium';
  courseIds: string[];
  action?: InsightAction;
}

const firstValidSemester = (courseId: string, placements: Placements) =>
  futureSemesters.find((s) => {
    const c = courseById[courseId];
    if (!c.offered.includes(s.term)) return false;
    return unmetPrerequisites(courseId, s.id, applyMove(placements, courseId, s.id)).length === 0;
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
      const later = sem ? nextOffering(id, sem.id) : null;
      return {
        ...base,
        topic: 'requirement',
        body: `${issue.detail}${sem ? ' You meet all prerequisites.' : ''}`,
        impact: sem && later ? `If it slips past ${sem.label}, the next run is ${later.label}` : undefined,
        action: sem
          ? { type: 'move', label: `Add to ${sem.label}`, courseId: id, to: sem.id }
          : { type: 'course', label: 'View course', courseId: id },
      };
    }
    case 'missing-credits':
    case 'missing-rule':
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
    case 'duplicate':
      return { ...base, topic: 'planning', action: { type: 'move', label: 'Remove from plan', courseId: issue.courseIds[0], to: null } };
    case 'conflict':
      return { ...base, topic: 'schedule', action: { type: 'navigate', label: 'Open plan', href: '/plan' } };
    case 'overload':
      return { ...base, topic: 'workload', action: { type: 'navigate', label: 'Rebalance', href: '/plan' } };
  }
}

export function generateInsights(placements: Placements, prefs: PlanPrefs): Insight[] {
  const issues = checkPlan(placements);
  const projection = project(placements, issues, prefs);
  const loads = semesterLoads(placements, issues);
  const out: Insight[] = issues.map((i) => ruleInsight(i, placements));
  // Courses already explained by a confirmed missing-requirement card don't get a second, overlapping AI card.
  const covered = new Set(
    issues.filter((i) => i.kind === 'missing-course' || i.kind === 'duplicate').flatMap((i) => i.courseIds),
  );

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

  // AI: next-term recommendations from the engine (only what the plan doesn't already contain).
  const rec = recommendNext(placements, prefs, nextSemester.id);
  const newPicks = rec.picks.filter((p) => placements[p.courseId] !== rec.term.id);
  const usedForSwap = new Set<string>();

  // Better planning: resolve a time conflict by swapping an elective for the engine's pick.
  for (const issue of issues) {
    if (issue.kind !== 'conflict' || issue.semesterId !== rec.term.id) continue;
    const removable = issue.courseIds.map((id) => courseById[id]).find((c) => !c.mandatory);
    if (!removable) continue;
    const without = coursesIn(issue.semesterId, applyMove(placements, removable.id, null)).map((c) => c.id);
    const pick = newPicks.find(
      (p) =>
        courseById[p.courseId].category === removable.category &&
        courseById[p.courseId].credits >= removable.credits &&
        findConflicts([...without, p.courseId]).length === 0,
    );
    if (!pick) continue;
    const add = courseById[pick.courseId];
    const slot = add.schedule[0];
    usedForSwap.add(add.id);
    out.push({
      id: `ai-swap-${removable.id}-${add.id}`,
      source: 'ai',
      topic: 'planning',
      severity: 'info',
      title: `Swap ${removable.name} for ${add.name}`,
      body: `${add.name} (${slot.day} ${slot.start}–${slot.end}) earns the same ${removable.credits} elective credits and removes the overlap.`,
      reasons: pick.reasons.filter((r) => !r.startsWith('No time conflicts')),
      impact: 'Resolves 1 schedule conflict · graduation unchanged',
      confidence: 'High',
      courseIds: [removable.id, add.id],
      action: { type: 'swap', label: 'Apply swap', remove: removable.id, add: add.id, semesterId: issue.semesterId },
    });
  }

  for (const p of newPicks.filter((x) => !usedForSwap.has(x.courseId) && !covered.has(x.courseId)).slice(0, 2)) {
    const c = courseById[p.courseId];
    out.push({
      id: `ai-rec-${p.courseId}-${rec.term.id}`,
      source: 'ai',
      topic: 'take-soon',
      severity: 'info',
      title: `Recommended for ${rec.term.label}: ${c.name}`,
      body: `${c.code} · ${c.credits} credits · ~${c.workload} h/week.`,
      reasons: p.reasons,
      confidence: p.kind === 'elective' ? 'Medium' : 'High',
      courseIds: [p.courseId],
      action: { type: 'move', label: `Add to ${rec.term.label}`, courseId: p.courseId, to: rec.term.id },
    });
  }

  // AI: what could delay graduation (what-if simulations from the forecast engine).
  const report = riskReport(placements, prefs);
  const delayRisks = report.risks.filter(
    (r) => r.delayTerms > 0 && r.delayTerms < 99 && !r.courseIds.some((id) => covered.has(id)),
  );
  for (const r of delayRisks.slice(0, 2)) {
    out.push({
      id: `ai-risk-${r.id}`,
      source: 'ai',
      topic: 'delay',
      severity: r.kind === 'fail-in-progress' ? 'info' : 'warning',
      title: r.title,
      body: r.detail,
      impact: r.newTerm
        ? `${r.delayTerms} ${r.delayTerms === 1 ? 'term' : 'terms'} later · ${r.newTerm.label} ends ${monthYear(r.newTerm.end)}`
        : undefined,
      confidence: 'High',
      courseIds: r.courseIds,
      action: r.courseIds[0] ? { type: 'course', label: 'View course', courseId: r.courseIds[0] } : undefined,
    });
  }
  const infeasible = report.risks.find((r) => r.kind === 'infeasible');
  if (infeasible) {
    out.push({
      id: 'ai-infeasible',
      source: 'ai',
      topic: 'delay',
      severity: 'warning',
      title: infeasible.title,
      body: infeasible.detail,
      courseIds: [],
      action: { type: 'navigate', label: 'Open plan', href: '/plan' },
    });
  }

  // AI: a failing elective grade still in the average (program's latest-grade policy).
  const h = engine.history;
  if (h.average !== null && engine.program.failedGradesInAverage) {
    for (const r of h.records.values()) {
      if (r.status !== 'failed' || typeof r.grade !== 'number' || courseById[r.courseId].mandatory) continue;
      if (courseStatus(r.courseId, placements) === 'planned' || usedForSwap.has(r.courseId)) continue;
      const cr = courseById[r.courseId].credits;
      const without = (h.average * h.averageCredits - r.grade * cr) / (h.averageCredits - cr);
      const sem = firstValidSemester(r.courseId, placements);
      out.push({
        id: `ai-failed-${r.courseId}`,
        source: 'ai',
        topic: 'planning',
        severity: 'info',
        title: `${courseById[r.courseId].name} (${r.grade}) is lowering your average`,
        body: `Under your program’s latest-grade rule, a failing grade stays in the average until the course is passed. Your average is ${h.average.toFixed(1)}; without this grade it would be ${without.toFixed(1)}.`,
        impact: 'Optional — it’s an elective, so graduation doesn’t depend on it',
        confidence: 'High',
        courseIds: [r.courseId],
        action: sem ? { type: 'move', label: `Plan a retake in ${sem.label}`, courseId: r.courseId, to: sem.id } : undefined,
      });
    }
  }

  // AI: workload forecast for planned semesters.
  const pastLoads = loads.filter((l) => l.semester.status === 'completed' && l.courses.length);
  const avgPast = pastLoads.reduce((a, l) => a + l.workload, 0) / Math.max(1, pastLoads.length);
  for (const load of loads) {
    if (load.semester.status !== 'future' || !load.courses.length) continue;
    const heavy = load.workload > prefs.heavyWorkloadHours || load.credits > prefs.preferredMaxCredits;
    if (!heavy) continue;
    const pct = Math.round(((load.workload - avgPast) / avgPast) * 100);
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
        movable ? ` Moving ${movable.c.name} to ${movable.later.label} would bring it to ~${load.workload - movable.c.workload} h/week.` : ''
      }`,
      impact: movable ? `Trade-off: graduation would move to ${monthYear(movable.later.end)}` : 'Consider lighter electives',
      confidence: 'Medium',
      courseIds: load.courses.map((c) => c.id),
      action: movable
        ? { type: 'move', label: `Move to ${movable.later.label}`, courseId: movable.c.id, to: movable.later.id }
        : undefined,
    });
  }

  // AI: recover a delayed graduation by pulling a course back into the target term or earlier.
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
        return credits <= creditLimit(s.id) && findConflicts(ids).length === 0;
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
    (i) => i.severity === 'critical' && i.kind !== 'missing-course' && i.kind !== 'missing-credits' && i.kind !== 'missing-rule',
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

  const missing = issues.filter((i) => i.kind === 'missing-course' || i.kind === 'missing-credits' || i.kind === 'missing-rule');
  for (const m of missing.slice(0, 1)) {
    const course = m.kind === 'missing-course' && m.courseIds[0] ? courseById[m.courseIds[0]] : undefined;
    const retake = !!course && courseStatus(course.id, placements) === 'failed';
    steps.push({
      id: `missing-${m.id}`,
      priority: 1,
      title: retake && course ? `Retake ${course.name}` : `Complete the missing ${groupNoun[m.groupId ?? 'core']} requirement`,
      detail: course ? `Add ${course.name} (${course.credits} cr) to your plan — offered ${offeredText(course)}.` : m.detail,
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
export { semesterById };
