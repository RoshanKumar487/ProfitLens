
'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Receipt, Mail, Printer, ArrowLeft, Loader2, Edit, Download, PenSquare, ZoomIn, ZoomOut } from 'lucide-react';
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
import { MOCK_FULL_INVOICE, MOCK_COMPANY_PROFILE, MOCK_INVOICE_SETTINGS, type FullInvoiceDisplay, type CompanyDetailsFirestore } from '@/lib/mock-data';
import { Slider } from '@/components/ui/slider';


export default function ViewInvoicePage() {
    const { currencySymbol } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const [invoice] = useState<FullInvoiceDisplay | null>(MOCK_FULL_INVOICE);
    const [companyProfile] = useState<CompanyDetailsFirestore | null>(MOCK_COMPANY_PROFILE);
    const [invoiceSettings] = useState<InvoiceSettings | null>(MOCK_INVOICE_SETTINGS);
    
    const [localSignatureUri, setLocalSignatureUri] = useState<string | undefined>(undefined);
    const [isProcessing, setIsProcessing] = useState(false);
    const [template, setTemplate] = useState<'business' | 'modern' | 'simple' | 'minimalist' | 'bold' | 'corporate'>('corporate');
    const [useLetterhead, setUseLetterhead] = useState(true);
    const [isBlackAndWhite, setIsBlackAndWhite] = useState(false);
    const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);
    const [zoom, setZoom] = useState(1);


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
      <div className="w-full flex flex-col h-full overflow-hidden">
        <header className="w-full bg-background/80 border-b shadow-sm sticky top-14 sm:top-16 z-10 p-2 print:hidden backdrop-blur-sm shrink-0">
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
                         <div className="hidden lg:flex items-center gap-2">
                            <ZoomOut className="h-4 w-4" />
                            <Slider
                                value={[zoom]}
                                onValueChange={(value) => setZoom(value[0])}
                                min={0.2}
                                max={2}
                                step={0.1}
                                className="w-24"
                                disabled={isProcessing}
                            />
                            <ZoomIn className="h-4 w-4" />
                        </div>
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

        <main className="w-full bg-muted py-8 overflow-auto flex-grow">
            <div 
                className="transition-transform origin-top mx-auto"
                style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top',
                }}
            >
                 <div className="bg-white shadow-lg mx-auto">
                     {templateToRender()}
                </div>
            </div>
        </main>
      </div>
    );
}
