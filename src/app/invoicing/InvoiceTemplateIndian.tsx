
'use client';

import React from 'react';
import { format } from 'date-fns';

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
  clientGstin?: string; // Assuming client GSTIN might be part of address or a separate field
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
}

interface InvoiceTemplateProps {
  invoiceToView: InvoiceDisplay;
  companyProfileDetails: CompanyDetailsFirestore;
  currencySymbol: string;
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
  ({ invoiceToView, companyProfileDetails, currencySymbol }, ref) => {
    
    const amountInWords = numberToWords(Math.floor(invoiceToView.amount));
    const subtotal = (invoiceToView.items || []).reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
    const cgstAmount = invoiceToView.taxAmount / 2;
    const sgstAmount = invoiceToView.taxAmount / 2;

    return (
      <div ref={ref} className="bg-white text-black p-4 font-sans text-xs w-[210mm] min-h-[297mm] mx-auto flex flex-col justify-center">
          <div>
            {/* Header */}
            <header className="grid grid-cols-3 mb-1">
                <div className="text-left">
                    <p>GST No: {companyProfileDetails.gstin}</p>
                    <p>PAN No: {companyProfileDetails.pan || 'N/A'}</p>
                </div>
                <div className="text-center font-bold">
                    <p>INVOICE</p>
                    <p>HSN CODE: 998525</p>
                </div>
                <div className="text-right">
                    <p>Phone: {companyProfileDetails.phone}</p>
                </div>
            </header>

            <div className="text-center font-bold border-y-2 border-black py-1">
                Bill for The Month of {format(invoiceToView.issuedDate, 'MMMM yyyy').toUpperCase()}
            </div>

            {/* Details Table */}
            <table className="w-full border-collapse border-2 border-black mt-1">
                <tbody>
                    <tr>
                        <td className="w-1/2 border-r-2 border-black p-1 align-top">
                            <p>To,</p>
                            <p className="font-bold">{invoiceToView.clientName}</p>
                            <p className="whitespace-pre-line">{invoiceToView.clientAddress}</p>
                            <p className="mt-4">GSTIN NO. {invoiceToView.clientGstin || 'N/A'}</p>
                        </td>
                        <td className="w-1/2 p-1 align-top text-xs">
                            <div className="grid grid-cols-[auto_1fr] gap-x-2">
                                <span>Invoice No:</span><span className="font-bold">{invoiceToView.invoiceNumber}</span>
                                <span>DATE:</span><span className="font-bold">{format(invoiceToView.issuedDate, 'dd-MM-yyyy')}</span>
                                <span className="col-span-2 mt-2 font-bold">A/C. NAME : {companyProfileDetails.name}</span>
                                <span>BANK NAME:</span><span>{companyProfileDetails.bankName}</span>
                                <span>A/C NO. :</span><span>{companyProfileDetails.accountNumber}</span>
                                <span>IFSC CODE :</span><span>{companyProfileDetails.ifscCode}</span>
                                <span>BRANCH :</span><span>{companyProfileDetails.branch}</span>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Items Table */}
            <table className="w-full border-collapse border-x-2 border-b-2 border-black text-center">
                <thead>
                    <tr className="border-b-2 border-black">
                        <th className="p-1 border-r-2 border-black">Description</th>
                        <th className="p-1 border-r-2 border-black w-24">Per Head</th>
                        <th className="p-1 border-r-2 border-black w-20">No. Of<br/>person</th>
                        <th className="p-1 border-r-2 border-black w-20">No. Of Duties</th>
                        <th className="p-1 w-28">Total Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {(invoiceToView.items || []).map((item, index) => (
                        <tr key={item.id}>
                            <td className="p-1 border-r-2 border-black text-left">{index + 1}. {item.description}</td>
                            <td className="p-1 border-r-2 border-black">{item.unitPrice.toFixed(2)}</td>
                            <td className="p-1 border-r-2 border-black">{item.quantity}</td>
                            <td className="p-1 border-r-2 border-black">-</td>
                            <td className="p-1 text-right">{(item.quantity * item.unitPrice).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Footer */}
            <table className="w-full border-collapse border-2 border-black mt-[-2px]">
                <tbody>
                    <tr>
                        <td className="w-2/3 p-1 border-r-2 border-black align-top">
                            <p>In Words: {amountInWords} rupees only.</p>
                            <div className="mt-16">
                                <p>Checked by:</p>
                            </div>
                        </td>
                        <td className="w-1/3 p-0 align-top">
                            <table className="w-full border-collapse">
                                <tbody>
                                    <tr className="border-b-2 border-black">
                                        <td className="p-1">Total</td>
                                        <td className="p-1 text-right">{subtotal.toFixed(2)}</td>
                                    </tr>
                                    <tr className="border-b-2 border-black">
                                        <td className="p-1">RCM CGST {invoiceToView.taxRate / 2}%</td>
                                        <td className="p-1 text-right">{cgstAmount > 0 ? cgstAmount.toFixed(2) : '-'}</td>
                                    </tr>
                                    <tr className="border-b-2 border-black">
                                        <td className="p-1">RCM SGST {invoiceToView.taxRate / 2}%</td>
                                        <td className="p-1 text-right">{sgstAmount > 0 ? sgstAmount.toFixed(2) : '-'}</td>
                                    </tr>
                                    <tr>
                                        <td className="p-1 font-bold">Grand Total</td>
                                        <td className="p-1 text-right font-bold">{invoiceToView.amount.toFixed(2)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Signature */}
            <div className="text-right mt-10">
                <p>For {companyProfileDetails.name}</p>
                <div className="h-16"></div> {/* Blank space for signature */}
            </div>
          </div>
      </div>
    );
  }
);
InvoiceTemplateIndian.displayName = 'InvoiceTemplateIndian';
export default InvoiceTemplateIndian;
