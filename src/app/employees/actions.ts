
'use server';

import { revalidatePath } from 'next/cache';
import { uploadFileToStorage, deleteFileFromStorage } from '@/lib/firebaseStorageUtils';
import { type EmployeeInput } from '@/lib/schemas';
import { db } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

export interface EmployeeDisplay {
  id: string;
  name: string;
  position: string;
  salary: number;
  description?: string;
  dateOfBirth?: Date;
  joiningDate?: Date;
  fatherName?: string;
  motherName?: string;
  selfPhoneNo?: string;
  qualification?: string;
  experience?: string;
  permanentAddressHNo?: string;
  permanentAddressPS?: string;
  permanentAddressPost?: string;
  permanentAddressDist?: string;
  permanentAddressState?: string;
  permanentAddressPin?: string;
  guarantorName?: string;
  guarantorPhone?: string;
  height?: string;
  weight?: string;
  identificationMarks?: string;
  profilePictureUrl?: string;
  signatureUrl?: string;
  leftThumbImpressionUrl?: string;
}

export async function uploadFile(file: File, path: string, companyId: string): Promise<string> {
    const companyPath = `companies/${companyId}/${path}`;
    const downloadURL = await uploadFileToStorage(file, companyPath);
    return downloadURL;
}

export async function getEmployees(companyId: string): Promise<EmployeeDisplay[]> {
  const snapshot = await db.collection('employees').where('companyId', '==', companyId).get();
  return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        position: data.position,
        salary: data.salary,
        description: data.description,
        profilePictureUrl: data.profilePictureUrl,
      } as EmployeeDisplay;
  });
}

export async function getEmployeeById(employeeId: string, companyId: string): Promise<EmployeeDisplay | null> {
    const docRef = db.collection('employees').doc(employeeId);
    const doc = await docRef.get();

    if (!doc.exists || doc.data()?.companyId !== companyId) {
        return null;
    }

    const data = doc.data();
    if (!data) return null;

    // Convert Firestore Timestamps to JS Dates
    const convertTimestamp = (field: any) => field instanceof Timestamp ? field.toDate() : undefined;

    return {
        id: doc.id,
        ...data,
        joiningDate: convertTimestamp(data.joiningDate),
        dateOfBirth: convertTimestamp(data.dateOfBirth),
    } as EmployeeDisplay;
}

export async function updateEmployee(
  employeeId: string | null,
  companyId: string,
  data: EmployeeInput & { profilePictureUrl?: string | null, signatureUrl?: string | null, leftThumbImpressionUrl?: string | null }
) {
  try {
    const { profilePictureUrl, signatureUrl, leftThumbImpressionUrl, ...employeeData } = data;

    const payload = {
        ...employeeData,
        companyId,
        profilePictureUrl: profilePictureUrl || null,
        signatureUrl: signatureUrl || null,
        leftThumbImpressionUrl: leftThumbImpressionUrl || null,
        updatedAt: Timestamp.now(),
    };

    if (employeeId) {
        await db.collection('employees').doc(employeeId).update(payload);
    } else {
        await db.collection('employees').add({ ...payload, createdAt: Timestamp.now() });
    }

    revalidatePath('/employees');
    return { success: true, message: `Employee ${employeeId ? 'updated' : 'added'} successfully.` };
  } catch(error) {
    console.error("Error updating employee:", error);
    return { success: false, message: "Failed to save employee data." };
  }
}

export async function deleteEmployee(employeeId: string, companyId: string) {
    try {
        const docRef = db.collection('employees').doc(employeeId);
        const doc = await docRef.get();
        const data = doc.data();

        if (!doc.exists || data?.companyId !== companyId) {
            return { success: false, message: "Employee not found or permission denied." };
        }

        // Delete associated files from storage
        if (data.profilePictureUrl) await deleteFileFromStorage(data.profilePictureUrl);
        if (data.signatureUrl) await deleteFileFromStorage(data.signatureUrl);
        if (data.leftThumbImpressionUrl) await deleteFileFromStorage(data.leftThumbImpressionUrl);

        await docRef.delete();
        
        revalidatePath('/employees');
        return { success: true, message: "Employee deleted successfully." };
    } catch (error) {
        console.error("Error deleting employee:", error);
        return { success: false, message: "Failed to delete employee." };
    }
}
