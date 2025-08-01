
'use server';

import { connectToDatabase } from '@/lib/mongodb';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/app/auth/actions';

interface RevenueEntry {
  date: string;
  amount: number;
  source: string;
  description?: string;
}

export interface RevenueEntryDisplay extends RevenueEntry {
    id: string;
}

export async function addRevenueEntry(entry: RevenueEntry) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, message: 'Not authenticated.' };
  }

  try {
    const { db } = await connectToDatabase();
    await db.collection('revenues').insertOne({
      ...entry,
      userId: user.uid,
      companyId: user.companyId,
      createdAt: new Date(),
    });
    
    revalidatePath('/record-revenue');
    return { success: true, message: 'Revenue recorded successfully.' };
  } catch (error: any) {
    console.error('Failed to add revenue:', error);
    return { success: false, message: `Failed to add revenue: ${error.message}` };
  }
}

export async function getRevenueEntries(): Promise<RevenueEntryDisplay[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  try {
    const { db } = await connectToDatabase();
    const entries = await db.collection('revenues')
      .find({ companyId: user.companyId })
      .sort({ date: -1 })
      .limit(100)
      .toArray();

    return entries.map(doc => ({
        id: doc._id.toHexString(),
        date: doc.date,
        amount: doc.amount,
        source: doc.source,
        description: doc.description,
    })) as RevenueEntryDisplay[];
  } catch (error) {
    console.error('Failed to get revenue entries:', error);
    return [];
  }
}
