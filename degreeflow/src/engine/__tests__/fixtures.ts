import { createEngine } from '..';
import type { Attempt, CalendarDef, CatalogCourse, CatalogDef, Exemption, Plan, PlanningPrefs, ProgramDef } from '../types';

/**
 * A small synthetic institution used only by tests ("Test College"), independent of the demo data.
 * Current term: Fall 2025.
 */

export const calendar: CalendarDef = {
  today: '2025-11-01',
  currentTermId: 'F25',
  yearOrder: ['fall', 'spring', 'summer'],
  idPrefix: { fall: 'F', spring: 'S', summer: 'U' },
  template: {
    fall: { start: '10-15', end: '02-01', endsNextYear: true },
    spring: { start: '03-01', end: '06-30' },
    summer: { start: '07-05', end: '09-05' },
  },
  terms: [
    { id: 'F23', season: 'fall', year: 2023, start: '2023-10-15', end: '2024-02-01' },
    { id: 'S24', season: 'spring', year: 2024, start: '2024-03-01', end: '2024-06-30' },
    { id: 'F24', season: 'fall', year: 2024, start: '2024-10-15', end: '2025-02-01' },
    { id: 'S25', season: 'spring', year: 2025, start: '2025-03-01', end: '2025-06-30' },
    { id: 'F25', season: 'fall', year: 2025, start: '2025-10-15', end: '2026-02-01' },
  ],
};

const course = (c: Partial<CatalogCourse> & Pick<CatalogCourse, 'id' | 'credits' | 'category' | 'offered'>): CatalogCourse => ({
  code: c.id,
  name: c.id,
  workload: c.credits * 2,
  difficulty: 3,
  instructor: 'Staff',
  description: '',
  schedule: [],
  topics: [],
  ...c,
});

export const catalog: CatalogDef = {
  id: 'test-college',
  institution: 'Test College',
  courses: [
    course({ id: 'A101', credits: 4, category: 'core', offered: ['fall'], schedule: [{ day: 'Sun', start: '08:00', end: '10:00', kind: 'Lecture' }] }),
    course({ id: 'A102', credits: 4, category: 'core', offered: ['spring'], prerequisites: { course: 'A101' } }),
    course({ id: 'A201', credits: 4, category: 'core', offered: ['fall'], prerequisites: { course: 'A102', minGrade: 70 } }),
    course({ id: 'M101', credits: 3, category: 'math', offered: ['fall'] }),
    course({ id: 'M102', credits: 3, category: 'math', offered: ['spring'], equivalents: ['M102X'] }),
    course({ id: 'M102X', credits: 3, category: 'math', offered: ['spring', 'fall'], equivalents: ['M102'] }),
    course({ id: 'E301', credits: 3, category: 'elective', level: 3, offered: ['fall', 'spring'] }),
    course({ id: 'E302', credits: 3, category: 'elective', level: 3, offered: ['spring'], schedule: [{ day: 'Tue', start: '10:00', end: '12:00', kind: 'Lecture' }] }),
    course({ id: 'E401', credits: 3, category: 'elective', level: 4, offered: ['fall'] }),
    course({ id: 'E402', credits: 3, category: 'elective', level: 4, offered: ['spring'], schedule: [{ day: 'Tue', start: '11:00', end: '13:00', kind: 'Lecture' }] }),
    course({ id: 'E403', credits: 3, category: 'elective', level: 4, offered: ['spring'], schedule: [{ day: 'Thu', start: '10:00', end: '12:00', kind: 'Lecture' }] }),
    course({ id: 'P401', credits: 4, category: 'project', offered: ['fall', 'spring'], prerequisites: { minCredits: 12 } }),
    course({ id: 'G100', credits: 2, category: 'general', offered: ['fall', 'spring'], gradingMode: 'pass-fail' }),
    course({ id: 'G200', credits: 2, category: 'general', offered: ['fall', 'spring'] }),
    course({ id: 'X000', credits: 2, category: 'preparatory', offered: ['summer'] }),
    course({ id: 'Z999', credits: 2, category: 'core', offered: [] }),
  ],
};

export const program: ProgramDef = {
  id: 'test-program',
  institution: 'Test College',
  name: 'B.Sc. Test',
  shortName: 'Test',
  faculty: 'Testing',
  catalogYear: '2023',
  totalCredits: 33,
  passingGrade: 56,
  maxCreditsPerTerm: { fall: 12, spring: 12, summer: 6 },
  retakePolicy: 'latest',
  failedGradesInAverage: true,
  groups: [
    {
      id: 'core',
      name: 'Core',
      shortName: 'Core',
      description: '',
      kind: 'mandatory',
      minCredits: 12,
      pool: { categories: ['core'] },
      rules: ['A101', 'A102', 'A201'].map((c) => ({ type: 'course' as const, id: `core-${c}`, course: c })),
    },
    {
      id: 'math',
      name: 'Math',
      shortName: 'Math',
      description: '',
      kind: 'mandatory',
      minCredits: 6,
      pool: { categories: ['math'] },
      rules: [
        { type: 'course', id: 'math-M101', course: 'M101' },
        { type: 'course', id: 'math-M102', course: 'M102', alternatives: ['M102X'] },
      ],
    },
    {
      id: 'elective',
      name: 'Electives',
      shortName: 'Electives',
      description: '',
      kind: 'elective',
      minCredits: 9,
      pool: { categories: ['elective'] },
      rules: [{ type: 'count', id: 'adv', label: 'At least one 400-level elective', min: 1, from: { categories: ['elective'], minLevel: 4 } }],
    },
    { id: 'project', name: 'Project', shortName: 'Project', description: '', kind: 'mandatory', minCredits: 4, pool: { categories: ['project'] }, rules: [{ type: 'course', id: 'prj', course: 'P401' }] },
    { id: 'general', name: 'General', shortName: 'General', description: '', kind: 'mixed', minCredits: 2, maxCredits: 2, pool: { categories: ['general'] }, rules: [] },
  ],
  conditions: [
    { type: 'total-credits', id: 'total', label: '33 credits', min: 33 },
    { type: 'groups', id: 'groups', label: 'All groups' },
    { type: 'average', id: 'avg', label: 'Average ≥ 65', min: 65 },
    { type: 'exemption', id: 'english', label: 'English', key: 'english' },
  ],
};

export const prefs: PlanningPrefs = { maxCredits: 12, heavyWorkloadHours: 40, includeSummer: true };

export const graded = (courseId: string, termId: string, grade: Attempt['grade']): Attempt => ({ courseId, termId, status: 'graded', grade });
export const inProgress = (courseId: string): Attempt => ({ courseId, termId: 'F25', status: 'in-progress' });
export const englishExemption: Exemption = { id: 'eng', type: 'exemption', key: 'english', credits: 0, source: 'Placement exam', date: '2023-09-01' };

/** A record that satisfies every requirement (33 credits). */
export const completeAttempts: Attempt[] = [
  graded('A101', 'F23', 90),
  graded('M101', 'F23', 85),
  graded('A102', 'S24', 88),
  graded('M102', 'S24', 80),
  graded('A201', 'F24', 75),
  graded('E301', 'F24', 92),
  graded('E401', 'F24', 81),
  graded('E302', 'S25', 77),
  graded('P401', 'S25', 95),
  graded('G100', 'S25', 'pass'),
];

export function build(attempts: Attempt[], exemptions: Exemption[] = [englishExemption], overrides: Partial<ProgramDef> = {}) {
  return createEngine({
    calendar,
    catalog,
    program: { ...program, ...overrides },
    student: { id: 's1', programId: 'test-program', firstName: 'Test', startTermId: 'F23', targetTermId: 'S26', attempts, exemptions },
  });
}

export const without = (ids: string[], list = completeAttempts) => list.filter((a) => !ids.includes(a.courseId));
export type { Plan };
