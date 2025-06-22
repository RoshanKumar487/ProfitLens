
import type { LucideIcon } from 'lucide-react';
import { Home, TrendingUp, TrendingDown, Sparkles, FileText, Users, PieChart, Shield, HelpCircle } from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    icon: Home,
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
    icon: FileText,
  },
  {
    label: 'Employees',
    href: '/employees',
    icon: Users,
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: PieChart,
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
