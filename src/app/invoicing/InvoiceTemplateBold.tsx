
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


const InvoiceTemplateBold = React.forwardRef<HTMLDivElement, InvoiceTemplateProps>(
  ({ invoiceToView, companyProfileDetails, currencySymbol, signatureDataUri, invoiceSettings }, ref) => {
    
    const primaryColor = stringToHslColor(companyProfileDetails.name, 45, 55);
    const customColumns = invoiceSettings?.customItemColumns || [];

    return (
      <div ref={ref} className="bg-white text-gray-800 font-sans text-sm w-[210mm] min-h-[297mm] mx-auto flex flex-col">
        
        {/* Header */}
        <header className="p-8 text-white" style={{ backgroundColor: primaryColor }}>
          <div className="flex justify-between items-center">
            <h1 className="text-4xl font-extrabold uppercase tracking-tight">{companyProfileDetails.name}</h1>
            <h2 className="text-3xl font-light uppercase">Invoice</h2>
          </div>
          <p className="text-sm mt-1 opacity-80">{companyProfileDetails.email} | {companyProfileDetails.phone}</p>
        </header>

        {/* Invoice & Client Details */}
        <section className="grid grid-cols-2 gap-8 p-8">
          <div>
            <h3 className="text-sm font-semibold uppercase text-gray-500">Billed To</h3>
            <p className="text-xl font-bold mt-1">{invoiceToView.clientName}</p>
            <p className="text-sm text-gray-600 whitespace-pre-line">{invoiceToView.clientAddress || 'N/A'}</p>
          </div>
          <div className="text-right">
             <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                <span className="font-semibold text-gray-500">Invoice No:</span><span className="font-medium">{invoiceToView.invoiceNumber}</span>
                <span className="font-semibold text-gray-500">Issued:</span><span className="font-medium">{format(invoiceToView.issuedDate, 'dd MMM, yyyy')}</span>
                <span className="font-semibold text-gray-500">Due:</span><span className="font-medium">{format(invoiceToView.dueDate, 'dd MMM, yyyy')}</span>
            </div>
          </div>
        </section>

        {/* Items Table */}
        <section className="flex-grow px-8">
          <table className="w-full text-left">
            <thead>
              <tr style={{ backgroundColor: primaryColor }} className="text-white text-sm uppercase">
                <th className="p-3 w-10">#</th>
                <th className="p-3 w-2/5">Item</th>
                {customColumns.map(col => (
                  <th key={col.id} className="p-3 text-right">{col.label}</th>
                ))}
                <th className="p-3 text-right">Qty</th>
                <th className="p-3 text-right">Price</th>
                <th className="p-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {(invoiceToView.items || []).map((item, index) => (
                <tr key={item.id} className="border-b">
                  <td className="p-3 text-gray-500">{index + 1}</td>
                  <td className="p-3 font-medium">{item.description}</td>
                  {customColumns.map(col => (
                    <td key={col.id} className="p-3 text-right text-gray-600">{item.customFields?.[col.id] || ''}</td>
                  ))}
                  <td className="p-3 text-right text-gray-600">{item.quantity}</td>
                  <td className="p-3 text-right text-gray-600">{currencySymbol}{item.unitPrice.toFixed(2)}</td>
                  <td className="p-3 text-right font-medium">{currencySymbol}{(item.quantity * item.unitPrice).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        
        {/* Footer */}
        <footer className="mt-auto">
            <div className="p-8 grid grid-cols-2 gap-8 items-end">
                <div className="text-sm text-gray-600">
                    <h4 className="font-bold text-base text-gray-800 mb-2">Thank you!</h4>
                    <p>{invoiceToView.notes || 'We appreciate your business. Please contact us if you have any questions.'}</p>
                </div>
                <div className="text-right">
                    <div className="grid grid-cols-2 py-1">
                        <span className="font-semibold text-gray-500">Subtotal:</span>
                        <span>{currencySymbol}{invoiceToView.subtotal.toFixed(2)}</span>
                    </div>
                     {invoiceToView.discountAmount > 0 && (
                      <div className="grid grid-cols-2 py-1 text-red-600">
                          <span className="font-semibold">Discount:</span>
                          <span>- {currencySymbol}{invoiceToView.discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 py-1">
                        <span className="font-semibold text-gray-500">Tax ({invoiceToView.taxRate}%):</span>
                        <span>{currencySymbol}{invoiceToView.taxAmount.toFixed(2)}</span>
                    </div>
                </div>
            </div>
            <div style={{ backgroundColor: primaryColor }} className="text-white p-8 flex justify-between items-center">
                <div className="text-sm">
                    <p className="font-bold">Payment Details</p>
                    <p className="opacity-80">Bank: {companyProfileDetails.bankName || 'N/A'}, A/C: {companyProfileDetails.accountNumber || 'N/A'}</p>
                </div>
                <div className="text-right">
                    <p className="text-lg opacity-80">Total Amount</p>
                    <p className="text-4xl font-bold">{currencySymbol}{invoiceToView.amount.toFixed(2)}</p>
                </div>
            </div>
        </footer>
      </div>
    );
  }
);
InvoiceTemplateBold.displayName = 'InvoiceTemplateBold';
export default InvoiceTemplateBold;
