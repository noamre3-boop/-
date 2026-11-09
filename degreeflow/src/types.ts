// Domain model for DegreeFlow. Data files describe the program and the student;
// everything else (progress, issues, projections, insights) is derived in src/lib.

export type CategoryId = 'core' | 'math' | 'elective' | 'project' | 'general';
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
  /** Mandatory courses must all be completed to graduate. */
  mandatory: boolean;
  prerequisites: string[];
  offered: Term[];
  description: string;
  /** Estimated hours per week, including lectures and self-study. */
  workload: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  instructor: string;
  schedule: TimeSlot[];
  /** Typically fills quickly during registration. */
  highDemand?: boolean;
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

export type CourseStatus = 'completed' | 'in-progress' | 'planned' | 'unscheduled';

export interface ThemePreference {
  mode: 'dark' | 'light' | 'system';
}
