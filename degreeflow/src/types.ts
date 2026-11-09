// UI-facing view types. The academic domain model lives in src/engine/types.ts;
// src/data/courses.ts and src/data/program.ts adapt engine data into these shapes.

export type CategoryId = 'core' | 'math' | 'elective' | 'project' | 'general' | 'preparatory';
export type Term = 'fall' | 'spring' | 'summer';
export type Weekday = 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';

export interface TimeSlot {
  day: Weekday;
  start: string; // "HH:MM"
  end: string;
  kind: 'Lecture' | 'Recitation' | 'Lab' | 'Seminar';
}

export interface Course {
  id: string;
  code: string;
  name: string;
  credits: number;
  category: CategoryId;
  /** Named by a mandatory course rule in the program. */
  mandatory: boolean;
  /** Accepted in place of this mandatory course. */
  alternativeTo?: string;
  /** Prerequisite courses for display (first option of each "one of" group). The full rule is in `prereqText`. */
  prerequisites: string[];
  prereqText: string;
  offered: Term[];
  description: string;
  /** Estimated hours per week, including lectures and self-study. */
  workload: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  instructor: string;
  schedule: TimeSlot[];
  /** Typically fills quickly during registration. */
  highDemand?: boolean;
  gradingMode: 'numeric' | 'pass-fail';
  passingGrade: number;
  level: number;
  topics: string[];
}

export interface Semester {
  id: string;
  term: Term;
  year: number;
  label: string;
  /** ISO dates */
  start: string;
  end: string;
  status: 'completed' | 'current' | 'future';
}

export interface RequirementGroup {
  id: CategoryId;
  name: string;
  /** Short label used in compact lists. */
  shortName: string;
  description: string;
  requiredCredits: number;
  kind: 'mandatory' | 'elective' | 'mixed';
}

export interface DegreeProgram {
  name: string;
  shortName: string;
  faculty: string;
  totalCredits: number;
  minAverage: number;
  passingGrade: number;
  /** Fall/spring limit; summer terms have their own (lower) limit in the engine. */
  maxCreditsPerSemester: number;
  targetGraduation: string; // semester id
  catalogYear: string;
}

export interface StudentProfile {
  firstName: string;
  lastName: string;
  studentId: string;
  email: string;
  advisor: string;
  startedIn: string;
}

export type MilestoneType = 'registration' | 'exam' | 'deadline' | 'academic' | 'graduation';

export interface Milestone {
  id: string;
  date: string;
  title: string;
  description: string;
  type: MilestoneType;
  href?: string;
}

export type Severity = 'critical' | 'warning' | 'info' | 'success';

export interface Alert {
  id: string;
  date: string;
  title: string;
  body: string;
  severity: Severity;
  category: 'deadline' | 'requirement' | 'grade' | 'plan' | 'system';
  actionLabel?: string;
  href?: string;
}

export type CourseStatus =
  | 'completed'
  | 'in-progress'
  | 'planned'
  | 'unscheduled'
  | 'failed'
  | 'exempt'
  | 'not-counted';

export interface ThemePreference {
  mode: 'dark' | 'light' | 'system';
}
