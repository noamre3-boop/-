import type { CalendarDef, Season, Term, TermDef } from './types';

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export interface Calendar {
  readonly today: string;
  readonly current: Term;
  /** Known terms sorted chronologically. */
  readonly terms: Term[];
  get(id: string): Term;
  /** Negative when a is earlier than b. */
  compare(a: string, b: string): number;
  isBefore(a: string, b: string): boolean;
  status(id: string): 'completed' | 'current' | 'future';
  next(id: string, opts?: { includeSummer?: boolean }): Term;
  /** The next `count` terms after `id`. */
  after(id: string, count: number, opts?: { includeSummer?: boolean }): Term[];
  /** First term at or after `fromId` whose season is in `seasons`. */
  nextOffering(fromId: string, seasons: Season[], opts?: { includeSummer?: boolean; inclusive?: boolean }): Term | null;
}

export function createCalendar(def: CalendarDef): Calendar {
  const prefixToSeason = new Map(Object.entries(def.idPrefix).map(([season, p]) => [p, season as Season]));
  const toTerm = (t: TermDef): Term => ({ ...t, label: `${cap(t.season)} ${t.year}` });
  const known = new Map(def.terms.map((t) => [t.id, toTerm(t)]));

  const idFor = (season: Season, year: number) => `${def.idPrefix[season]}${String(year).slice(-2)}`;

  const generate = (season: Season, year: number): Term => {
    const id = idFor(season, year);
    const existing = known.get(id);
    if (existing) return existing;
    const tpl = def.template[season];
    return toTerm({
      id,
      season,
      year,
      start: `${year}-${tpl.start}`,
      end: `${tpl.endsNextYear ? year + 1 : year}-${tpl.end}`,
    });
  };

  const get = (id: string): Term => {
    const k = known.get(id);
    if (k) return k;
    const m = /^([A-Za-z]+)(\d{2})$/.exec(id);
    const season = m && prefixToSeason.get(m[1]);
    if (!m || !season) throw new Error(`Unknown term id "${id}"`);
    return generate(season, 2000 + Number(m[2]));
  };

  const compare = (a: string, b: string) => {
    const sa = get(a).start;
    const sb = get(b).start;
    return sa < sb ? -1 : sa > sb ? 1 : 0;
  };

  const current = get(def.currentTermId);

  // Season sequence: the academic year opens with yearOrder[0]; calendar years advance when the
  // following season starts earlier in the calendar year (e.g. fall 2026 → spring 2027).
  const next = (id: string, opts: { includeSummer?: boolean } = {}): Term => {
    let t = get(id);
    for (let i = 0; i < 4; i++) {
      const idx = def.yearOrder.indexOf(t.season);
      const season = def.yearOrder[(idx + 1) % def.yearOrder.length];
      const sameYear = generate(season, t.year);
      const candidate = sameYear.start > t.start ? sameYear : generate(season, t.year + 1);
      t = candidate;
      if (opts.includeSummer === false && season === 'summer') continue;
      return t;
    }
    return t;
  };

  return {
    today: def.today,
    current,
    terms: [...known.values()].sort((a, b) => (a.start < b.start ? -1 : 1)),
    get,
    compare,
    isBefore: (a, b) => compare(a, b) < 0,
    status: (id) => {
      const c = compare(id, current.id);
      return c < 0 ? 'completed' : c === 0 ? 'current' : 'future';
    },
    next,
    after: (id, count, opts) => {
      const out: Term[] = [];
      let t = id;
      for (let i = 0; i < count; i++) {
        const n = next(t, opts);
        out.push(n);
        t = n.id;
      }
      return out;
    },
    nextOffering: (fromId, seasons, opts = {}) => {
      if (!seasons.length) return null;
      let t = opts.inclusive ? get(fromId) : next(fromId, opts);
      for (let i = 0; i < 12; i++) {
        if (seasons.includes(t.season) && (opts.includeSummer !== false || t.season !== 'summer')) return t;
        t = next(t.id, opts);
      }
      return null;
    },
  };
}
