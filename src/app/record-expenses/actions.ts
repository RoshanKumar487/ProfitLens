
'use server';

import { db } from '@/lib/firebaseConfig';
import { collection, doc, updateDoc, deleteDoc, Timestamp, serverTimestamp, writeBatch } from 'firebase/firestore';

export interface ExpenseUpdateData {
  date: Date;
  amount: number;
  category: string;
  description: string;
  vendor: string;
  employeeId?: string;
  employeeName?: string;
}

export interface ExpenseImportData {
  date: Date;
  amount: number;
  category: string;
  description?: string;
  vendor?: string;
  employeeId?: string;
  employeeName?: string;
}

export async function bulkAddExpenses(
  expenses: ExpenseImportData[],
  companyId: string,
  addedById: string,
  addedBy: string
): Promise<{ success: boolean; message: string; count: number }> {
  if (!companyId || !addedById) {
    return { success: false, message: 'User or company information is missing.', count: 0 };
  }
  if (!expenses || expenses.length === 0) {
    return { success: false, message: 'No expense data provided.', count: 0 };
  }

  const batch = writeBatch(db);
  let processedCount = 0;

  try {
    expenses.forEach(expense => {
      // Basic validation for each expense record
      if (expense.date && expense.category && typeof expense.amount === 'number' && expense.amount > 0) {
        const newExpenseRef = doc(collection(db, 'expenses'));
        batch.set(newExpenseRef, {
          ...expense,
          date: Timestamp.fromDate(expense.date), // Convert JS Date to Firestore Timestamp
          companyId,
          addedById,
          addedBy,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        processedCount++;
      }
    });
    
    if (processedCount === 0) {
        return { success: false, message: "No valid expense records found to import.", count: 0 };
    }

    await batch.commit();
    return { success: true, message: `Successfully imported ${processedCount} expenses.`, count: processedCount };
  } catch (error: any) {
    console.error("Error bulk adding expenses:", error);
    return { success: false, message: `Failed to import expenses: ${error.message}`, count: 0 };
  }
}

export async function updateExpenseEntry(id: string, updates: ExpenseUpdateData): Promise<{ success: boolean; message: string }> {
  try {
    const expenseRef = doc(db, 'expenses', id);
    const payload = { 
      ...updates,
      date: Timestamp.fromDate(updates.date),
      updatedAt: serverTimestamp() 
    };

    if (!payload.employeeId) {
        (payload as any).employeeId = null;
        (payload as any).employeeName = null;
    }

    await updateDoc(expenseRef, payload);
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
