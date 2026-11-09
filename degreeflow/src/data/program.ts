import type { DegreeProgram, RequirementGroup, Semester, StudentProfile } from '../types';
import { DEMO_TODAY, engine } from './demo';

/**
 * UI adapter for program-level data. The source of truth is the engine input in
 * src/data/institutions and src/data/students (sample data).
 */

export { DEMO_TODAY };

const p = engine.program;
const avg = p.conditions.find((c) => c.type === 'average');

export const student: StudentProfile = {
  firstName: engine.student.firstName,
  lastName: '',
  studentId: engine.student.id,
  email: 'noam@student.degreeflow.app',
  advisor: 'Dr. Shira Alon',
  startedIn: engine.calendar.get(engine.student.startTermId).label,
};

export const program: DegreeProgram = {
  name: p.name,
  shortName: p.shortName,
  faculty: p.faculty,
  totalCredits: p.totalCredits,
  minAverage: avg && avg.type === 'average' ? avg.min : 0,
  passingGrade: p.passingGrade,
  maxCreditsPerSemester: Math.max(p.maxCreditsPerTerm.fall, p.maxCreditsPerTerm.spring),
  targetGraduation: engine.student.targetTermId,
  catalogYear: p.catalogYear,
};

export const requirementGroups: RequirementGroup[] = p.groups.map((g) => ({
  id: g.id as RequirementGroup['id'],
  name: g.name,
  shortName: g.shortName,
  description: g.description,
  requiredCredits: g.minCredits,
  kind: g.kind,
}));

/** Terms the student attended, the current term, and the planning horizon. */
const attended = new Set(engine.student.attempts.map((a) => a.termId));
export const semesters: Semester[] = engine.calendar.terms
  .filter((t) => {
    const status = engine.calendar.status(t.id);
    return status !== 'completed' || attended.has(t.id);
  })
  .map((t) => ({
    id: t.id,
    term: t.season,
    year: t.year,
    label: t.label,
    start: t.start,
    end: t.end,
    status: engine.calendar.status(t.id),
  }));

export const semesterById = Object.fromEntries(semesters.map((s) => [s.id, s])) as Record<string, Semester>;

/** A UI semester for any term id, including terms generated beyond the known calendar. */
export function semesterFor(termId: string): Semester {
  if (semesterById[termId]) return semesterById[termId];
  const t = engine.calendar.get(termId);
  return { id: t.id, term: t.season, year: t.year, label: t.label, start: t.start, end: t.end, status: engine.calendar.status(t.id) };
}
