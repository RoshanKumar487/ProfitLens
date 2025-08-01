
'use server';

import { connectToDatabase } from '@/lib/mongodb';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/app/auth/actions';
import { ObjectId } from 'mongodb';

export interface EmployeeWithPayroll {
  id: string; // employeeId for existing, tempId for new
  name: string;
  position?: string;
  uan?: string;
  joiningDate?: Date;
  profilePictureUrl?: string;
  payrollId: string | null;
  baseSalary: number; // Base salary from employee record
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


export async function getPayrollDataForPeriod(companyId: string, period: string): Promise<EmployeeWithPayroll[]> {
  try {
    const { db } = await connectToDatabase();
    
    // 1. Get all employees for the company
    const employees = await db.collection('employees').find({ companyId }).toArray();
    
    // 2. Get existing payroll records for the period
    const payrolls = await db.collection('payrolls').find({ companyId, period }).toArray();
    const payrollsMap = new Map(payrolls.map(p => [p.employeeId.toString(), p]));

    // 3. Combine employee data with payroll data
    const combinedData = employees.map(emp => {
      const payrollRecord = payrollsMap.get(emp._id.toString());
      return {
        id: emp._id.toString(),
        name: emp.name,
        position: emp.position,
        uan: emp.uan,
        joiningDate: emp.joiningDate,
        profilePictureUrl: emp.profilePictureUrl,
        baseSalary: emp.salary || 0,
        payrollId: payrollRecord ? payrollRecord._id.toString() : null,
        workingDays: payrollRecord ? payrollRecord.workingDays : new Date(period).getDate(),
        presentDays: payrollRecord ? payrollRecord.presentDays : new Date(period).getDate(),
        otDays: payrollRecord ? payrollRecord.otDays : 0,
        advances: payrollRecord ? payrollRecord.advances : 0,
        otherDeductions: payrollRecord ? payrollRecord.otherDeductions : 0,
        status: payrollRecord ? payrollRecord.status : 'Pending',
        customFields: payrollRecord ? payrollRecord.customFields : {},
      };
    });

    return combinedData as EmployeeWithPayroll[];
  } catch (error) {
    console.error("Failed to get payroll data:", error);
    throw new Error("Could not fetch payroll data.");
  }
}

export async function savePayrollData(companyId: string, period: string, payrollData: EmployeeWithPayroll[]) {
  try {
    const { db } = await connectToDatabase();
    const bulkOps = payrollData.map(p => {
      const { id, name, position, uan, joiningDate, profilePictureUrl, baseSalary, isNew, ...payrollRecord } = p;
      
      const payload = {
        companyId,
        period,
        employeeId: new ObjectId(id),
        ...payrollRecord
      };

      if (payrollRecord.payrollId && ObjectId.isValid(payrollRecord.payrollId)) {
        return {
          updateOne: {
            filter: { _id: new ObjectId(payrollRecord.payrollId), companyId },
            update: { $set: payload },
            upsert: true
          }
        };
      } else {
        // Remove null payrollId before insert
        delete (payload as any).payrollId;
        return {
          insertOne: {
            document: payload
          }
        };
      }
    });

    if (bulkOps.length > 0) {
      await db.collection('payrolls').bulkWrite(bulkOps);
    }

    revalidatePath('/payroll');
    return { success: true, message: 'Payroll saved successfully.' };
  } catch (error: any) {
    console.error('Failed to save payroll:', error);
    return { success: false, message: `Failed to save payroll: ${error.message}` };
  }
}


export async function deletePayrollRecord(companyId: string, payrollId: string) {
    if (!ObjectId.isValid(payrollId)) {
        return { success: false, message: "Invalid payroll record ID." };
    }
    try {
        const { db } = await connectToDatabase();
        const result = await db.collection('payrolls').deleteOne({
            _id: new ObjectId(payrollId),
            companyId: companyId,
        });

        if (result.deletedCount === 0) {
            return { success: false, message: "Record not found or you don't have permission." };
        }

        revalidatePath('/payroll');
        return { success: true, message: 'Payroll record deleted successfully.' };
    } catch (error: any) {
        console.error('Failed to delete payroll record:', error);
        return { success: false, message: `Failed to delete record: ${error.message}` };
    }
}


export async function sendPayslipEmail(companyId: string, to: string, payslipPdfDataUri: string, employeeName: string, period: string) {
  // This is a placeholder for a real email sending service (e.g., Nodemailer with SendGrid/Resend)
  // For the demo, we will just log the action.
  console.log(`[Mock Email Service] Sending payslip to ${to} for ${employeeName} for period ${period}.`);
  
  if (!process.env.EMAIL_SERVER_USER) {
    return { success: false, message: "Email service is not configured on the server." };
  }
  
  // In a real implementation, you would:
  // 1. Configure a transporter with Nodemailer
  // 2. Create the email content (HTML body)
  // 3. Attach the PDF from the data URI
  // 4. Send the email
  
  return { success: true, message: `Payslip email sent to ${to}.` };
}
