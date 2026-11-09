import { type ReactNode, createContext, useContext, useMemo, useState } from 'react';

interface UICtx {
  courseId: string | null;
  openCourse: (id: string) => void;
  closeCourse: () => void;
  insightsOpen: boolean;
  setInsightsOpen: (v: boolean) => void;
  paletteOpen: boolean;
  setPaletteOpen: (v: boolean) => void;
  navOpen: boolean;
  setNavOpen: (v: boolean) => void;
}

const Ctx = createContext<UICtx | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [courseId, setCourseId] = useState<string | null>(null);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  const value = useMemo(
    () => ({
      courseId,
      openCourse: (id: string) => setCourseId(id),
      closeCourse: () => setCourseId(null),
      insightsOpen,
      setInsightsOpen,
      paletteOpen,
      setPaletteOpen,
      navOpen,
      setNavOpen,
    }),
    [courseId, insightsOpen, paletteOpen, navOpen],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUI() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useUI must be used inside UIProvider');
  return ctx;
}
