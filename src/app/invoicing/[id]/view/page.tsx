
'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Receipt, Mail, Printer, ArrowLeft, Loader2, Edit, Download, PenSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import InvoiceTemplateIndian from '../../InvoiceTemplateIndian';
import InvoiceTemplateModern from '../../InvoiceTemplateModern';
import InvoiceTemplateBusiness from '../../InvoiceTemplateBusiness';
import InvoiceTemplateMinimalist from '../../InvoiceTemplateMinimalist';
import InvoiceTemplateBold from '../../InvoiceTemplateBold';
import InvoiceTemplateCorporate from '../../InvoiceTemplateCorporate';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type InvoiceSettings } from '@/app/settings/actions';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import SignaturePad from '@/components/SignaturePad';

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
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail?: string;
  clientAddress?: string;
  clientGstin?: string;
  subtotal: number;
  discountType: 'fixed' | 'percentage';
  discountValue: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  amount: number;
  dueDate: Date;
  status: 'Paid' | 'Pending' | 'Overdue' | 'Draft';
  issuedDate: Date;
  items: InvoiceItem[];
  notes?: string;
  isRcmApplicable?: boolean;
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

const MOCK_INVOICE: InvoiceDisplay = {
    id: '1',
    invoiceNumber: 'INV001',
    clientName: 'Acme Corp',
    clientAddress: '123 Main St\nAnytown, USA 12345',
    clientEmail: 'contact@acme.com',
    status: 'Paid',
    issuedDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 86400000),
    items: [
        { id: 'item1', description: 'Premium Web Development', quantity: 1, unitPrice: 2000, hsnNo: '998314' },
        { id: 'item2', description: 'Logo Design & Branding', quantity: 1, unitPrice: 500, hsnNo: '998313' },
    ],
    subtotal: 2500,
    discountType: 'fixed',
    discountValue: 0,
    discountAmount: 0,
    taxRate: 10,
    taxAmount: 250,
    amount: 2750,
    notes: 'Thank you for your business!',
    isRcmApplicable: false,
};

const MOCK_COMPANY_PROFILE: CompanyDetailsFirestore = {
    name: 'Demo Company Inc.',
    address: '456 Business Ave',
    city: 'Metropolis',
    state: 'CA',
    country: 'USA',
    gstin: '1234567890ABC',
    phone: '555-123-4567',
    email: 'billing@demo.com',
    website: 'demo.com',
    accountNumber: '1234567890',
    ifscCode: 'DEMO0001234',
    bankName: 'Global Bank',
    branch: 'Main Branch'
};

const MOCK_INVOICE_SETTINGS: InvoiceSettings = {
    customItemColumns: [{id: 'col1', label: 'S/N'}],
    defaultHsnCode: '',
    defaultNotes: 'Thank you for your business.',
    defaultPaymentTermsDays: 30
};


export default function ViewInvoicePage() {
    const { currencySymbol } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const [invoice] = useState<InvoiceDisplay | null>(MOCK_INVOICE);
    const [companyProfile] = useState<CompanyDetailsFirestore | null>(MOCK_COMPANY_PROFILE);
    const [invoiceSettings] = useState<InvoiceSettings | null>(MOCK_INVOICE_SETTINGS);
    
    const [localSignatureUri, setLocalSignatureUri] = useState<string | undefined>(undefined);
    const [isProcessing, setIsProcessing] = useState(false);
    const [template, setTemplate] = useState<'business' | 'modern' | 'simple' | 'minimalist' | 'bold' | 'corporate'>('corporate');
    const [useLetterhead, setUseLetterhead] = useState(true);
    const [isBlackAndWhite, setIsBlackAndWhite] = useState(false);
    const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);


    const handleDisabledAction = () => {
        toast({ title: 'Action Disabled', description: 'This action is disabled in the demo.', variant: 'destructive' });
    }
    
    const handleSignatureSave = (dataUrl: string) => {
        setLocalSignatureUri(dataUrl);
        setIsSignatureDialogOpen(false);
    };

    if (!invoice || !companyProfile) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-muted min-h-screen">
                 <div className="w-[210mm] min-h-[297mm] mx-auto p-4 border shadow-lg bg-white">
                    <Skeleton className="h-24 w-full mb-4" />
                    <Skeleton className="h-[800px] w-full mt-4" />
                </div>
            </div>
        )
    }
    
    const templateToRender = () => {
        const commonProps = {
            ref: printRef,
            invoiceToView: invoice, 
            companyProfileDetails: companyProfile, 
            currencySymbol: currencySymbol, 
            signatureDataUri: localSignatureUri,
            invoiceSettings: invoiceSettings,
            letterheadTemplate: useLetterhead ? 'simple' as const : 'none' as const,
            isBlackAndWhite: isBlackAndWhite,
        };

        switch(template) {
            case 'modern': return <InvoiceTemplateModern {...commonProps} />
            case 'business': return <InvoiceTemplateBusiness {...commonProps} />
            case 'simple': return <InvoiceTemplateIndian {...commonProps} />
            case 'minimalist': return <InvoiceTemplateMinimalist {...commonProps} />
            case 'bold': return <InvoiceTemplateBold {...commonProps} />
            case 'corporate': return <InvoiceTemplateCorporate {...commonProps} />
            default: return  <InvoiceTemplateBusiness {...commonProps} />
        }
    }

    return (
      <div className="w-full">
        <header className="w-full bg-background/80 border-b shadow-sm sticky top-14 sm:top-16 z-10 p-2 print:hidden backdrop-blur-sm">
            <div className="max-w-7xl mx-auto flex justify-between items-center flex-wrap gap-2 px-4">
                <div className="flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-primary" />
                    <h1 className="text-lg font-bold truncate">Invoice {invoice.invoiceNumber}</h1>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                    <Button variant="outline" asChild size="sm">
                        <Link href={`/invoicing`}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> All Invoices
                        </Link>
                    </Button>
                    <Button variant="secondary" size="sm" onClick={handleDisabledAction}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Dialog open={isSignatureDialogOpen} onOpenChange={setIsSignatureDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="secondary" size="sm">
                                <PenSquare className="mr-2 h-4 w-4" /> Draw Signature
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Draw Signature</DialogTitle>
                                <DialogDescription>Draw a signature for this invoice. It will not be saved.</DialogDescription>
                            </DialogHeader>
                            <SignaturePad onSave={handleSignatureSave} isSaving={false} />
                        </DialogContent>
                    </Dialog>
                    <div className="flex items-center gap-2 border-l pl-2">
                        <div className="flex items-center gap-1.5">
                            <Switch id="use-letterhead" checked={useLetterhead} onCheckedChange={setUseLetterhead} disabled={isProcessing} />
                            <Label htmlFor="use-letterhead" className="text-xs cursor-pointer">Letterhead</Label>
                        </div>
                         <div className="flex items-center gap-1.5">
                            <Switch id="b-and-w" checked={isBlackAndWhite} onCheckedChange={setIsBlackAndWhite} disabled={isProcessing} />
                            <Label htmlFor="b-and-w" className="text-xs cursor-pointer">B&W</Label>
                        </div>
                         <Select value={template} onValueChange={(value) => setTemplate(value as any)} disabled={isProcessing}>
                            <SelectTrigger className="w-[120px] h-9" id="template-select">
                                <SelectValue placeholder="Template" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="business">Business</SelectItem>
                                <SelectItem value="modern">Modern</SelectItem>
                                <SelectItem value="simple">Simple</SelectItem>
                                <SelectItem value="minimalist">Minimalist</SelectItem>
                                <SelectItem value="bold">Bold</SelectItem>
                                <SelectItem value="corporate">Corporate</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button size="sm" onClick={handleDisabledAction} disabled={isProcessing || !companyProfile}>
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} PDF
                    </Button>
                    <Button size="sm" onClick={handleDisabledAction} disabled={isProcessing || !companyProfile}>
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />} Email
                    </Button>
                     <Button size="sm" onClick={handleDisabledAction} disabled={isProcessing || !companyProfile}>
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />} Print
                    </Button>
                </div>
            </div>
        </header>

        <main className="w-full bg-muted py-8">
            <div className="bg-white shadow-lg mx-auto">
                 {templateToRender()}
            </div>
        </main>
      </div>
    );
}
