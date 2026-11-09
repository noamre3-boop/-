import { ArrowRight, CornerDownLeft, FileText, Search } from 'lucide-react';
import { type KeyboardEvent as ReactKeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { courses } from '../../data/courses';
import { courseStatus } from '../../lib/degree';
import { cn } from '../../lib/format';
import { navigate } from '../../lib/router';
import { useDegree } from '../../state/store';
import { useUI } from '../../state/ui';
import { StatusDot } from '../course/meta';
import { Kbd } from '../ui/Controls';
import { Modal } from '../ui/Overlay';
import { navItems } from './nav';

type Result =
  | { kind: 'page'; id: string; label: string; sub: string; run: () => void }
  | { kind: 'course'; id: string; label: string; sub: string; run: () => void };

export function CommandPalette() {
  const { paletteOpen, setPaletteOpen, openCourse } = useUI();
  const { placements } = useDegree();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setPaletteOpen]);

  useEffect(() => {
    if (paletteOpen) {
      setQ('');
      setActive(0);
    }
  }, [paletteOpen]);

  const results = useMemo<Result[]>(() => {
    const term = q.trim().toLowerCase();
    const close = () => setPaletteOpen(false);
    const pages: Result[] = navItems
      .filter((n) => !term || n.label.toLowerCase().includes(term) || n.description.toLowerCase().includes(term))
      .map((n) => ({
        kind: 'page',
        id: n.path,
        label: n.label,
        sub: n.description,
        run: () => {
          close();
          navigate(n.path);
        },
      }));
    const matched: Result[] = courses
      .filter(
        (c) =>
          !term ||
          c.name.toLowerCase().includes(term) ||
          c.code.toLowerCase().replace(' ', '').includes(term.replace(' ', '')) ||
          c.topics.some((t) => t.toLowerCase().includes(term)),
      )
      .slice(0, term ? 8 : 5)
      .map((c) => ({
        kind: 'course',
        id: c.id,
        label: c.name,
        sub: `${c.code} · ${c.credits} credits`,
        run: () => {
          close();
          openCourse(c.id);
        },
      }));
    return term ? [...matched, ...pages] : [...pages, ...matched];
  }, [q, openCourse, setPaletteOpen]);

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      results[active]?.run();
    }
  };

  const groups: { title: string; kind: Result['kind'] }[] = q.trim()
    ? [
        { title: 'Courses', kind: 'course' },
        { title: 'Pages', kind: 'page' },
      ]
    : [
        { title: 'Pages', kind: 'page' },
        { title: 'Courses', kind: 'course' },
      ];

  return (
    <Modal open={paletteOpen} onClose={() => setPaletteOpen(false)} title="Search" className="max-w-xl overflow-hidden">
      <div className="flex items-center gap-3 border-b border-line px-4">
        <Search className="h-4 w-4 shrink-0 text-subtle" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search courses, codes, topics or pages…"
          aria-label="Search courses or pages"
          className="h-14 w-full bg-transparent text-sm text-fg placeholder:text-subtle focus:outline-none"
        />
        <Kbd>Esc</Kbd>
      </div>
      <div ref={list} className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
        {results.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-fg">No results for “{q}”</p>
            <p className="mt-1 text-xs text-muted">Try a course code like “CS 320” or a topic like “graphs”.</p>
          </div>
        ) : (
          groups.map((g) => {
            const items = results.map((r, index) => ({ r, index })).filter(({ r }) => r.kind === g.kind);
            if (!items.length) return null;
            return (
              <div key={g.title} className="mb-1">
                <p className="px-2.5 pb-1 pt-2 text-2xs font-medium uppercase tracking-wider text-subtle">{g.title}</p>
                {items.map(({ r, index }) => (
                  <button
                    key={r.kind + r.id}
                    data-index={index}
                    onMouseMove={() => setActive(index)}
                    onClick={r.run}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors',
                      active === index ? 'bg-raised' : '',
                    )}
                  >
                    {r.kind === 'page' ? (
                      <FileText className="h-4 w-4 shrink-0 text-subtle" />
                    ) : (
                      <span className="grid h-4 w-4 shrink-0 place-items-center">
                        <StatusDot status={courseStatus(r.id, placements)} />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-fg">{r.label}</span>
                      <span className="block truncate text-2xs text-subtle">{r.sub}</span>
                    </span>
                    {active === index ? (
                      <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-subtle" />
                    ) : (
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-transparent" />
                    )}
                  </button>
                ))}
              </div>
            );
          })
        )}
      </div>
    </Modal>
  );
}
