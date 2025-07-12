
'use client';

import React from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { InvoiceSettings } from '../settings/actions';
import { Phone, Mail, Globe, MapPin } from 'lucide-react';

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

const InvoiceTemplateCorporate = React.forwardRef<HTMLDivElement, InvoiceTemplateProps>(
  ({ invoiceToView, companyProfileDetails, currencySymbol, signatureDataUri, stampDataUri, invoiceSettings, isBlackAndWhite }, ref) => {
    
    const primaryColor = '#0d244f'; // Dark Navy Blue
    const accentColor = '#facc15'; // Yellow

    const fullCompanyAddress = [
      companyProfileDetails.address,
      companyProfileDetails.city,
      companyProfileDetails.state,
      companyProfileDetails.country
    ].filter(Boolean).join(', ');

    return (
      <div ref={ref} className="bg-white text-gray-800 font-sans text-sm w-[210mm] min-h-[297mm] mx-auto flex flex-col">
        <header className="relative p-8 text-white" style={{ backgroundColor: primaryColor }}>
          <div className="absolute top-0 right-8 h-20 w-20" style={{ backgroundColor: accentColor, clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}></div>
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3">
                 <div className="bg-white p-2 rounded-md">
                   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-6 w-6">
                        <path d="M22 2L15 22L11 13L2 9L22 2Z" fill={accentColor}/>
                    </svg>
                 </div>
                 <h1 className="text-2xl font-bold uppercase tracking-wider">{companyProfileDetails.name}</h1>
              </div>
              <div className="mt-8">
                <p className="text-xs text-gray-300">Invoice To:</p>
                <p className="text-xl font-bold">{invoiceToView.clientName}</p>
                <p className="text-sm text-gray-300">{invoiceToView.clientEmail}</p>
              </div>
            </div>
            <div className="text-right">
                <h2 className="text-4xl font-extrabold text-white" style={{color: accentColor}}>INVOICE</h2>
                <div className="mt-8 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                    <span className="font-semibold text-gray-300">Invoice No:</span><span className="font-medium">#{invoiceToView.invoiceNumber}</span>
                    <span className="font-semibold text-gray-300">Due Date:</span><span className="font-medium">{format(invoiceToView.dueDate, 'dd MMMM, yyyy')}</span>
                    <span className="font-semibold text-gray-300">Invoice Date:</span><span className="font-medium">{format(invoiceToView.issuedDate, 'dd MMMM, yyyy')}</span>
                </div>
            </div>
          </div>
        </header>

        <div className="p-2 flex items-center gap-2 text-gray-800" style={{backgroundColor: accentColor}}>
            <MapPin className="h-4 w-4 ml-6" />
            <p className="font-semibold text-sm">{fullCompanyAddress}</p>
        </div>

        <main className="flex-grow p-8">
            <section className="grid grid-cols-2 gap-8 mb-8">
                <div>
                    <p><strong className="w-20 inline-block">Phone:</strong> {companyProfileDetails.phone}</p>
                    <p><strong className="w-20 inline-block">Email:</strong> {companyProfileDetails.email}</p>
                    <p><strong className="w-20 inline-block">Address:</strong> {fullCompanyAddress}</p>
                </div>
                <div>
                    <h3 className="font-bold mb-1">PAYMENT METHOD</h3>
                    <p><strong className="w-28 inline-block">Account No:</strong> {companyProfileDetails.accountNumber}</p>
                    <p><strong className="w-28 inline-block">Account Name:</strong> {companyProfileDetails.name}</p>
                    <p><strong className="w-28 inline-block">Branch Name:</strong> {companyProfileDetails.branch}</p>
                </div>
            </section>

            <section>
                <table className="w-full text-left">
                    <thead>
                    <tr className="text-sm text-white" style={{backgroundColor: primaryColor}}>
                        <th className="p-3 w-3/5 font-semibold">DESCRIPTION</th>
                        <th className="p-3 text-right font-semibold">UNIT PRICE</th>
                        <th className="p-3 text-right font-semibold">QTY</th>
                        <th className="p-3 text-right font-semibold">TOTAL</th>
                    </tr>
                    </thead>
                    <tbody>
                    {(invoiceToView.items || []).map((item) => (
                        <tr key={item.id} className="border-b">
                            <td className="p-3 font-medium">{item.description}</td>
                            <td className="p-3 text-right">{currencySymbol}{item.unitPrice.toFixed(2)}</td>
                            <td className="p-3 text-right">{item.quantity}</td>
                            <td className="p-3 text-right font-medium">{currencySymbol}{(item.quantity * item.unitPrice).toFixed(2)}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </section>

             <section className="mt-8 flex justify-between">
                <div>
                    <h4 className="font-bold">TERM AND CONDITIONS</h4>
                    <p className="text-xs text-gray-600 max-w-xs">{invoiceToView.notes || 'Please send payment within 30 days of receiving this invoice. There will be a 10% interest charge per month on late invoice.'}</p>
                    
                    <h4 className="font-bold mt-4">THANK YOU FOR YOUR BUSINESS</h4>
                     <div className="text-xs text-gray-600 mt-2 space-y-1">
                        <p className="flex items-center gap-2"><Phone size={12}/> {companyProfileDetails.phone}</p>
                        <p className="flex items-center gap-2"><Globe size={12}/> {companyProfileDetails.website}</p>
                        <p className="flex items-center gap-2"><MapPin size={12}/> {fullCompanyAddress}</p>
                    </div>
                </div>
                <div className="w-1/3 text-sm">
                    <div className="flex justify-between py-1"><span>Sub-total:</span><span>{currencySymbol}{invoiceToView.subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between py-1"><span>Discount:</span><span>{currencySymbol}{invoiceToView.discountAmount.toFixed(2)}</span></div>
                    <div className="flex justify-between py-1"><span>Tax ({invoiceToView.taxRate}%):</span><span>{currencySymbol}{invoiceToView.taxAmount.toFixed(2)}</span></div>
                    <div className="flex justify-between py-2 mt-2 text-white font-bold text-lg" style={{backgroundColor: primaryColor}}>
                        <span className="pl-2">Total:</span><span className="pr-2">{currencySymbol}{invoiceToView.amount.toFixed(2)}</span>
                    </div>

                    <div className="mt-16 text-center">
                        {signatureDataUri ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={signatureDataUri} alt="Signature" className="mx-auto max-h-12 object-contain" crossOrigin="anonymous" />
                        ) : <div className="h-12"></div>}
                        <p className="border-t border-black pt-1 mt-1 text-xs">Administrator</p>
                    </div>
                </div>
             </section>
        </main>
        
        <footer className="relative h-12">
           <div className="absolute bottom-0 left-0 w-full h-12" style={{ backgroundColor: accentColor }}></div>
           <div className="absolute bottom-0 right-0 h-16 w-32" style={{ backgroundColor: primaryColor, clipPath: 'polygon(0 100%, 100% 0, 100% 100%)' }}></div>
        </footer>
      </div>
    );
  }
);
InvoiceTemplateCorporate.displayName = 'InvoiceTemplateCorporate';
export default InvoiceTemplateCorporate;
