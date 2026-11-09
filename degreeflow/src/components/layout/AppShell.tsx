import { Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { useRoute } from '../../lib/router';
import { useDegree } from '../../state/store';
import { useUI } from '../../state/ui';
import { CourseDrawer } from '../course/CourseDrawer';
import { InsightsPanel } from '../insights/InsightsPanel';
import { Drawer, DrawerClose } from '../ui/Overlay';
import { ErrorState, PageSkeleton } from '../ui/States';
import { CommandPalette } from './CommandPalette';
import { Sidebar, SidebarContent } from './Sidebar';
import { Topbar } from './Topbar';

export function AppShell({ children }: { children: ReactNode }) {
  const { status, reload } = useDegree();
  const { navOpen, setNavOpen, insightsOpen, setInsightsOpen } = useUI();
  const { path } = useRoute();

  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-surface px-3 py-2 text-sm focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>
      <Sidebar />
      <div className="lg:pl-64">
        <Topbar />
        <main id="main" className="mx-auto w-full max-w-[1240px] px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pt-8">
          {status === 'loading' && <PageSkeleton />}
          {status === 'error' && <ErrorState onRetry={reload} />}
          {status === 'ready' && (
            <div key={path} className="animate-fade-up">
              {children}
            </div>
          )}
        </main>
      </div>

      <Drawer open={navOpen} onClose={() => setNavOpen(false)} title="Navigation" side="left" width="max-w-[17rem]">
        <SidebarContent onNavigate={() => setNavOpen(false)} />
      </Drawer>

      <Drawer open={insightsOpen} onClose={() => setInsightsOpen(false)} title="DegreeFlow Intelligence" width="max-w-md">
        <div className="flex items-start justify-between gap-3 border-b border-line px-6 py-5">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-fg">
              <Sparkles className="h-4 w-4 text-violet" />
              DegreeFlow Intelligence
            </h2>
            <p className="mt-1 text-xs text-muted">Requirements to resolve and suggestions to plan better.</p>
          </div>
          <DrawerClose onClose={() => setInsightsOpen(false)} />
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {status === 'ready' ? <InsightsPanel onAfterAction={() => setInsightsOpen(false)} /> : null}
        </div>
      </Drawer>

      <CourseDrawer />
      <CommandPalette />
    </div>
  );
}
