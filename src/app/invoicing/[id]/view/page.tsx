
'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
import { getInvoiceSettings, type InvoiceSettings } from '@/app/settings/actions';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import SignaturePad from '@/components/SignaturePad';
import { Slider } from '@/components/ui/slider';
import { getInvoiceById, getCompanyProfile, type FullInvoiceDisplay, type CompanyDetailsFirestore } from '../../actions';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function ViewInvoicePage() {
    const { user, currencySymbol, isLoading: authIsLoading } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const params = useParams();
    const invoiceId = params.id as string;

    const [invoice, setInvoice] = useState<FullInvoiceDisplay | null>(null);
    const [companyProfile, setCompanyProfile] = useState<CompanyDetailsFirestore | null>(null);
    const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const [localSignatureUri, setLocalSignatureUri] = useState<string | undefined>(undefined);
    const [isProcessing, setIsProcessing] = useState(false);
    const [template, setTemplate] = useState<'business' | 'modern' | 'simple' | 'minimalist' | 'bold' | 'corporate'>('corporate');
    const [useLetterhead, setUseLetterhead] = useState(true);
    const [isBlackAndWhite, setIsBlackAndWhite] = useState(false);
    const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);
    const [zoom, setZoom] = useState(1);


    const fetchInvoiceData = useCallback(async () => {
        if (!user?.companyId || !invoiceId) {
            setIsLoading(false);
            return;
        };

        setIsLoading(true);
        try {
            const [invoiceData, companyData, settingsData] = await Promise.all([
                getInvoiceById(invoiceId),
                getCompanyProfile(),
                getInvoiceSettings(user.companyId),
            ]);

            if (!invoiceData) {
                toast({ title: "Error", description: "Invoice not found.", variant: "destructive" });
                router.push('/invoicing');
                return;
            }

            setInvoice(invoiceData);
            setCompanyProfile(companyData);
            setInvoiceSettings(settingsData);

        } catch (error) {
            toast({ title: "Error", description: "Failed to load invoice data.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [invoiceId, user?.companyId, router, toast]);

    useEffect(() => {
        if (!authIsLoading) {
            fetchInvoiceData();
        }
    }, [authIsLoading, fetchInvoiceData]);


    const processDocument = async (action: 'download' | 'print' | 'email', email?: string) => {
        if (!printRef.current || !invoice) return;
        setIsProcessing(true);
        toast({ title: "Processing...", description: `Generating PDF for ${action}.` });
        try {
            const elementToPrint = printRef.current;
            const canvas = await html2canvas(elementToPrint, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
            const imgData = canvas.toDataURL('image/png');
            if (!imgData || imgData === 'data:,') {
                throw new Error("Could not generate an image of the document.");
            }
            const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

            if (action === 'download') {
                pdf.save(`Invoice-${invoice.invoiceNumber}.pdf`);
                toast({ title: "Download Started" });
            } else if (action === 'print') {
                const pdfBlob = pdf.output('blob');
                const pdfUrl = URL.createObjectURL(pdfBlob);
                const printWindow = window.open(pdfUrl);
                if (printWindow) {
                    printWindow.onload = () => { printWindow.print(); URL.revokeObjectURL(pdfUrl); };
                } else {
                    throw new Error("Could not open print window. Please disable pop-up blockers.");
                }
            } else if (action === 'email') {
                // Email sending is disabled on the frontend for this example.
                 toast({ title: "Action Disabled", description: "Emailing invoices requires backend setup.", variant: "destructive"});
            }
        } catch (error: any) {
            toast({ title: `${action.charAt(0).toUpperCase() + action.slice(1)} Failed`, description: error.message, variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleSignatureSave = (dataUrl: string) => {
        setLocalSignatureUri(dataUrl);
        setIsSignatureDialogOpen(false);
    };

    if (isLoading || authIsLoading) {
        return (
            <div className="w-full flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
                 <header className="w-full bg-background/80 border-b shadow-sm z-10 p-2 print:hidden backdrop-blur-sm shrink-0">
                    <div className="max-w-7xl mx-auto flex items-center gap-4 px-4 h-12">
                         <Skeleton className="h-8 w-8" />
                         <Skeleton className="h-6 w-32" />
                    </div>
                </header>
                 <main className="w-full bg-muted py-8 overflow-auto flex-grow">
                     <div className="w-[210mm] min-h-[297mm] mx-auto p-4 border shadow-lg bg-white">
                        <Skeleton className="h-24 w-full mb-4" />
                        <Skeleton className="h-[800px] w-full mt-4" />
                    </div>
                </main>
            </div>
        )
    }

    if (!invoice || !companyProfile) {
        return (
             <div className="p-8 text-center">
                <p>Could not load invoice data. It might have been deleted.</p>
                <Button asChild variant="link"><Link href="/invoicing">Return to Invoices</Link></Button>
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
      <div className="w-full flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
        <header className="w-full bg-background/80 border-b shadow-sm z-10 p-2 print:hidden backdrop-blur-sm shrink-0">
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
                    <Button variant="secondary" size="sm" asChild>
                         <Link href={`/invoicing/new?from=${invoice.id}`}><Edit className="mr-2 h-4 w-4" /> Duplicate & Edit</Link>
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
                                <SelectItem value="simple">Indian</SelectItem>
                                <SelectItem value="minimalist">Minimalist</SelectItem>
                                <SelectItem value="bold">Bold</SelectItem>
                                <SelectItem value="corporate">Corporate</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button size="sm" onClick={() => processDocument('download')} disabled={isProcessing || !companyProfile}>
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} PDF
                    </Button>
                    <Button size="sm" onClick={() => processDocument('email')} disabled={isProcessing || !companyProfile}>
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />} Email
                    </Button>
                     <Button size="sm" onClick={() => processDocument('print')} disabled={isProcessing || !companyProfile}>
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
