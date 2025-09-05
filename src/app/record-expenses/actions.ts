'use server';

import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/app/auth/actions';

export interface Expense {
    date: Date;
    amount: number;
    category: string;
    vendor?: string;
    description?: string;
    employeeName?: string;
}

export interface ExpenseDisplay extends Expense {
  id: string;
}

async function getCompanyId(): Promise<ObjectId | null> {
    const session = await getSession();
    if (!session?.companyId) {
        // Fallback for mock environment
        return new ObjectId("66a4f91e3e7649f49d21a221");
    }
    return new ObjectId(session.companyId);
}

export async function addExpenseEntry(expenseData: Expense) {
    const companyId = await getCompanyId();
    if (!companyId) {
        return { success: false, message: 'User not associated with a company.' };
    }

    try {
        const { db } = await connectToDatabase();
        await db.collection('expenses').insertOne({
            ...expenseData,
            companyId,
            createdAt: new Date(),
        });
        revalidatePath('/record-expenses');
        return { success: true, message: 'Expense recorded successfully.' };
    } catch (error: any) {
        console.error('Failed to add expense:', error);
        return { success: false, message: `Failed to record expense: ${error.message}` };
    }
}

export async function getRecentExpenses(): Promise<ExpenseDisplay[]> {
    const companyId = await getCompanyId();
    if (!companyId) {
        return [];
    }

    try {
        const { db } = await connectToDatabase();
        const expenses = await db.collection('expenses')
            .find({ companyId })
            .sort({ date: -1 })
            .limit(50)
            .toArray();

        // MongoDB driver returns BSON dates, which need to be converted for the client
        return expenses.map(doc => {
            const { _id, ...rest } = doc;
            return {
                id: _id.toHexString(),
                ...rest,
                date: new Date(doc.date).toISOString(),
            } as unknown as ExpenseDisplay;
        });
    } catch (error) {
        console.error('Failed to get expenses:', error);
        return [];
    }
}