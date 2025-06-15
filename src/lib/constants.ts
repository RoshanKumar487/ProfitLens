
import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, CalendarDays, TrendingUp, TrendingDown, Sparkles, Receipt } from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    label: 'Calendar',
    href: '/calendar',
    icon: CalendarDays,
  },
  {
    label: 'Record Revenue',
    href: '/record-revenue',
    icon: TrendingUp,
  },
  {
    label: 'Record Expenses',
    href: '/record-expenses',
    icon: TrendingDown,
  },
  {
    label: 'Expense Analyzer',
    href: '/expense-analyzer',
    icon: Sparkles,
  },
  {
    label: 'Invoicing',
    href: '/invoicing',
    icon: Receipt,
  },
];
