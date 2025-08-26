
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';


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
    const employeesSnapshot = await db.collection('employees').where('companyId', '==', companyId).get();
    const employees = employeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const payrollsSnapshot = await db.collection('payrolls').where('companyId', '==', companyId).where('period', '==', period).get();
    const payrollsMap = new Map(payrollsSnapshot.docs.map(p => [p.data().employeeId, { id: p.id, ...p.data() }]));

    const combinedData = employees.map(emp => {
      const payrollRecord = payrollsMap.get(emp.id);
      
      const workingDaysInMonth = new Date(parseInt(period.split('-')[0]), parseInt(period.split('-')[1]), 0).getDate();

      return {
        id: emp.id,
        name: emp.name,
        position: emp.position,
        uan: emp.uan,
        joiningDate: emp.joiningDate instanceof Timestamp ? emp.joiningDate.toDate() : emp.joiningDate,
        profilePictureUrl: emp.profilePictureUrl,
        baseSalary: emp.salary || 0,
        payrollId: payrollRecord ? payrollRecord.id : null,
        workingDays: payrollRecord ? payrollRecord.workingDays : workingDaysInMonth,
        presentDays: payrollRecord ? payrollRecord.presentDays : workingDaysInMonth,
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
    const batch = db.batch();
    
    payrollData.forEach(p => {
      const { id, name, position, uan, joiningDate, profilePictureUrl, baseSalary, isNew, ...payrollRecord } = p;
      
      const payload: any = {
        companyId,
        period,
        employeeId: id,
        ...payrollRecord
      };
      
      let docRef;
      if (payrollRecord.payrollId) {
         docRef = db.collection('payrolls').doc(payrollRecord.payrollId);
      } else {
         docRef = db.collection('payrolls').doc();
      }
      
      batch.set(docRef, payload, { merge: true });
    });

    if (payrollData.length > 0) {
      await batch.commit();
    }

    revalidatePath('/payroll');
    return { success: true, message: 'Payroll saved successfully.' };
  } catch (error: any) {
    console.error('Failed to save payroll:', error);
    return { success: false, message: `Failed to save payroll: ${error.message}` };
  }
}


export async function deletePayrollRecord(companyId: string, payrollId: string) {
    try {
        const docRef = db.collection('payrolls').doc(payrollId);
        const doc = await docRef.get();

        if (!doc.exists || doc.data()?.companyId !== companyId) {
            return { success: false, message: "Record not found or you don't have permission." };
        }
        await docRef.delete();

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
