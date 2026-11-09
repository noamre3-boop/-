import { describe, expect, it } from 'vitest';
import { build, completeAttempts, englishExemption, graded, inProgress, prefs, program, without } from './fixtures';

const condition = (e: ReturnType<typeof build>, id: string, plan = {}) => e.audit(plan).conditions.find((c) => c.def.id === id)!;

describe('student who completed every requirement', () => {
  const e = build(completeAttempts);
  const a = e.audit({});

  it('is eligible to graduate', () => {
    expect(a.eligible).toBe(true);
    expect(a.conditions.every((c) => c.status === 'met')).toBe(true);
  });

  it('has the exact credit totals', () => {
    expect(a.totals.completed).toBe(33);
    expect(a.totals.remaining).toBe(0);
    expect(a.totals.unplanned).toBe(0);
  });

  it('has no missing mandatory courses and no plan issues', () => {
    expect(a.missingCourses).toEqual([]);
    expect(e.validate({})).toEqual([]);
  });

  it('satisfies the elective rule individually, not just by credits', () => {
    const electives = a.groups.find((g) => g.group.id === 'elective')!;
    expect(electives.satisfied).toBe(true);
    expect(electives.rules[0]).toMatchObject({ status: 'met', have: 1, need: 1 });
  });

  it('forecast reports that the student is already eligible', () => {
    expect(e.forecast({}, prefs).status).toBe('eligible');
  });
});

describe('student missing a mandatory course', () => {
  const e = build(without(['A201']));
  const a = e.audit({});

  it('lists the missing course and is not eligible', () => {
    expect(a.eligible).toBe(false);
    expect(a.missingCourses.map((m) => m.courseId)).toEqual(['A201']);
    expect(condition(e, 'groups').status).toBe('missing');
  });

  it('reports a missing-course issue', () => {
    const issue = e.validate({}).find((i) => i.kind === 'missing-course');
    expect(issue?.courseIds).toEqual(['A201']);
    expect(issue?.severity).toBe('critical');
  });

  it('is covered once the course is planned', () => {
    const planned = e.audit({ A201: 'F26' });
    expect(planned.missingCourses).toEqual([]);
    expect(planned.projectedEligible).toBe(true);
    expect(planned.groups.find((g) => g.group.id === 'core')!.rules[2].status).toBe('planned');
  });

  it('recommends it for the next fall with a reason', () => {
    const rec = e.recommend({}, prefs, 'F26');
    const pick = rec.picks.find((p) => p.courseId === 'A201');
    expect(pick).toBeDefined();
    expect(pick!.reasons.some((r) => r.startsWith('Mandatory'))).toBe(true);
  });
});

describe('student missing credits', () => {
  // Electives: only 6 of 9 credits (E301 + E401).
  const e = build(without(['E302']));
  const a = e.audit({});

  it('flags the elective group as short by exactly 3 credits', () => {
    const g = a.groups.find((x) => x.group.id === 'elective')!;
    expect(g.completed).toBe(6);
    expect(g.unplanned).toBe(3);
    expect(g.satisfied).toBe(false);
    expect(a.totals.completed).toBe(30);
    expect(a.totals.remaining).toBe(3);
  });

  it('reports missing credits, not a missing course', () => {
    const kinds = e.validate({}).map((i) => i.kind);
    expect(kinds).toContain('missing-credits');
    expect(kinds).not.toContain('missing-course');
  });

  it('recommends exactly one elective to close the gap, with reasons', () => {
    const rec = e.recommend({}, prefs, 'S26');
    const electives = rec.picks.filter((p) => p.kind === 'elective');
    expect(electives).toHaveLength(1);
    expect(electives[0].reasons.join(' ')).toMatch(/credits still needed/);
  });
});

describe('student who failed a course', () => {
  it('earns no credit for the failed course and must retake it', () => {
    const e = build([...without(['A102', 'A201']), graded('A102', 'S24', 40)]);
    const rec = e.history.get('A102')!;
    expect(rec.status).toBe('failed');
    expect(rec.credits).toBe(0);
    const missing = e.audit({}).missingCourses.find((m) => m.courseId === 'A102');
    expect(missing?.failedBefore).toBe(true);
    expect(e.validate({}).find((i) => i.courseIds[0] === 'A102')?.title).toMatch(/must be retaken/);
  });

  it('keeps the failing grade in the average until the course is passed (program policy)', () => {
    const e = build([...without(['A102']), graded('A102', 'S24', 40)]);
    expect(e.history.get('A102')!.inAverage).toBe(true);
    const off = build([...without(['A102']), graded('A102', 'S24', 40)], [englishExemption], { failedGradesInAverage: false });
    expect(off.history.get('A102')!.inAverage).toBe(false);
  });

  it('counts a retake once, using the latest grade', () => {
    const e = build([...without(['A102']), graded('A102', 'S24', 40), graded('A102', 'S25', 80)]);
    const rec = e.history.get('A102')!;
    expect(rec.status).toBe('passed');
    expect(rec.grade).toBe(80);
    expect(rec.attempts).toHaveLength(2);
    expect(e.audit({}).totals.completed).toBe(33);
  });

  it('applies the "highest grade" policy when the program uses it', () => {
    const attempts = [...without(['A102']), graded('A102', 'S24', 85), graded('A102', 'S25', 50)];
    expect(build(attempts).history.get('A102')!.status).toBe('failed'); // latest counts
    const highest = build(attempts, [englishExemption], { retakePolicy: 'highest' });
    expect(highest.history.get('A102')).toMatchObject({ status: 'passed', grade: 85, credits: 4 });
  });

  it('treats a course being retaken now as in progress, with the old fail still in the average', () => {
    const e = build([...without(['A102', 'A201']), graded('A102', 'S24', 40), inProgress('A102')]);
    const rec = e.history.get('A102')!;
    expect(rec.status).toBe('in-progress');
    expect(rec.retaking).toBe(true);
    expect(rec.inAverage).toBe(true);
  });

  it('ignores withdrawn attempts', () => {
    const e = build([...without(['A102', 'A201']), { courseId: 'A102', termId: 'S24', status: 'withdrawn' }]);
    expect(e.history.get('A102')!.status).toBe('withdrawn');
    expect(e.history.get('A102')!.credits).toBe(0);
  });
});

describe('student with an exemption', () => {
  it('satisfies a mandatory course without credit or a grade', () => {
    const e = build(without(['A101']), [englishExemption, { id: 'x', type: 'exemption', courseId: 'A101', credits: 0, source: 'Prior exam', date: '2023-09-01' }]);
    const a = e.audit({});
    expect(e.history.get('A101')!.status).toBe('exempt');
    expect(a.missingCourses).toEqual([]);
    const core = a.groups.find((g) => g.group.id === 'core')!;
    expect(core.rules[0].status).toBe('met');
    expect(core.completed).toBe(8); // the exemption carries no credits
    expect(core.satisfied).toBe(false);
  });

  it('grants recognized credit that stays out of the average', () => {
    const e = build(without(['G100']), [englishExemption, { id: 't', type: 'transfer', courseId: 'G200', credits: 2, source: 'Other college', date: '2023-09-01' }]);
    expect(e.history.get('G200')).toMatchObject({ status: 'transfer', credits: 2, inAverage: false });
    expect(e.audit({}).eligible).toBe(true);
  });

  it('satisfies a non-course condition such as English', () => {
    expect(condition(build(completeAttempts), 'english').status).toBe('met');
    const noEnglish = build(completeAttempts, []);
    expect(condition(noEnglish, 'english').status).toBe('missing');
    expect(noEnglish.audit({}).eligible).toBe(false);
  });

  it('lets an exempt course satisfy prerequisites', () => {
    const e = build(without(['A101', 'A102', 'A201']), [englishExemption, { id: 'x', type: 'exemption', courseId: 'A101', credits: 0, source: 'Exam', date: '2023-09-01' }]);
    expect(e.prerequisites('A102', 'S26', {}).state).toBe('met');
  });
});

describe('student with overlapping courses', () => {
  // No electives yet: needs 9 elective credits including one 400-level course.
  const e = build(without(['E301', 'E302', 'E401']));
  const plan = { E302: 'S26', E402: 'S26' };

  it('reports the time conflict with the exact overlap', () => {
    const conflict = e.validate(plan).find((i) => i.kind === 'conflict');
    expect(conflict).toBeDefined();
    expect(conflict!.courseIds.sort()).toEqual(['E302', 'E402']);
    expect(conflict!.detail).toContain('Tue 11:00–12:00');
  });

  it('never recommends two conflicting courses together, and explains the skip', () => {
    const rec = e.recommend({}, prefs, 'S26');
    const ids = rec.picks.map((p) => p.courseId);
    expect(ids.includes('E302') && ids.includes('E402')).toBe(false);
    expect(rec.alternatives.find((x) => x.courseId === 'E302')?.notPicked).toMatch(/^Time conflict with E402/);
    expect(rec.credits).toBe(9);
  });
});

describe('student blocked by a prerequisite', () => {
  // A102 passed with 65, but A201 requires at least 70.
  const e = build([...without(['A102', 'A201']), graded('A102', 'S24', 65)]);

  it('explains the unmet minimum grade', () => {
    const check = e.prerequisites('A201', 'F26', {});
    expect(check.state).toBe('unmet');
    expect(check.missing[0]).toContain('grade 65, needs 70');
  });

  it('flags a planned course whose prerequisite is not met', () => {
    const issue = e.validate({ A201: 'F26' }).find((i) => i.kind === 'prerequisite');
    expect(issue?.courseIds).toEqual(['A201']);
  });

  it('does not recommend the blocked course and says why', () => {
    const rec = e.recommend({}, prefs, 'F26');
    expect(rec.picks.map((p) => p.courseId)).not.toContain('A201');
    expect(rec.blocked.find((b) => b.courseId === 'A201')?.reason).toContain('needs 70');
  });

  it('treats a prerequisite planned for an earlier term as conditional', () => {
    const e2 = build(without(['A102', 'A201']));
    expect(e2.prerequisites('A201', 'F26', { A102: 'S26' }).state).toBe('expected');
    expect(e2.prerequisites('A201', 'S26', { A102: 'S26' }).state).toBe('unmet'); // same term doesn't count
  });

  it('checks credit-threshold prerequisites', () => {
    const early = build([graded('A101', 'F23', 90)]);
    expect(early.prerequisites('P401', 'F25', {}).state).toBe('unmet');
  });
});

describe('no double counting', () => {
  it('grants credit for only one of two equivalent courses', () => {
    const e = build([...completeAttempts, graded('M102X', 'F24', 90)]);
    expect(e.history.get('M102X')).toMatchObject({ status: 'duplicate', credits: 0, duplicateOf: 'M102' });
    expect(e.audit({}).totals.completed).toBe(33);
  });

  it('warns when a planned course duplicates one already passed', () => {
    const e = build(without(['E302']));
    expect(e.validate({ M102X: 'S26' }).map((i) => i.kind)).toContain('duplicate');
  });

  it('accepts an alternative course for a mandatory rule', () => {
    const e = build([...without(['M102']), graded('M102X', 'S24', 70)]);
    const rule = e.audit({}).groups.find((g) => g.group.id === 'math')!.rules[1];
    expect(rule.status).toBe('met');
    expect(rule.satisfiedBy).toEqual(['M102X']);
  });

  it('does not count credits above a group cap toward the total', () => {
    const e = build([...completeAttempts, graded('G200', 'S25', 90)]);
    const a = e.audit({});
    expect(a.groups.find((g) => g.group.id === 'general')!.completed).toBe(2);
    expect(a.totals.completed).toBe(33);
    expect(a.notCounted.map((n) => n.courseId)).toContain('G200');
  });

  it('counts a course outside the program toward nothing', () => {
    const e = build([...completeAttempts, graded('X000', 'F23', 99)]);
    expect(e.audit({}).totals.completed).toBe(33);
    expect(e.audit({}).notCounted.find((n) => n.courseId === 'X000')?.reason).toMatch(/Not part of this program/);
    expect(e.history.get('X000')).toMatchObject({ credits: 0, inAverage: false, outsideProgram: true });
  });

  it('keeps pass/fail grades out of the average', () => {
    const e = build(completeAttempts);
    expect(e.history.get('G100')).toMatchObject({ status: 'passed', credits: 2, inAverage: false });
    expect(e.history.averageCredits).toBe(31);
  });
});

describe('average condition', () => {
  it('fails the average condition below the minimum', () => {
    const low = completeAttempts.map((a) => (typeof a.grade === 'number' ? { ...a, grade: 60 } : a));
    const e = build(low);
    expect(condition(e, 'avg').status).toBe('failing');
    expect(e.audit({}).eligible).toBe(false);
  });
});

describe('graduation forecast', () => {
  it('schedules a prerequisite chain across the terms each course is offered', () => {
    // Missing A102 (spring) → A201 (fall, needs A102 ≥ 70).
    const e = build(without(['A102', 'A201']));
    const f = e.forecast({}, prefs);
    expect(f.status).toBe('projected');
    expect(f.schedule.map((t) => [t.term.id, t.courseIds.filter((c) => c.startsWith('A'))])).toEqual([
      ['S26', ['A102']],
      ['F26', ['A201']],
    ]);
    expect(f.term?.id).toBe('F26');
  });

  it('identifies what could delay graduation', () => {
    const e = build([...without(['A201', 'P401']), inProgress('P401')]);
    const report = e.risks({}, prefs);
    expect(report.baseline.term?.id).toBe('F26');
    const projectRisk = report.risks.find((r) => r.id === 'fail-P401');
    expect(projectRisk).toBeUndefined(); // P401 can be retaken in spring without moving graduation past F26
    const seat = report.risks.find((r) => r.courseIds.includes('A201'));
    expect(seat?.delayTerms).toBeGreaterThan(0); // A201 runs fall only
  });

  it('respects the per-term credit cap', () => {
    const e = build([graded('A101', 'F23', 90)]);
    const f = e.forecast({}, { ...prefs, maxCredits: 6 });
    expect(f.schedule.every((t) => t.credits <= 6)).toBe(true);
  });

  it('reports infeasible requirements with blockers instead of guessing', () => {
    // Z999 is mandatory but never offered.
    const groups = program.groups.map((g) =>
      g.id === 'core' ? { ...g, rules: [...g.rules, { type: 'course' as const, id: 'core-Z999', course: 'Z999' }] } : g,
    );
    const e = build(completeAttempts, [englishExemption], { groups });
    const f = e.forecast({}, prefs);
    expect(f.status).toBe('infeasible');
    expect(f.term).toBeNull();
    expect(f.blockers.join(' ')).toContain('Z999');
  });
});

describe('calendar', () => {
  const e = build(completeAttempts);
  it('walks terms in academic order and generates future terms', () => {
    expect(e.calendar.after('F25', 4).map((t) => t.id)).toEqual(['S26', 'U26', 'F26', 'S27']);
    expect(e.calendar.after('F25', 3, { includeSummer: false }).map((t) => t.id)).toEqual(['S26', 'F26', 'S27']);
    expect(e.calendar.nextOffering('F25', ['fall'])?.id).toBe('F26');
    expect(e.calendar.status('S25')).toBe('completed');
    expect(e.calendar.status('F25')).toBe('current');
  });
});
