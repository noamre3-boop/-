import type { Calendar } from './calendar';
import type { Catalog } from './catalog';
import type { History } from './history';
import type { Plan, PlanningPrefs, ProgramDef, StudentRecord } from './types';

/** Everything the engine modules share for one student in one program. */
export interface Core {
  calendar: Calendar;
  catalog: Catalog;
  program: ProgramDef;
  student: StudentRecord;
  history: History;
}

/** Credit cap for a term: the program's limit for that season, lowered by the student's preference. */
export function creditCap(core: Core, termId: string, prefs?: PlanningPrefs) {
  const season = core.calendar.get(termId).season;
  const programCap = core.program.maxCreditsPerTerm[season];
  return prefs ? Math.min(programCap, prefs.maxCredits) : programCap;
}

/** Plan entries for terms strictly before `termId`. */
export function planBefore(core: Core, plan: Plan, termId: string): Plan {
  return Object.fromEntries(Object.entries(plan).filter(([, t]) => core.calendar.isBefore(t, termId)));
}

export function offeredText(seasons: string[]) {
  if (seasons.length >= 3) return 'every term';
  return seasons.length === 1 ? `${seasons[0]} only` : seasons.join(' & ');
}
