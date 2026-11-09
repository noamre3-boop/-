import { describe, expect, it } from 'vitest';
import { engine } from '../../data/demo';
import { demoPlan } from '../../data/students/demo-student';

/** Integration checks on the sample student shown in the app. */

const prefs = { maxCredits: 20, heavyWorkloadHours: 45, includeSummer: true };

describe('demo student record', () => {
  const a = engine.audit(demoPlan);

  it('counts 84 completed credits out of 120 without double counting', () => {
    expect(a.totals).toMatchObject({ required: 120, completed: 84, inProgress: 18, planned: 14, remaining: 36, unplanned: 4 });
  });

  it('resolves the history correctly', () => {
    const h = engine.history;
    expect(h.get('MATH102')).toMatchObject({ status: 'passed', grade: 78, credits: 4 }); // failed 48, retaken
    expect(h.get('MATH102')!.attempts).toHaveLength(2);
    expect(h.get('CS370')).toMatchObject({ status: 'failed', grade: 52, credits: 0, inAverage: true });
    expect(h.get('GEN130')).toMatchObject({ status: 'passed', grade: 'pass', inAverage: false });
    expect(h.get('GEN105')).toMatchObject({ status: 'transfer', credits: 2, inAverage: false });
    expect(h.get('CS310')!.status).toBe('in-progress');
    expect(a.notCounted.map((n) => n.courseId)).toContain('MATH000');
    expect(h.average!).toBeCloseTo(84.99, 1);
  });

  it('finds the missing mathematics requirement and the Tuesday conflict', () => {
    expect(a.missingCourses.map((m) => m.courseId)).toEqual(['MATH301']);
    const issues = engine.validate(demoPlan);
    expect(issues.filter((i) => i.severity === 'critical').map((i) => i.kind)).toEqual(['missing-course']);
    expect(issues.find((i) => i.kind === 'conflict')?.courseIds.sort()).toEqual(['CS320', 'CS440']);
  });

  it('meets the English and average conditions but is not yet eligible', () => {
    const status = Object.fromEntries(a.conditions.map((c) => [c.def.id, c.status]));
    expect(status).toEqual({ total: 'missing', groups: 'missing', average: 'met', english: 'met' });
    expect(a.eligible).toBe(false);
    expect(engine.audit({ ...demoPlan, MATH301: 'S27' }).projectedEligible).toBe(true);
  });

  it('recommends Numerical Analysis for Spring 2027 and avoids the conflicting elective', () => {
    const rec = engine.recommend(demoPlan, prefs, 'S27');
    const ids = rec.picks.map((p) => p.courseId);
    expect(ids).toEqual(expect.arrayContaining(['CS320', 'MATH301', 'PRJ402']));
    expect(ids).not.toContain('CS440');
    expect(rec.credits).toBeLessThanOrEqual(20);
    for (const p of rec.picks) expect(p.reasons.length).toBeGreaterThan(0);
  });

  it('forecasts graduation in Spring 2027 and the main delay risks', () => {
    const report = engine.risks(demoPlan, prefs);
    expect(report.baseline.term?.id).toBe('S27');
    const byId = Object.fromEntries(report.risks.map((r) => [r.id, r]));
    expect(byId['fail-CS310'].newTerm?.id).toBe('F27'); // Operating Systems runs fall only
    expect(byId['fail-PRJ401'].newTerm?.id).toBe('U27'); // Part A retaken in spring, Part B in summer
    expect(byId['seat-CS320'].kind).toBe('missed-seat');
    expect(byId['seat-CS320'].newTerm?.id).toBe('S28');
  });
});
