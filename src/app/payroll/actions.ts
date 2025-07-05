
'use server';

import { db } from '@/lib/firebaseConfig';
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  serverTimestamp,
  Timestamp,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';

export interface PayrollData {
  id?: string; // Existing payroll document ID
  employeeId: string;
  payPeriod: string; // YYYY-MM format
  grossSalary: number;
  advances: number;
  otherDeductions: number;
  netPayment: number;
  status: 'Pending' | 'Paid';
  customFields?: { [key: string]: number };
}

/**
 * Converts a Firestore document's data into a plain JavaScript object,
 * ensuring that any Firestore Timestamp objects are converted to ISO date strings,
 * which are safe to pass from Server to Client Components.
 * @param data The data object from a Firestore document.
 * @returns A new object with Timestamps serialized.
 */
function serializeFirestoreData(data: any) {
  const serializedData: { [key: string]: any } = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const value = data[key];
      // Check if the value is a Firestore Timestamp
      if (value instanceof Timestamp) {
        serializedData[key] = value.toDate().toISOString();
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Recursively serialize nested objects
        serializedData[key] = serializeFirestoreData(value);
      }
      else {
        serializedData[key] = value;
      }
    }
  }
  return serializedData;
}

export async function getPayrollDataForPeriod(companyId: string, payPeriod: string): Promise<any[]> {
    const employeesRef = collection(db, 'employees');
    const qEmployees = query(employeesRef, where('companyId', '==', companyId));
    
    const payrollsRef = collection(db, 'payrolls');
    const qPayrolls = query(payrollsRef, where('companyId', '==', companyId), where('payPeriod', '==', payPeriod));

    const [employeeSnapshot, payrollSnapshot] = await Promise.all([
        getDocs(qEmployees),
        getDocs(qPayrolls)
    ]);

    const payrollsMap = new Map(payrollSnapshot.docs.map(doc => [doc.data().employeeId, { id: doc.id, ...doc.data() }]));

    const employeesWithPayroll = employeeSnapshot.docs.map(doc => {
        const employeeData = doc.data();
        const existingPayrollData = payrollsMap.get(doc.id);
        const customFields = existingPayrollData?.customFields || {};

        const combinedData = {
            id: doc.id,
            ...employeeData,
            payrollId: existingPayrollData ? existingPayrollData.id : null,
            grossSalary: existingPayrollData ? existingPayrollData.grossSalary : (employeeData.salary || 0),
            advances: existingPayrollData ? existingPayrollData.advances : 0,
            otherDeductions: existingPayrollData ? existingPayrollData.otherDeductions : 0,
            netPayment: 0, // This will be calculated on the client-side for dynamic updates
            status: existingPayrollData ? existingPayrollData.status : 'Pending',
            customFields: customFields,
        };
        
        return serializeFirestoreData(combinedData);
    });

    return employeesWithPayroll;
}


export async function savePayrollData(companyId: string, payPeriod: string, payrolls: any[]): Promise<{ success: boolean; message: string }> {
    if (!companyId || !payPeriod || payrolls.length === 0) {
        return { success: false, message: "Invalid data provided." };
    }

    const batch = writeBatch(db);
    const timestamp = serverTimestamp();

    try {
        for (const data of payrolls) {
            let employeeId = data.employeeId;
            const { isNew, name, payrollId, grossSalary, advances, otherDeductions, netPayment, status, customFields } = data;

            // If it's a new employee, create the employee document first
            if (isNew) {
                const newEmployeeRef = doc(collection(db, 'employees'));
                employeeId = newEmployeeRef.id; // Use the new ID for the payroll record
                batch.set(newEmployeeRef, {
                    name,
                    salary: grossSalary || 0,
                    companyId,
                    position: 'N/A', // Default position for manually added
                    createdAt: timestamp,
                    updatedAt: timestamp,
                    addedById: 'payroll_manual_add',
                    addedBy: 'Payroll Page',
                });
            }

            const payrollPayload = {
                companyId,
                employeeId,
                payPeriod,
                grossSalary,
                advances,
                otherDeductions,
                netPayment,
                status,
                customFields: customFields || {},
                updatedAt: timestamp,
            };

            if (payrollId && !isNew) { // Update existing payroll record
                const payrollRef = doc(db, 'payrolls', payrollId);
                batch.update(payrollRef, payrollPayload);
            } else { // Create new payroll record (for new or existing employees)
                const payrollRef = doc(collection(db, 'payrolls'));
                batch.set(payrollRef, {
                    ...payrollPayload,
                    createdAt: timestamp,
                });
            }
        }

        await batch.commit();
        return { success: true, message: "Payroll data saved successfully." };
    } catch (error: any) {
        console.error("Error saving payroll data:", error);
        return { success: false, message: `Failed to save payroll data: ${error.message}` };
    }
}

export async function deletePayrollRecord(payrollId: string): Promise<{ success: boolean; message: string }> {
    if (!payrollId) {
        return { success: false, message: "Payroll ID is required." };
    }

    try {
        const payrollRef = doc(db, 'payrolls', payrollId);
        await deleteDoc(payrollRef);
        return { success: true, message: "Payroll record deleted successfully." };
    } catch (error: any) {
        console.error("Error deleting payroll record:", error);
        return { success: false, message: `Failed to delete payroll record: ${error.message}` };
    }
}
