import { type ComponentType, useEffect } from 'react';
import { AppShell } from './components/layout/AppShell';
import { navItems } from './components/layout/nav';
import { useRoute } from './lib/router';
import { ThemeProvider } from './lib/theme';
import { AcademicPlan } from './pages/AcademicPlan';
import { Alerts } from './pages/Alerts';
import { Analytics } from './pages/Analytics';
import { MyDegree } from './pages/MyDegree';
import { NotFound } from './pages/NotFound';
import { Overview } from './pages/Overview';
import { Requirements } from './pages/Requirements';
import { Settings } from './pages/Settings';
import { DegreeProvider } from './state/store';
import { ToastProvider } from './state/toast';
import { UIProvider } from './state/ui';

const routes: Record<string, ComponentType> = {
  '/': Overview,
  '/degree': MyDegree,
  '/plan': AcademicPlan,
  '/requirements': Requirements,
  '/analytics': Analytics,
  '/alerts': Alerts,
  '/settings': Settings,
};

function Router() {
  const { path } = useRoute();
  const Page = routes[path] ?? NotFound;

  useEffect(() => {
    const item = navItems.find((n) => n.path === path);
    document.title = item && path !== '/' ? `${item.label} · DegreeFlow` : 'DegreeFlow';
    window.scrollTo({ top: 0 });
  }, [path]);

  return <Page />;
}

export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <DegreeProvider>
          <UIProvider>
            <AppShell>
              <Router />
            </AppShell>
          </UIProvider>
        </DegreeProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
