import { type Audit, auditDegree } from './audit';
import { type Calendar, createCalendar } from './calendar';
import { type Catalog, createCatalog } from './catalog';
import type { Core } from './core';
import { type Forecast, type RiskReport, analyzeRisks, forecastGraduation } from './forecast';
import { type History, resolveHistory } from './history';
import { type PrereqCheck, describePrereq, evaluatePrereq } from './prerequisites';
import { type RecommendationSet, recommendForTerm } from './recommend';
import { type Issue, validatePlan } from './validate';
import type { CalendarDef, CatalogDef, Plan, PlanningPrefs, ProgramDef, StudentRecord } from './types';

export interface EngineInput {
  calendar: CalendarDef;
  catalog: CatalogDef;
  program: ProgramDef;
  student: StudentRecord;
}

/**
 * One engine instance per student × program. All methods are pure functions of the inputs
 * and the plan passed in; nothing is cached across plans.
 */
export interface Engine {
  calendar: Calendar;
  catalog: Catalog;
  program: ProgramDef;
  student: StudentRecord;
  history: History;
  audit(plan: Plan, assumeFailed?: Set<string>): Audit;
  validate(plan: Plan): Issue[];
  recommend(plan: Plan, prefs: PlanningPrefs, termId?: string): RecommendationSet;
  forecast(plan: Plan, prefs: PlanningPrefs): Forecast;
  risks(plan: Plan, prefs: PlanningPrefs): RiskReport;
  prerequisites(courseId: string, termId: string, plan: Plan): PrereqCheck;
  describePrerequisites(courseId: string): string;
}

export function createEngine(input: EngineInput): Engine {
  const calendar = createCalendar(input.calendar);
  const catalog = createCatalog(input.catalog);
  if (input.student.programId !== input.program.id) {
    throw new Error(`Student ${input.student.id} is enrolled in ${input.student.programId}, not ${input.program.id}`);
  }
  const history = resolveHistory(input.student, catalog, input.program, calendar);
  const core: Core = { calendar, catalog, program: input.program, student: input.student, history };

  return {
    calendar,
    catalog,
    program: input.program,
    student: input.student,
    history,
    audit: (plan, assumeFailed) => auditDegree({ ...core, plan, assumeFailed }),
    validate: (plan) => validatePlan(core, plan),
    recommend: (plan, prefs, termId) =>
      recommendForTerm(core, plan, prefs, termId ?? calendar.next(calendar.current.id, { includeSummer: prefs.includeSummer }).id),
    forecast: (plan, prefs) => forecastGraduation(core, plan, prefs),
    risks: (plan, prefs) => analyzeRisks(core, plan, prefs),
    prerequisites: (courseId, termId, plan) =>
      evaluatePrereq(catalog.get(courseId).prerequisites, { catalog, calendar, history, plan }, termId),
    describePrerequisites: (courseId) => describePrereq(catalog.get(courseId).prerequisites, catalog),
  };
}

export type { Audit, GroupAudit, RuleResult, ConditionResult, MissingCourse } from './audit';
export type { Calendar } from './calendar';
export type { Catalog } from './catalog';
export { prereqCourses } from './catalog';
export type { Forecast, Risk, RiskReport } from './forecast';
export type { CourseRecord, History, RecordStatus } from './history';
export type { PrereqCheck } from './prerequisites';
export type { Recommendation, RecommendationSet } from './recommend';
export { findConflicts, type Conflict } from './schedule';
export type { Issue, IssueKind } from './validate';
export { offeredText } from './core';
export * from './types';
