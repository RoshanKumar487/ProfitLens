'use server';

import { db } from '@/lib/firebaseConfig';
import { doc, updateDoc, deleteDoc, Timestamp, serverTimestamp } from 'firebase/firestore';

export interface RevenueUpdateData {
  date: Date;
  amount: number;
  source: string;
  description: string;
}

export async function updateRevenueEntry(id: string, updates: RevenueUpdateData): Promise<{ success: boolean; message: string }> {
  try {
    const revenueRef = doc(db, 'revenueEntries', id);
    await updateDoc(revenueRef, { 
      ...updates,
      date: Timestamp.fromDate(updates.date),
      updatedAt: serverTimestamp() 
    });
    return { success: true, message: 'Revenue entry updated successfully.' };
  } catch (error: any) {
    console.error("Error updating revenue entry:", error);
    return { success: false, message: `Failed to update revenue entry: ${error.message}` };
  }
}

export async function deleteRevenueEntry(id: string): Promise<{ success: boolean; message: string }> {
  try {
    await deleteDoc(doc(db, 'revenueEntries', id));
    return { success: true, message: 'Revenue entry deleted successfully.' };
  } catch (error: any) {
    console.error("Error deleting revenue entry:", error);
    return { success: false, message: `Failed to delete revenue entry: ${error.message}` };
  }
}
