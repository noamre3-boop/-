import type { CatalogCourse, CatalogDef, CourseSelector, PrereqExpr } from './types';

export interface Catalog {
  readonly id: string;
  readonly institution: string;
  readonly courses: CatalogCourse[];
  has(id: string): boolean;
  get(id: string): CatalogCourse;
  /** The course plus every course declared equivalent to it (symmetric, transitive). */
  equivalenceClass(id: string): Set<string>;
  matches(courseId: string, selector: CourseSelector): boolean;
  /** Courses that list `id` anywhere in their prerequisite expression. */
  dependents(id: string): CatalogCourse[];
}

export function prereqCourses(expr: PrereqExpr | undefined): string[] {
  if (!expr) return [];
  if ('course' in expr) return [expr.course];
  if ('all' in expr) return expr.all.flatMap(prereqCourses);
  if ('any' in expr) return expr.any.flatMap(prereqCourses);
  return [];
}

export function createCatalog(def: CatalogDef): Catalog {
  const byId = new Map(def.courses.map((c) => [c.id, c]));

  // Union-find over declared equivalences.
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    const p = parent.get(x) ?? x;
    if (p === x) return x;
    const root = find(p);
    parent.set(x, root);
    return root;
  };
  for (const c of def.courses) {
    for (const e of c.equivalents ?? []) {
      const a = find(c.id);
      const b = find(e);
      if (a !== b) parent.set(a, b);
    }
  }
  const classes = new Map<string, Set<string>>();
  for (const c of def.courses) {
    const root = find(c.id);
    if (!classes.has(root)) classes.set(root, new Set());
    classes.get(root)!.add(c.id);
  }

  const dependents = new Map<string, CatalogCourse[]>();
  for (const c of def.courses) {
    for (const p of new Set(prereqCourses(c.prerequisites))) {
      if (!dependents.has(p)) dependents.set(p, []);
      dependents.get(p)!.push(c);
    }
  }

  const get = (id: string) => {
    const c = byId.get(id);
    if (!c) throw new Error(`Course "${id}" is not in catalog ${def.id}`);
    return c;
  };

  return {
    id: def.id,
    institution: def.institution,
    courses: def.courses,
    has: (id) => byId.has(id),
    get,
    equivalenceClass: (id) => classes.get(find(id)) ?? new Set([id]),
    matches: (courseId, s) => {
      const c = byId.get(courseId);
      if (!c) return false;
      if (s.exclude?.includes(courseId)) return false;
      const hit =
        (s.courses?.includes(courseId) ?? false) ||
        (s.categories?.includes(c.category) ?? false) ||
        (s.tags?.some((t) => c.tags?.includes(t)) ?? false);
      const anyFilter = !!(s.courses || s.categories || s.tags);
      if (anyFilter && !hit) return false;
      if (s.minLevel !== undefined && (c.level ?? 0) < s.minLevel) return false;
      return anyFilter || s.minLevel !== undefined;
    },
    dependents: (id) => dependents.get(id) ?? [],
  };
}
