
'use client';

import React from 'react';
import { format } from 'date-fns';
import type { InvoiceSettings } from '../settings/actions';
import Letterhead from '@/components/Letterhead';
import { cn } from '@/lib/utils';

// Interface definitions mirrored from invoicing/page.tsx for component props
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
  invoiceSettings: InvoiceSettings | null;
  letterheadTemplate: 'none' | 'simple';
  isBlackAndWhite?: boolean;
}


const InvoiceTemplateBusiness = React.forwardRef<HTMLDivElement, InvoiceTemplateProps>(
  ({ invoiceToView, companyProfileDetails, currencySymbol, invoiceSettings, letterheadTemplate, isBlackAndWhite }, ref) => {
    
    const fullCompanyAddress = [
        companyProfileDetails.address,
        companyProfileDetails.city,
        companyProfileDetails.state,
        companyProfileDetails.country
    ].filter(Boolean).join('\n');
    
    const customColumns = invoiceSettings?.customItemColumns || [];
    const items = invoiceToView.items || [];


    return (
      <div ref={ref} className="bg-white text-gray-800 font-sans text-xs w-[210mm] min-h-[297mm] mx-auto flex flex-col p-8">
        
        {letterheadTemplate === 'simple' && companyProfileDetails ? (
            <Letterhead companyDetails={companyProfileDetails} />
        ) : (
            <div className="h-24 w-full"></div>
        )}

        <header className="flex justify-between items-start mb-4">
            <div>
                <h1 className="text-xl font-bold text-gray-900">{companyProfileDetails.name}</h1>
                <p className="whitespace-pre-line text-xs text-gray-600">{fullCompanyAddress}</p>
                <p className="text-xs text-gray-600">Phone: {companyProfileDetails.phone || 'N/A'}</p>
                <p className="text-xs text-gray-600">Email: {companyProfileDetails.email || 'N/A'}</p>
            </div>
            <div className="text-right">
                <h2 className="text-4xl font-light text-gray-700 tracking-widest">INVOICE</h2>
            </div>
        </header>

        <section className="flex border-t border-b border-gray-900">
            <div className="w-7/12 border-r border-gray-900 p-2">
                <table className="text-xs w-full">
                    <tbody>
                        <tr><td className="font-bold py-1 pr-4">Invoice#</td><td className="font-bold py-1">{invoiceToView.invoiceNumber}</td></tr>
                        <tr><td className="font-bold py-1 pr-4">Invoice Date</td><td className="py-1">{format(invoiceToView.issuedDate, 'dd MMM yyyy')}</td></tr>
                        <tr><td className="font-bold py-1 pr-4">Terms</td><td className="py-1">Due on Receipt</td></tr>
                        <tr><td className="font-bold py-1 pr-4">Due Date</td><td className="py-1">{format(invoiceToView.dueDate, 'dd MMM yyyy')}</td></tr>
                    </tbody>
                </table>
            </div>
            <div className="w-5/12 p-2">
                 {/* This space can be used for Ship To if needed, but for now we follow the design */}
            </div>
        </section>

        <section className="flex border-b border-gray-900">
            <div className="w-7/12 border-r border-gray-900 p-2">
                <h3 className="text-xs text-gray-600 font-bold mb-1">Bill To</h3>
                <p className="font-bold text-xl">{invoiceToView.clientName}</p>
                <p className="whitespace-pre-line text-xs">{invoiceToView.clientAddress}</p>
            </div>
             <div className="w-5/12 p-2">
                <h3 className="text-xs text-gray-600 font-bold mb-1">Ship To</h3>
                <p className="font-bold text-xl">{invoiceToView.clientName}</p>
                <p className="whitespace-pre-line text-xs">{invoiceToView.clientAddress}</p>
            </div>
        </section>

        <main className="mt-4">
            <table className="w-full text-left text-xs border-l border-r border-gray-900">
                <thead>
                    <tr className={cn(isBlackAndWhite ? "text-black border-y-2 border-black" : "text-white")}
                        style={{ backgroundColor: isBlackAndWhite ? 'transparent' : '#0A2B58' }}>
                        <th className="p-2 w-10 text-center font-bold border-r border-gray-500">#</th>
                        <th className="p-2 font-bold border-r border-gray-500">Item & Description</th>
                        <th className="p-2 w-24 font-bold border-r border-gray-500">HSN No.</th>
                        {customColumns.map(col => (
                            <th key={col.id} className="p-2 w-24 font-bold text-right border-r border-gray-500">{col.label}</th>
                        ))}
                        <th className="p-2 w-20 text-right font-bold border-r border-gray-500">Qty</th>
                        <th className="p-2 w-24 text-right font-bold border-r border-gray-500">Rate</th>
                        <th className="p-2 w-28 text-right font-bold">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {(items).map((item, index) => (
                        <tr key={item.id} className="border-b border-gray-900">
                            <td className="p-2 text-center align-top border-r border-gray-900">{index + 1}</td>
                            <td className="p-2 align-top border-r border-gray-900">
                                <p className="font-bold">{item.description}</p>
                            </td>
                            <td className="p-2 align-top border-r border-gray-900">{item.hsnNo || ''}</td>
                             {customColumns.map(col => (
                                <td key={col.id} className="p-2 text-right align-top border-r border-gray-900">{item.customFields?.[col.id] || ''}</td>
                            ))}
                            <td className="p-2 text-right align-top border-r border-gray-900">{item.quantity.toFixed(2)}</td>
                            <td className="p-2 text-right align-top border-r border-gray-900">{currencySymbol}{item.unitPrice.toFixed(2)}</td>
                            <td className="p-2 text-right align-top">{currencySymbol}{(item.quantity * item.unitPrice).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </main>
        
        <footer className="mt-auto pt-4">
             <div className="flex justify-end mb-2">
                <div className="w-1/3">
                    <div className="flex justify-between py-1 border-b">
                        <span className='font-semibold'>Sub Total</span>
                        <span className="text-right font-semibold">{currencySymbol}{invoiceToView.subtotal.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-start">
                <div className="w-1/2 text-xs">
                    <p className="mb-4">Thanks for shopping with us.</p>
                    <p className="font-bold">Terms & Conditions</p>
                    <p className="text-gray-600 whitespace-pre-line">{invoiceToView.notes || 'Full payment is due upon receipt of this invoice. Late payments may incur additional charges or interest as per the applicable laws.'}</p>
                </div>
                <div className="w-1/3">
                    <table className="w-full text-sm font-bold">
                        <tbody>
                            <tr style={{backgroundColor: isBlackAndWhite ? 'transparent' : '#EBF4FF'}} className={cn(isBlackAndWhite && "border-b border-black")}>
                                <td className="p-2">Tax Rate</td>
                                <td className="p-2 text-right">{invoiceToView.taxRate.toFixed(2)}%</td>
                            </tr>
                            <tr style={{backgroundColor: isBlackAndWhite ? 'transparent' : '#EBF4FF'}} className={cn(isBlackAndWhite && "border-b border-black")}>
                                <td className="p-2">Total</td>
                                <td className="p-2 text-right">{currencySymbol}{invoiceToView.amount.toFixed(2)}</td>
                            </tr>
                            <tr style={{backgroundColor: isBlackAndWhite ? 'transparent' : '#0A2B58'}} className={cn(isBlackAndWhite ? "text-black border-t-2 border-black" : "text-white")}>
                                <td className="p-2">Balance Due</td>
                                <td className="p-2 text-right">{currencySymbol}{invoiceToView.amount.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
             <div className="h-16 w-full mt-4"></div> {/* Spacer for bottom letterhead */}
        </footer>
      </div>
    );
  }
);
InvoiceTemplateBusiness.displayName = 'InvoiceTemplateBusiness';
export default InvoiceTemplateBusiness;
