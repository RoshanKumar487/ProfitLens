
'use client';

import React from 'react';
import { format } from 'date-fns';
import type { InvoiceSettings } from '../settings/actions';
import { cn } from '@/lib/utils';

// Interface definitions mirrored for component props
interface InvoiceItem {
  id: string;
  description: string;
  hsnNo?: string;
  quantity: number;
  unitPrice: number;
  customFields?: { [key: string]: string };
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
  invoiceSettings: InvoiceSettings | null;
  letterheadTemplate: 'none' | 'simple';
  isBlackAndWhite?: boolean;
}

const InvoiceTemplateModern = React.forwardRef<HTMLDivElement, InvoiceTemplateProps>(
  ({ invoiceToView, companyProfileDetails, currencySymbol, signatureDataUri, invoiceSettings, isBlackAndWhite }, ref) => {
    
    const fullCompanyAddress = [
      companyProfileDetails.address,
      companyProfileDetails.city,
      companyProfileDetails.state,
      companyProfileDetails.country
    ].filter(Boolean).join(', ');

    const customColumns = invoiceSettings?.customItemColumns || [];
    const hasCustomColumns = customColumns.length > 0;

    return (
      <div ref={ref} className="bg-white text-gray-800 font-sans text-sm w-[210mm] min-h-[297mm] mx-auto flex flex-col p-8">
        {/* Header Section */}
        <header className="relative mb-8">
          <div className={cn("text-white p-6 pl-8 rounded-tr-[50px]", isBlackAndWhite ? "bg-transparent !text-black border-2 border-black" : "bg-slate-800")}>
            <h1 className={cn("text-4xl font-bold uppercase tracking-wider", isBlackAndWhite ? "" : "text-amber-400")}>{companyProfileDetails.name}</h1>
            <p className={cn("mt-2", isBlackAndWhite ? "text-gray-600" : "text-slate-300")}>{fullCompanyAddress}</p>
            <div className={cn("flex gap-4 text-xs mt-1", isBlackAndWhite ? "text-gray-600" : "text-slate-300")}>
                <p><strong>Phone:</strong> {companyProfileDetails.phone || 'N/A'}</p>
                <p><strong>Email:</strong> {companyProfileDetails.email || 'N/A'}</p>
            </div>
          </div>
          <div className={cn(
            "absolute top-0 right-0 h-full w-2/5 rounded-tl-[50px] rounded-br-[50px] flex items-center justify-center",
             isBlackAndWhite ? "bg-transparent" : "bg-amber-400"
          )}>
            <h2 className={cn("text-5xl font-bold -rotate-15 transform", isBlackAndWhite ? "text-black" : "text-white")}>INVOICE</h2>
          </div>
        </header>

        {/* Invoice Details & Client Info */}
        <section className="grid grid-cols-2 gap-8 mb-8">
          <div className={cn("p-4 rounded-lg", isBlackAndWhite ? "border" : "bg-slate-100")}>
            <h3 className={cn("text-lg font-semibold border-b-2 pb-1 mb-2", isBlackAndWhite ? "text-black border-black" : "text-slate-800 border-amber-400")}>Invoice To:</h3>
            <p className="text-2xl font-bold text-slate-700">{invoiceToView.clientName}</p>
            <p><strong>Address:</strong> {invoiceToView.clientAddress || 'N/A'}</p>
          </div>
          <div className={cn("p-4 rounded-lg", isBlackAndWhite ? "border" : "bg-slate-100")}>
             <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                <span className="font-bold">Invoice No:</span><span className="font-medium text-slate-600">{invoiceToView.invoiceNumber}</span>
                <span className="font-bold">Invoice Date:</span><span className="font-medium text-slate-600">{format(invoiceToView.issuedDate, 'dd MMM, yyyy')}</span>
                <span className="font-bold">Due Date:</span><span className="font-medium text-slate-600">{format(invoiceToView.dueDate, 'dd MMM, yyyy')}</span>
            </div>
            <div className="mt-4">
              <h3 className="font-bold text-slate-800">Payment Method:</h3>
              <p className="text-xs text-slate-600">Bank: {companyProfileDetails.bankName || 'N/A'}</p>
              <p className="text-xs text-slate-600">A/C: {companyProfileDetails.accountNumber || 'N/A'}</p>
              <p className="text-xs text-slate-600">IFSC: {companyProfileDetails.ifscCode || 'N/A'}</p>
            </div>
          </div>
        </section>

        {/* Items Table */}
        <section className="mb-4">
          <table className="w-full text-left">
            <thead>
              <tr className={cn(isBlackAndWhite ? "text-black border-y-2 border-black" : "bg-slate-800 text-white")}>
                <th className={cn("p-3 w-2/5 font-semibold", isBlackAndWhite ? "" : "rounded-l-lg")}>Product Description</th>
                <th className="p-3 text-center font-semibold">HSN</th>
                {customColumns.map(col => (
                  <th key={col.id} className="p-3 text-center font-semibold">{col.label}</th>
                ))}
                <th className="p-3 text-right font-semibold">Price</th>
                <th className="p-3 text-right font-semibold">QTY</th>
                <th className={cn("p-3 text-right font-semibold", isBlackAndWhite ? "" : "rounded-r-lg")}>Total</th>
              </tr>
            </thead>
            <tbody>
              {(invoiceToView.items || []).map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="p-3 font-semibold">{item.description}</td>
                  <td className="p-3 text-center">{item.hsnNo || ''}</td>
                   {customColumns.map(col => (
                    <td key={col.id} className="p-3 text-center">{item.customFields?.[col.id] || ''}</td>
                  ))}
                  <td className="p-3 text-right">{currencySymbol}{item.unitPrice.toFixed(2)}</td>
                  <td className="p-3 text-right">{item.quantity}</td>
                  <td className="p-3 text-right font-semibold">{currencySymbol}{(item.quantity * item.unitPrice).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Totals Section */}
        <section className="grid grid-cols-2 gap-8 items-start mt-auto pt-8">
            <div className="text-xs text-slate-600">
                <h4 className="font-bold text-lg text-slate-800 mb-2">Terms & Conditions</h4>
                <p>{invoiceToView.notes || 'Full payment is due upon receipt of this invoice. Thank you for your business.'}</p>
            </div>

            <div className="text-right">
                <div className="grid grid-cols-2 py-1">
                    <span className="font-semibold">Sub Total:</span>
                    <span>{currencySymbol}{invoiceToView.subtotal.toFixed(2)}</span>
                </div>
                {invoiceToView.discountAmount > 0 && (
                  <div className="grid grid-cols-2 py-1 text-red-600">
                      <span className="font-semibold">Discount:</span>
                      <span>- {currencySymbol}{invoiceToView.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 py-1">
                    <span className="font-semibold">Tax ({invoiceToView.taxRate}%):</span>
                    <span>{currencySymbol}{invoiceToView.taxAmount.toFixed(2)}</span>
                </div>
                <div className={cn("grid grid-cols-2 py-2 mt-2", isBlackAndWhite ? "border-t-2 border-black" : "bg-slate-800 text-white rounded-lg")}>
                    <span className="font-bold text-xl pl-4">Grand Total:</span>
                    <span className="font-bold text-xl pr-4">{currencySymbol}{invoiceToView.amount.toFixed(2)}</span>
                </div>
            </div>
        </section>

        {/* Footer */}
        <footer className="mt-16 pt-8 flex justify-between items-end border-t-2 border-slate-200">
           <p className={cn("font-bold text-lg", isBlackAndWhite ? "text-black" : "text-amber-500")}>Thanks For Your Business</p>
           <div className="w-48 text-center">
             {signatureDataUri ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={signatureDataUri} alt="Signature" className="mx-auto max-h-12 object-contain" crossOrigin="anonymous" />
              ) : (
                <div className="h-12"></div>
              )}
             <p className="border-t-2 border-slate-800 pt-1 text-sm font-semibold">Authorize Signature</p>
           </div>
        </footer>
        <div className="h-16 w-full mt-4"></div>
      </div>
    );
  }
);
InvoiceTemplateModern.displayName = 'InvoiceTemplateModern';
export default InvoiceTemplateModern;
