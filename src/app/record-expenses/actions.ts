
'use server';

import { getDb } from '@/lib/db';
import { revalidatePath } from 'next/cache';

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
  try {
    const db = await getDb();
    await db.run(
      'INSERT INTO expenses (date, amount, category, vendor, description, employeeName) VALUES (?, ?, ?, ?, ?, ?)',
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
  try {
    const db = await getDb();
    const expenses = await db.all('SELECT * FROM expenses ORDER BY date DESC');
    return expenses;
  } catch (error) {
    console.error('Failed to get expenses:', error);
    return [];
  }
}

// We will keep searchEmployees as a mock function since it's not part of the core SQLite change.
export async function searchEmployees(name: string, companyId: string): Promise<any[]> {
    console.log(`[Mock Search] Searching for ${name} in company ${companyId}`);
    // In a real app, this would query your employee data source.
    // For now, it returns an empty array.
    return [];
}
