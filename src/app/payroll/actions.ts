
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
        const employee = { id: doc.id, ...doc.data() };
        const existingPayroll = payrollsMap.get(employee.id);

        if (existingPayroll) {
            return {
                ...employee,
                payrollId: existingPayroll.id,
                grossSalary: existingPayroll.grossSalary,
                advances: existingPayroll.advances,
                otherDeductions: existingPayroll.otherDeductions,
                netPayment: existingPayroll.netPayment,
                status: existingPayroll.status,
            };
        } else {
            return {
                ...employee,
                payrollId: null,
                grossSalary: employee.salary || 0,
                advances: 0,
                otherDeductions: 0,
                netPayment: employee.salary || 0,
                status: 'Pending',
            };
        }
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
