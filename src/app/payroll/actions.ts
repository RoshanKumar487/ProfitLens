
'use server';

import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/app/auth/actions';

export interface EmployeeWithPayroll {
  id: string; // employeeId for existing, tempId for new
  name: string;
  position?: string;
  uan?: string;
  joiningDate?: Date;
  profilePictureUrl?: string;
  payrollId: string | null;
  baseSalary: number;
  workingDays: number;
  presentDays: number;
  otDays: number;
  advances: number;
  otherDeductions: number;
  status: 'Pending' | 'Paid';
  customFields: { [key: string]: any };
  isNew?: boolean;

  // Calculated fields
  proratedSalary?: number;
  overtimePay?: number;
  grossEarnings?: number;
  pfContribution?: number;
  esiContribution?: number;
  totalDeductions?: number;
  netPayment?: number;
}


async function getCompanyId(): Promise<ObjectId | null> {
    const session = await getSession();
    if (!session?.companyId) {
        return null;
    }
    return new ObjectId(session.companyId);
}

export async function getPayrollDataForPeriod(period: string): Promise<EmployeeWithPayroll[]> {
    const companyId = await getCompanyId();
    if (!companyId) return [];

    try {
        const { db } = await connectToDatabase();
        
        // 1. Fetch all employees
        const employees = await db.collection('employees').find({ companyId }).toArray();
        
        // 2. Fetch existing payroll data for the period
        const payrolls = await db.collection('payrolls').find({ companyId, period }).toArray();
        const payrollMap = new Map(payrolls.map(p => [p.employeeId.toHexString(), p]));

        // 3. Combine data
        const combinedData: EmployeeWithPayroll[] = employees.map(emp => {
            const payroll = payrollMap.get(emp._id.toHexString());
            
            return {
                id: emp._id.toHexString(),
                name: emp.name,
                position: emp.position,
                uan: emp.uan,
                joiningDate: emp.joiningDate,
                profilePictureUrl: emp.profilePictureUrl,
                payrollId: payroll ? payroll._id.toHexString() : null,
                baseSalary: payroll?.baseSalary ?? emp.salary, // Default to employee's salary
                workingDays: payroll?.workingDays ?? 0,
                presentDays: payroll?.presentDays ?? 0,
                otDays: payroll?.otDays ?? 0,
                advances: payroll?.advances ?? 0,
                otherDeductions: payroll?.otherDeductions ?? 0,
                status: payroll?.status ?? 'Pending',
                customFields: payroll?.customFields ?? {},
            };
        });
        
        return combinedData;

    } catch (error) {
        console.error("Failed to get payroll data:", error);
        throw new Error("Could not fetch payroll data.");
    }
}


export async function savePayrollData(period: string, payrollData: EmployeeWithPayroll[]) {
    const companyId = await getCompanyId();
    if (!companyId) return { success: false, message: "User not authenticated." };

    try {
        const { db } = await connectToDatabase();
        const collection = db.collection('payrolls');
        const batch = collection.initializeUnorderedBulkOp();

        for (const data of payrollData) {
            const { id, isNew, payrollId, name, position, uan, joiningDate, profilePictureUrl, ...payrollFields } = data;
            
            const doc = {
                ...payrollFields,
                companyId,
                period,
                employeeId: new ObjectId(id),
                updatedAt: new Date(),
            };

            if (payrollId) {
                // Update existing payroll record
                batch.find({ _id: new ObjectId(payrollId), companyId }).updateOne({ $set: doc });
            } else {
                // Insert new payroll record
                batch.insert({ ...doc, createdAt: new Date() });
            }
        }

        if (batch.length > 0) {
            await batch.execute();
        }

        revalidatePath('/payroll');
        return { success: true, message: 'Payroll saved successfully.' };
    } catch (error: any) {
        console.error('Failed to save payroll:', error);
        return { success: false, message: `Failed to save payroll: ${error.message}` };
    }
}


export async function deletePayrollRecord(payrollId: string) {
    const companyId = await getCompanyId();
    if (!companyId || !ObjectId.isValid(payrollId)) {
        return { success: false, message: "Invalid payroll ID or company." };
    }
    try {
        const { db } = await connectToDatabase();
        await db.collection('payrolls').deleteOne({ _id: new ObjectId(payrollId), companyId });
        revalidatePath('/payroll');
        return { success: true, message: 'Payroll record deleted successfully.' };
    } catch (error: any) {
        console.error('Failed to delete payroll record:', error);
        return { success: false, message: `Failed to delete record: ${error.message}` };
    }
}
