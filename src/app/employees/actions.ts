
'use server';

import { db } from '@/lib/firebaseConfig';
import { collection, doc, updateDoc, deleteDoc, writeBatch, serverTimestamp } from 'firebase/firestore';

// Explicitly define the types for employee data to ensure consistency.
// Note: This matches the structure in the employees page component.
interface EmployeeData {
  name: string;
  position: string;
  salary: number;
  description?: string;
}

export async function bulkAddEmployees(
  employees: EmployeeData[],
  companyId: string,
  addedById: string,
  addedBy: string
): Promise<{ success: boolean; message: string; count: number }> {
  if (!companyId || !addedById) {
    return { success: false, message: 'User or company information is missing.', count: 0 };
  }
  if (!employees || employees.length === 0) {
    return { success: false, message: 'No employee data provided.', count: 0 };
  }

  const batch = writeBatch(db);
  let processedCount = 0;

  try {
    employees.forEach(employee => {
      // Basic validation for each employee record
      if (employee.name && employee.position && typeof employee.salary === 'number' && employee.salary >= 0) {
        const newEmployeeRef = doc(collection(db, 'employees'));
        batch.set(newEmployeeRef, {
          ...employee,
          name_lowercase: employee.name.toLowerCase(),
          companyId,
          addedById,
          addedBy,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          profilePictureUrl: '',
          profilePictureStoragePath: '',
          associatedFileUrl: '',
          associatedFileName: '',
          associatedFileStoragePath: '',
        });
        processedCount++;
      }
    });
    
    if (processedCount === 0) {
        return { success: false, message: "No valid employee records found to import.", count: 0 };
    }

    await batch.commit();
    return { success: true, message: `Successfully imported ${processedCount} employees.`, count: processedCount };
  } catch (error: any) {
    console.error("Error bulk adding employees:", error);
    return { success: false, message: `Failed to import employees: ${error.message}`, count: 0 };
  }
}
