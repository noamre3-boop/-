# DegreeFlow

An academic planning dashboard for university students. The home screen answers three questions straight away: **where you stand**, **what remains before graduation**, and **what to do next**.

> **Demo data.** DegreeFlow runs entirely in the browser on sample data (one B.Sc. Computer Science student). It is not connected to any university system. Changes are saved in `localStorage` only.

## Run it

```bash
cd degreeflow
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
```

Built with React 19, TypeScript, Tailwind CSS 3 and Lucide icons. Charts, routing, drag-and-drop and state management are written in-house, so there are no other runtime dependencies.

## What's inside

| Page | What it does |
|---|---|
| **Overview** | Greeting, degree progress (ring + credit breakdown + projected graduation), the top 3 next steps, a compact requirements summary and an upcoming-milestones timeline. |
| **My Degree** | Credits required/completed/in progress/remaining, what's left in each requirement group, graduation conditions, mandatory courses and electives, and prerequisite readiness. |
| **Academic Plan** | Semester board. Drag courses between semesters (or use the ⋯ menu on touch screens and keyboards). While you drag, each semester shows the impact of dropping there, e.g. *"Delays graduation to Sep 2027"*. Includes undo/reset, a course pool with search and filters, and a live intelligence panel. |
| **Course Requirements** | The full catalog with requirement-group tiles, status filters, search and sorting. Filters are stored in the URL. |
| **Progress & Analytics** | Cumulative credits with a projection from your plan, grade trend, credits per semester and estimated weekly workload. Every chart has a hover tooltip and a table view. |
| **Alerts** | Static notifications plus alerts generated from your plan. Filter them, mark read or unread, and dismiss or restore. |
| **Settings** | Profile, theme (dark / light / system), planning thresholds, notification preferences, and demo controls (replay the loading state, simulate an error, reset). |

Also included: a course detail drawer (prerequisites, courses it unlocks, schedule, workload, move-to), a ⌘K / Ctrl+K command palette, a responsive mobile navigation drawer, and loading, empty, error and 404 states.

## Intelligence layer

`src/lib/insights.ts` turns the plan into two clearly separated kinds of insight:

- **Confirmed · degree rule**: deterministic checks of the program rules. These cover missing mandatory courses, uncovered credits, prerequisites, terms where a course isn't offered, time conflicts, the credit limit, and graduation delays.
- **AI suggestion**: recommendations from heuristics, each with a confidence level. Examples are courses on the critical path that should be taken soon, swapping a course to remove a time conflict, workload forecasts with their trade-offs, ways to recover a delayed graduation, and elective picks. Suggestions can be dismissed. Confirmed rules cannot.

Many insights include a one-click action, such as *Add to Spring 2027* or *Apply swap*. Every action can be undone.

## Structure

```
src/
  data/        sample program, courses, grades, calendar, alerts (no UI)
  lib/         degree engine (progress, rule checks, projection), insights, router, theme, formatting
  state/       app store (plan, prefs, alerts, persistence), toasts, UI state
  components/  ui primitives, layout (sidebar, topbar, palette), course, plan, insights, charts
  pages/       Overview, MyDegree, AcademicPlan, Requirements, Analytics, Alerts, Settings
```

All derived numbers (progress, remaining credits, projected graduation, issues, next steps) are computed from `data/` through `lib/degree.ts`. When the plan changes, every page updates.
