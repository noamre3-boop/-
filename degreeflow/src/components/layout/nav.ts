import { BarChart3, Bell, CalendarRange, GraduationCap, LayoutDashboard, ListChecks, type LucideIcon, Settings } from 'lucide-react';

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

export const navItems: NavItem[] = [
  { path: '/', label: 'Overview', icon: LayoutDashboard, description: 'Where you stand and what to do next' },
  { path: '/degree', label: 'My Degree', icon: GraduationCap, description: 'Everything left before graduation' },
  { path: '/plan', label: 'Academic Plan', icon: CalendarRange, description: 'Plan and rearrange your semesters' },
  { path: '/requirements', label: 'Course Requirements', icon: ListChecks, description: 'Browse every course in your program' },
  { path: '/analytics', label: 'Progress & Analytics', icon: BarChart3, description: 'Credits, grades and workload over time' },
  { path: '/alerts', label: 'Alerts', icon: Bell, description: 'Deadlines and plan notifications' },
  { path: '/settings', label: 'Settings', icon: Settings, description: 'Profile, appearance and preferences' },
];

export const isActive = (itemPath: string, path: string) => (itemPath === '/' ? path === '/' : path.startsWith(itemPath));
