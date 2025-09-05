
'use server';

import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/app/auth/actions';

export interface RevenueEntry {
    date: Date;
    amount: number;
    source: string;
    description?: string;
}

export interface RevenueEntryDisplay extends RevenueEntry {
    id: string;
}

async function getCompanyId(): Promise<ObjectId | null> {
    const session = await getSession();
    if (!session?.companyId) {
        return null;
    }
    return new ObjectId(session.companyId);
}

export async function addRevenueEntry(data: RevenueEntry) {
    const companyId = await getCompanyId();
    if (!companyId) {
        return { success: false, message: 'User not associated with a company.' };
    }
    
    try {
        const { db } = await connectToDatabase();
        await db.collection('revenue').insertOne({ ...data, companyId, createdAt: new Date() });
        revalidatePath('/record-revenue');
        return { success: true, message: 'Revenue recorded successfully.' };
    } catch (error: any) {
        return { success: false, message: `Failed to record revenue: ${error.message}` };
    }
}

export async function getRecentRevenue(): Promise<RevenueEntryDisplay[]> {
    const companyId = await getCompanyId();
    if (!companyId) return [];

    try {
        const { db } = await connectToDatabase();
        const revenue = await db.collection('revenue')
            .find({ companyId })
            .sort({ date: -1 })
            .limit(50)
            .toArray();
            
        return revenue.map(doc => {
            const { _id, companyId, ...rest } = doc;
            return {
                id: _id.toHexString(),
                date: new Date(doc.date),
                amount: doc.amount,
                source: doc.source,
                description: doc.description,
            };
        });
    } catch (error) {
        console.error('Failed to get revenue:', error);
        return [];
    }
}
