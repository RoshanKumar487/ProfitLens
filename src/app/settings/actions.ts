
'use server';

import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getSession } from '@/app/auth/actions';

export interface CustomItemColumn {
  id: string;
  label: string;
}

export interface InvoiceSettings {
  customItemColumns: CustomItemColumn[];
  defaultPaymentTermsDays: number;
  defaultHsnCode: string;
  defaultNotes: string;
}

export interface CustomPayrollField {
  id: string;
  label: string;
  type: 'number' | 'string' | 'date';
}

export interface PayrollSettings {
  customFields: CustomPayrollField[];
  pfPercentage: number;
  esiPercentage: number;
}

export interface CustomProductField {
  id: string;
  label: string;
}

export interface ProductSettings {
    customFields: CustomProductField[];
}

async function getCompanyId(): Promise<ObjectId | null> {
    const session = await getSession();
    if (!session?.companyId) return null;
    return new ObjectId(session.companyId);
}

// --- INVOICE SETTINGS ---
export async function getInvoiceSettings(): Promise<InvoiceSettings> {
    const companyId = await getCompanyId();
    if (!companyId) return { customItemColumns: [], defaultPaymentTermsDays: 30, defaultHsnCode: '', defaultNotes: '' };
    try {
        const { db } = await connectToDatabase();
        const settings = await db.collection('settings').findOne({ companyId, type: 'invoice' });
        return settings?.data ?? { customItemColumns: [], defaultPaymentTermsDays: 30, defaultHsnCode: '', defaultNotes: '' };
    } catch (error) {
        console.error("Failed to get invoice settings:", error);
        return { customItemColumns: [], defaultPaymentTermsDays: 30, defaultHsnCode: '', defaultNotes: '' };
    }
}

export async function saveInvoiceSettings(settings: InvoiceSettings) {
    const companyId = await getCompanyId();
    if (!companyId) return { success: false, message: 'User not authenticated.' };
    try {
        const { db } = await connectToDatabase();
        await db.collection('settings').updateOne(
            { companyId, type: 'invoice' },
            { $set: { data: settings, updatedAt: new Date() } },
            { upsert: true }
        );
        return { success: true, message: 'Invoice settings saved successfully.' };
    } catch (error: any) {
        return { success: false, message: `Failed to save settings: ${error.message}` };
    }
}

// --- PAYROLL SETTINGS ---
export async function getPayrollSettings(): Promise<PayrollSettings> {
    const companyId = await getCompanyId();
    if (!companyId) return { customFields: [], pfPercentage: 12, esiPercentage: 0.75 };
    try {
        const { db } = await connectToDatabase();
        const settings = await db.collection('settings').findOne({ companyId, type: 'payroll' });
        return settings?.data ?? { customFields: [], pfPercentage: 12, esiPercentage: 0.75 };
    } catch (error) {
        console.error("Failed to get payroll settings:", error);
        return { customFields: [], pfPercentage: 12, esiPercentage: 0.75 };
    }
}

export async function savePayrollSettings(settings: PayrollSettings) {
    const companyId = await getCompanyId();
    if (!companyId) return { success: false, message: 'User not authenticated.' };
    try {
        const { db } = await connectToDatabase();
        await db.collection('settings').updateOne(
            { companyId, type: 'payroll' },
            { $set: { data: settings, updatedAt: new Date() } },
            { upsert: true }
        );
        return { success: true, message: 'Payroll settings saved successfully.' };
    } catch (error: any) {
        return { success: false, message: `Failed to save settings: ${error.message}` };
    }
}

// --- PRODUCT SETTINGS ---
export async function getProductSettings(): Promise<ProductSettings> {
    const companyId = await getCompanyId();
    if (!companyId) return { customFields: [] };
    try {
        const { db } = await connectToDatabase();
        const settings = await db.collection('settings').findOne({ companyId, type: 'product' });
        return settings?.data ?? { customFields: [] };
    } catch (error) {
        console.error("Failed to get product settings:", error);
        return { customFields: [] };
    }
}

export async function saveProductSettings(settings: ProductSettings) {
    const companyId = await getCompanyId();
    if (!companyId) return { success: false, message: 'User not authenticated.' };
    try {
        const { db } = await connectToDatabase();
        await db.collection('settings').updateOne(
            { companyId, type: 'product' },
            { $set: { data: settings, updatedAt: new Date() } },
            { upsert: true }
        );
        return { success: true, message: 'Product settings saved successfully.' };
    } catch (error: any) {
        return { success: false, message: `Failed to save settings: ${error.message}` };
    }
}
