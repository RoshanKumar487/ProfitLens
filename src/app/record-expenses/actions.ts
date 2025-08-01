'use server';

import { connectToDatabase } from '@/lib/mongodb';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/app/auth/actions';
import { ObjectId } from 'mongodb';

export interface Expense {
  id?: string; // MongoDB will use _id
  date: string;
  amount: number;
  category: string;
  vendor?: string;
  description?: string;
  employeeName?: string;
}

export async function addExpense(expense: Omit<Expense, 'id'>) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, message: 'Not authenticated.' };
  }

  try {
    const { db } = await connectToDatabase();
    await db.collection('expenses').insertOne({
      ...expense,
      userId: new ObjectId(user.uid),
      companyId: new ObjectId(user.companyId),
      createdAt: new Date(),
    });
    
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
    const { db } = await connectToDatabase();
    const expenses = await db.collection('expenses')
      .find({ userId: new ObjectId(user.uid) })
      .sort({ date: -1 })
      .toArray();

    return expenses.map(doc => ({
        id: doc._id.toHexString(),
        date: doc.date,
        amount: doc.amount,
        category: doc.category,
        vendor: doc.vendor,
        description: doc.description,
        employeeName: doc.employeeName,
    }));
  } catch (error) {
    console.error('Failed to get expenses:', error);
    return [];
  }
}

export async function searchEmployees(name: string, companyId: string): Promise<any[]> {
    console.log(`[Mock Search] Searching for ${name} in company ${companyId}`);
    return [];
}
