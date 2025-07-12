
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
import { format, startOfMonth, endOfMonth } from 'date-fns';
import nodemailer from 'nodemailer';

export interface PayrollData {
  id?: string; // Existing payroll document ID
  employeeId: string;
  payPeriod: string; // YYYY-MM format
  baseSalary: number;
  workingDays: number;
  presentDays: number;
  otDays: number;
  advances: number;
  otherDeductions: number;
  pfContribution?: number;
  esiContribution?: number;
  overtimePay?: number;
  proratedSalary?: number;
  grossEarnings?: number;
  totalDeductions?: number;
  netPayment: number;
  status: 'Pending' | 'Paid';
  customFields?: { [key: string]: number | string | Date };
}

export interface SendPayslipEmailPayload {
  to: string;
  subject: string;
  htmlBody: string;
  attachment: {
    filename: string;
    content: string; // base64
  };
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
    
    // Fetch advances for the given period
    const periodDate = new Date(payPeriod + '-02'); // Use 2nd to avoid timezone issues
    const startDate = startOfMonth(periodDate);
    const endDate = endOfMonth(periodDate);

    const advancesRef = collection(db, 'expenses');
    const qAdvances = query(advancesRef, 
        where('companyId', '==', companyId),
        where('category', '==', 'Salary / Advance'),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
    );

    const [employeeSnapshot, payrollSnapshot, advancesSnapshot] = await Promise.all([
        getDocs(qEmployees),
        getDocs(qPayrolls),
        getDocs(qAdvances)
    ]);

    const payrollsMap = new Map(payrollSnapshot.docs.map(doc => [doc.data().employeeId, { id: doc.id, ...doc.data() }]));
    
    const advancesByEmployee = new Map<string, number>();
    advancesSnapshot.forEach(doc => {
        const data = doc.data();
        if(data.employeeId) {
            const currentAdvances = advancesByEmployee.get(data.employeeId) || 0;
            advancesByEmployee.set(data.employeeId, currentAdvances + data.amount);
        }
    });


    const employeesWithPayroll = employeeSnapshot.docs.map(doc => {
        const employeeData = doc.data();
        const existingPayrollData = payrollsMap.get(doc.id);
        const customFields = existingPayrollData?.customFields || {};
        const advances = advancesByEmployee.get(doc.id) || 0;

        const combinedData = {
            id: doc.id,
            ...employeeData,
            payrollId: existingPayrollData ? existingPayrollData.id : null,
            baseSalary: existingPayrollData ? existingPayrollData.baseSalary : (employeeData.salary || 0),
            advances: existingPayrollData ? existingPayrollData.advances : advances,
            otherDeductions: existingPayrollData ? existingPayrollData.otherDeductions : 0,
            workingDays: existingPayrollData?.workingDays,
            presentDays: existingPayrollData?.presentDays,
            otDays: existingPayrollData?.otDays,
            netPayment: existingPayrollData?.netPayment || 0,
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
            const { isNew, name, payrollId, ...payrollFields } = data;

            // If it's a new employee, create the employee document first
            if (isNew) {
                const newEmployeeRef = doc(collection(db, 'employees'));
                employeeId = newEmployeeRef.id; // Use the new ID for the payroll record
                batch.set(newEmployeeRef, {
                    name,
                    salary: payrollFields.baseSalary || 0,
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
                ...payrollFields,
                updatedAt: timestamp,
            };
            // remove fields that shouldn't be saved
            delete payrollPayload.isNew;
            delete payrollPayload.name;

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

export async function sendPayslipEmail(payload: SendPayslipEmailPayload): Promise<{ success: boolean; message: string }> {
  const { to, subject, htmlBody, attachment } = payload;

  if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.SMTP_FROM_EMAIL) {
    console.error('SMTP environment variables are not fully configured.');
    return { success: false, message: 'Email server not configured. Please contact administrator.' };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production', 
    }
  });

  const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME || 'ProfitLens'}" <${process.env.SMTP_FROM_EMAIL}>`,
    to: to,
    subject: subject,
    html: htmlBody,
    attachments: [
      {
        filename: attachment.filename,
        content: attachment.content,
        encoding: 'base64',
        contentType: 'application/pdf'
      }
    ]
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Payslip email sent to ${to}: ${info.messageId}`);
    return { success: true, message: 'Payslip email sent successfully!' };
  } catch (error: any) {
    console.error(`Error sending payslip email to ${to}:`, error);
    return { success: false, message: `Failed to send email: ${error.message}` };
  }
}
