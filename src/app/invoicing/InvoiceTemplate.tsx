
'use client';

import React from 'react';
import { format } from 'date-fns';
import Image from 'next/image';

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
}

interface InvoiceTemplateProps {
  invoiceToView: InvoiceDisplay;
  companyProfileDetails: CompanyDetailsFirestore;
  currencySymbol: string;
}

// Using React.forwardRef to pass the ref down to the DOM element for PDF capture
const InvoiceTemplate = React.forwardRef<HTMLDivElement, InvoiceTemplateProps>(
  ({ invoiceToView, companyProfileDetails, currencySymbol }, ref) => {
    
    // Combine address parts for display
    const fullCompanyAddress = [
        companyProfileDetails.address,
        companyProfileDetails.city,
        companyProfileDetails.state,
        companyProfileDetails.country
    ].filter(Boolean).join(', ');

    return (
      <div ref={ref} className="invoice-view-container bg-white text-black p-4 mx-auto w-[210mm] min-h-[297mm] font-sans text-[10px] leading-tight flex flex-col">
        <div className="border-2 border-black p-1 h-full flex flex-col">
          <div className="border-2 border-black flex-grow flex flex-col">
            {/* Header */}
            <header className="flex justify-between items-start pt-4 px-4 pb-2 border-b-2 border-black">
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
            <div className="grid grid-cols-[60%_40%] border-b-2 border-black">
              <div className="p-2 border-r-2 border-black">
                <p className="font-bold">Customer Details:</p>
                <p className="font-bold text-base">{invoiceToView.clientName}</p>
                <p className="font-bold mt-1">Billing Address:</p>
                <p className="whitespace-pre-line">{invoiceToView.clientAddress}</p>
                <p className="font-bold mt-1">Shipping Address:</p>
                <p className="whitespace-pre-line">{invoiceToView.clientAddress}</p>
              </div>
              <div className="grid grid-rows-4 text-xs">
                <div className="p-2 border-b-2 border-black grid grid-cols-2"><span>Invoice #:</span><span className="font-bold">{invoiceToView.invoiceNumber}</span></div>
                <div className="p-2 border-b-2 border-black grid grid-cols-2"><span>Invoice Date:</span><span className="font-bold">{format(invoiceToView.issuedDate, 'dd MMM yyyy')}</span></div>
                <div className="p-2 border-b-2 border-black grid grid-cols-2"><span>Place of Supply:</span><span>{companyProfileDetails.state}</span></div>
                <div className="p-2 grid grid-cols-2"><span>Due Date:</span><span className="font-bold">{format(invoiceToView.dueDate, 'dd MMM yyyy')}</span></div>
              </div>
            </div>

            {/* Items Table */}
            <div className="flex-grow">
              <table className="w-full text-[10px] table-fixed">
                <thead>
                  <tr className="border-b-2 border-black text-left">
                    <th className="p-1 border-r-2 border-black font-bold w-8">#</th>
                    <th className="p-1 border-r-2 border-black font-bold">Item</th>
                    <th className="p-1 border-r-2 border-black font-bold w-16">HSN/SAC</th>
                    <th className="p-1 border-r-2 border-black font-bold w-20 text-right">Rate/Item</th>
                    <th className="p-1 border-r-2 border-black font-bold w-10 text-center">Qty</th>
                    <th className="p-1 border-r-2 border-black font-bold w-20 text-right">Taxable Val</th>
                    <th className="p-1 border-r-2 border-black font-bold w-20 text-right">Tax Amount</th>
                    <th className="p-1 font-bold w-24 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="border-b-2 border-black">
                  {(invoiceToView.items || []).map((item, index) => {
                    const taxableValue = item.quantity * item.unitPrice;
                    const taxAmount = taxableValue * (invoiceToView.taxRate / 100);
                    const totalAmount = taxableValue; // The final amount in the row should be without tax
                    return (
                      <tr key={item.id} className="border-b border-black align-top">
                        <td className="p-1 border-r-2 border-black text-center">{index + 1}</td>
                        <td className="p-1 border-r-2 border-black font-bold">{item.description}</td>
                        <td className="p-1 border-r-2 border-black"></td>
                        <td className="p-1 border-r-2 border-black text-right">{currencySymbol}{item.unitPrice.toFixed(2)}</td>
                        <td className="p-1 border-r-2 border-black text-center">{item.quantity}</td>
                        <td className="p-1 border-r-2 border-black text-right">{currencySymbol}{taxableValue.toFixed(2)}</td>
                        <td className="p-1 border-r-2 border-black text-right">{currencySymbol}{taxAmount.toFixed(2)} <br /> ({invoiceToView.taxRate}%)</td>
                        <td className="p-1 text-right font-bold">{currencySymbol}{totalAmount.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                   {/* This is a spacer to push the footer down if there are few items */}
                  <tr className="align-top"><td colSpan={8} className="p-1 min-h-[100px]"></td></tr>
                </tbody>
              </table>
            </div>

            {/* Calculation Section */}
            <div className="grid grid-cols-[60%_40%] border-t-2 border-black">
              <div className="p-1 text-xs">
                Total Items / Qty: {(invoiceToView.items || []).length} / {(invoiceToView.items || []).reduce((acc, i) => acc + i.quantity, 0)}
              </div>
              <div className="text-right text-xs">
                <div className="grid grid-cols-2 p-1 border-b-2 border-black">
                  <span>Taxable Amount</span>
                  <span className="font-bold">{currencySymbol}{invoiceToView.subtotal.toFixed(2)}</span>
                </div>
                 {invoiceToView.discountAmount > 0 && (
                    <div className="grid grid-cols-2 p-1 border-b-2 border-black">
                        <span>Discount</span>
                        <span className="font-bold text-red-600">-{currencySymbol}{invoiceToView.discountAmount.toFixed(2)}</span>
                    </div>
                )}
                <div className="grid grid-cols-2 p-1 border-b-2 border-black">
                  <span>IGST {invoiceToView.taxRate}%</span>
                  <span className="font-bold">{currencySymbol}{invoiceToView.taxAmount.toFixed(2)}</span>
                </div>
                <div className="grid grid-cols-2 p-1 bg-gray-200">
                  <span className="font-bold">Total</span>
                  <span className="font-bold">{currencySymbol}{invoiceToView.amount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="border-y-2 border-black mt-2 text-xs">
              <div className="p-1">Total amount (in words): {/* Placeholder for amount in words */}</div>
            </div>

            {/* Footer */}
            <footer className="mt-auto pt-4 text-xs">
              <div className="flex justify-between items-start border-b-2 border-black pb-2">
                <div>
                  <p className="font-bold">Bank Details:</p>
                  <p><span className="font-bold">Bank:</span> {companyProfileDetails.bankName || 'N/A'}</p>
                  <p><span className="font-bold">Account #:</span> {companyProfileDetails.accountNumber || 'N/A'}</p>
                  <p><span className="font-bold">IFSC:</span> {companyProfileDetails.ifscCode || 'N/A'}</p>
                </div>
                <div className="flex flex-col items-center justify-between">
                  <p className="font-bold text-center">For {companyProfileDetails.name}</p>
                  <div className="relative h-16 w-32 bg-gray-100">
                    <Image src="https://placehold.co/128x64.png" layout="fill" objectFit="contain" alt="Signature Stamp" data-ai-hint="signature stamp" />
                  </div>
                  <p>Authorized Signatory</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <p className="font-bold">Notes:</p>
                  <p className="whitespace-pre-line">{invoiceToView.notes}</p>
                </div>
                <div>
                  <p className="font-bold">Terms and Conditions:</p>
                  <ol className="list-decimal list-inside text-[9px] space-y-px">
                    <li>Goods once sold cannot be taken back or exchanged.</li>
                    <li>We are not the manufacturers; company will stand for warranty as per their terms and conditions.</li>
                    <li>Interest @24% p.a. will be charged for uncleared bills beyond 15 days.</li>
                    <li>Subject to local Jurisdiction.</li>
                  </ol>
                </div>
              </div>
            </footer>
          </div>
        </div>
        <div className="text-center text-xs mt-2 text-gray-500">
          This is a digitally signed document.
        </div>
      </div>
    );
  }
);
InvoiceTemplate.displayName = 'InvoiceTemplate';
export default InvoiceTemplate;

    