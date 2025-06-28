
'use server';

import { db } from '@/lib/firebaseConfig';
import { doc, updateDoc, deleteDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import nodemailer from 'nodemailer';

interface SendInvoiceEmailPayload {
  to: string;
  subject: string;
  htmlBody: string;
  invoiceNumber: string; // For logging/tracking, not directly in email content by default here
}

interface EmailSendingResult {
  success: boolean;
  message: string;
  error?: any;
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
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports like 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
        // do not fail on invalid certs if using self-signed or local dev server
        rejectUnauthorized: process.env.NODE_ENV === 'production', 
    }
  });

  const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME || 'ProfitLens'}" <${process.env.SMTP_FROM_EMAIL}>`,
    to: to, // recipient
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


export async function updateInvoice(id: string, data: any): Promise<{ success: boolean; message: string }> {
  try {
    const invoiceRef = doc(db, 'invoices', id);
    // Convert JS dates back to Timestamps if they exist in the update payload
    const dataToSave = { ...data };
    if (data.issuedDate && !(data.issuedDate instanceof Timestamp)) {
        dataToSave.issuedDate = Timestamp.fromDate(new Date(data.issuedDate));
    }
    if (data.dueDate && !(data.dueDate instanceof Timestamp)) {
        dataToSave.dueDate = Timestamp.fromDate(new Date(data.dueDate));
    }
    
    // Remove the ID field before saving to prevent it from being written to the document
    delete dataToSave.id;

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
