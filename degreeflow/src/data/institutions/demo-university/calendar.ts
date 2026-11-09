import type { CalendarDef } from '../../../engine';

/**
 * SAMPLE DATA — academic calendar of a fictional institution ("Demo University").
 * Semester A (fall) runs Oct–Feb, semester B (spring) Mar–Jun, and a short summer term Jul–Sep.
 */
export const demoCalendar: CalendarDef = {
  today: '2026-11-09',
  currentTermId: 'F26',
  yearOrder: ['fall', 'spring', 'summer'],
  idPrefix: { fall: 'F', spring: 'S', summer: 'U' },
  template: {
    fall: { start: '10-18', end: '02-05', endsNextYear: true },
    spring: { start: '03-07', end: '06-25' },
    summer: { start: '07-04', end: '09-10' },
  },
  terms: [
    { id: 'U23', season: 'summer', year: 2023, start: '2023-07-02', end: '2023-09-08' },
    { id: 'F23', season: 'fall', year: 2023, start: '2023-10-22', end: '2024-02-09' },
    { id: 'S24', season: 'spring', year: 2024, start: '2024-03-10', end: '2024-06-28' },
    { id: 'U24', season: 'summer', year: 2024, start: '2024-07-07', end: '2024-09-13' },
    { id: 'F24', season: 'fall', year: 2024, start: '2024-10-20', end: '2025-02-07' },
    { id: 'S25', season: 'spring', year: 2025, start: '2025-03-09', end: '2025-06-27' },
    { id: 'U25', season: 'summer', year: 2025, start: '2025-07-06', end: '2025-09-12' },
    { id: 'F25', season: 'fall', year: 2025, start: '2025-10-19', end: '2026-02-06' },
    { id: 'S26', season: 'spring', year: 2026, start: '2026-03-08', end: '2026-06-26' },
    { id: 'U26', season: 'summer', year: 2026, start: '2026-07-05', end: '2026-09-11' },
    { id: 'F26', season: 'fall', year: 2026, start: '2026-10-18', end: '2027-02-05' },
    { id: 'S27', season: 'spring', year: 2027, start: '2027-03-07', end: '2027-06-25' },
    { id: 'U27', season: 'summer', year: 2027, start: '2027-07-04', end: '2027-09-10' },
    { id: 'F27', season: 'fall', year: 2027, start: '2027-10-17', end: '2028-02-04' },
  ],
};
