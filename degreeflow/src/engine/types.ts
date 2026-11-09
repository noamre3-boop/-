/**
 * DegreeFlow academic engine — domain model.
 *
 * The engine is institution-agnostic: everything specific to a college or a program
 * (calendar, catalog, requirements, policies) is data that conforms to these types.
 * Nothing in src/engine imports from src/data or from React.
 */

// ── Calendar ────────────────────────────────────────────────────────────────

export type Season = 'fall' | 'spring' | 'summer';

export interface TermDef {
  id: string;
  season: Season;
  year: number;
  /** ISO dates */
  start: string;
  end: string;
}

export interface Term extends TermDef {
  label: string;
}

export interface CalendarDef {
  /** Terms with known dates. Terms outside this list are generated from `template`. */
  terms: TermDef[];
  /** Month-day ("MM-DD") template used to generate future terms for forecasting. */
  template: Record<Season, { start: string; end: string; endsNextYear?: boolean }>;
  /** Term id prefix per season, e.g. { fall: 'F', spring: 'S', summer: 'U' } → "F26". */
  idPrefix: Record<Season, string>;
  /** Order of seasons within an academic year, starting with the season that opens it. */
  yearOrder: Season[];
  /** The term in progress on `today`. */
  currentTermId: string;
  today: string;
}

// ── Catalog ─────────────────────────────────────────────────────────────────

export type Weekday = 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';

export interface TimeSlot {
  day: Weekday;
  start: string; // "HH:MM"
  end: string;
  kind: 'Lecture' | 'Recitation' | 'Lab' | 'Seminar';
}

/** Prerequisite expression. Leaves are courses (optionally with a minimum grade) or a credit threshold. */
export type PrereqExpr =
  | { course: string; minGrade?: number }
  | { all: PrereqExpr[] }
  | { any: PrereqExpr[] }
  | { minCredits: number };

export interface CatalogCourse {
  id: string;
  code: string;
  name: string;
  credits: number;
  /** Catalog category (department / course type). Programs select courses by category, tag or id. */
  category: string;
  level?: number;
  tags?: string[];
  prerequisites?: PrereqExpr;
  offered: Season[];
  gradingMode?: 'numeric' | 'pass-fail';
  /** Overrides the program's passing grade for this course. */
  passingGrade?: number;
  /** Interchangeable courses: credit is granted only once across an equivalence class. */
  equivalents?: string[];
  /** Estimated weekly hours including self-study. */
  workload: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  instructor: string;
  description: string;
  schedule: TimeSlot[];
  topics: string[];
  /** Historically fills up quickly at registration. */
  highDemand?: boolean;
}

export interface CatalogDef {
  id: string;
  institution: string;
  courses: CatalogCourse[];
}

// ── Program requirements ────────────────────────────────────────────────────

export interface CourseSelector {
  courses?: string[];
  categories?: string[];
  tags?: string[];
  minLevel?: number;
  exclude?: string[];
}

export type Rule =
  /** Pass `course` or one of its `alternatives`. */
  | { type: 'course'; id: string; course: string; alternatives?: string[] }
  /** Pass at least `min` courses matching `from`. */
  | { type: 'count'; id: string; label: string; min: number; from: CourseSelector }
  /** Earn at least `min` credits from courses matching `from`. */
  | { type: 'credits'; id: string; label: string; min: number; from: CourseSelector };

export interface RequirementGroupDef {
  id: string;
  name: string;
  shortName: string;
  description: string;
  kind: 'mandatory' | 'elective' | 'mixed';
  minCredits: number;
  /** Credits above this cap do not count toward the degree total. */
  maxCredits?: number;
  /** Which courses earn credit in this group. */
  pool: CourseSelector;
  /** Specific rules checked individually (mandatory courses, minimum counts…). */
  rules: Rule[];
}

export type ConditionDef =
  | { type: 'total-credits'; id: string; label: string; min: number }
  | { type: 'average'; id: string; label: string; min: number }
  | { type: 'groups'; id: string; label: string }
  | { type: 'exemption'; id: string; label: string; key: string };

export interface ProgramDef {
  id: string;
  institution: string;
  name: string;
  shortName: string;
  faculty: string;
  catalogYear: string;
  totalCredits: number;
  passingGrade: number;
  /** Maximum credits per term without special approval. */
  maxCreditsPerTerm: Record<Season, number>;
  /** Which grade counts when a course is repeated. */
  retakePolicy: 'latest' | 'highest';
  /** Whether a failing grade counts in the average until the course is passed. */
  failedGradesInAverage: boolean;
  groups: RequirementGroupDef[];
  conditions: ConditionDef[];
}

// ── Student ─────────────────────────────────────────────────────────────────

export type GradeValue = number | 'pass' | 'fail';

export interface Attempt {
  courseId: string;
  termId: string;
  status: 'graded' | 'in-progress' | 'withdrawn';
  grade?: GradeValue;
}

export interface Exemption {
  id: string;
  /** `exemption`: requirement waived. `transfer`: credit recognized from prior studies. */
  type: 'exemption' | 'transfer';
  /** The course this exemption replaces, if any. */
  courseId?: string;
  /** A non-course requirement this exemption satisfies (e.g. English proficiency). */
  key?: string;
  /** Credits granted (0 for waivers without credit). */
  credits: number;
  source: string;
  date: string;
}

export interface StudentRecord {
  id: string;
  programId: string;
  firstName: string;
  startTermId: string;
  targetTermId: string;
  attempts: Attempt[];
  exemptions: Exemption[];
}

/** Future placements: courseId → termId. */
export type Plan = Record<string, string>;

export interface PlanningPrefs {
  /** Soft credit cap per term used by recommendations and forecasts. */
  maxCredits: number;
  /** Estimated weekly hours above which a term is considered heavy. */
  heavyWorkloadHours: number;
  includeSummer: boolean;
}
