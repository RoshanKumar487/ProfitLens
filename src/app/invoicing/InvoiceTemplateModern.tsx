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
  phone: string;
  email: string;
  website: string;
  accountNumber?: string;
  ifscCode?: string;
  bankName?: string;
  signatureUrl?: string;
  stampUrl?: string;
}

interface InvoiceTemplateProps {
  invoiceToView: InvoiceDisplay;
  companyProfileDetails: CompanyDetailsFirestore;
  currencySymbol: string;
}

const InvoiceTemplateModern = React.forwardRef<HTMLDivElement, InvoiceTemplateProps>(
  ({ invoiceToView, companyProfileDetails, currencySymbol }, ref) => {
    
    // Combine address parts for display
    const fullCompanyAddress = [
        companyProfileDetails.address,
        companyProfileDetails.city,
        companyProfileDetails.state,
        companyProfileDetails.country
    ].filter(Boolean).join(', ');

    const numberToWords = (num: number): string => {
        const a = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
        const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
        const g = ['', 'thousand', 'million', 'billion', 'trillion'];

        const inWords = (n: number): string => {
            let str = '';
            if (n > 999) {
                const thousands = Math.floor(n / 1000);
                str += inWords(thousands) + ' thousand ';
                n %= 1000;
            }
            if (n > 99) {
                str += a[Math.floor(n / 100)] + ' hundred ';
                n %= 100;
            }
            if (n > 19) {
                str += b[Math.floor(n / 10)] + ' ' + a[n % 10];
            } else {
                str += a[n];
            }
            return str.trim();
        };

        const integerPart = Math.floor(num);
        const decimalPart = Math.round((num - integerPart) * 100);

        let words = inWords(integerPart);
        if (decimalPart > 0) {
            words += ' and ' + inWords(decimalPart) + ' paisa';
        }
        return words.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + ' only.';
    };

    const amountInWords = numberToWords(invoiceToView.amount);

    return (
      <div ref={ref} className="invoice-view-container bg-white text-black p-10 mx-auto w-[210mm] min-h-[297mm] font-sans text-[10px] leading-tight flex flex-col">
        <div className="border border-black p-1 h-full flex flex-col">
          <div className="border border-black flex-grow flex flex-col">
            {/* Header */}
            <header className="flex justify-between items-start pt-4 px-4 pb-2 border-b border-black">
              <div className="text-xs w-1/2">
                <h2 className="font-bold text-lg uppercase">{companyProfileDetails.name}</h2>
                <p>GSTIN: {companyProfileDetails.gstin}</p>
                <p className="whitespace-pre-line">{fullCompanyAddress}</p>
                {companyProfileDetails.phone && <p>Mobile: {companyProfileDetails.phone}</p>}
                {companyProfileDetails.email && <p>Email: {companyProfileDetails.email}</p>}
              </div>
              <div className="text-center">
                <h1 className="font-bold text-lg text-blue-600">TAX INVOICE</h1>
                <p className="text-xs">ORIGINAL FOR RECIPIENT</p>
              </div>
            </header>

            {/* Details Grid */}
            <div className="grid grid-cols-[60%_40%] border-b border-black">
              <div className="p-2 border-r border-black">
                <p className="font-bold">Customer Details:</p>
                <p className="font-bold text-lg">{invoiceToView.clientName}</p>
                <p className="font-bold mt-1">Billing Address:</p>
                <p className="whitespace-pre-line">{invoiceToView.clientAddress}</p>
                <p className="font-bold mt-1">Shipping Address:</p>
                <p className="whitespace-pre-line">{invoiceToView.clientAddress}</p>
              </div>
              <div className="grid grid-rows-4 text-xs">
                <div className="p-2 border-b border-black grid grid-cols-2"><span>Invoice #:</span><span className="font-bold">{invoiceToView.invoiceNumber}</span></div>
                <div className="p-2 border-b border-black grid grid-cols-2"><span>Invoice Date:</span><span className="font-bold">{format(invoiceToView.issuedDate, 'dd MMM yyyy')}</span></div>
                <div className="p-2 border-b border-black grid grid-cols-2"><span>Place of Supply:</span><span>{companyProfileDetails.state}</span></div>
                <div className="p-2 grid grid-cols-2"><span>Due Date:</span><span className="font-bold">{format(invoiceToView.dueDate, 'dd MMM yyyy')}</span></div>
              </div>
            </div>

            {/* Items Table */}
            <div className="flex-grow flex flex-col">
              <table className="w-full text-[10px] table-fixed">
                <thead>
                  <tr className="border-b border-black text-left">
                    <th className="p-1 border-r border-black font-bold w-8">#</th>
                    <th className="p-1 border-r border-black font-bold">Item</th>
                    <th className="p-1 border-r border-black font-bold w-16">HSN/SAC</th>
                    <th className="p-1 border-r border-black font-bold w-20 text-right">Rate/Item</th>
                    <th className="p-1 border-r border-black font-bold w-10 text-center">Qty</th>
                    <th className="p-1 border-r border-black font-bold w-20 text-right">Taxable Val</th>
                    <th className="p-1 border-r border-black font-bold w-20 text-right">Tax Amount</th>
                    <th className="p-1 font-bold w-24 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="border-b border-black">
                  {(invoiceToView.items || []).map((item, index) => {
                    const taxableValue = item.quantity * item.unitPrice;
                    const taxAmount = taxableValue * (invoiceToView.taxRate / 100);
                    const totalAmount = taxableValue + taxAmount;
                    return (
                      <tr key={item.id} className="border-b border-black align-top">
                        <td className="p-1 border-r border-black text-center">{index + 1}</td>
                        <td className="p-1 border-r border-black font-bold">{item.description}</td>
                        <td className="p-1 border-r border-black"></td>
                        <td className="p-1 border-r border-black text-right">{currencySymbol}{item.unitPrice.toFixed(2)}</td>
                        <td className="p-1 border-r border-black text-center">{item.quantity}</td>
                        <td className="p-1 border-r border-black text-right">{currencySymbol}{taxableValue.toFixed(2)}</td>
                        <td className="p-1 border-r border-black text-right">{currencySymbol}{taxAmount.toFixed(2)} <br /> ({invoiceToView.taxRate}%)</td>
                        <td className="p-1 text-right font-bold">{currencySymbol}{totalAmount.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                  <tr className="h-full"><td colSpan={8} className="p-1"></td></tr>
                </tbody>
              </table>
            </div>

            {/* Calculation Section */}
            <div className="grid grid-cols-[60%_40%]">
                <div className="text-xs p-1 border-t border-black">
                    Total Items / Qty: {(invoiceToView.items || []).length} / {(invoiceToView.items || []).reduce((acc, i) => acc + i.quantity, 0)}
                </div>
                <div className="text-right text-xs">
                    <div className="grid grid-cols-2 p-1 border-t border-b border-black">
                    <span>Taxable Amount</span>
                    <span className="font-bold">{currencySymbol}{invoiceToView.subtotal.toFixed(2)}</span>
                    </div>
                    {invoiceToView.discountAmount > 0 && (
                        <div className="grid grid-cols-2 p-1 border-b border-black">
                            <span>Discount</span>
                            <span className="font-bold text-red-600">-{currencySymbol}{invoiceToView.discountAmount.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="grid grid-cols-2 p-1 border-b border-black">
                    <span>IGST {invoiceToView.taxRate}%</span>
                    <span className="font-bold">{currencySymbol}{invoiceToView.taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="grid grid-cols-2 p-1 bg-gray-200">
                    <span className="font-bold text-base">Total</span>
                    <span className="font-bold text-base">{currencySymbol}{invoiceToView.amount.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <div className="border-y border-black text-xs">
                <div className="p-1">Total amount (in words): {amountInWords}</div>
            </div>
            
            <div className="border-b border-black text-right p-1">
                {invoiceToView.status === 'Paid' && <span className="font-bold text-green-600">&#10004; Amount Paid</span>}
            </div>

            {/* Footer */}
            <footer className="mt-auto pt-2 text-xs">
              <div className="flex justify-between items-start pb-2">
                <div className="p-1">
                  <p className="font-bold">Bank Details:</p>
                  <p><span className="font-bold">Bank:</span> {companyProfileDetails.bankName || 'N/A'}</p>
                  <p><span className="font-bold">Account #:</span> {companyProfileDetails.accountNumber || 'N/A'}</p>
                  <p><span className="font-bold">IFSC:</span> {companyProfileDetails.ifscCode || 'N/A'}</p>
                   {companyProfileDetails.stampUrl && (
                    <div className="relative h-20 w-20 mt-2 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={companyProfileDetails.stampUrl} alt="Company Stamp" className="max-h-full max-w-full object-contain" crossOrigin="anonymous" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-center justify-between h-24 w-40 text-center">
                  <p className="font-bold">For {companyProfileDetails.name}</p>
                  <div className="h-12 w-full relative flex items-center justify-center">
                      {companyProfileDetails.signatureUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={companyProfileDetails.signatureUrl} alt="Signature" className="max-h-full max-w-full object-contain" crossOrigin="anonymous" />
                      )}
                  </div>
                  <p className="border-t border-black w-full pt-1">Authorized Signatory</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-black">
                <div>
                  <p className="font-bold">Notes:</p>
                  <p className="whitespace-pre-line p-1">{invoiceToView.notes}</p>
                </div>
                <div>
                  <p className="font-bold">Terms and Conditions:</p>
                  <ol className="list-decimal list-inside text-[9px] space-y-px p-1">
                     <li>Goods once sold cannot be taken back or exchanged.</li>
                     <li>We are not the manufacturers; company will stand for warranty as per their terms and conditions.</li>
                  </ol>
                </div>
              </div>
            </footer>
          </div>
        </div>
      </div>
    );
  }
);
InvoiceTemplateModern.displayName = 'InvoiceTemplateModern';
export default InvoiceTemplateModern;
