
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Receipt, Mail, Printer, ArrowLeft, Loader2, Edit, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { sendInvoiceEmailAction } from '../../actions';
import InvoiceTemplateIndian from '../../InvoiceTemplateIndian';
import InvoiceTemplateModern from '../../InvoiceTemplateModern';
import InvoiceTemplateBusiness from '../../InvoiceTemplateBusiness';
import InvoiceTemplateMinimalist from '../../InvoiceTemplateMinimalist';
import InvoiceTemplateBold from '../../InvoiceTemplateBold';
import InvoiceTemplateCorporate from '../../InvoiceTemplateCorporate';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Skeleton } from '@/components/ui/skeleton';
import { urlToDataUri, cn } from '@/lib/utils';
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getInvoiceSettings, type InvoiceSettings } from '@/app/settings/actions';
import { Switch } from '@/components/ui/switch';

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

export default function ViewInvoicePage() {
    const { user, currencySymbol, isLoading: authIsLoading } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const params = useParams();
    const invoiceId = params.id as string;

    const [invoice, setInvoice] = useState<InvoiceDisplay | null>(null);
    const [companyProfile, setCompanyProfile] = useState<CompanyDetailsFirestore | null>(null);
    const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings | null>(null);
    const [imageDataUris, setImageDataUris] = useState<{ signature?: string; stamp?: string }>({});
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [template, setTemplate] = useState<'business' | 'modern' | 'simple' | 'minimalist' | 'bold' | 'corporate'>('corporate');
    const [useLetterhead, setUseLetterhead] = useState(true);
    const [isBlackAndWhite, setIsBlackAndWhite] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

    const fetchAllData = useCallback(async () => {
        if (!user || !invoiceId) {
            setIsLoadingData(false);
            return;
        }
        setIsLoadingData(true);
        try {
            const companyId = user.companyId;
            if (!companyId) throw new Error("User not associated with a company.");

            const invoiceRef = doc(db, 'invoices', invoiceId);
            const invoiceSnap = await getDoc(invoiceRef);
            if (!invoiceSnap.exists() || invoiceSnap.data().companyId !== companyId) {
                throw new Error("Invoice not found or you don't have permission.");
            }
            const data = invoiceSnap.data();
            setInvoice({
                ...data, id: invoiceSnap.id,
                issuedDate: (data.issuedDate as Timestamp).toDate(),
                dueDate: (data.dueDate as Timestamp).toDate(),
            } as InvoiceDisplay);

            const companyRef = doc(db, 'companyProfiles', companyId);
            const companySnap = await getDoc(companyRef);
            if (companySnap.exists()) {
                const companyData = companySnap.data() as CompanyDetailsFirestore;
                setCompanyProfile(companyData);

                const uris: { signature?: string; stamp?: string } = {};
                if (companyData.signatureUrl) uris.signature = await urlToDataUri(companyData.signatureUrl);
                if (companyData.stampUrl) uris.stamp = await urlToDataUri(companyData.stampUrl);
                setImageDataUris(uris);
            }

            const settings = await getInvoiceSettings(companyId);
            setInvoiceSettings(settings);

        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to load invoice data.", variant: "destructive" });
            router.push('/invoicing');
        } finally {
            setIsLoadingData(false);
        }
    }, [invoiceId, user, toast, router]);

    useEffect(() => {
        if (!authIsLoading) {
            fetchAllData();
        }
    }, [authIsLoading, fetchAllData]);

    const handleDownloadPdf = async () => {
        if (!printRef.current || !invoice) return;
        setIsProcessing(true);
        try {
            const elementToPrint = printRef.current;
            const canvas = await html2canvas(elementToPrint, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
            const imgData = canvas.toDataURL('image/png');

            if (!imgData || imgData === 'data:,') {
              toast({ title: "Download Failed", description: "Could not generate an image of the document. This may be a temporary issue, please try again.", variant: "destructive" });
              setIsProcessing(false);
              return;
            }

            const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            
            pdf.save(`Invoice-${invoice.invoiceNumber}.pdf`);

            toast({ title: "Download Started", description: `Invoice ${invoice.invoiceNumber}.pdf is being downloaded.` });

        } catch (error: any) {
            toast({ title: "Download Failed", description: `Could not generate PDF: ${error.message}`, variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePrint = async () => {
        if (!printRef.current) return;
        setIsProcessing(true);
        try {
            const elementToPrint = printRef.current;
            const canvas = await html2canvas(elementToPrint, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
            const imgData = canvas.toDataURL('image/png');

            if (!imgData || imgData === 'data:,') {
              toast({ title: "Print Failed", description: "Could not generate a printable image. This may be a temporary issue, please try again.", variant: "destructive" });
              setIsProcessing(false);
              return;
            }

            const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            
            const pdfBlob = pdf.output('blob');
            const pdfUrl = URL.createObjectURL(pdfBlob);
            const printWindow = window.open(pdfUrl);
            
            if (printWindow) {
                printWindow.onload = () => {
                    printWindow.print();
                    URL.revokeObjectURL(pdfUrl);
                };
            } else {
                toast({ title: "Print Error", description: "Could not open print window. Please check your pop-up blocker.", variant: "destructive"});
            }
        } catch (error: any) {
            toast({ title: "Print Failed", description: `Could not generate document for printing: ${error.message}`, variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleEmail = async () => {
        if (!invoice?.clientEmail || !printRef.current) {
            toast({ title: "Missing Information", description: "Client email is required to send an invoice.", variant: "destructive" });
            return;
        }
        setIsProcessing(true);
        try {
            const subject = `Invoice ${invoice.invoiceNumber} from ${companyProfile?.name || 'Us'}`;
            const htmlBody = printRef.current.innerHTML;

            const result = await sendInvoiceEmailAction({ to: invoice.clientEmail, subject, htmlBody, invoiceNumber: invoice.invoiceNumber });
            toast({ title: result.success ? "Success" : "Error", description: result.message, variant: result.success ? "default" : "destructive" });
        } catch (error: any) {
             toast({ title: 'Email Failed', description: error.message, variant: 'destructive' });
        } finally {
            setIsProcessing(false);
        }
    };

    if (authIsLoading || isLoadingData) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-muted min-h-screen">
                 <div className="w-[210mm] min-h-[297mm] mx-auto p-4 border shadow-lg bg-white">
                    <Skeleton className="h-24 w-full mb-4" />
                    <div className="flex justify-between items-center mb-4">
                        <Skeleton className="h-20 w-1/2" />
                        <Skeleton className="h-20 w-1/3" />
                    </div>
                    <Skeleton className="h-64 w-full mt-4" />
                </div>
            </div>
        )
    }

    if (!invoice || !companyProfile) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <p className="text-muted-foreground">Could not load invoice data.</p>
                 <Button variant="outline" asChild className="mt-4">
                    <Link href="/invoicing">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Invoices
                    </Link>
                </Button>
            </div>
        )
    }
    
    const templateToRender = () => {
        const commonProps = {
            ref: printRef,
            invoiceToView: invoice, 
            companyProfileDetails: companyProfile, 
            currencySymbol: currencySymbol, 
            signatureDataUri: imageDataUris.signature,
            stampDataUri: imageDataUris.stamp,
            invoiceSettings: invoiceSettings,
            letterheadTemplate: useLetterhead ? 'simple' as const : 'none' as const,
            isBlackAndWhite: isBlackAndWhite,
        };

        switch(template) {
            case 'modern':
                 return <InvoiceTemplateModern {...commonProps} />
            case 'business':
                 return <InvoiceTemplateBusiness {...commonProps} />
            case 'simple':
                 return <InvoiceTemplateIndian {...commonProps} />
            case 'minimalist':
                 return <InvoiceTemplateMinimalist {...commonProps} />
            case 'bold':
                 return <InvoiceTemplateBold {...commonProps} />
            case 'corporate':
                return <InvoiceTemplateCorporate {...commonProps} />
            default:
                return  <InvoiceTemplateBusiness {...commonProps} />
        }
    }

    return (
      <div className="w-full">
        <header className="w-full bg-background/80 border-b shadow-sm sticky top-14 sm:top-16 z-10 p-2 print:hidden backdrop-blur-sm">
            <div className="max-w-7xl mx-auto flex justify-between items-center px-4">
                <div className="flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-primary" />
                    <h1 className="text-lg font-bold truncate">Invoice {invoice.invoiceNumber}</h1>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                    <Button variant="outline" asChild>
                        <Link href={`/invoicing`}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            All Invoices
                        </Link>
                    </Button>
                    <Button variant="secondary" asChild>
                        <Link href={`/invoicing/${invoiceId}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                        </Link>
                    </Button>
                    <div className="flex items-center gap-4 border-l pl-4">
                         <div className="flex items-center gap-2">
                            <Switch id="use-letterhead" checked={useLetterhead} onCheckedChange={setUseLetterhead} disabled={isProcessing} />
                            <Label htmlFor="use-letterhead" className="cursor-pointer">Letterhead</Label>
                        </div>
                         <div className="flex items-center gap-2">
                            <Switch id="b-and-w" checked={isBlackAndWhite} onCheckedChange={setIsBlackAndWhite} disabled={isProcessing} />
                            <Label htmlFor="b-and-w" className="cursor-pointer">B&W</Label>
                        </div>
                         <Select value={template} onValueChange={(value) => setTemplate(value as any)} disabled={isProcessing}>
                            <SelectTrigger className="w-[180px]" id="template-select">
                                <SelectValue placeholder="Select a template" />
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
                    <Button onClick={handleDownloadPdf} disabled={isProcessing || !companyProfile}>
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} Download PDF
                    </Button>
                    <Button onClick={handleEmail} disabled={isProcessing || !companyProfile}>
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />} Email
                    </Button>
                     <Button onClick={handlePrint} disabled={isProcessing || !companyProfile}>
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
