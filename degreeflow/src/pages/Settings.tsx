import { Check, Database, Loader, Monitor, Moon, RotateCcw, Sun, TriangleAlert, Trash2 } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card, PageHeader } from '../components/ui/Card';
import { Switch } from '../components/ui/Controls';
import { Modal } from '../components/ui/Overlay';
import { program, student } from '../data/program';
import { cn } from '../lib/format';
import { type ThemeMode, useTheme } from '../lib/theme';
import { useDegree } from '../state/store';

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <Card className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,15rem)_1fr] lg:gap-10">
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-fg">{title}</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </Card>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-sm text-fg">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-subtle">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

const field =
  'h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg transition placeholder:text-subtle focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/15 disabled:bg-raised/50 disabled:text-muted';

const themes: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
  { mode: 'dark', label: 'Dark', icon: Moon },
  { mode: 'light', label: 'Light', icon: Sun },
  { mode: 'system', label: 'System', icon: Monitor },
];

function ThemePreview({ mode }: { mode: ThemeMode }) {
  const dark = (
    <div className="h-full w-full bg-[#060912] p-2">
      <div className="flex h-full gap-1.5">
        <div className="w-1/4 rounded bg-[#0c111f]" />
        <div className="flex-1 space-y-1.5">
          <div className="h-4 rounded bg-[#0c111f]" />
          <div className="flex h-6 items-center gap-1 rounded bg-[#0c111f] px-1.5">
            <div className="h-1 w-2/3 rounded-full bg-[#22d3ee]" />
            <div className="h-1 w-1/5 rounded-full bg-[#a78bfa]" />
          </div>
        </div>
      </div>
    </div>
  );
  const light = (
    <div className="h-full w-full bg-[#f5f7fb] p-2">
      <div className="flex h-full gap-1.5">
        <div className="w-1/4 rounded bg-white ring-1 ring-[#e4e8f0]" />
        <div className="flex-1 space-y-1.5">
          <div className="h-4 rounded bg-white ring-1 ring-[#e4e8f0]" />
          <div className="flex h-6 items-center gap-1 rounded bg-white px-1.5 ring-1 ring-[#e4e8f0]">
            <div className="h-1 w-2/3 rounded-full bg-[#0891b2]" />
            <div className="h-1 w-1/5 rounded-full bg-[#7c3aed]" />
          </div>
        </div>
      </div>
    </div>
  );
  if (mode === 'dark') return dark;
  if (mode === 'light') return light;
  return (
    <div className="relative h-full w-full">
      {light}
      <div className="absolute inset-0" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}>
        {dark}
      </div>
    </div>
  );
}

export function Settings() {
  const { mode, setMode } = useTheme();
  const {
    firstName,
    setFirstName,
    prefs,
    setPrefs,
    notifications,
    setNotifications,
    resetPlan,
    resetAll,
    reload,
    simulateError,
  } = useDegree();
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Account" title="Settings" description="Manage your profile, appearance and planning preferences." />

      <Section title="Profile" description="Used across DegreeFlow, including your home greeting.">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs text-muted">First name</span>
            <input className={field} value={firstName} maxLength={40} onChange={(e) => setFirstName(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs text-muted">Student ID</span>
            <input className={field} value={student.studentId} disabled />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs text-muted">Program</span>
            <input className={field} value={program.name} disabled />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs text-muted">Academic advisor</span>
            <input className={field} value={student.advisor} disabled />
          </label>
        </div>
      </Section>

      <Section title="Appearance" description="Choose a theme, or follow your device setting.">
        <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-label="Theme">
          {themes.map((t) => {
            const active = mode === t.mode;
            return (
              <button
                key={t.mode}
                role="radio"
                aria-checked={active}
                onClick={() => setMode(t.mode)}
                className={cn(
                  'group overflow-hidden rounded-xl border text-left transition',
                  active ? 'border-accent/60 ring-2 ring-accent/15' : 'border-line hover:border-line-strong',
                )}
              >
                <div className="h-16 w-full overflow-hidden sm:h-20">
                  <ThemePreview mode={t.mode} />
                </div>
                <div className="flex items-center justify-between border-t border-line px-3 py-2">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-fg">
                    <t.icon className="h-3.5 w-3.5 text-muted" />
                    {t.label}
                  </span>
                  {active && <Check className="h-3.5 w-3.5 text-accent" />}
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Planning preferences" description="Tune when DegreeFlow flags a semester as heavy and which terms appear in your plan.">
        <div className="divide-y divide-line">
          <Row label="Preferred credits per semester" hint={`Semesters above this are flagged as heavy (limit ${program.maxCreditsPerSemester})`}>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={12}
                max={program.maxCreditsPerSemester}
                value={prefs.preferredMaxCredits}
                onChange={(e) => setPrefs({ preferredMaxCredits: +e.target.value })}
                className="w-28 accent-[rgb(var(--accent))] sm:w-40"
                aria-label="Preferred credits per semester"
              />
              <span className="tnum w-10 text-right text-sm text-fg">{prefs.preferredMaxCredits}</span>
            </div>
          </Row>
          <Row label="Heavy workload threshold" hint="Estimated hours per week">
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={30}
                max={60}
                step={1}
                value={prefs.heavyWorkloadHours}
                onChange={(e) => setPrefs({ heavyWorkloadHours: +e.target.value })}
                className="w-28 accent-[rgb(var(--accent))] sm:w-40"
                aria-label="Heavy workload threshold in hours per week"
              />
              <span className="tnum w-10 text-right text-sm text-fg">{prefs.heavyWorkloadHours}h</span>
            </div>
          </Row>
          <Row label="Show summer semesters" hint="Summer terms appear in your plan when enabled">
            <Switch label="Show summer semesters" checked={prefs.includeSummer} onChange={(v) => setPrefs({ includeSummer: v })} />
          </Row>
        </div>
      </Section>

      <Section title="Notifications" description="Choose what DegreeFlow alerts you about.">
        <div className="divide-y divide-line">
          <Row label="Registration & deadlines" hint="Registration windows, submissions and exams">
            <Switch label="Registration and deadlines" checked={notifications.deadlines} onChange={(v) => setNotifications({ deadlines: v })} />
          </Row>
          <Row label="Plan issues" hint="Conflicts, missing requirements and graduation changes">
            <Switch label="Plan issues" checked={notifications.planIssues} onChange={(v) => setNotifications({ planIssues: v })} />
          </Row>
          <Row label="Grades" hint="When a grade is published">
            <Switch label="Grades" checked={notifications.grades} onChange={(v) => setNotifications({ grades: v })} />
          </Row>
          <Row label="Weekly digest" hint="A Sunday summary of progress and next steps">
            <Switch label="Weekly digest" checked={notifications.weeklyDigest} onChange={(v) => setNotifications({ weeklyDigest: v })} />
          </Row>
        </div>
      </Section>

      <Section title="Data" description="DegreeFlow is running on sample data for demonstration.">
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-line bg-raised/40 p-4">
            <Database className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
            <p className="text-xs leading-relaxed text-muted">
              Courses, grades and dates are illustrative. DegreeFlow is <span className="text-fg">not connected</span> to any
              university system. Your changes are saved only in this browser.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" icon={RotateCcw} onClick={resetPlan}>
              Reset plan
            </Button>
            <Button size="sm" icon={Loader} onClick={reload}>
              Replay loading state
            </Button>
            <Button size="sm" icon={TriangleAlert} onClick={simulateError}>
              Simulate connection error
            </Button>
            <Button size="sm" variant="danger" icon={Trash2} onClick={() => setConfirm(true)}>
              Reset all demo data
            </Button>
          </div>
        </div>
      </Section>

      <Modal open={confirm} onClose={() => setConfirm(false)} title="Reset all demo data">
        <div className="p-6">
          <h2 className="text-base font-semibold text-fg">Reset all demo data?</h2>
          <p className="mt-2 text-sm text-muted">
            This restores the original plan, alerts, preferences and profile name. This can’t be undone.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                resetAll();
                setConfirm(false);
              }}
            >
              Reset everything
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
