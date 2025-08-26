
'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/app/auth/actions';
import { db } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

export interface Expense {
  id?: string;
  date: string; // Stored as YYYY-MM-DD string
  amount: number;
  category: string;
  vendor?: string;
  description?: string;
  employeeName?: string;
}

export async function addExpense(expense: Omit<Expense, 'id'>) {
  const user = await getCurrentUser();
  if (!user || !user.companyId) {
    return { success: false, message: 'Not authenticated or company not found.' };
  }
  
  try {
    const expenseData = {
      ...expense,
      companyId: user.companyId,
      createdAt: Timestamp.now(),
      date: Timestamp.fromDate(new Date(expense.date)),
    };
    await db.collection('expenses').add(expenseData);
    
    revalidatePath('/record-expenses');
    return { success: true, message: 'Expense added successfully.' };
  } catch (error) {
    console.error("Error adding expense:", error);
    return { success: false, message: 'Failed to add expense.' };
  }
}

export async function getExpenses(): Promise<Expense[]> {
  const user = await getCurrentUser();
  if (!user || !user.companyId) {
    return [];
  }
  
  try {
    const expensesSnapshot = await db.collection('expenses')
      .where('companyId', '==', user.companyId)
      .orderBy('date', 'desc')
      .get();
      
    const expenses = expensesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: (data.date as Timestamp).toDate().toISOString(),
      } as Expense;
    });
    
    return expenses;
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return [];
  }
}
