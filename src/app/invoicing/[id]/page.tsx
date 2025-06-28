
'use client';

import React, { useState, useEffect, type FormEvent, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Receipt, PlusCircle, Save, Loader2, Calendar as CalendarIconLucide, Trash2, Mail, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { updateInvoice, sendInvoiceEmailAction } from '../actions';
import InvoiceTemplateIndian from '../InvoiceTemplateIndian';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Skeleton } from '@/components/ui/skeleton';
import { urlToDataUri } from '@/lib/utils';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}
type DiscountType = 'fixed' | 'percentage';

interface InvoiceDisplay {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail?: string;
  clientAddress?: string;
  clientGstin?: string;
  subtotal: number;
  discountType: DiscountType;
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

export default function EditInvoicePage() {
    const { user, currencySymbol } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const params = useParams();
    const invoiceId = params.id as string;

    const [invoice, setInvoice] = useState<InvoiceDisplay | null>(null);
    const [companyProfile, setCompanyProfile] = useState<CompanyDetailsFirestore | null>(null);
    const [imageDataUris, setImageDataUris] = useState<{ signature?: string; stamp?: string }>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!user || !invoiceId) return;

        const fetchInvoiceAndCompany = async () => {
            setIsLoading(true);
            try {
                const invoiceRef = doc(db, 'invoices', invoiceId);
                const invoiceSnap = await getDoc(invoiceRef);

                if (!invoiceSnap.exists() || invoiceSnap.data().companyId !== user.companyId) {
                    toast({ title: "Not Found", description: "Invoice not found or you don't have permission to view it.", variant: "destructive" });
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

                const companyRef = doc(db, 'companyProfiles', user.companyId);
                const companySnap = await getDoc(companyRef);
                if (companySnap.exists()) {
                    const companyData = companySnap.data() as CompanyDetailsFirestore;
                    setCompanyProfile(companyData);

                    // Fetch images as data URIs for printing
                    const uris: { signature?: string; stamp?: string } = {};
                    if (companyData.signatureUrl) {
                        uris.signature = await urlToDataUri(companyData.signatureUrl);
                    }
                    if (companyData.stampUrl) {
                        uris.stamp = await urlToDataUri(companyData.stampUrl);
                    }
                    setImageDataUris(uris);
                }

            } catch (error) {
                toast({ title: "Error", description: "Failed to load invoice data.", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };

        fetchInvoiceAndCompany();
    }, [invoiceId, user, router, toast]);

    useEffect(() => {
        if (!invoice) return;

        const subtotal = (invoice.items || []).reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0);
        const discountValue = parseFloat(String(invoice.discountValue) || '0');
        let discountAmount = 0;
        if (invoice.discountType === 'percentage') {
            discountAmount = subtotal * (discountValue / 100);
        } else {
            discountAmount = discountValue;
        }
        const taxRate = parseFloat(String(invoice.taxRate) || '0');
        const taxableAmount = subtotal - discountAmount;
        const taxAmount = taxableAmount * (taxRate / 100);
        const total = taxableAmount + taxAmount;

        setInvoice(prev => prev ? ({ 
            ...prev, 
            subtotal: isNaN(subtotal) ? 0 : subtotal,
            discountAmount: isNaN(discountAmount) ? 0 : discountAmount,
            taxAmount: isNaN(taxAmount) ? 0 : taxAmount,
            amount: isNaN(total) ? 0 : total,
        }) : null);
    }, [invoice?.items, invoice?.discountType, invoice?.discountValue, invoice?.taxRate]);


    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!invoice) return;
        setIsSaving(true);
        const result = await updateInvoice(invoiceId, invoice);
        toast({
            title: result.success ? "Success" : "Error",
            description: result.message,
            variant: result.success ? "default" : "destructive",
        });
        setIsSaving(false);
        if (result.success) {
            router.push('/invoicing');
        }
    };

    const handleAddItem = () => {
        const newItem: InvoiceItem = { id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0 };
        setInvoice(prev => prev ? ({ ...prev, items: [...(prev.items || []), newItem] }) : null);
    };

    const handleItemChange = (itemId: string, field: keyof InvoiceItem, value: string | number) => {
        setInvoice(prev => prev ? ({
            ...prev,
            items: (prev.items || []).map(item =>
                item.id === itemId ? { ...item, [field]: typeof value === 'string' && (field === 'quantity' || field === 'unitPrice') ? parseFloat(value) || 0 : value } : item
            )
        }) : null);
    };

    const handleRemoveItem = (itemId: string) => {
        setInvoice(prev => prev ? ({ ...prev, items: (prev.items || []).filter(item => item.id !== itemId) }) : null);
    };
    
    const handleValueChange = (field: keyof InvoiceDisplay, value: any) => {
        setInvoice(prev => prev ? ({ ...prev, [field]: value }) : null);
    };

    const handlePrint = async () => {
        if (!printRef.current) return;
        setIsPrinting(true);
        try {
            const elementToPrint = printRef.current;
            const images = Array.from(elementToPrint.getElementsByTagName('img'));
            const imagePromises = images.map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise<void>((resolve, reject) => {
                    img.onload = () => resolve();
                    img.onerror = () => {
                        console.warn('An image failed to load for printing:', img.src);
                        resolve(); // Resolve even if an image fails, to not block printing
                    };
                });
            });

            await Promise.all(imagePromises);

            const canvas = await html2canvas(elementToPrint, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const imgData = canvas.toDataURL('image/png');
            
            if (!imgData || imgData === 'data:,') {
                 toast({
                    title: "Print Failed",
                    description: "Could not generate document image. This can happen if an image like a signature or stamp failed to load.",
                    variant: "destructive",
                });
                setIsPrinting(false);
                return;
            }

            const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgProps = pdf.getImageProperties(imgData);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                heightLeft -= pdfHeight;
            }
            
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
            console.error("Error generating PDF:", error);
            toast({ title: "Print Failed", description: `Could not generate document for printing. ${error.message}`, variant: "destructive" });
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

    if (isLoading || !invoice) {
        return (
            <div className="space-y-6 p-4 sm:p-6 lg:p-8">
                <Skeleton className="h-8 w-1/3" />
                <Card className="max-w-4xl mx-auto">
                    <CardHeader><Skeleton className="h-6 w-1/4" /><Skeleton className="h-4 w-1/2 mt-2" /></CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-10 w-full" />
                         <Separator />
                        <Skeleton className="h-24 w-full" />
                        <div className="flex justify-end gap-2"><Skeleton className="h-10 w-24" /><Skeleton className="h-10 w-24" /></div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
            <PageTitle title={`Invoice ${invoice.invoiceNumber}`} subtitle={`Manage invoice for ${invoice.clientName}`} icon={Receipt}>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handlePrint} disabled={isPrinting || !companyProfile}>
                        {isPrinting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />} Print
                    </Button>
                    <Button variant="outline" onClick={handleEmail} disabled={isSendingEmail || !companyProfile}>
                        {isSendingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />} Email
                    </Button>
                </div>
            </PageTitle>

            <Card className="max-w-4xl mx-auto shadow-lg">
                <form onSubmit={handleFormSubmit}>
                    <CardContent className="p-6 space-y-4">
                        <div>
                            <Label htmlFor="clientName">Client Name</Label>
                            <Input id="clientName" value={invoice.clientName} onChange={(e) => handleValueChange('clientName', e.target.value)} required disabled={isSaving}/>
                        </div>
                        <div>
                            <Label htmlFor="clientEmail">Client Email</Label>
                            <Input id="clientEmail" type="email" value={invoice.clientEmail} onChange={(e) => handleValueChange('clientEmail', e.target.value)} disabled={isSaving}/>
                        </div>
                        <div>
                            <Label htmlFor="clientGstin">Client GSTIN</Label>
                            <Input id="clientGstin" value={invoice.clientGstin} onChange={(e) => handleValueChange('clientGstin', e.target.value)} disabled={isSaving} />
                        </div>
                        <div>
                            <Label htmlFor="clientAddress">Client Address</Label>
                            <Textarea id="clientAddress" value={invoice.clientAddress} onChange={(e) => handleValueChange('clientAddress', e.target.value)} disabled={isSaving} rows={3} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <Label>Issued Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild><Button variant="outline" className="w-full justify-start"><CalendarIconLucide className="mr-2 h-4 w-4" />{format(invoice.issuedDate, 'PPP')}</Button></PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={invoice.issuedDate} onSelect={(d) => handleValueChange('issuedDate', d)}/></PopoverContent>
                                </Popover>
                            </div>
                            <div>
                                <Label>Due Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild><Button variant="outline" className="w-full justify-start"><CalendarIconLucide className="mr-2 h-4 w-4" />{format(invoice.dueDate, 'PPP')}</Button></PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={invoice.dueDate} onSelect={(d) => handleValueChange('dueDate', d)}/></PopoverContent>
                                </Popover>
                            </div>
                            <div>
                                <Label>Status</Label>
                                <Select value={invoice.status} onValueChange={(v) => handleValueChange('status', v)}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Draft">Draft</SelectItem>
                                        <SelectItem value="Pending">Pending</SelectItem>
                                        <SelectItem value="Paid">Paid</SelectItem>
                                        <SelectItem value="Overdue">Overdue</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <Separator/>
                        <div className="space-y-2 pt-2">
                             <div className="flex justify-between items-center">
                                <Label className="text-base font-medium">Invoice Items</Label>
                                <Button type="button" variant="outline" size="sm" onClick={handleAddItem} disabled={isSaving}><PlusCircle className="mr-2 h-4 w-4" /> Add Item</Button>
                            </div>
                            {(invoice.items || []).map((item) => (
                                <div key={item.id} className="grid grid-cols-[1fr,auto,auto,auto] sm:grid-cols-[2fr_1fr_1fr_auto] items-end gap-2 p-2 border rounded-md bg-muted/30">
                                    <div className="space-y-1"><Label htmlFor={`item-desc-${item.id}`} className="text-xs">Description</Label><Input id={`item-desc-${item.id}`} value={item.description} onChange={e => handleItemChange(item.id, 'description', e.target.value)} disabled={isSaving} /></div>
                                    <div className="space-y-1"><Label htmlFor={`item-qty-${item.id}`} className="text-xs">Qty</Label><Input id={`item-qty-${item.id}`} type="number" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', e.target.value)} disabled={isSaving} className="w-20" /></div>
                                    <div className="space-y-1"><Label htmlFor={`item-price-${item.id}`} className="text-xs">Unit Price</Label><Input id={`item-price-${item.id}`} type="number" value={item.unitPrice} onChange={e => handleItemChange(item.id, 'unitPrice', e.target.value)} disabled={isSaving} className="w-24"/></div>
                                    <Button type="button" variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => handleRemoveItem(item.id)} disabled={isSaving}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            ))}
                        </div>
                        
                        <Separator/>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <Label>Discount Type</Label>
                                        <Select value={invoice.discountType} onValueChange={(v: DiscountType) => handleValueChange('discountType', v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="fixed">Fixed ({currencySymbol})</SelectItem><SelectItem value="percentage">Percentage (%)</SelectItem></SelectContent></Select>
                                    </div>
                                    <div><Label>Discount Value</Label><Input type="number" value={invoice.discountValue} onChange={(e) => handleValueChange('discountValue', e.target.value)} /></div>
                                </div>
                                <div><Label>Tax Rate (%)</Label><Input type="number" value={invoice.taxRate} onChange={(e) => handleValueChange('taxRate', e.target.value)} /></div>
                            </div>
                            <div className="space-y-2 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                                <h4 className="font-medium text-center mb-2">Summary</h4>
                                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal:</span><span className="font-medium">{currencySymbol}{invoice.subtotal.toFixed(2)}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Discount:</span><span className="font-medium text-destructive">- {currencySymbol}{invoice.discountAmount.toFixed(2)}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tax ({invoice.taxRate}%):</span><span className="font-medium text-chart-2">+ {currencySymbol}{invoice.taxAmount.toFixed(2)}</span></div>
                                <Separator className="my-2" />
                                <div className="flex justify-between text-lg font-bold"><span>Grand Total:</span><span>{currencySymbol}{invoice.amount.toFixed(2)}</span></div>
                            </div>
                        </div>

                        <div><Label>Notes / Terms</Label><Textarea value={invoice.notes} onChange={(e) => handleValueChange('notes', e.target.value)} /></div>

                    </CardContent>
                    <CardHeader className="p-6 pt-0">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" asChild type="button"><Link href="/invoicing">Cancel</Link></Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Changes
                        </Button>
                      </div>
                    </CardHeader>
                </form>
            </Card>

            <div className="hidden">
                 <div ref={printRef}>
                    {companyProfile && <InvoiceTemplateIndian 
                        invoiceToView={invoice} 
                        companyProfileDetails={companyProfile} 
                        currencySymbol={currencySymbol} 
                        signatureDataUri={imageDataUris.signature}
                        stampDataUri={imageDataUris.stamp}
                    />}
                 </div>
            </div>
        </div>
    );
}
