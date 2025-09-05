
'use server';

import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/app/auth/actions';
import type { InvoiceSettings } from '@/app/settings/actions';
import { MOCK_COMPANY_PROFILE, MOCK_FULL_INVOICE, MOCK_INVOICES } from '@/lib/mock-data';

// Interface for a single item within an invoice
export interface InvoiceItem {
  id: string;
  description: string;
  hsnNo?: string;
  quantity: number;
  unitPrice: number;
  customFields?: { [key: string]: string };
}

// Interface for the complete invoice data structure used for creation and display
export interface FullInvoice {
  clientName: string;
  clientEmail?: string;
  clientAddress?: string;
  clientGstin?: string;
  subtotal: number;
  discountType: 'fixed' | 'percentage';
  discountValue: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  isRcmApplicable: boolean;
  amount: number;
  dueDate?: Date;
  status: 'Paid' | 'Pending' | 'Overdue' | 'Draft';
  issuedDate: Date;
  items: InvoiceItem[];
  notes?: string;
  invoiceNumber: string;
}

// Interface for displaying a summary of an invoice in a list
export interface InvoiceDisplay {
  id: string;
  invoiceNumber: string;
  clientName: string;
  amount: number;
  dueDate: Date;
  status: 'Paid' | 'Pending' | 'Overdue' | 'Draft';
  issuedDate: Date;
}

export interface FullInvoiceDisplay extends FullInvoice {
  id: string;
}


// Interface for the company's profile details stored in Firestore
export interface CompanyDetailsFirestore {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  gstin?: string;
  pan?: string;
  phone?: string;
  email?: string;
  website?: string;
  accountNumber?: string;
  ifscCode?: string;
  bankName?: string;
  branch?: string;
  signatureUrl?: string;
  stampUrl?: string;
}


async function getCompanyId(): Promise<ObjectId | null> {
    const session = await getSession();
    if (!session?.companyId) {
        return new ObjectId("66a4f91e3e7649f49d21a221"); // Fallback for mock/dev
    }
    return new ObjectId(session.companyId);
}

/**
 * Fetches all invoices for the current user's company.
 * @returns A promise that resolves to an array of invoices.
 */
export async function getInvoices(): Promise<InvoiceDisplay[]> {
  const companyId = await getCompanyId();
  if (!companyId) return [];

  try {
    const { db } = await connectToDatabase();
    const invoices = await db.collection('invoices')
      .find({ companyId })
      .sort({ issuedDate: -1 })
      .toArray();

    return invoices.map(doc => ({
      id: doc._id.toHexString(),
      invoiceNumber: doc.invoiceNumber,
      clientName: doc.clientName,
      amount: doc.amount,
      dueDate: new Date(doc.dueDate),
      status: doc.status,
      issuedDate: new Date(doc.issuedDate),
    }));
  } catch (error) {
    console.error('Failed to get invoices:', error);
    return MOCK_INVOICES;
  }
}

/**
 * Fetches a single invoice by its ID.
 * @param invoiceId The ID of the invoice to fetch.
 * @returns A promise that resolves to the invoice object or null if not found.
 */
export async function getInvoiceById(invoiceId: string): Promise<FullInvoiceDisplay | null> {
    const companyId = await getCompanyId();
    if (!companyId || !ObjectId.isValid(invoiceId)) return null;

    try {
        const { db } = await connectToDatabase();
        const doc = await db.collection('invoices').findOne({
            _id: new ObjectId(invoiceId),
            companyId: companyId,
        });

        if (!doc) {
             // Fallback to mock for demo purposes if not found
            return MOCK_FULL_INVOICE.id === invoiceId ? MOCK_FULL_INVOICE : null;
        };

        const { _id, companyId: docCompanyId, ...rest } = doc;
        
        const fullInvoiceData: FullInvoice = {
            clientName: doc.clientName,
            subtotal: doc.subtotal,
            discountType: doc.discountType,
            discountValue: doc.discountValue,
            discountAmount: doc.discountAmount,
            taxRate: doc.taxRate,
            taxAmount: doc.taxAmount,
            isRcmApplicable: doc.isRcmApplicable,
            amount: doc.amount,
            status: doc.status,
            issuedDate: new Date(doc.issuedDate),
            items: doc.items.map((item: any) => ({...item, id: item.id || new ObjectId().toHexString()})),
            invoiceNumber: doc.invoiceNumber,
            clientEmail: doc.clientEmail,
            clientAddress: doc.clientAddress,
            clientGstin: doc.clientGstin,
            dueDate: doc.dueDate ? new Date(doc.dueDate) : undefined,
            notes: doc.notes,
        };

        return {
            id: _id.toHexString(),
            ...fullInvoiceData,
        };

    } catch (error) {
        console.error('Failed to get invoice by ID:', error);
        // Fallback to mock for demo purposes if error
        return MOCK_FULL_INVOICE.id === invoiceId ? MOCK_FULL_INVOICE : null;
    }
}


/**
 * Adds a new invoice to the database.
 * @param invoiceData The data for the new invoice.
 * @returns A promise that resolves to an object indicating success or failure.
 */
export async function addInvoice(invoiceData: FullInvoice) {
  const companyId = await getCompanyId();
  if (!companyId) {
    return { success: false, message: 'User not associated with a company.' };
  }

  try {
    const { db } = await connectToDatabase();
    const result = await db.collection('invoices').insertOne({
      ...invoiceData,
      companyId,
      createdAt: new Date(),
    });
    revalidatePath('/invoicing');
    return { success: true, message: 'Invoice created successfully.', invoiceId: result.insertedId.toHexString() };
  } catch (error: any) {
    return { success: false, message: `Failed to create invoice: ${error.message}` };
  }
}


/**
 * Deletes an invoice from the database.
 * @param invoiceId The ID of the invoice to delete.
 * @returns A promise that resolves to an object indicating success or failure.
 */
export async function deleteInvoice(invoiceId: string) {
    const companyId = await getCompanyId();
    if (!companyId || !ObjectId.isValid(invoiceId)) {
        return { success: false, message: 'Invalid invoice ID or company.' };
    }

    try {
        const { db } = await connectToDatabase();
        await db.collection('invoices').deleteOne({
            _id: new ObjectId(invoiceId),
            companyId,
        });
        revalidatePath('/invoicing');
        return { success: true, message: 'Invoice deleted successfully.' };
    } catch (error: any) {
        return { success: false, message: `Failed to delete invoice: ${error.message}` };
    }
}

/**
 * Fetches the company profile details.
 * @returns The company profile details or null if not found.
 */
export async function getCompanyProfile(): Promise<CompanyDetailsFirestore | null> {
    const companyId = await getCompanyId();
    if (!companyId) return null;
    
    try {
        const { db } = await connectToDatabase();
        const company = await db.collection('companies').findOne({ _id: companyId });

        if (company) {
            const { _id, ...profileData } = company;
            return profileData as CompanyDetailsFirestore;
        }
        return MOCK_COMPANY_PROFILE;

    } catch (error) {
        console.error('Failed to get company profile:', error);
        return MOCK_COMPANY_PROFILE;
    }
}
