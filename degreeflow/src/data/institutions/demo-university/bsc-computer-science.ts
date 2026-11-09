import type { ProgramDef } from '../../../engine';

/**
 * SAMPLE DATA — degree requirements of a fictional B.Sc. in Computer Science (120 credits).
 * The structure (groups, individual rules, caps, conditions, policies) is what a real program
 * would be encoded as; the specific values are illustrative.
 */
export const bscComputerScience: ProgramDef = {
  id: 'demo-bsc-cs-2023',
  institution: 'Demo University',
  name: 'B.Sc. Computer Science',
  shortName: 'Computer Science',
  faculty: 'Faculty of Exact Sciences',
  catalogYear: '2023–24 catalog',
  totalCredits: 120,
  passingGrade: 56,
  maxCreditsPerTerm: { fall: 22, spring: 22, summer: 10 },
  retakePolicy: 'latest',
  failedGradesInAverage: true,
  groups: [
    {
      id: 'core',
      name: 'Core courses',
      shortName: 'Core',
      description: 'Foundational computer science courses every student completes.',
      kind: 'mandatory',
      minCredits: 48,
      pool: { categories: ['core'] },
      rules: ['CS101', 'CS102', 'CS201', 'CS202', 'CS210', 'CS220', 'CS230', 'CS240', 'CS250', 'CS310', 'CS320'].map((c) => ({
        type: 'course' as const,
        id: `core-${c}`,
        course: c,
      })),
    },
    {
      id: 'math',
      name: 'Mandatory credits',
      shortName: 'Math & science',
      description: 'Required mathematics and science foundations.',
      kind: 'mandatory',
      minCredits: 26,
      pool: { categories: ['math'] },
      rules: [
        { type: 'course', id: 'math-MATH101', course: 'MATH101' },
        { type: 'course', id: 'math-MATH110', course: 'MATH110' },
        { type: 'course', id: 'math-MATH102', course: 'MATH102' },
        { type: 'course', id: 'math-linear', course: 'MATH120', alternatives: ['MATH121'] },
        { type: 'course', id: 'math-MATH201', course: 'MATH201' },
        { type: 'course', id: 'math-MATH301', course: 'MATH301' },
      ],
    },
    {
      id: 'elective',
      name: 'Elective courses',
      shortName: 'Electives',
      description: 'Advanced computer science electives of your choice.',
      kind: 'elective',
      minCredits: 24,
      pool: { categories: ['elective'] },
      rules: [
        {
          type: 'count',
          id: 'elective-advanced',
          label: 'At least 2 advanced (400-level) electives',
          min: 2,
          from: { categories: ['elective'], minLevel: 4 },
        },
      ],
    },
    {
      id: 'project',
      name: 'Final project',
      shortName: 'Final project',
      description: 'Two-semester capstone project, supervised by a faculty member.',
      kind: 'mandatory',
      minCredits: 8,
      pool: { categories: ['project'] },
      rules: [
        { type: 'course', id: 'project-PRJ401', course: 'PRJ401' },
        { type: 'course', id: 'project-PRJ402', course: 'PRJ402' },
      ],
    },
    {
      id: 'general',
      name: 'Additional requirements',
      shortName: 'Additional',
      description: 'Writing and general-studies credits outside the faculty (up to 16 count).',
      kind: 'mixed',
      minCredits: 14,
      maxCredits: 16,
      pool: { categories: ['general'] },
      rules: [{ type: 'course', id: 'general-GEN210', course: 'GEN210' }],
    },
  ],
  conditions: [
    { type: 'total-credits', id: 'total', label: '120 credits', min: 120 },
    { type: 'groups', id: 'groups', label: 'All requirement groups complete' },
    { type: 'average', id: 'average', label: 'Weighted average ≥ 65', min: 65 },
    { type: 'exemption', id: 'english', label: 'English proficiency — exemption level', key: 'english-exemption' },
  ],
};
