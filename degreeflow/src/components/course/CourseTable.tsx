import { ChevronRight } from 'lucide-react';
import { grades } from '../../data/courses';
import { semesterById } from '../../data/program';
import { type Placements, courseStatus } from '../../lib/degree';
import { cn } from '../../lib/format';
import { useUI } from '../../state/ui';
import type { Course } from '../../types';
import { CategoryTag, StatusBadge } from './meta';

export function CourseTable({
  courses,
  placements,
  showCategory = true,
  className,
}: {
  courses: Course[];
  placements: Placements;
  showCategory?: boolean;
  className?: string;
}) {
  const { openCourse } = useUI();
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full text-left text-sm">
        <thead className="hidden border-b border-line text-2xs uppercase tracking-wider text-subtle md:table-header-group">
          <tr>
            <th className="py-2.5 pl-5 pr-3 font-medium">Course</th>
            {showCategory && <th className="hidden px-3 py-2.5 font-medium xl:table-cell">Requirement</th>}
            <th className="px-3 py-2.5 text-right font-medium">Credits</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5 font-medium">Term</th>
            <th className="py-2.5 pl-3 pr-5 text-right font-medium">Grade</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {courses.map((c) => {
            const status = courseStatus(c.id, placements);
            const sem = semesterById[placements[c.id]];
            return (
              <tr
                key={c.id}
                tabIndex={0}
                onClick={() => openCourse(c.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openCourse(c.id);
                  }
                }}
                className="group cursor-pointer transition-colors hover:bg-raised/50 focus-visible:bg-raised/50 focus-visible:outline-none"
              >
                {/* Mobile: one stacked cell */}
                <td className="px-4 py-3 md:hidden" colSpan={6}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-fg">{c.name}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-2xs text-subtle">
                        <span className="font-mono">{c.code}</span>
                        <span>·</span>
                        <span>{c.credits} cr</span>
                        {sem && (
                          <>
                            <span>·</span>
                            <span>{sem.label}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {status === 'completed' && <span className="tnum text-sm font-medium text-fg">{grades[c.id]}</span>}
                      <StatusBadge status={status} mandatory={c.mandatory} />
                    </div>
                  </div>
                </td>

                <td className="hidden py-3 pl-5 pr-3 md:table-cell">
                  <div className="flex items-center gap-3">
                    <span className="w-16 shrink-0 font-mono text-2xs text-subtle">{c.code}</span>
                    <span className="text-fg">{c.name}</span>
                  </div>
                </td>
                {showCategory && (
                  <td className="hidden whitespace-nowrap px-3 py-3 xl:table-cell">
                    <CategoryTag category={c.category} />
                  </td>
                )}
                <td className="tnum hidden px-3 py-3 text-right text-muted md:table-cell">{c.credits}</td>
                <td className="hidden px-3 py-3 md:table-cell">
                  <StatusBadge status={status} mandatory={c.mandatory} />
                </td>
                <td className="hidden whitespace-nowrap px-3 py-3 text-xs text-muted md:table-cell">{sem?.label ?? '—'}</td>
                <td className="hidden py-3 pl-3 pr-5 text-right md:table-cell">
                  <span className="inline-flex items-center gap-2">
                    <span className="tnum text-fg">{status === 'completed' ? grades[c.id] : <span className="text-subtle">—</span>}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-subtle opacity-0 transition group-hover:opacity-100" />
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
