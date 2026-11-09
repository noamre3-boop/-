import { AlertOctagon, type LucideIcon, RotateCcw } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/format';
import { Button } from './Button';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden />;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      <div className="relative mb-4">
        <div className="absolute inset-0 rounded-2xl bg-accent/10 blur-xl" aria-hidden />
        <div className="relative grid h-11 w-11 place-items-center rounded-xl border border-line bg-raised text-muted">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </div>
      <p className="text-sm font-medium text-fg">{title}</p>
      {description && <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="card mx-auto mt-10 max-w-md animate-fade-up">
      <div className="flex flex-col items-center px-8 py-12 text-center">
        <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl border border-danger/25 bg-danger/10 text-danger">
          <AlertOctagon className="h-5 w-5" aria-hidden />
        </div>
        <h2 className="text-base font-semibold text-fg">We couldn’t load your academic record</h2>
        <p className="mt-1.5 text-sm text-muted">
          The connection timed out. Your plan is saved locally — nothing was lost.
        </p>
        <Button className="mt-6" variant="primary" icon={RotateCcw} onClick={onRetry}>
          Try again
        </Button>
      </div>
    </div>
  );
}

/** Generic page skeleton shown while data loads. */
export function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="card p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <Skeleton className="h-36 w-36 rounded-full" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-full" />
            <div className="grid grid-cols-3 gap-4 pt-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card space-y-4 p-5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ))}
      </div>
    </div>
  );
}
