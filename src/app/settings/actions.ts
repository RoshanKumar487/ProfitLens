
'use server';

import { db } from '@/lib/firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export interface CustomItemColumn {
  id: string;
  label: string;
}

export interface InvoiceSettings {
  customItemColumns: CustomItemColumn[];
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
    return data.invoiceSettings || { customItemColumns: [] };
  } else {
    // Return default settings for a company profile that might not have been saved yet
    return { customItemColumns: [] };
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
    await updateDoc(companyDocRef, {
      invoiceSettings: settings,
    });
    return { success: true, message: 'Invoice settings saved successfully.' };
  } catch (error: any) {
    console.error('Error saving invoice settings:', error);
    return { success: false, message: `Failed to save settings: ${error.message}` };
  }
}
