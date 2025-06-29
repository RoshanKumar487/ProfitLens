
'use client';

import React from 'react';
import { format } from 'date-fns';
import Letterhead from '@/components/Letterhead';
import LetterheadModern from '@/components/LetterheadModern';
import { stringToHslColor } from '@/lib/utils';

// Interface definitions mirrored from invoicing/page.tsx for component props
interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface InvoiceDisplay {
  invoiceNumber: string;
  clientName: string;
  clientEmail?: string;
  clientAddress?: string;
  clientGstin?: string;
  subtotal: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  amount: number;
  dueDate: Date;
  status: string;
  issuedDate: Date;
  items?: InvoiceItem[];
  notes?: string;
}

interface CompanyDetailsFirestore {
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  gstin: string;
  pan?: string;
  phone: string;
  email: string;
  website: string;
  accountNumber?: string;
  ifscCode?: string;
  bankName?: string;
  branch?: string;
  signatureUrl?: string;
  stampUrl?: string;
}

interface InvoiceTemplateProps {
  invoiceToView: InvoiceDisplay;
  companyProfileDetails: CompanyDetailsFirestore;
  currencySymbol: string;
  signatureDataUri?: string;
  stampDataUri?: string;
  letterheadTemplate: 'none' | 'simple' | 'modern';
}

const numberToWords = (num: number): string => {
    const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    const numToWords = (n: number): string => {
        if (n < 20) return ones[n];
        const digit = n % 10;
        return tens[Math.floor(n / 10)] + (digit ? ' ' + ones[digit] : '');
    };

    if (num === 0) return 'Zero';
    let words = '';
    if (num >= 10000000) {
        words += numToWords(Math.floor(num / 10000000)) + ' crore ';
        num %= 10000000;
    }
    if (num >= 100000) {
        words += numToWords(Math.floor(num / 100000)) + ' lakh ';
        num %= 100000;
    }
    if (num >= 1000) {
        words += numToWords(Math.floor(num / 1000)) + ' thousand ';
        num %= 1000;
    }
    if (num >= 100) {
        words += numToWords(Math.floor(num / 100)) + ' hundred ';
        num %= 100;
    }
    if (num > 0) {
        words += (words ? 'and ' : '') + numToWords(num);
    }
    return words.trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

const InvoiceTemplateIndian = React.forwardRef<HTMLDivElement, InvoiceTemplateProps>(
  ({ invoiceToView, companyProfileDetails, currencySymbol, signatureDataUri, stampDataUri, letterheadTemplate }, ref) => {
    
    const amountInWords = numberToWords(Math.floor(invoiceToView.amount));
    const subtotal = (invoiceToView.items || []).reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
    const cgstAmount = invoiceToView.taxAmount / 2;
    const sgstAmount = invoiceToView.taxAmount / 2;
    const fullCompanyAddress = [
        companyProfileDetails.address,
        companyProfileDetails.city,
        companyProfileDetails.state,
        companyProfileDetails.country
    ].filter(Boolean).join(', ');

    const modernFooterStyle = letterheadTemplate === 'modern' 
    ? { borderBottom: `4px solid ${stringToHslColor(companyProfileDetails.name, 70, 55)}` }
    : {};

    return (
      <div ref={ref} className="bg-white text-black font-sans text-xs w-[210mm] min-h-[297mm] mx-auto flex flex-col" style={modernFooterStyle}>
          {letterheadTemplate === 'simple' && <Letterhead companyDetails={companyProfileDetails} />}
          {letterheadTemplate === 'modern' && <LetterheadModern companyDetails={companyProfileDetails} />}

          <div className="flex-grow flex flex-col p-4 space-y-4">
            {letterheadTemplate === 'none' && (
                <header className="text-center space-y-2">
                    <div className="w-full h-24">{/* Blank space for letterhead */}</div>
                    <h1 className="text-2xl font-bold uppercase tracking-wider text-gray-800">{companyProfileDetails.name}</h1>
                    <p className="text-sm text-gray-600">{fullCompanyAddress}</p>
                    <p className="text-sm text-gray-600">GSTIN: {companyProfileDetails.gstin} | PAN: {companyProfileDetails.pan || 'N/A'}</p>
                </header>
            )}
            
            <h2 className="text-lg font-bold border-y-2 border-black py-1 text-center">TAX INVOICE</h2>

            {/* Details Table */}
            <table className="w-full border-collapse text-sm">
                <tbody>
                    <tr>
                        <td className="w-1/2 p-2 align-top border border-black">
                            <p className="font-bold">Bill To:</p>
                            <p className="font-bold text-base">{invoiceToView.clientName}</p>
                            <p className="whitespace-pre-line">{invoiceToView.clientAddress}</p>
                            <p className="mt-2">GSTIN: {invoiceToView.clientGstin || 'N/A'}</p>
                        </td>
                        <td className="w-1/2 p-2 align-top border border-black">
                             <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                                <span className="font-bold">Invoice No:</span><span>{invoiceToView.invoiceNumber}</span>
                                <span className="font-bold">Invoice Date:</span><span>{format(invoiceToView.issuedDate, 'dd-MM-yyyy')}</span>
                                <span className="font-bold">Due Date:</span><span>{format(invoiceToView.dueDate, 'dd-MM-yyyy')}</span>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Items Table */}
            <div className="flex-grow">
                <table className="w-full border-collapse border border-black text-center text-sm">
                    <thead className="bg-gray-100">
                        <tr className="border-b border-black">
                            <th className="p-2 border-r border-black w-10">#</th>
                            <th className="p-2 border-r border-black text-left">Item Description</th>
                            <th className="p-2 border-r border-black w-24">HSN/SAC</th>
                            <th className="p-2 border-r border-black w-20">Qty</th>
                            <th className="p-2 border-r border-black w-28">Rate</th>
                            <th className="p-2 w-32">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(invoiceToView.items || []).map((item, index) => (
                            <tr key={item.id} className="border-b border-gray-200 last:border-b-0">
                                <td className="p-2 border-r border-black">{index + 1}</td>
                                <td className="p-2 border-r border-black text-left">{item.description}</td>
                                <td className="p-2 border-r border-black">998314</td>
                                <td className="p-2 border-r border-black">{item.quantity}</td>
                                <td className="p-2 border-r border-black text-right">{currencySymbol}{item.unitPrice.toFixed(2)}</td>
                                <td className="p-2 text-right">{currencySymbol}{(item.quantity * item.unitPrice).toFixed(2)}</td>
                            </tr>
                        ))}
                         {/* Spacer row to push footer down */}
                         <tr><td colSpan={6} className="py-24">&nbsp;</td></tr>
                    </tbody>
                </table>
             </div>

            {/* Footer */}
            <footer className="mt-auto">
                <div className="grid grid-cols-[60%_40%] border border-black">
                     <div className="p-2 border-r border-black">
                        <p className="font-bold">Amount in Words:</p>
                        <p>{amountInWords} Only.</p>
                        <br/>
                        <p className="font-bold">Bank Details:</p>
                        <p>Bank: {companyProfileDetails.bankName || 'N/A'}</p>
                        <p>A/C No: {companyProfileDetails.accountNumber || 'N/A'}</p>
                        <p>IFSC: {companyProfileDetails.ifscCode || 'N/A'}</p>
                        <p>Branch: {companyProfileDetails.branch || 'N/A'}</p>
                    </div>
                    <div className="p-0">
                         <table className="w-full border-collapse text-sm">
                            <tbody>
                                <tr className="border-b border-black">
                                    <td className="p-2">Subtotal</td>
                                    <td className="p-2 text-right">{currencySymbol}{subtotal.toFixed(2)}</td>
                                </tr>
                                <tr className="border-b border-black">
                                    <td className="p-2">CGST ({invoiceToView.taxRate / 2}%)</td>
                                    <td className="p-2 text-right">{currencySymbol}{cgstAmount > 0 ? cgstAmount.toFixed(2) : '0.00'}</td>
                                </tr>
                                <tr className="border-b border-black">
                                    <td className="p-2">SGST ({invoiceToView.taxRate / 2}%)</td>
                                    <td className="p-2 text-right">{currencySymbol}{sgstAmount > 0 ? sgstAmount.toFixed(2) : '0.00'}</td>
                                </tr>
                                <tr className="bg-gray-100 font-bold">
                                    <td className="p-2">Grand Total</td>
                                    <td className="p-2 text-right">{currencySymbol}{invoiceToView.amount.toFixed(2)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="grid grid-cols-2 mt-4">
                    <div className="p-2 text-xs">
                        <p className="font-bold">Terms & Conditions:</p>
                        <p>1. Please pay within {format(invoiceToView.dueDate, 'dd-MM-yyyy')}.</p>
                        <p>2. This is a computer generated invoice.</p>
                    </div>
                    <div className="p-2 text-center">
                        <div className="relative h-24 w-48 mx-auto flex flex-col items-center justify-end">
                             {signatureDataUri && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={signatureDataUri} alt="Signature" className="max-h-16 max-w-full object-contain" crossOrigin="anonymous" />
                            )}
                             <p className="border-t border-black w-full pt-1 mt-2">Authorised Signatory</p>
                        </div>
                        <p className="font-bold">For {companyProfileDetails.name}</p>
                    </div>
                </div>
            </footer>
          </div>
      </div>
    );
  }
);
InvoiceTemplateIndian.displayName = 'InvoiceTemplateIndian';
export default InvoiceTemplateIndian;
