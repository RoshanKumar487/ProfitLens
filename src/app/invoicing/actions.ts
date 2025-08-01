
'use server';

import { db } from '@/lib/firebaseConfig';
import { doc, updateDoc, deleteDoc, Timestamp, serverTimestamp, collection, addDoc } from 'firebase/firestore';

// A specific type for creating/updating invoices to ensure data consistency.
interface InvoiceData {
  invoiceNumber: string;
  clientName: string;
  clientEmail?: string;
  clientAddress?: string;
  clientGstin?: string;
  issuedDate: Date;
  dueDate: Date;
  items: { id: string; description: string; hsnNo?: string; quantity: number; unitPrice: number, customFields?: { [key: string]: string } }[];
  status: 'Paid' | 'Pending' | 'Overdue' | 'Draft';
  notes?: string;
  subtotal: number;
  discountType: 'fixed' | 'percentage';
  discountValue: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  isRcmApplicable: boolean;
  amount: number;
}

/**
 * Creates a new invoice document in Firestore.
 * @param invoiceData The invoice data payload.
 * @param companyId The ID of the company creating the invoice.
 * @param userId The ID of the user creating the invoice.
 * @param userName The name of the user creating the invoice.
 * @returns A promise that resolves with the result of the operation.
 */
export async function createInvoice(
  invoiceData: InvoiceData,
  companyId: string,
  userId: string,
  userName: string
): Promise<{ success: boolean; message: string; id?: string }> {
  if (!companyId || !userId) {
    return { success: false, message: 'User or company information is missing.' };
  }
  if (!invoiceData.clientName || invoiceData.amount === undefined || !invoiceData.issuedDate || !invoiceData.dueDate) {
    return { success: false, message: 'Client Name, Amount, Issued Date, and Due Date are required.' };
  }

  try {
    const invoicePayload = {
      ...invoiceData,
      companyId,
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

/**
 * Updates an existing invoice document in Firestore.
 * @param id The ID of the invoice to update.
 * @param data The partial data to update the invoice with.
 * @returns A promise that resolves with the result of the operation.
 */
export async function updateInvoice(id: string, data: Partial<InvoiceData>): Promise<{ success: boolean; message: string }> {
  if (!id) {
    return { success: false, message: 'Invoice ID is required for updates.' };
  }
  try {
    const invoiceRef = doc(db, 'invoices', id);
    const dataToSave: { [key: string]: any } = { ...data };
    
    // Convert dates to Firestore Timestamps if they are not already
    if (data.issuedDate && !(data.issuedDate instanceof Timestamp)) {
        dataToSave.issuedDate = Timestamp.fromDate(new Date(data.issuedDate));
    }
    if (data.dueDate && !(data.dueDate instanceof Timestamp)) {
        dataToSave.dueDate = Timestamp.fromDate(new Date(data.dueDate));
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

/**
 * Deletes an invoice document from Firestore.
 * @param id The ID of the invoice to delete.
 * @returns A promise that resolves with the result of the operation.
 */
export async function deleteInvoice(id: string): Promise<{ success: boolean; message: string }> {
  if (!id) {
    return { success: false, message: 'Invoice ID is required for deletion.' };
  }
  try {
    const invoiceRef = doc(db, 'invoices', id);
    await deleteDoc(invoiceRef);
    return { success: true, message: 'Invoice deleted successfully.' };
  } catch (error: any) {
    console.error("Error deleting invoice:", error);
    return { success: false, message: `Failed to delete invoice: ${error.message}` };
  }
}

interface SendInvoiceEmailPayload {
  to: string;
  subject: string;
  htmlBody: string;
  invoiceNumber: string;
}

/**
 * Sends an invoice email using Nodemailer.
 * Note: Requires SMTP environment variables to be configured.
 * @param payload The email payload.
 * @returns A promise that resolves with the result of the email sending operation.
 */
export async function sendInvoiceEmailAction(payload: SendInvoiceEmailPayload): Promise<{ success: boolean; message: string }> {
  const { to, subject, htmlBody, invoiceNumber } = payload;

  if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.SMTP_FROM_EMAIL) {
    console.error('SMTP environment variables are not fully configured.');
    return { success: false, message: 'Email server not configured. Please contact administrator.' };
  }

  const nodemailer = require('nodemailer');
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
    return { success: false, message: `Failed to send email: ${error.message}` };
  }
}
