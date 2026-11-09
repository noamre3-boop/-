import { ChevronRight, Database } from 'lucide-react';
import { program } from '../../data/program';
import { cn } from '../../lib/format';
import { Link, useRoute } from '../../lib/router';
import { useDegree } from '../../state/store';
import { Logo } from './Logo';
import { isActive, navItems } from './nav';

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { path } = useRoute();
  const { unreadAlerts, issues, projection, firstName, status } = useDegree();
  const planIssues = issues.length;
  const ready = status === 'ready';

  const badgeFor = (p: string) => {
    if (!ready) return null;
    if (p === '/alerts' && unreadAlerts > 0)
      return <span className="tnum ml-auto rounded-md bg-accent/15 px-1.5 text-2xs font-semibold text-accent">{unreadAlerts}</span>;
    if (p === '/plan' && planIssues > 0)
      return <span className="tnum ml-auto rounded-md bg-warning/15 px-1.5 text-2xs font-semibold text-warning">{planIssues}</span>;
    return null;
  };

  const main = navItems.slice(0, 5);
  const secondary = navItems.slice(5);

  const renderItem = (item: (typeof navItems)[number]) => {
    const active = isActive(item.path, path);
    return (
      <li key={item.path}>
        <Link
          to={item.path}
          onClick={onNavigate}
          aria-current={active ? 'page' : undefined}
          className={cn(
            'group relative flex h-9 items-center gap-3 rounded-lg px-3 text-sm transition-colors duration-150',
            active ? 'bg-raised text-fg' : 'text-muted hover:bg-raised/60 hover:text-fg',
          )}
        >
          {active && <span className="absolute -left-3 top-2 h-5 w-0.5 rounded-full bg-accent" aria-hidden />}
          <item.icon className={cn('h-4 w-4 shrink-0', active ? 'text-accent' : 'text-subtle group-hover:text-muted')} />
          <span className="truncate">{item.label}</span>
          {badgeFor(item.path)}
        </Link>
      </li>
    );
  };

  const gradTone =
    projection.status === 'on-track' ? 'bg-success' : projection.status === 'delayed' ? 'bg-warning' : 'bg-danger';
  const gradLabel = projection.status === 'on-track' ? 'On track' : projection.status === 'delayed' ? 'Delayed' : 'At risk';

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Link to="/" onClick={onNavigate} aria-label="DegreeFlow home">
          <Logo />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pt-2" aria-label="Main">
        <p className="eyebrow px-3 pb-2">Workspace</p>
        <ul className="space-y-0.5">{main.map(renderItem)}</ul>
        <p className="eyebrow px-3 pb-2 pt-6">Account</p>
        <ul className="space-y-0.5">{secondary.map(renderItem)}</ul>
      </nav>

      <div className="space-y-3 p-3">
        {ready && (
          <Link
            to="/degree"
            onClick={onNavigate}
            className="group block rounded-xl border border-line bg-surface/60 p-3 transition hover:border-line-strong"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xs text-subtle">Expected graduation</span>
              <ChevronRight className="h-3.5 w-3.5 text-subtle transition group-hover:translate-x-0.5" />
            </div>
            <p className="mt-1 text-sm font-medium text-fg">{projection.label}</p>
            <p className="mt-1 flex items-center gap-1.5 text-2xs text-muted">
              <span className={cn('h-1.5 w-1.5 rounded-full', gradTone)} />
              {gradLabel}
            </p>
          </Link>
        )}
        <div className="flex items-center gap-3 rounded-xl px-2 py-1.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent/80 to-violet/80 text-xs font-semibold text-white">
            {firstName.slice(0, 1).toUpperCase() || 'S'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-fg">{firstName || 'Student'}</p>
            <p className="truncate text-2xs text-subtle">{program.name}</p>
          </div>
          <span title="Showing sample data — not connected to a university system" className="text-subtle">
            <Database className="h-3.5 w-3.5" aria-label="Sample data" />
          </span>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-sidebar/80 backdrop-blur-xl lg:block">
      <SidebarContent />
    </aside>
  );
}
