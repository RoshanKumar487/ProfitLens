
'use server';

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
