'use server';

import { db } from '@/lib/firebaseConfig';
import { doc, getDoc, setDoc, Timestamp, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { uploadFileToStorage, uploadBase64ToStorage, deleteFileFromStorage } from '@/lib/firebaseStorageUtils';


interface CompanyDetailsFirestore {
  name: string;
  address: string; // Street address
  city: string;
  state: string; // State or Province
  country: string;
  gstin: string;
  pan?: string;
  phone: string;
  email: string;
  website: string;
  accountNumber?: string;
  ifscCode?: string;
  bankName?: string;
  branch?: string;
  signatureUrl?: string;
  signatureStoragePath?: string;
  stampUrl?: string;
  stampStoragePath?: string;
  publicCompanyId?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export async function saveCompanyDetails(
  companyId: string,
  details: Partial<CompanyDetailsFirestore>,
  files: { signatureFile?: File | null; stampFile?: File | null, signatureDataUrl?: string | null }
): Promise<{ success: boolean; message: string; updatedDetails?: Partial<CompanyDetailsFirestore> }> {
  if (!companyId) {
    return { success: false, message: 'User not authenticated or company not found.' };
  }

  const companyDocRef = doc(db, 'companyProfiles', companyId);

  try {
    const docSnap = await getDoc(companyDocRef);
    const existingData = docSnap.exists() ? docSnap.data() : {};
    
    // Handle Signature Upload or Drawing
    if (files.signatureDataUrl) {
      if (existingData.signatureStoragePath) {
        await deleteFileFromStorage(existingData.signatureStoragePath);
      }
      const path = `companyProfiles/${companyId}/signature_drawn.png`;
      const url = await uploadBase64ToStorage(files.signatureDataUrl, path);
      details.signatureUrl = url;
      details.signatureStoragePath = path;
    } else if (files.signatureFile) {
      if (existingData.signatureStoragePath) {
        await deleteFileFromStorage(existingData.signatureStoragePath);
      }
      const path = `companyProfiles/${companyId}/signature.${files.signatureFile.name.split('.').pop()}`;
      const url = await uploadFileToStorage(files.signatureFile, path);
      details.signatureUrl = url;
      details.signatureStoragePath = path;
    }

    // Handle Stamp Upload
    if (files.stampFile) {
       if (existingData.stampStoragePath) {
        await deleteFileFromStorage(existingData.stampStoragePath);
      }
      const path = `companyProfiles/${companyId}/stamp.${files.stampFile.name.split('.').pop()}`;
      const url = await uploadFileToStorage(files.stampFile, path);
      details.stampUrl = url;
      details.stampStoragePath = path;
    }

    const detailsToSave: Partial<CompanyDetailsFirestore> = { ...details, updatedAt: Timestamp.now() };
    await setDoc(companyDocRef, detailsToSave, { merge: true });

    return {
      success: true,
      message: 'Company details saved successfully.',
      updatedDetails: {
        signatureUrl: details.signatureUrl,
        stampUrl: details.stampUrl
      }
    };
  } catch (error: any) {
    console.error('Error saving company details:', error);
    return { success: false, message: `Failed to save details: ${error.message}` };
  }
}
