import type { DegreeProgram, RequirementGroup, Semester, StudentProfile } from '../types';

/**
 * Sample data for demonstration only. DegreeFlow is not connected to any university system;
 * every course, date and grade below is illustrative.
 */

/** The demo is anchored to a fixed "today" so relative dates stay meaningful. */
export const DEMO_TODAY = '2026-11-09';

export const student: StudentProfile = {
  firstName: 'Noam',
  lastName: '',
  studentId: 'DF-204-118',
  email: 'noam@student.degreeflow.app',
  advisor: 'Dr. Shira Alon',
  startedIn: 'Fall 2023',
};

export const program: DegreeProgram = {
  name: 'B.Sc. Computer Science',
  shortName: 'Computer Science',
  faculty: 'Faculty of Exact Sciences',
  totalCredits: 120,
  minAverage: 65,
  maxCreditsPerSemester: 22,
  targetGraduation: 'S27',
  catalogYear: '2023–24 catalog',
};

export const requirementGroups: RequirementGroup[] = [
  {
    id: 'core',
    name: 'Core courses',
    shortName: 'Core',
    description: 'Foundational computer science courses every student completes.',
    requiredCredits: 48,
    kind: 'mandatory',
  },
  {
    id: 'math',
    name: 'Mandatory credits',
    shortName: 'Math & science',
    description: 'Required mathematics and science foundations.',
    requiredCredits: 26,
    kind: 'mandatory',
  },
  {
    id: 'elective',
    name: 'Elective courses',
    shortName: 'Electives',
    description: 'Advanced computer science electives of your choice.',
    requiredCredits: 24,
    kind: 'elective',
  },
  {
    id: 'project',
    name: 'Final project',
    shortName: 'Final project',
    description: 'Two-semester capstone project, supervised by a faculty member.',
    requiredCredits: 8,
    kind: 'mandatory',
  },
  {
    id: 'general',
    name: 'Additional requirements',
    shortName: 'Additional',
    description: 'English, writing and general-studies credits outside the faculty.',
    requiredCredits: 14,
    kind: 'mixed',
  },
];

export const semesters: Semester[] = [
  { id: 'F23', term: 'fall', year: 2023, label: 'Fall 2023', start: '2023-10-22', end: '2024-02-09', status: 'completed' },
  { id: 'S24', term: 'spring', year: 2024, label: 'Spring 2024', start: '2024-03-10', end: '2024-06-28', status: 'completed' },
  { id: 'F24', term: 'fall', year: 2024, label: 'Fall 2024', start: '2024-10-20', end: '2025-02-07', status: 'completed' },
  { id: 'S25', term: 'spring', year: 2025, label: 'Spring 2025', start: '2025-03-09', end: '2025-06-27', status: 'completed' },
  { id: 'F25', term: 'fall', year: 2025, label: 'Fall 2025', start: '2025-10-19', end: '2026-02-06', status: 'completed' },
  { id: 'S26', term: 'spring', year: 2026, label: 'Spring 2026', start: '2026-03-08', end: '2026-06-26', status: 'completed' },
  { id: 'F26', term: 'fall', year: 2026, label: 'Fall 2026', start: '2026-10-18', end: '2027-02-05', status: 'current' },
  { id: 'S27', term: 'spring', year: 2027, label: 'Spring 2027', start: '2027-03-07', end: '2027-06-25', status: 'future' },
  { id: 'U27', term: 'summer', year: 2027, label: 'Summer 2027', start: '2027-07-04', end: '2027-09-10', status: 'future' },
  { id: 'F27', term: 'fall', year: 2027, label: 'Fall 2027', start: '2027-10-17', end: '2028-02-04', status: 'future' },
];

export const semesterById = Object.fromEntries(semesters.map((s) => [s.id, s])) as Record<string, Semester>;
