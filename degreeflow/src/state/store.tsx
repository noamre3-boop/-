import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import { courseById, initialPlacements } from '../data/courses';
import { semesterById, student } from '../data/program';
import { buildAlerts } from '../lib/alerts';
import {
  type DegreeSummary,
  type Issue,
  type PlanPrefs,
  type Placements,
  type Projection,
  type SemesterLoad,
  applyMove,
  checkPlan,
  defaultPrefs,
  isMovable,
  moveImpact,
  project,
  semesterLoads,
  summarize,
} from '../lib/degree';
import { type Insight, type NextStep, generateInsights, nextSteps } from '../lib/insights';
import { readStorage, removeStorage, writeStorage } from '../lib/storage';
import type { Alert } from '../types';
import { useToast } from './toast';

// v2: engine-backed data model (attempts, exemptions, alternative courses).
const KEY = 'df:state:v2';

export interface Notifications {
  deadlines: boolean;
  planIssues: boolean;
  grades: boolean;
  weeklyDigest: boolean;
}

interface Persisted {
  placements: Placements;
  prefs: PlanPrefs;
  firstName: string;
  readAlerts: string[];
  dismissedAlerts: string[];
  dismissedInsights: string[];
  notifications: Notifications;
}

interface State extends Persisted {
  status: 'loading' | 'ready' | 'error';
  history: Placements[];
}

type Action =
  | { type: 'loaded'; data: Partial<Persisted> }
  | { type: 'loading' }
  | { type: 'error' }
  | { type: 'plan'; placements: Placements }
  | { type: 'undo' }
  | { type: 'reset-plan' }
  | { type: 'reset-all' }
  | { type: 'prefs'; prefs: Partial<PlanPrefs> }
  | { type: 'name'; firstName: string }
  | { type: 'notifications'; value: Partial<Notifications> }
  | { type: 'read'; ids: string[] }
  | { type: 'unread'; id: string }
  | { type: 'dismiss-alert'; id: string }
  | { type: 'restore-alerts' }
  | { type: 'dismiss-insight'; id: string }
  | { type: 'restore-insights' };

const defaults: Persisted = {
  placements: initialPlacements,
  prefs: defaultPrefs,
  firstName: student.firstName,
  readAlerts: ['a-adddrop', 'a-audit'],
  dismissedAlerts: [],
  dismissedInsights: [],
  notifications: { deadlines: true, planIssues: true, grades: true, weeklyDigest: false },
};

/** Drop persisted placements that no longer match the sample data (e.g. after a data update). */
function sanitize(p: Placements | undefined): Placements {
  if (!p) return initialPlacements;
  const out: Placements = { ...initialPlacements };
  for (const [id, sem] of Object.entries(p)) {
    if (!courseById[id] || !semesterById[sem]) continue;
    if (isMovable(id, initialPlacements)) out[id] = sem;
  }
  for (const id of Object.keys(initialPlacements)) {
    if (isMovable(id, initialPlacements) && !(id in p)) delete out[id];
  }
  return out;
}

function reducer(state: State, a: Action): State {
  switch (a.type) {
    case 'loading':
      return { ...state, status: 'loading' };
    case 'error':
      return { ...state, status: 'error' };
    case 'loaded':
      return {
        ...state,
        ...a.data,
        placements: sanitize(a.data.placements ?? state.placements),
        prefs: { ...state.prefs, ...a.data.prefs },
        notifications: { ...state.notifications, ...a.data.notifications },
        status: 'ready',
      };
    case 'plan':
      return { ...state, history: [...state.history.slice(-30), state.placements], placements: a.placements };
    case 'undo': {
      const prev = state.history[state.history.length - 1];
      return prev ? { ...state, placements: prev, history: state.history.slice(0, -1) } : state;
    }
    case 'reset-plan':
      return { ...state, history: [...state.history, state.placements], placements: initialPlacements, dismissedInsights: [] };
    case 'reset-all':
      return { ...state, ...defaults, history: [] };
    case 'prefs':
      return { ...state, prefs: { ...state.prefs, ...a.prefs } };
    case 'name':
      return { ...state, firstName: a.firstName };
    case 'notifications':
      return { ...state, notifications: { ...state.notifications, ...a.value } };
    case 'read':
      return { ...state, readAlerts: [...new Set([...state.readAlerts, ...a.ids])] };
    case 'unread':
      return { ...state, readAlerts: state.readAlerts.filter((x) => x !== a.id) };
    case 'dismiss-alert':
      return { ...state, dismissedAlerts: [...state.dismissedAlerts, a.id] };
    case 'restore-alerts':
      return { ...state, dismissedAlerts: [] };
    case 'dismiss-insight':
      return { ...state, dismissedInsights: [...state.dismissedInsights, a.id] };
    case 'restore-insights':
      return { ...state, dismissedInsights: [] };
  }
}

export interface DegreeContext {
  status: State['status'];
  placements: Placements;
  prefs: PlanPrefs;
  firstName: string;
  notifications: Notifications;
  summary: DegreeSummary;
  issues: Issue[];
  projection: Projection;
  loads: SemesterLoad[];
  insights: Insight[];
  dismissedInsightCount: number;
  steps: NextStep[];
  alerts: (Alert & { read: boolean })[];
  unreadAlerts: number;
  canUndo: boolean;
  moveCourse: (courseId: string, to: string | null) => void;
  swapCourses: (remove: string, add: string, semesterId: string) => void;
  undo: () => void;
  resetPlan: () => void;
  resetAll: () => void;
  setPrefs: (p: Partial<PlanPrefs>) => void;
  setFirstName: (n: string) => void;
  setNotifications: (n: Partial<Notifications>) => void;
  markRead: (ids: string[]) => void;
  markUnread: (id: string) => void;
  dismissAlert: (id: string) => void;
  restoreAlerts: () => void;
  dismissInsight: (id: string) => void;
  restoreInsights: () => void;
  reload: () => void;
  simulateError: () => void;
}

const Ctx = createContext<DegreeContext | null>(null);

/** Simulated network latency so loading states are visible in the demo. */
const LOAD_MS = 650;

export function DegreeProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [state, dispatch] = useReducer(reducer, undefined, () => ({ ...defaults, status: 'loading' as const, history: [] }));

  const load = useCallback(() => {
    dispatch({ type: 'loading' });
    const t = window.setTimeout(() => dispatch({ type: 'loaded', data: readStorage<Persisted>(KEY) ?? {} }), LOAD_MS);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => load(), [load]);

  useEffect(() => {
    if (state.status !== 'ready') return;
    const { placements, prefs, firstName, readAlerts, dismissedAlerts, dismissedInsights, notifications } = state;
    writeStorage(KEY, { placements, prefs, firstName, readAlerts, dismissedAlerts, dismissedInsights, notifications });
  }, [state]);

  const derived = useMemo(() => {
    const summary = summarize(state.placements);
    const issues = checkPlan(state.placements);
    const projection = project(state.placements, issues, state.prefs);
    const loads = semesterLoads(state.placements, issues);
    const allInsights = generateInsights(state.placements, state.prefs);
    const insights = allInsights.filter((i) => !state.dismissedInsights.includes(i.id));
    const steps = nextSteps(state.placements, projection, issues);
    const alerts = buildAlerts(issues, projection)
      .filter((a) => !state.dismissedAlerts.includes(a.id))
      .map((a) => ({ ...a, read: state.readAlerts.includes(a.id) }));
    return {
      summary,
      issues,
      projection,
      loads,
      insights,
      dismissedInsightCount: allInsights.length - insights.length,
      steps,
      alerts,
      unreadAlerts: alerts.filter((a) => !a.read).length,
    };
  }, [state.placements, state.prefs, state.dismissedInsights, state.dismissedAlerts, state.readAlerts]);

  const undo = useCallback(() => dispatch({ type: 'undo' }), []);

  const moveCourse = useCallback(
    (courseId: string, to: string | null) => {
      const from = state.placements[courseId] ?? null;
      if (from === to) return;
      if (!isMovable(courseId, state.placements)) {
        toast({ title: 'This course is locked', description: 'Completed and in-progress courses can’t be moved.', tone: 'info' });
        return;
      }
      const impact = moveImpact(state.placements, courseId, to);
      dispatch({ type: 'plan', placements: applyMove(state.placements, courseId, to) });
      const c = courseById[courseId];
      const where = to ? semesterById[to].label : 'unscheduled courses';
      if (impact.delays) {
        toast({
          title: `Graduation moves to ${impact.newLabel}`,
          description: `${c.name} moved to ${where}. This change delays your graduation.`,
          tone: 'warning',
          action: { label: 'Undo', onClick: undo },
        });
      } else if (impact.problems.length) {
        toast({
          title: `Moved ${c.name} to ${where}`,
          description: impact.problems.join(' · '),
          tone: 'warning',
          action: { label: 'Undo', onClick: undo },
        });
      } else {
        toast({ title: `Moved ${c.name}`, description: `Now in ${where}.`, tone: 'success', action: { label: 'Undo', onClick: undo } });
      }
    },
    [state.placements, toast, undo],
  );

  const swapCourses = useCallback(
    (remove: string, add: string, semesterId: string) => {
      const next = applyMove(applyMove(state.placements, remove, null), add, semesterId);
      const before = project(state.placements, undefined, state.prefs, false);
      const after = project(next, undefined, state.prefs, false);
      dispatch({ type: 'plan', placements: next });
      toast({
        title: `Swapped in ${courseById[add].name}`,
        description:
          after.date > before.date
            ? `Graduation moves to ${after.label}.`
            : `${courseById[remove].name} moved to unscheduled courses.`,
        tone: after.date > before.date ? 'warning' : 'success',
        action: { label: 'Undo', onClick: undo },
      });
    },
    [state.placements, toast, undo],
  );

  const value: DegreeContext = {
    status: state.status,
    placements: state.placements,
    prefs: state.prefs,
    firstName: state.firstName,
    notifications: state.notifications,
    ...derived,
    canUndo: state.history.length > 0,
    moveCourse,
    swapCourses,
    undo,
    resetPlan: () => {
      dispatch({ type: 'reset-plan' });
      toast({ title: 'Plan reset', description: 'Your plan is back to the original sample.', tone: 'info', action: { label: 'Undo', onClick: undo } });
    },
    resetAll: () => {
      removeStorage(KEY);
      dispatch({ type: 'reset-all' });
      toast({ title: 'Demo data reset', tone: 'info' });
    },
    setPrefs: (prefs) => dispatch({ type: 'prefs', prefs }),
    setFirstName: (firstName) => dispatch({ type: 'name', firstName }),
    setNotifications: (value) => dispatch({ type: 'notifications', value }),
    markRead: (ids) => dispatch({ type: 'read', ids }),
    markUnread: (id) => dispatch({ type: 'unread', id }),
    dismissAlert: (id) => dispatch({ type: 'dismiss-alert', id }),
    restoreAlerts: () => dispatch({ type: 'restore-alerts' }),
    dismissInsight: (id) => dispatch({ type: 'dismiss-insight', id }),
    restoreInsights: () => dispatch({ type: 'restore-insights' }),
    reload: () => {
      load();
    },
    simulateError: () => dispatch({ type: 'error' }),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDegree() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useDegree must be used inside DegreeProvider');
  return ctx;
}
