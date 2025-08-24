
'use server';

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

// Mock Database
let MOCK_REVENUE: RevenueEntryDisplay[] = [
    { id: 'rev1', date: new Date().toISOString(), amount: 2500, source: 'Client A Payment', description: 'Invoice #INV001' },
    { id: 'rev2', date: new Date(Date.now() - 86400000 * 5).toISOString(), amount: 8000, source: 'Product Sale', description: 'Online Store Order #12345' },
];

export async function addRevenueEntry(entry: RevenueEntry) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, message: 'Not authenticated.' };
  }

  const newEntry = { ...entry, id: `rev${Date.now()}` };
  MOCK_REVENUE.unshift(newEntry);
  
  revalidatePath('/record-revenue');
  return { success: true, message: 'Revenue recorded successfully.' };
}

export async function getRevenueEntries(): Promise<RevenueEntryDisplay[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  return [...MOCK_REVENUE].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
