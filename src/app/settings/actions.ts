
'use server';

import { db } from '@/lib/firebaseConfig';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';

export interface CustomItemColumn {
  id: string;
  label: string;
}

export interface InvoiceSettings {
  customItemColumns: CustomItemColumn[];
  defaultPaymentTermsDays?: number;
  defaultHsnCode?: string;
}

export interface CustomPayrollField {
  id: string;
  label: string;
  type: 'number' | 'string' | 'date';
}

export interface PayrollSettings {
  customFields: CustomPayrollField[];
}


export async function getInvoiceSettings(companyId: string): Promise<InvoiceSettings> {
  if (!companyId) {
    throw new Error('Company ID is required to get invoice settings.');
  }

  const companyDocRef = doc(db, 'companyProfiles', companyId);
  const docSnap = await getDoc(companyDocRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    // Return existing settings or default if not present
    return data.invoiceSettings || { customItemColumns: [], defaultPaymentTermsDays: 30, defaultHsnCode: '' };
  } else {
    // Return default settings for a company profile that might not have been saved yet
    return { customItemColumns: [], defaultPaymentTermsDays: 30, defaultHsnCode: '' };
  }
}

export async function saveInvoiceSettings(
  companyId: string,
  settings: InvoiceSettings
): Promise<{ success: boolean; message: string }> {
  if (!companyId) {
    return { success: false, message: 'Company ID is required to save settings.' };
  }

  try {
    const companyDocRef = doc(db, 'companyProfiles', companyId);
    await setDoc(companyDocRef, { invoiceSettings: settings }, { merge: true });
    return { success: true, message: 'Invoice settings saved successfully.' };
  } catch (error: any) {
    console.error('Error saving invoice settings:', error);
    return { success: false, message: `Failed to save settings: ${error.message}` };
  }
}

export async function getPayrollSettings(companyId: string): Promise<PayrollSettings> {
  if (!companyId) {
    throw new Error('Company ID is required to get payroll settings.');
  }
  const companyDocRef = doc(db, 'companyProfiles', companyId);
  const docSnap = await getDoc(companyDocRef);

  if (docSnap.exists()) {
    const settings = docSnap.data().payrollSettings || { customFields: [] };
    // Add default type for backward compatibility
    settings.customFields = settings.customFields.map((field: any) => ({
      ...field,
      type: field.type || 'number', // Default to 'number' if type is missing
    }));
    return settings;
  } else {
    return { customFields: [] };
  }
}

export async function savePayrollSettings(
  companyId: string,
  settings: PayrollSettings
): Promise<{ success: boolean; message: string }> {
  if (!companyId) {
    return { success: false, message: 'Company ID is required to save settings.' };
  }

  try {
    const companyDocRef = doc(db, 'companyProfiles', companyId);
    await setDoc(companyDocRef, { payrollSettings: settings }, { merge: true });
    return { success: true, message: 'Payroll settings saved successfully.' };
  } catch (error: any) {
    console.error('Error saving payroll settings:', error);
    return { success: false, message: `Failed to save settings: ${error.message}` };
  }
}
