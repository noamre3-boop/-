import type { Calendar } from './calendar';
import type { Catalog } from './catalog';
import type { Attempt, Exemption, GradeValue, ProgramDef, StudentRecord } from './types';

/**
 * Resolves a student's raw attempts and exemptions into one record per course.
 *
 * Guarantees:
 * - A course earns credit at most once, however many times it was taken.
 * - Within an equivalence class only the first passed course earns credit; the rest are `duplicate`.
 * - Which attempt counts follows the program's retake policy (latest or highest grade).
 * - Failed grades count in the average only while the course remains unpassed, if the program says so.
 * - Pass/fail grades, exemptions and transferred credit never enter the average.
 */

export type RecordStatus =
  | 'passed'
  | 'failed'
  | 'in-progress'
  | 'exempt' // requirement waived (with or without credit)
  | 'transfer' // credit recognized from prior studies
  | 'withdrawn'
  | 'duplicate'; // passed, but credit already granted for an equivalent course

export interface CourseRecord {
  courseId: string;
  status: RecordStatus;
  /** All attempts, oldest first. */
  attempts: Attempt[];
  /** The attempt whose grade counts (per retake policy). */
  counted?: Attempt;
  grade?: GradeValue;
  /** Credits this course earns toward the degree (before program allocation). */
  credits: number;
  inAverage: boolean;
  /** Term of the counted attempt, or of the attempt in progress. */
  termId?: string;
  /** A retake of a previously graded attempt is in progress. */
  retaking: boolean;
  /** The course isn't part of the student's program: it earns no degree credit and stays out of the average. */
  outsideProgram: boolean;
  exemption?: Exemption;
  duplicateOf?: string;
}

export interface History {
  records: Map<string, CourseRecord>;
  get(courseId: string): CourseRecord | undefined;
  /** Non-course requirements satisfied by exemptions (e.g. "english-advanced"). */
  exemptionKeys: Set<string>;
  exemptions: Exemption[];
  /** Credit-weighted average over grades that count, or null if there are none. */
  average: number | null;
  averageCredits: number;
  /** Sum of credits earned (passed + recognized), before program rules are applied. */
  earnedCredits: number;
  /** Credits earned in terms strictly before `termId` (transfers count as earned before any term). */
  earnedBefore(termId: string): number;
  isPassing(courseId: string, grade: GradeValue | undefined): boolean;
}

export function resolveHistory(
  student: StudentRecord,
  catalog: Catalog,
  program: ProgramDef,
  calendar: Calendar,
): History {
  const passingGradeFor = (id: string) => catalog.get(id).passingGrade ?? program.passingGrade;
  const isPassing = (id: string, g: GradeValue | undefined) => {
    if (g === undefined) return false;
    if (g === 'pass') return true;
    if (g === 'fail') return false;
    return g >= passingGradeFor(id);
  };

  const inProgram = (id: string) =>
    program.groups.some(
      (g) => catalog.matches(id, g.pool) || g.rules.some((r) => r.type === 'course' && (r.course === id || r.alternatives?.includes(id))),
    );

  const byCourse = new Map<string, Attempt[]>();
  for (const a of student.attempts) {
    if (!catalog.has(a.courseId)) continue;
    if (!byCourse.has(a.courseId)) byCourse.set(a.courseId, []);
    byCourse.get(a.courseId)!.push(a);
  }

  const records = new Map<string, CourseRecord>();

  for (const [courseId, list] of byCourse) {
    const attempts = [...list].sort((a, b) => calendar.compare(a.termId, b.termId));
    const graded = attempts.filter((a) => a.status === 'graded' && a.grade !== undefined);
    const inProgress = attempts.find((a) => a.status === 'in-progress');

    let counted: Attempt | undefined;
    if (graded.length) {
      if (program.retakePolicy === 'latest') counted = graded[graded.length - 1];
      else {
        const rank = (g: GradeValue | undefined) => (g === 'pass' ? 1000 : g === 'fail' || g === undefined ? -1 : g);
        counted = graded.reduce((best, a) => (rank(a.grade) > rank(best.grade) ? a : best));
      }
    }

    const passed = counted ? isPassing(courseId, counted.grade) : false;
    const course = catalog.get(courseId);
    let status: RecordStatus;
    if (passed) status = 'passed';
    else if (inProgress) status = 'in-progress';
    else if (counted) status = 'failed';
    else status = 'withdrawn';

    const outsideProgram = !inProgram(courseId);
    const numeric = typeof counted?.grade === 'number' && course.gradingMode !== 'pass-fail';
    const inAverage =
      !outsideProgram &&
      numeric &&
      (status === 'passed' || ((status === 'failed' || status === 'in-progress') && program.failedGradesInAverage));

    records.set(courseId, {
      courseId,
      status,
      attempts,
      counted,
      grade: counted?.grade,
      credits: status === 'passed' && !outsideProgram ? course.credits : 0,
      inAverage,
      outsideProgram,
      termId: status === 'in-progress' ? inProgress!.termId : (counted ?? attempts[attempts.length - 1]).termId,
      retaking: !!inProgress && graded.length > 0,
    });
  }

  // Exemptions and recognized prior studies override attempts for the same course.
  const exemptionKeys = new Set<string>();
  for (const ex of student.exemptions) {
    if (ex.key) exemptionKeys.add(ex.key);
    if (!ex.courseId || !catalog.has(ex.courseId)) continue;
    const prev = records.get(ex.courseId);
    if (prev?.status === 'passed') continue; // already passed: the exemption adds nothing
    records.set(ex.courseId, {
      courseId: ex.courseId,
      status: ex.type === 'transfer' ? 'transfer' : 'exempt',
      attempts: prev?.attempts ?? [],
      credits: ex.credits,
      inAverage: false,
      retaking: false,
      outsideProgram: !inProgram(ex.courseId),
      exemption: ex,
    });
  }

  // Equivalent courses earn credit once: keep the earliest earned record in each class.
  const seenClass = new Map<string, string>();
  const earnedOrder = [...records.values()]
    .filter((r) => r.credits > 0)
    .sort((a, b) => {
      if (!a.termId) return -1;
      if (!b.termId) return 1;
      return calendar.compare(a.termId, b.termId);
    });
  for (const r of earnedOrder) {
    const key = [...catalog.equivalenceClass(r.courseId)].sort().join('|');
    const owner = seenClass.get(key);
    if (owner) {
      r.status = 'duplicate';
      r.duplicateOf = owner;
      r.credits = 0;
      r.inAverage = false;
    } else seenClass.set(key, r.courseId);
  }

  let points = 0;
  let averageCredits = 0;
  let earnedCredits = 0;
  for (const r of records.values()) {
    earnedCredits += r.credits;
    if (r.inAverage && typeof r.grade === 'number') {
      const cr = catalog.get(r.courseId).credits;
      points += cr * r.grade;
      averageCredits += cr;
    }
  }

  return {
    records,
    get: (id) => records.get(id),
    exemptionKeys,
    exemptions: student.exemptions,
    average: averageCredits ? points / averageCredits : null,
    averageCredits,
    earnedCredits,
    earnedBefore: (termId) =>
      [...records.values()]
        .filter((r) => r.credits > 0 && (!r.termId || calendar.isBefore(r.termId, termId)))
        .reduce((a, r) => a + r.credits, 0),
    isPassing,
  };
}

/** Records that earn credit or satisfy a requirement. */
export const isComplete = (r: CourseRecord | undefined) =>
  !!r && (r.status === 'passed' || r.status === 'exempt' || r.status === 'transfer');
