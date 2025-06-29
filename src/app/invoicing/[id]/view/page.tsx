
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Receipt, Mail, Printer, ArrowLeft, Loader2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { sendInvoiceEmailAction } from '../../actions';
import InvoiceTemplateIndian from '../../InvoiceTemplateIndian';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Skeleton } from '@/components/ui/skeleton';
import { urlToDataUri } from '@/lib/utils';
import Link from 'next/link';

// Interface definitions mirrored from invoicing/page.tsx for component props
interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
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
    const [imageDataUris, setImageDataUris] = useState<{ signature?: string; stamp?: string }>({});
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isPrinting, setIsPrinting] = useState(false);
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (authIsLoading) return;
        if (!user || !invoiceId) {
            router.push('/auth/signin');
            return;
        }

        const fetchInvoiceAndCompany = async () => {
            setIsLoadingData(true);
            try {
                const companyId = user.companyId;
                if (!companyId) {
                    toast({ title: "Error", description: "User is not associated with a company.", variant: "destructive" });
                    return;
                }

                const invoiceRef = doc(db, 'invoices', invoiceId);
                const invoiceSnap = await getDoc(invoiceRef);

                if (!invoiceSnap.exists() || invoiceSnap.data().companyId !== companyId) {
                    toast({ title: "Not Found", description: "Invoice not found or you don't have permission.", variant: "destructive" });
                    router.push('/invoicing');
                    return;
                }
                const data = invoiceSnap.data();
                setInvoice({
                    ...data,
                    id: invoiceSnap.id,
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
            } catch (error) {
                toast({ title: "Error", description: "Failed to load invoice data.", variant: "destructive" });
            } finally {
                setIsLoadingData(false);
            }
        };
        fetchInvoiceAndCompany();
    }, [invoiceId, user, authIsLoading, router, toast]);

    const handlePrint = async () => {
        if (!printRef.current) return;
        setIsPrinting(true);
        try {
            const elementToPrint = printRef.current;
            const canvas = await html2canvas(elementToPrint, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const imgData = canvas.toDataURL('image/png');

            if (!imgData || imgData === 'data:,') {
              toast({ title: "Print Failed", description: "Could not generate a printable image of the document.", variant: "destructive" });
              setIsPrinting(false);
              return;
            }

            const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgProps = pdf.getImageProperties(imgData);
            const imgAspectRatio = imgProps.width / imgProps.height;
            const pdfAspectRatio = pdfWidth / pdfHeight;
            let finalWidth, finalHeight;

            if (imgAspectRatio > pdfAspectRatio) {
              finalWidth = pdfWidth;
              finalHeight = pdfWidth / imgAspectRatio;
            } else {
              finalHeight = pdfHeight;
              finalWidth = pdfHeight * imgAspectRatio;
            }

            const x = (pdfWidth - finalWidth) / 2;
            const y = (pdfHeight - finalHeight) / 2;
            pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
            
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
            setIsPrinting(false);
        }
    };
    
    const handleEmail = async () => {
        if (!invoice?.clientEmail || !printRef.current) {
            toast({ title: "Missing Information", description: "Client email is required to send an invoice.", variant: "destructive" });
            return;
        }
        setIsSendingEmail(true);
        try {
            const subject = `Invoice ${invoice.invoiceNumber} from ${companyProfile?.name || 'Us'}`;
            const htmlBody = printRef.current.innerHTML;

            const result = await sendInvoiceEmailAction({ to: invoice.clientEmail, subject, htmlBody, invoiceNumber: invoice.invoiceNumber });
            toast({ title: result.success ? "Success" : "Error", description: result.message, variant: result.success ? "default" : "destructive" });
        } catch (error: any) {
             toast({ title: 'Email Failed', description: error.message, variant: 'destructive' });
        } finally {
            setIsSendingEmail(false);
        }
    };

    if (authIsLoading || isLoadingData) {
        return (
            <div className="flex flex-col items-center justify-center p-8">
                 <div className="w-[210mm] min-h-[297mm] mx-auto p-4 border shadow-md bg-white">
                    <div className="flex justify-between items-center mb-4">
                        <Skeleton className="h-8 w-1/4" />
                        <Skeleton className="h-8 w-1/4" />
                    </div>
                    <Skeleton className="h-32 w-full" />
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
                    <Button onClick={handleEmail} disabled={isSendingEmail || !companyProfile}>
                        {isSendingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />} Email
                    </Button>
                     <Button onClick={handlePrint} disabled={isPrinting || !companyProfile}>
                        {isPrinting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />} Print
                    </Button>
                </div>
            </div>
        </header>

        <main className="w-full py-8 bg-muted">
            <div ref={printRef} className="bg-white shadow-lg">
                <InvoiceTemplateIndian 
                    invoiceToView={invoice} 
                    companyProfileDetails={companyProfile} 
                    currencySymbol={currencySymbol} 
                    signatureDataUri={imageDataUris.signature}
                    stampDataUri={imageDataUris.stamp}
                />
            </div>
        </main>
      </div>
    );
}
