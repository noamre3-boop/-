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
npm test           # run the academic engine test suite (Vitest)
```

Built with React 19, TypeScript, Tailwind CSS 3 and Lucide icons. Charts, routing, drag-and-drop and state management are written in-house, so there are no other runtime dependencies. Vitest is the only extra development dependency.

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

## Academic engine

`src/engine/` is a standalone, institution-agnostic engine written in plain TypeScript. It imports neither React nor any data. One engine instance takes four inputs and answers every academic question about one student in one program:

```ts
const engine = createEngine({ calendar, catalog, program, student });
engine.audit(plan);             // every requirement, rule and graduation condition, checked separately
engine.validate(plan);          // plan issues: missing courses/credits/rules, prerequisites, offerings, conflicts, credit limits
engine.recommend(plan, prefs);  // next-term courses, each with the reasons it was picked
engine.forecast(plan, prefs);   // earliest graduation, simulated term by term
engine.risks(plan, prefs);      // what could delay graduation (what-if simulations)
```

| Module | Responsibility |
|---|---|
| `types.ts` | Domain model: calendar, catalog, program requirements, student record, plan. |
| `calendar.ts` | Term order, term status, future-term generation, the next offering of a course. |
| `catalog.ts` | Course lookup, course selectors, equivalence classes, dependents. |
| `history.ts` | Turns raw attempts and exemptions into one record per course: passed, failed, in progress, exempt, recognized, withdrawn, or duplicate. It applies the retake policy, the passing grade, and the average rules. |
| `prerequisites.ts` | Prerequisite expressions (`all` / `any` / course with minimum grade / credit threshold), evaluated as met, expected (depends on courses in progress or planned) or unmet. |
| `audit.ts` | Allocates credits so each course counts in exactly one group, respecting group caps. Evaluates each rule and each graduation condition, and decides eligibility. |
| `validate.ts` | Rule-based plan issues. |
| `schedule.ts` | Weekly time-conflict detection. |
| `recommend.ts` | Candidates are only courses the student still needs. Each is checked for offering, prerequisites, credit cap and conflicts, then ranked. Every pick carries reasons. |
| `forecast.ts` | Simulates future terms with the recommendation engine until all requirements are covered. Then runs what-if checks: failing a course in progress, or missing a seat in a course scheduled next term. |

**What a program can express** (`ProgramDef`): requirement groups with minimum and maximum credits and a course pool, plus rules inside each group. A rule can be a mandatory course with alternatives, a minimum number of courses from a selector, or minimum credits from a selector. Programs also define graduation conditions (total credits, all groups complete, minimum average, a non-course exemption such as English), a passing grade, per-season credit limits, a retake policy (`latest` or `highest`), and whether failed grades stay in the average. Course-level options: prerequisites, minimum grades, pass/fail grading, a course-specific passing grade, equivalents, and offering seasons.

**No double counting:** a repeated course earns credit once. Equivalent courses earn credit once. Each course counts in one group only. Credits above a group cap and courses outside the program don't count toward the total.

### Data separation

```
src/data/institutions/demo-university/
  calendar.ts                 terms and term template          (sample data)
  catalog.ts                  course catalog                   (sample data)
  bsc-computer-science.ts     degree program and requirements  (sample data)
src/data/students/
  demo-student.ts             attempts, grades, exemptions, plan (sample data)
src/data/demo.ts              binds one engine instance for the app
src/data/courses.ts, program.ts   adapters from engine data to UI view types
src/lib/degree.ts             UI-facing API over the engine (placements ⇄ engine plan)
src/lib/insights.ts           turns engine output into insight cards and next steps
```

To add another college or program, write its `calendar`, `catalog` and `program` definitions and a student record, then call `createEngine`. The engine code does not change. The test suite proves this with a separate synthetic institution (`src/engine/__tests__/fixtures.ts`).

The demo student's record is deliberately realistic. It includes a failed mandatory course that was retaken (Calculus II: 48 → 78) and a failed elective that still counts in the average. It also has a pass/fail course, credit recognized from prior studies, an English exemption, a preparatory course that doesn't count, five courses in progress, and a plan for next term that's missing a required course.

### Tests

`npm test` runs 47 tests across two files:

- **`engine.test.ts`**: scenarios on the synthetic institution.
  - A student who completed everything.
  - Missing mandatory courses, and missing credits.
  - Failed courses, retakes, and both retake policies.
  - Exemptions and recognized credit.
  - Overlapping courses, and prerequisites blocked by a minimum grade or a credit threshold.
  - No double counting, group caps, pass/fail, and the average condition.
  - Forecasts across offering seasons, the credit cap, infeasible requirements, and the calendar.
- **`demo-data.test.ts`**: integration checks on the sample student. These cover the 84/120 credits, the resolved history, the missing requirement, the time conflict, the recommendations and the delay risks.

## Intelligence layer

`src/lib/insights.ts` turns engine output into two clearly separated kinds of insight:

- **Confirmed · degree rule**: deterministic results from the program rules. These cover missing mandatory courses, uncovered rules or credits, prerequisites, terms where a course isn't offered, time conflicts, credit limits, duplicate courses, and graduation delays.
- **AI suggestion**: recommendations generated by the engine, each with a confidence level and its reasons. Examples are next-term recommendations, swapping an elective to remove a time conflict, what-if delay risks, the effect of a failing grade on the average, workload forecasts with their trade-offs, and ways to recover a delayed graduation. Suggestions can be dismissed. Confirmed rules cannot.

Many insights include a one-click action, such as *Add to Spring 2027* or *Apply swap*. Every action can be undone.

## Structure

```
src/
  engine/      academic engine (pure TypeScript) + tests
  data/        sample institution, program and student data; UI adapters
  lib/         UI-facing engine API, insights, router, theme, formatting
  state/       app store (plan, prefs, alerts, persistence), toasts, UI state
  components/  ui primitives, layout (sidebar, topbar, palette), course, plan, insights, charts
  pages/       Overview, MyDegree, AcademicPlan, Requirements, Analytics, Alerts, Settings
```

All derived numbers (progress, remaining credits, eligibility, projected graduation, issues, recommendations, next steps) come from the engine. When the plan changes, every page updates.
