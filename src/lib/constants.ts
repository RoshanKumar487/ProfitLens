
import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, TrendingUp, TrendingDown, Sparkles, Receipt, Users, Shield, Banknote, Settings, LayoutGrid, Crown, HandCoins, ShieldCheck, BarChart2, Package, Warehouse } from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
  sidebar?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    description: 'Get a high-level overview of your business finances and activities.'
  },
  {
    label: 'Record Revenue',
    href: '/record-revenue',
    icon: TrendingUp,
    description: 'Manually log all incoming revenue from various sources.'
  },
  {
    label: 'Record Expenses',
    href: '/record-expenses',
    icon: TrendingDown,
    description: 'Track all business expenditures, either manually or by scanning receipts.'
  },
  {
    label: 'Expense Analyzer',
    href: '/expense-analyzer',
    icon: Sparkles,
    description: 'Use AI to analyze your spending and find savings opportunities.'
  },
  {
    label: 'Invoicing',
    href: '/invoicing',
    icon: Receipt,
    description: 'Create, send, and manage professional invoices for your clients.'
  },
  {
    label: 'Products & Services',
    href: '/products-services',
    icon: Package,
    description: 'Manage your entire catalog of items and their stock levels.',
  },
  {
    label: 'My Tools',
    href: '/',
    icon: LayoutGrid,
    description: 'Access all your business management tools from one central hub.'
  },
  {
    label: 'Bank Accounts',
    href: '/bank-accounts',
    icon: Banknote,
    description: 'Manually track bank accounts and categorize transactions.',
    sidebar: false,
  },
  {
    label: 'Payroll',
    href: '/payroll',
    icon: HandCoins,
    description: 'Manage employee monthly payments, advances, and deductions.',
  },
  {
    label: 'Employees',
    href: '/employees',
    icon: Users,
    description: 'Manage your team, track salaries, and store employee documents.'
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: BarChart2,
    description: 'Generate and export detailed reports on various aspects of your business.'
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    description: 'Customize application settings, like adding custom invoice fields.'
  },
  {
    label: 'Administration',
    href: '/admin',
    icon: ShieldCheck,
    description: 'Manage user access requests and assign roles to your team members.'
  },
  {
    label: 'Super Admin',
    href: '/super-admin',
    icon: Crown,
    description: 'Manage all companies and users across the platform.',
  }
];

