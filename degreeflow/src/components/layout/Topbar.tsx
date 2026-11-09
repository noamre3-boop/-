import { Bell, Menu as MenuIcon, Moon, Search, Sparkles, Sun } from 'lucide-react';
import { cn } from '../../lib/format';
import { Link, useRoute } from '../../lib/router';
import { useTheme } from '../../lib/theme';
import { useDegree } from '../../state/store';
import { useUI } from '../../state/ui';
import { Kbd } from '../ui/Controls';
import { LogoMark } from './Logo';
import { isActive, navItems } from './nav';

const iconBtn =
  'relative grid h-9 w-9 place-items-center rounded-lg text-muted transition-colors hover:bg-raised hover:text-fg';

export function Topbar() {
  const { path } = useRoute();
  const { resolved, toggle } = useTheme();
  const { unreadAlerts, insights, status } = useDegree();
  const { setPaletteOpen, setInsightsOpen, setNavOpen } = useUI();
  const current = navItems.find((n) => isActive(n.path, path));
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  const attention = insights.filter((i) => i.severity === 'critical' || i.severity === 'warning').length;

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-canvas/75 backdrop-blur-xl">
      <div className="flex h-14 items-center gap-2 px-4 sm:px-6 lg:px-8">
        <button className={cn(iconBtn, 'lg:hidden')} aria-label="Open navigation" onClick={() => setNavOpen(true)}>
          <MenuIcon className="h-[18px] w-[18px]" />
        </button>
        <Link to="/" className="lg:hidden" aria-label="DegreeFlow home">
          <LogoMark className="h-6 w-6" />
        </Link>

        <div className="hidden min-w-0 items-center gap-2 text-sm lg:flex">
          <span className="text-subtle">DegreeFlow</span>
          <span className="text-line-strong">/</span>
          <span className="truncate font-medium text-fg">{current?.label ?? 'Not found'}</span>
        </div>

        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
          <button
            onClick={() => setPaletteOpen(true)}
            className="hidden h-9 w-64 items-center gap-2 rounded-lg border border-line bg-surface/60 px-3 text-sm text-subtle transition hover:border-line-strong hover:text-muted md:flex"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="flex-1 truncate whitespace-nowrap text-left">Search…</span>
            <span className="flex gap-0.5">
              <Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd>
              <Kbd>K</Kbd>
            </span>
          </button>
          <button className={cn(iconBtn, 'md:hidden')} aria-label="Search" onClick={() => setPaletteOpen(true)}>
            <Search className="h-[18px] w-[18px]" />
          </button>

          <button
            onClick={() => setInsightsOpen(true)}
            className="group relative flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm text-muted transition-colors hover:bg-raised hover:text-fg"
            aria-label={`Open DegreeFlow Intelligence${attention ? `, ${attention} items need attention` : ''}`}
          >
            <Sparkles className="h-4 w-4 text-violet" />
            <span className="hidden font-medium sm:inline">Insights</span>
            {status === 'ready' && attention > 0 && (
              <span className="tnum grid h-4 min-w-4 place-items-center rounded-full bg-violet/15 px-1 text-2xs font-semibold text-violet">
                {attention}
              </span>
            )}
          </button>

          <button
            className={iconBtn}
            onClick={toggle}
            aria-label={resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={resolved === 'dark' ? 'Light theme' : 'Dark theme'}
          >
            {resolved === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </button>

          <Link to="/alerts" className={iconBtn} aria-label={`Alerts${unreadAlerts ? `, ${unreadAlerts} unread` : ''}`}>
            <Bell className="h-[18px] w-[18px]" />
            {status === 'ready' && unreadAlerts > 0 && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent ring-2 ring-canvas" />
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
