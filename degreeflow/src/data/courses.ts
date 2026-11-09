import { prereqCourses } from '../engine';
import type { CategoryId, Course } from '../types';
import { demoInitialPlan, engine } from './demo';

/**
 * UI adapter for catalog and history data. The source of truth is the engine input
 * (src/data/institutions/…/catalog.ts and src/data/students/demo-student.ts — sample data).
 */

const { catalog, program, history } = engine;

const mandatoryIds = new Set<string>();
const alternativeOf = new Map<string, string>();
for (const g of program.groups) {
  for (const r of g.rules) {
    if (r.type !== 'course') continue;
    mandatoryIds.add(r.course);
    for (const a of r.alternatives ?? []) alternativeOf.set(a, r.course);
  }
}

/** First option of each "one of" group, for compact display. */
function displayPrereqs(id: string): string[] {
  const expr = catalog.get(id).prerequisites;
  const walk = (e: typeof expr): string[] => {
    if (!e) return [];
    if ('course' in e) return [e.course];
    if ('all' in e) return e.all.flatMap(walk);
    if ('any' in e) {
      // Prefer an option the student already passed.
      const opts = e.any.flatMap(walk);
      return [opts.find((o) => history.get(o)?.status === 'passed') ?? opts[0]].filter(Boolean);
    }
    return [];
  };
  return [...new Set(walk(expr))];
}

export const courses: Course[] = catalog.courses.map((c) => ({
  id: c.id,
  code: c.code,
  name: c.name,
  credits: c.credits,
  category: c.category as CategoryId,
  mandatory: mandatoryIds.has(c.id),
  alternativeTo: alternativeOf.get(c.id),
  prerequisites: displayPrereqs(c.id),
  prereqText: engine.describePrerequisites(c.id),
  offered: c.offered,
  description: c.description,
  workload: c.workload,
  difficulty: c.difficulty,
  instructor: c.instructor,
  schedule: c.schedule,
  highDemand: c.highDemand,
  gradingMode: c.gradingMode ?? 'numeric',
  passingGrade: c.passingGrade ?? program.passingGrade,
  level: c.level ?? 0,
  topics: c.topics,
}));

export const courseById = Object.fromEntries(courses.map((c) => [c.id, c])) as Record<string, Course>;

/** Numeric grade that counts for each course (for failed courses: the latest failing grade). */
export const grades: Record<string, number> = Object.fromEntries(
  [...history.records.values()].filter((r) => typeof r.grade === 'number').map((r) => [r.courseId, r.grade as number]),
);

/** Where each course sits: the term of its counted attempt, the current term, or the student's plan. */
const historyPlacements: Record<string, string> = Object.fromEntries(
  [...history.records.values()].filter((r) => r.termId).map((r) => [r.courseId, r.termId!]),
);

export const initialPlacements: Record<string, string> = { ...historyPlacements, ...demoInitialPlan };

export { prereqCourses };
