
'use server';

import { db } from '@/lib/firebaseConfig';
import { doc, updateDoc, deleteDoc, Timestamp, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import nodemailer from 'nodemailer';

interface SendInvoiceEmailPayload {
  to: string;
  subject: string;
  htmlBody: string;
  invoiceNumber: string;
}

interface EmailSendingResult {
  success: boolean;
  message: string;
  error?: any;
}

interface InvoiceItem {
  id: string;
  description: string;
  hsnNo?: string;
  quantity: number;
  unitPrice: number;
  customFields?: { [key: string]: string };
}
interface InvoiceData {
  clientName: string;
  clientEmail?: string;
  clientAddress?: string;
  clientGstin?: string;
  subtotal: number;
  discountType: 'fixed' | 'percentage';
  discountValue: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  amount: number;
  dueDate: Date;
  status: 'Paid' | 'Pending' | 'Overdue' | 'Draft';
  issuedDate: Date;
  items: InvoiceItem[];
  notes?: string;
  invoiceNumber: string;
}


export async function createInvoice(invoiceData: Omit<InvoiceData, 'id'>, companyId: string, userId: string, userName: string): Promise<{ success: boolean; message: string; id?: string }> {
  if (!companyId || !userId) {
    return { success: false, message: 'User or company information is missing.' };
  }
  if (!invoiceData.clientName || invoiceData.amount === undefined || !invoiceData.issuedDate || !invoiceData.dueDate) {
    return { success: false, message: 'Client Name, Amount, Issued Date, and Due Date are required.' };
  }

  try {
    const invoicePayload = {
      ...invoiceData,
      companyId: companyId,
      issuedDate: Timestamp.fromDate(new Date(invoiceData.issuedDate)),
      dueDate: Timestamp.fromDate(new Date(invoiceData.dueDate)),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: {
        id: userId,
        name: userName,
      },
    };
    
    const docRef = await addDoc(collection(db, 'invoices'), invoicePayload);
    return { success: true, message: 'Invoice created successfully.', id: docRef.id };

  } catch (error: any) {
    console.error("Error creating invoice:", error);
    return { success: false, message: `Failed to create invoice: ${error.message}` };
  }
}


export async function sendInvoiceEmailAction(payload: SendInvoiceEmailPayload): Promise<EmailSendingResult> {
  const { to, subject, htmlBody, invoiceNumber } = payload;

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
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent for invoice ${invoiceNumber} to ${to}: ${info.messageId}`);
    return { success: true, message: 'Email sent successfully!' };
  } catch (error: any) {
    console.error(`Error sending email for invoice ${invoiceNumber} to ${to}:`, error);
    return { success: false, message: `Failed to send email: ${error.message || 'Unknown error'}`, error: error.toString() };
  }
}


export async function updateInvoice(id: string, data: Partial<InvoiceData>): Promise<{ success: boolean; message: string }> {
  try {
    const invoiceRef = doc(db, 'invoices', id);
    const dataToSave: { [key: string]: any } = { ...data };
    
    if (data.issuedDate && !(data.issuedDate instanceof Timestamp)) {
        dataToSave.issuedDate = Timestamp.fromDate(new Date(data.issuedDate));
    }
    if (data.dueDate && !(data.dueDate instanceof Timestamp)) {
        dataToSave.dueDate = Timestamp.fromDate(new Date(data.dueDate));
    }
    
    if ('id' in dataToSave) {
        delete dataToSave.id;
    }

    await updateDoc(invoiceRef, {
      ...dataToSave,
      updatedAt: serverTimestamp(),
    });
    return { success: true, message: 'Invoice updated successfully.' };
  } catch (error: any) {
    console.error("Error updating invoice:", error);
    return { success: false, message: `Failed to update invoice: ${error.message}` };
  }
}

export async function deleteInvoice(id: string): Promise<{ success: boolean; message: string }> {
  try {
    const invoiceRef = doc(db, 'invoices', id);
    await deleteDoc(invoiceRef);
    return { success: true, message: 'Invoice deleted successfully.' };
  } catch (error: any) {
    console.error("Error deleting invoice:", error);
    return { success: false, message: `Failed to delete invoice: ${error.message}` };
  }
}
