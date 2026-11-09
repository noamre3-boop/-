import { createEngine } from '../engine';
import { bscComputerScience } from './institutions/demo-university/bsc-computer-science';
import { demoCalendar } from './institutions/demo-university/calendar';
import { demoCatalog } from './institutions/demo-university/catalog';
import { demoPlan, demoStudent } from './students/demo-student';

/**
 * SAMPLE DATA binding. The app runs one engine instance for one fictional student.
 * To support another institution or program, supply its calendar, catalog and program
 * definitions plus a student record — the engine itself doesn't change.
 */
export const engine = createEngine({
  calendar: demoCalendar,
  catalog: demoCatalog,
  program: bscComputerScience,
  student: demoStudent,
});

export const demoInitialPlan = demoPlan;
export const DEMO_TODAY = demoCalendar.today;
