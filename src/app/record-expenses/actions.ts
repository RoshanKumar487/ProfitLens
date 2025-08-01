
'use server';

import { getDb } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/app/auth/actions';

export interface Expense {
  id?: number;
  date: string;
  amount: number;
  category: string;
  vendor?: string;
  description?: string;
  employeeName?: string;
}

export async function addExpense(expense: Expense) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, message: 'Not authenticated.' };
  }

  try {
    const db = await getDb();
    await db.run(
      'INSERT INTO expenses (userId, date, amount, category, vendor, description, employeeName) VALUES (?, ?, ?, ?, ?, ?, ?)',
      user.uid,
      expense.date,
      expense.amount,
      expense.category,
      expense.vendor,
      expense.description,
      expense.employeeName
    );
    revalidatePath('/record-expenses');
    return { success: true, message: 'Expense added successfully.' };
  } catch (error: any) {
    console.error('Failed to add expense:', error);
    return { success: false, message: `Failed to add expense: ${error.message}` };
  }
}

export async function getExpenses(): Promise<Expense[]> {
  const user = await getCurrentUser();
  if (!user) {
    return [];
  }

  try {
    const db = await getDb();
    const expenses = await db.all('SELECT * FROM expenses WHERE userId = ? ORDER BY date DESC', user.uid);
    return expenses;
  } catch (error) {
    console.error('Failed to get expenses:', error);
    return [];
  }
}

// This remains a mock as it's outside the SQLite scope for this task
export async function searchEmployees(name: string, companyId: string): Promise<any[]> {
    console.log(`[Mock Search] Searching for ${name} in company ${companyId}`);
    return [];
}
