import type { Catalog } from './catalog';

export interface Conflict {
  a: string;
  b: string;
  day: string;
  start: string;
  end: string;
}

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const fromMin = (n: number) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;

/** Every overlapping pair of weekly meetings among the given courses. Touching slots (12:00–12:00) don't overlap. */
export function findConflicts(courseIds: string[], catalog: Catalog): Conflict[] {
  const out: Conflict[] = [];
  for (let i = 0; i < courseIds.length; i++) {
    for (let j = i + 1; j < courseIds.length; j++) {
      const a = catalog.get(courseIds[i]);
      const b = catalog.get(courseIds[j]);
      for (const sa of a.schedule) {
        for (const sb of b.schedule) {
          if (sa.day !== sb.day) continue;
          const start = Math.max(toMin(sa.start), toMin(sb.start));
          const end = Math.min(toMin(sa.end), toMin(sb.end));
          if (start < end) out.push({ a: a.id, b: b.id, day: sa.day, start: fromMin(start), end: fromMin(end) });
        }
      }
    }
  }
  return out;
}

export const conflictsWith = (courseId: string, others: string[], catalog: Catalog) =>
  findConflicts([courseId, ...others.filter((o) => o !== courseId)], catalog).filter((c) => c.a === courseId || c.b === courseId);
