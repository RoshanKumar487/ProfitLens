'use server';

import { db } from '@/lib/firebaseConfig';
import { doc, updateDoc, deleteDoc, Timestamp, serverTimestamp } from 'firebase/firestore';

export interface ExpenseUpdateData {
  date: Date;
  amount: number;
  category: string;
  description: string;
  vendor: string;
}

export async function updateExpenseEntry(id: string, updates: ExpenseUpdateData): Promise<{ success: boolean; message: string }> {
  try {
    const expenseRef = doc(db, 'expenses', id);
    await updateDoc(expenseRef, { 
      ...updates,
      date: Timestamp.fromDate(updates.date),
      updatedAt: serverTimestamp() 
    });
    return { success: true, message: 'Expense updated successfully.' };
  } catch (error: any) {
    console.error("Error updating expense:", error);
    return { success: false, message: `Failed to update expense: ${error.message}` };
  }
}

export async function deleteExpenseEntry(id: string): Promise<{ success: boolean; message: string }> {
  try {
    await deleteDoc(doc(db, 'expenses', id));
    return { success: true, message: 'Expense deleted successfully.' };
  } catch (error: any)
  {
    console.error("Error deleting expense:", error);
    return { success: false, message: `Failed to delete expense: ${error.message}` };
  }
}
