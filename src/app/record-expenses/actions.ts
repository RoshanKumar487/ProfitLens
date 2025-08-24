
'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/app/auth/actions';

export interface Expense {
  id?: string;
  date: string;
  amount: number;
  category: string;
  vendor?: string;
  description?: string;
  employeeName?: string;
}

// Mock database
let MOCK_EXPENSES: Expense[] = [
  { id: 'exp1', date: new Date().toISOString(), amount: 75.50, category: 'Office Supplies', vendor: 'Staples', description: 'Printer paper and pens' },
  { id: 'exp2', date: new Date(Date.now() - 86400000 * 2).toISOString(), amount: 1200, category: 'Marketing & Advertising', vendor: 'Google Ads', description: 'Q3 Campaign' },
];

export async function addExpense(expense: Omit<Expense, 'id'>) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, message: 'Not authenticated.' };
  }
  
  const newExpense = { ...expense, id: `exp${Date.now()}` };
  MOCK_EXPENSES.unshift(newExpense);
  
  revalidatePath('/record-expenses');
  return { success: true, message: 'Expense added successfully.' };
}

export async function getExpenses(): Promise<Expense[]> {
  const user = await getCurrentUser();
  if (!user) {
    return [];
  }
  // Return a sorted copy
  return [...MOCK_EXPENSES].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
