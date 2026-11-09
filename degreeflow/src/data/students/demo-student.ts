import type { Plan, StudentRecord } from '../../engine';

/**
 * SAMPLE DATA — a fictional student record used for the demo.
 *
 * It deliberately includes the situations a real record has:
 * - a failed mandatory course that was retaken and passed (Calculus II: 48 → 78);
 * - a failed elective that was not retaken (Computer Graphics: 52, still in the average);
 * - a pass/fail course (Entrepreneurship & Innovation);
 * - recognized prior studies with credit (Introduction to Psychology);
 * - an English exemption without credit;
 * - a preparatory course that doesn't count toward the degree;
 * - courses in progress this term, and a plan for next term.
 */
export const demoStudent: StudentRecord = {
  id: 'DF-204-118',
  programId: 'demo-bsc-cs-2023',
  firstName: 'Noam',
  startTermId: 'F23',
  targetTermId: 'S27',
  exemptions: [
    {
      id: 'ex-english',
      type: 'exemption',
      key: 'english-exemption',
      credits: 0,
      source: 'English placement exam (sample)',
      date: '2023-07-20',
    },
    {
      id: 'tr-psychology',
      type: 'transfer',
      courseId: 'GEN105',
      credits: 2,
      source: 'Prior studies at another institution (sample)',
      date: '2023-09-15',
    },
  ],
  attempts: [
    { courseId: 'MATH000', termId: 'U23', status: 'graded', grade: 88 },

    { courseId: 'CS101', termId: 'F23', status: 'graded', grade: 92 },
    { courseId: 'MATH101', termId: 'F23', status: 'graded', grade: 83 },
    { courseId: 'MATH110', termId: 'F23', status: 'graded', grade: 87 },

    { courseId: 'CS102', termId: 'S24', status: 'graded', grade: 88 },
    { courseId: 'CS201', termId: 'S24', status: 'graded', grade: 85 },
    { courseId: 'MATH102', termId: 'S24', status: 'graded', grade: 48 },
    { courseId: 'GEN110', termId: 'S24', status: 'graded', grade: 91 },

    { courseId: 'MATH102', termId: 'U24', status: 'graded', grade: 78 },

    { courseId: 'CS202', termId: 'F24', status: 'graded', grade: 81 },
    { courseId: 'CS210', termId: 'F24', status: 'graded', grade: 84 },
    { courseId: 'MATH120', termId: 'F24', status: 'graded', grade: 80 },
    { courseId: 'GEN120', termId: 'F24', status: 'graded', grade: 88 },

    { courseId: 'CS220', termId: 'S25', status: 'graded', grade: 93 },
    { courseId: 'CS230', termId: 'S25', status: 'graded', grade: 90 },
    { courseId: 'CS340', termId: 'S25', status: 'graded', grade: 95 },
    { courseId: 'GEN130', termId: 'S25', status: 'graded', grade: 'pass' },

    { courseId: 'CS240', termId: 'F25', status: 'graded', grade: 86 },
    { courseId: 'CS350', termId: 'F25', status: 'graded', grade: 94 },
    { courseId: 'MATH201', termId: 'F25', status: 'graded', grade: 82 },
    { courseId: 'GEN150', termId: 'F25', status: 'graded', grade: 90 },
    { courseId: 'CS370', termId: 'F25', status: 'graded', grade: 52 },

    { courseId: 'CS250', termId: 'S26', status: 'graded', grade: 79 },
    { courseId: 'CS360', termId: 'S26', status: 'graded', grade: 89 },

    { courseId: 'CS310', termId: 'F26', status: 'in-progress' },
    { courseId: 'PRJ401', termId: 'F26', status: 'in-progress' },
    { courseId: 'CS410', termId: 'F26', status: 'in-progress' },
    { courseId: 'CS420', termId: 'F26', status: 'in-progress' },
    { courseId: 'GEN210', termId: 'F26', status: 'in-progress' },
  ],
};

/** The student's own plan for future terms. Numerical Analysis is intentionally missing. */
export const demoPlan: Plan = {
  CS320: 'S27',
  PRJ402: 'S27',
  CS430: 'S27',
  CS440: 'S27',
};
