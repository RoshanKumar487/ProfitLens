
import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, TrendingUp, TrendingDown, Sparkles, Receipt, Users, FileBarChart, Shield, HelpCircle, Banknote } from 'lucide-react';

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
  {
    label: 'Bank Accounts',
    href: '/bank-accounts',
    icon: Banknote,
  },
  {
    label: 'Employees',
    href: '/employees',
    icon: Users,
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: FileBarChart,
  },
  {
    label: 'Administration',
    href: '/admin',
    icon: Shield,
  },
  {
    label: 'Guide',
    href: '/guide',
    icon: HelpCircle,
  }
];
