import { DEMO_TODAY } from '../data/program';

const DAY_MS = 86_400_000;

const parse = (iso: string) => new Date(`${iso}T12:00:00`);

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) {
  return parse(iso).toLocaleDateString('en-US', opts);
}

export function monthYear(iso: string) {
  return parse(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function shortMonthYear(iso: string) {
  return parse(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function daysUntil(iso: string, from: string = DEMO_TODAY) {
  return Math.round((parse(iso).getTime() - parse(from).getTime()) / DAY_MS);
}

export function relativeDays(iso: string) {
  const d = daysUntil(iso);
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d === -1) return 'Yesterday';
  if (d < 0) return `${-d} days ago`;
  if (d < 14) return `In ${d} days`;
  if (d < 60) return `In ${Math.round(d / 7)} weeks`;
  return `In ${Math.round(d / 30)} months`;
}

export function pct(n: number, total: number) {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, (n / total) * 100));
}

export function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return 'Good evening';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

export function toMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function fromMinutes(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
