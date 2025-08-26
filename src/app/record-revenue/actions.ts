
'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/app/auth/actions';
import { db } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

interface RevenueEntry {
  date: string; // Stored as YYYY-MM-DD string
  amount: number;
  source: string;
  description?: string;
}

export interface RevenueEntryDisplay extends RevenueEntry {
    id: string;
}

export async function addRevenueEntry(entry: RevenueEntry) {
  const user = await getCurrentUser();
  if (!user || !user.companyId) {
    return { success: false, message: 'Not authenticated or company not found.' };
  }

  try {
    const revenueData = {
      ...entry,
      companyId: user.companyId,
      createdAt: Timestamp.now(),
      date: Timestamp.fromDate(new Date(entry.date)),
    };
    await db.collection('revenue').add(revenueData);
    
    revalidatePath('/record-revenue');
    return { success: true, message: 'Revenue recorded successfully.' };
  } catch (error) {
    console.error("Error adding revenue:", error);
    return { success: false, message: 'Failed to record revenue.' };
  }
}

export async function getRevenueEntries(): Promise<RevenueEntryDisplay[]> {
  const user = await getCurrentUser();
  if (!user || !user.companyId) return [];

  try {
    const revenueSnapshot = await db.collection('revenue')
      .where('companyId', '==', user.companyId)
      .orderBy('date', 'desc')
      .get();
      
    const revenueEntries = revenueSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: (data.date as Timestamp).toDate().toISOString(),
      } as RevenueEntryDisplay;
    });
    
    return revenueEntries;
  } catch (error) {
    console.error("Error fetching revenue:", error);
    return [];
  }
}
