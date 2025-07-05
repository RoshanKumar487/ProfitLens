
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
      } else {
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

        const combinedData = {
            id: doc.id,
            ...employeeData,
            payrollId: existingPayrollData ? existingPayrollData.id : null,
            grossSalary: existingPayrollData ? existingPayrollData.grossSalary : (employeeData.salary || 0),
            advances: existingPayrollData ? existingPayrollData.advances : 0,
            otherDeductions: existingPayrollData ? existingPayrollData.otherDeductions : 0,
            netPayment: existingPayrollData ? existingPayrollData.netPayment : (employeeData.salary || 0),
            status: existingPayrollData ? existingPayrollData.status : 'Pending',
        };
        
        // Serialize the combined data to make it safe to pass to the client component
        return serializeFirestoreData(combinedData);
    });

    return employeesWithPayroll;
}


export async function savePayrollData(companyId: string, payPeriod: string, payrolls: any[]): Promise<{ success: boolean; message: string }> {
    if (!companyId || !payPeriod || payrolls.length === 0) {
        return { success: false, message: "Invalid data provided." };
    }

    const batch = writeBatch(db);

    try {
        payrolls.forEach(data => {
            const { employeeId, payrollId, grossSalary, advances, otherDeductions, netPayment, status } = data;

            const payrollPayload = {
                companyId,
                employeeId,
                payPeriod,
                grossSalary,
                advances,
                otherDeductions,
                netPayment,
                status,
                updatedAt: serverTimestamp(),
            };

            if (payrollId) {
                const payrollRef = doc(db, 'payrolls', payrollId);
                batch.update(payrollRef, payrollPayload);
            } else {
                const payrollRef = doc(collection(db, 'payrolls'));
                batch.set(payrollRef, {
                    ...payrollPayload,
                    createdAt: serverTimestamp(),
                });
            }
        });

        await batch.commit();
        return { success: true, message: "Payroll data saved successfully." };
    } catch (error: any) {
        console.error("Error saving payroll data:", error);
        return { success: false, message: `Failed to save payroll data: ${error.message}` };
    }
}
