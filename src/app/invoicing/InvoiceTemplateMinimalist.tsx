
'use client';

import React from 'react';
import { format } from 'date-fns';
import { stringToHslColor } from '@/lib/utils';
import type { InvoiceSettings } from '../settings/actions';

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
}

const InvoiceTemplateMinimalist = React.forwardRef<HTMLDivElement, InvoiceTemplateProps>(
  ({ invoiceToView, companyProfileDetails, currencySymbol, signatureDataUri, invoiceSettings }, ref) => {
    
    const accentColor = stringToHslColor(companyProfileDetails.name, 60, 55);

    const fullCompanyAddress = [
      companyProfileDetails.address,
      companyProfileDetails.city,
      companyProfileDetails.state,
      companyProfileDetails.country
    ].filter(Boolean).join(', ');

    const customColumns = invoiceSettings?.customItemColumns || [];

    return (
      <div ref={ref} className="bg-white text-gray-800 font-[Georgia,serif] text-sm w-[210mm] min-h-[297mm] mx-auto flex flex-col p-10">
        
        {/* Header */}
        <header className="flex justify-between items-start pb-4 border-b">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{companyProfileDetails.name}</h1>
            <p className="text-xs text-gray-500 mt-1">{fullCompanyAddress}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">{companyProfileDetails.email}</p>
            <p className="text-xs text-gray-500">{companyProfileDetails.phone}</p>
            <p className="text-xs text-gray-500">{companyProfileDetails.website}</p>
          </div>
        </header>

        {/* Invoice Details */}
        <section className="grid grid-cols-3 gap-8 my-10">
            <div>
                <h2 className="text-xs uppercase tracking-widest text-gray-500 font-semibold">Billed To</h2>
                <p className="text-base font-medium text-gray-900 mt-1">{invoiceToView.clientName}</p>
                <p className="text-xs text-gray-600 whitespace-pre-line">{invoiceToView.clientAddress || 'N/A'}</p>
            </div>
             <div>
                <h2 className="text-xs uppercase tracking-widest text-gray-500 font-semibold">Invoice Number</h2>
                <p className="text-base font-medium text-gray-900 mt-1">{invoiceToView.invoiceNumber}</p>
            </div>
             <div>
                <h2 className="text-xs uppercase tracking-widest text-gray-500 font-semibold">Date of Issue</h2>
                <p className="text-base font-medium text-gray-900 mt-1">{format(invoiceToView.issuedDate, 'dd MMM, yyyy')}</p>
            </div>
        </section>

        {/* Items Table */}
        <section className="flex-grow">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="pb-2 text-xs uppercase tracking-widest text-gray-500 font-semibold w-2/5">Description</th>
                {customColumns.map(col => (
                  <th key={col.id} className="pb-2 text-xs uppercase tracking-widest text-gray-500 font-semibold text-right">{col.label}</th>
                ))}
                <th className="pb-2 text-xs uppercase tracking-widest text-gray-500 font-semibold text-right">Quantity</th>
                <th className="pb-2 text-xs uppercase tracking-widest text-gray-500 font-semibold text-right">Unit Price</th>
                <th className="pb-2 text-xs uppercase tracking-widest text-gray-500 font-semibold text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {(invoiceToView.items || []).map((item) => (
                <tr key={item.id}>
                  <td className="py-3 border-b border-gray-100">{item.description}</td>
                  {customColumns.map(col => (
                    <td key={col.id} className="py-3 border-b border-gray-100 text-right">{item.customFields?.[col.id] || ''}</td>
                  ))}
                  <td className="py-3 border-b border-gray-100 text-right">{item.quantity}</td>
                  <td className="py-3 border-b border-gray-100 text-right">{currencySymbol}{item.unitPrice.toFixed(2)}</td>
                  <td className="py-3 border-b border-gray-100 text-right font-medium">{currencySymbol}{(item.quantity * item.unitPrice).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Footer */}
        <footer className="mt-auto pt-8">
            <div className="flex justify-end">
                 <div className="w-1/2 sm:w-1/3">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="text-gray-800">{currencySymbol}{invoiceToView.subtotal.toFixed(2)}</span>
                    </div>
                     {invoiceToView.discountAmount > 0 && (
                      <div className="flex justify-between text-sm mt-1">
                          <span className="text-gray-600">Discount</span>
                          <span className="text-gray-800">- {currencySymbol}{invoiceToView.discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-600">Tax ({invoiceToView.taxRate}%)</span>
                        <span className="text-gray-800">{currencySymbol}{invoiceToView.taxAmount.toFixed(2)}</span>
                    </div>
                     <div className="border-t my-2"></div>
                    <div className="flex justify-between text-base font-bold">
                        <span style={{ color: accentColor }}>Total</span>
                        <span style={{ color: accentColor }}>{currencySymbol}{invoiceToView.amount.toFixed(2)}</span>
                    </div>
                 </div>
            </div>
            <div className="mt-10 pt-4 border-t text-xs text-gray-500 text-center">
                <p>Thank you for your business. Please make payment by {format(invoiceToView.dueDate, 'dd MMM, yyyy')}.</p>
            </div>
        </footer>

      </div>
    );
  }
);
InvoiceTemplateMinimalist.displayName = 'InvoiceTemplateMinimalist';
export default InvoiceTemplateMinimalist;
