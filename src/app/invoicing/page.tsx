
'use client';

import React, { useState, useMemo, useEffect, type FormEvent, useCallback, useRef } from 'react';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Receipt, PlusCircle, Search, MoreHorizontal, Edit, Trash2, Eye, Mail, Download, Calendar as CalendarIconLucide, Save, Loader2, UserPlus, Printer, FileDown } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, Timestamp, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Image from 'next/image';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface InvoiceFirestore {
  id?: string; 
  invoiceNumber: string;
  clientName: string;
  clientEmail?: string;
  amount: number;
  dueDate: Timestamp;
  status: 'Paid' | 'Pending' | 'Overdue' | 'Draft';
  issuedDate: Timestamp;
  items?: InvoiceItem[];
  notes?: string;
  companyId: string;
  createdAt: Timestamp;
}

interface InvoiceDisplay extends Omit<InvoiceFirestore, 'dueDate' | 'issuedDate' | 'createdAt' | 'companyId' | 'items'> {
  id: string;
  dueDate: Date;
  issuedDate: Date;
  items: InvoiceItem[];
  notes?: string;
}

interface ExistingClient {
  name: string;
  email?: string; // The latest email found for this client
}

interface CompanyDetailsFirestore {
  name: string;
  address: string;
  gstin: string;
  phone: string;
  email: string;
  website: string;
}

interface EmailTemplate {
  subject: string;
  body: string;
}

const LOCAL_STORAGE_EMAIL_TEMPLATE_KEY = 'bizsight-invoice-email-template';

const DEFAULT_EMAIL_TEMPLATE: EmailTemplate = {
  subject: "Invoice {{invoiceNumber}} from {{companyName}}",
  body: `Dear {{clientName}},

Please find details for invoice {{invoiceNumber}} regarding your recent services/products.

Amount: $ {{amount}}
Due Date: {{dueDate}}

A PDF of Invoice {{invoiceNumber}} would be attached to this email in a fully integrated system.
This email is sent via a mailto link and cannot attach files directly.

Thank you for your business!

Sincerely,
{{companyName}}`
};


export default function InvoicingPage() {
  const { user, isLoading: authIsLoading } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceDisplay[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<Partial<InvoiceDisplay & {invoiceNumber?: string}>>({});
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [invoiceToDeleteId, setInvoiceToDeleteId] = useState<string | null>(null);

  const [isEmailPreviewDialogOpen, setIsEmailPreviewDialogOpen] = useState(false);
  const [invoiceForEmail, setInvoiceForEmail] = useState<InvoiceDisplay | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  
  const [companyProfileDetails, setCompanyProfileDetails] = useState<CompanyDetailsFirestore | null>(null);
  const [isFetchingCompanyProfile, setIsFetchingCompanyProfile] = useState(true);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [existingClients, setExistingClients] = useState<ExistingClient[]>([]);
  const [isClientPopoverOpen, setIsClientPopoverOpen] = useState(false);
  const clientNameInputRef = useRef<HTMLInputElement>(null);
  const popoverContentRef = useRef<HTMLDivElement>(null);
  const invoicePrintRef = useRef<HTMLDivElement>(null);

  const [isViewInvoiceDialogOpen, setIsViewInvoiceDialogOpen] = useState(false);
  const [invoiceToView, setInvoiceToView] = useState<InvoiceDisplay | null>(null);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);


  const fetchCompanyProfile = useCallback(async () => {
    if (user && user.companyId) {
      setIsFetchingCompanyProfile(true);
      try {
        const docRef = doc(db, 'companyProfiles', user.companyId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCompanyProfileDetails(docSnap.data() as CompanyDetailsFirestore);
        } else {
          setCompanyProfileDetails({ name: 'Your Company Name', address: 'Your Address', gstin: 'Your GSTIN', phone: '', email: '', website: '' });
          console.log("[InvoicingPage fetchCompanyProfile] No company profile found, using defaults.");
        }
      } catch (error) {
        console.error("[InvoicingPage fetchCompanyProfile] Failed to fetch company details from Firestore:", error);
        setCompanyProfileDetails({ name: 'Your Company Name', address: 'Your Address', gstin: 'Your GSTIN', phone: '', email: '', website: '' });
        toast({ title: "Error Fetching Company Info", description: "Could not load company details for invoices.", variant: "destructive" });
      } finally {
        setIsFetchingCompanyProfile(false);
      }
    } else {
      setCompanyProfileDetails(null);
      setIsFetchingCompanyProfile(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authIsLoading) {
      fetchCompanyProfile();
    }
  }, [user, authIsLoading, fetchCompanyProfile]);


  const fetchInvoices = useCallback(async () => {
    if (!user || !user.companyId) {
      setInvoices([]);
      setExistingClients([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const invoicesColRef = collection(db, 'invoices');
      const q = query(invoicesColRef, where('companyId', '==', user.companyId), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      const fetchedInvoices = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data() as Omit<InvoiceFirestore, 'id'>;
        return {
          id: docSnap.id,
          invoiceNumber: data.invoiceNumber,
          clientName: data.clientName,
          clientEmail: data.clientEmail,
          amount: data.amount,
          dueDate: data.dueDate.toDate(),
          status: data.status,
          issuedDate: data.issuedDate.toDate(),
          items: data.items || [],
          notes: data.notes || '',
        } as InvoiceDisplay;
      });

      setInvoices(fetchedInvoices);

      const clientsMap = new Map<string, ExistingClient>();
      for (let i = fetchedInvoices.length - 1; i >= 0; i--) {
        const inv = fetchedInvoices[i];
        if (inv.clientName) {
          clientsMap.set(inv.clientName.toLowerCase(), { 
            name: inv.clientName, 
            email: inv.clientEmail || clientsMap.get(inv.clientName.toLowerCase())?.email 
          });
        }
      }
      setExistingClients(Array.from(clientsMap.values()));

    } catch (error: any) {
      console.error('[InvoicingPage fetchInvoices] Error fetching invoices:', error);
      toast({
        title: 'Error Fetching Invoices',
        description: `Could not load invoices. ${error.message || 'An unknown error occurred.'}`,
        variant: 'destructive',
      });
      setInvoices([]);
      setExistingClients([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);


  useEffect(() => {
    if (authIsLoading) {
      setIsLoading(true);
      return;
    }
    if (!user || !user.companyId) {
      setIsLoading(false);
      setInvoices([]);
      setExistingClients([]);
      return;
    }
    fetchInvoices();
  }, [user, user?.companyId, authIsLoading, fetchInvoices]);


  const filteredInvoices = useMemo(() => {
    return invoices.filter(
      (invoice) =>
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.status.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [invoices, searchTerm]);

  const getStatusBadgeVariant = (status: InvoiceDisplay['status']) => {
    switch (status) {
      case 'Paid':
        return 'default';
      case 'Pending':
        return 'secondary';
      case 'Overdue':
        return 'destructive';
      case 'Draft':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.companyId) {
      toast({ title: "Authentication Error", description: "User not authenticated. Please sign in.", variant: "destructive" });
      return;
    }
    if (!currentInvoice.clientName || currentInvoice.amount === undefined || !currentInvoice.issuedDate || !currentInvoice.dueDate) {
        toast({ title: "Missing Fields", description: "Please fill all required invoice details (Client Name, Amount, Issued Date, Due Date).", variant: "destructive" });
        return;
    }
     if (currentInvoice.amount < 0) {
        toast({ title: "Invalid Amount", description: "Amount cannot be negative.", variant: "destructive" });
        return;
    }

    setIsSaving(true);

    const issuedDateForFirestore = currentInvoice.issuedDate instanceof Date ? Timestamp.fromDate(currentInvoice.issuedDate) : Timestamp.fromDate(new Date(currentInvoice.issuedDate!));
    const dueDateForFirestore = currentInvoice.dueDate instanceof Date ? Timestamp.fromDate(currentInvoice.dueDate) : Timestamp.fromDate(new Date(currentInvoice.dueDate!));

    const invoiceDataToSaveCore = {
      clientName: currentInvoice.clientName!,
      clientEmail: currentInvoice.clientEmail || '', 
      amount: Number(currentInvoice.amount) || 0,
      issuedDate: issuedDateForFirestore,
      dueDate: dueDateForFirestore,
      status: currentInvoice.status || 'Draft',
      items: currentInvoice.items || [],
      notes: currentInvoice.notes || '',
      companyId: user.companyId,
    };

    try {
      if (isEditing && currentInvoice.id) {
        const invoiceRef = doc(db, 'invoices', currentInvoice.id);
        await updateDoc(invoiceRef, {
            ...invoiceDataToSaveCore,
            invoiceNumber: currentInvoice.invoiceNumber!, 
        });
        toast({ title: "Invoice Updated", description: `Invoice ${currentInvoice.invoiceNumber} updated successfully.` });
      } else {
        const newInvoiceNumber = currentInvoice.invoiceNumber || `INV${(Date.now()).toString().slice(-6)}`;
        const invoicesColRef = collection(db, 'invoices');
        await addDoc(invoicesColRef, {
            ...invoiceDataToSaveCore,
            invoiceNumber: newInvoiceNumber,
            createdAt: serverTimestamp(),
        });
        toast({ title: "Invoice Created", description: `Invoice ${newInvoiceNumber} created successfully.` });
      }
      fetchInvoices();
      setIsFormOpen(false);
      setCurrentInvoice({});
      setIsEditing(false);
    } catch (error: any) {
      console.error("Error saving invoice: ", error);
      toast({ title: "Save Failed", description: `Could not save invoice. ${error.message}`, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateNew = () => {
    setCurrentInvoice({
        issuedDate: new Date(),
        dueDate: new Date(new Date().setDate(new Date().getDate() + 30)),
        status: 'Draft',
        items: [],
        amount: 0,
        invoiceNumber: `INV${(Date.now()).toString().slice(-6)}`,
        clientName: '',
        clientEmail: '',
        notes: '',
    });
    setIsEditing(false);
    setIsFormOpen(true);
    setTimeout(() => clientNameInputRef.current?.focus(), 0);
  };

  const handleEditInvoice = (invoice: InvoiceDisplay) => {
    setCurrentInvoice({ 
      ...invoice,
      notes: invoice.notes || '' 
    });
    setIsEditing(true);
    setIsFormOpen(true);
  };

  const promptDeleteInvoice = (id: string) => {
    setInvoiceToDeleteId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteInvoice = async () => {
    if (invoiceToDeleteId) {
        setIsSaving(true);
        try {
            const invoiceRef = doc(db, 'invoices', invoiceToDeleteId);
            await deleteDoc(invoiceRef);
            toast({ title: "Invoice Deleted", description: "The invoice has been removed."});
            fetchInvoices();
            setInvoiceToDeleteId(null);
        } catch (error: any) {
            console.error("Error deleting invoice: ", error);
            toast({ title: "Delete Failed", description: `Could not delete invoice. ${error.message}`, variant: "destructive"});
        } finally {
            setIsSaving(false);
        }
    }
    setIsDeleteDialogOpen(false);
  };
  
  const handleOpenViewInvoiceDialog = (invoice: InvoiceDisplay) => {
    setInvoiceToView(invoice);
    setIsViewInvoiceDialogOpen(true);
  };

  const handlePrintInvoice = () => {
    const printContents = invoicePrintRef.current?.innerHTML;
    if (printContents && typeof window !== 'undefined') {
      const printWindow = window.open('', '_blank', 'height=800,width=800');
      if (printWindow) {
        printWindow.document.write('<html><head><title>Print Invoice</title>');
        // Basic print styling - can be expanded
        printWindow.document.write(`
          <style>
            body { font-family: 'PT Sans', sans-serif; margin: 20px; color: #333; }
            .invoice-view-container { max-width: 750px; margin: auto; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .text-lg { font-size: 1.125rem; }
            .text-2xl { font-size: 1.5rem; }
            .mb-4 { margin-bottom: 1rem; }
            .mt-4 { margin-top: 1rem; }
            .mt-8 { margin-top: 2rem; }
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .gap-8 { gap: 2rem; }
            .p-6 { padding: 1.5rem; }
            .bg-muted { background-color: #f1f5f9; } /* Example from globals.css, adjust if needed */
            .rounded-lg { border-radius: 0.5rem; }
            h1,h2,h3,h4 { margin-top:0; margin-bottom: 0.5rem; }
            /* Hide buttons in print view */
            @media print {
              body * { visibility: hidden; }
              .printable-area, .printable-area * { visibility: visible; }
              .printable-area { position: absolute; left: 0; top: 0; width: 100%; }
              .no-print { display: none !important; }
            }
          </style>
        `);
        printWindow.document.write('</head><body>');
        printWindow.document.write(`<div class="printable-area">${printContents}</div>`);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        
        // Delay print and close to allow content to render
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);

      } else {
        toast({ title: "Print Error", description: "Could not open print window. Please check pop-up blocker settings.", variant: "destructive"});
      }
    }
  };

  const handleDownloadPDF = async () => {
    if (!invoicePrintRef.current || !invoiceToView) return;
    setIsDownloadingPDF(true);
    try {
      const canvas = await html2canvas(invoicePrintRef.current, {
        scale: 2, // Increase scale for better quality
        useCORS: true, // If you have external images
        logging: true,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px', // Use pixels for unit to match canvas dimensions
        format: [canvas.width, canvas.height] // Set PDF size to canvas size
      });

      // If canvas width is greater than a typical A4 portrait width (approx 595px), scale it down.
      // A4: 210mm x 297mm. At 72 DPI, 595px x 842px. At 96 DPI, 794px x 1123px.
      // We'll use a reference width, e.g., 750px for a reasonably sized PDF.
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const aspectRatio = imgProps.width / imgProps.height;

      let newImgWidth = pdfWidth;
      let newImgHeight = newImgWidth / aspectRatio;

      if (newImgHeight > pdfHeight) {
        newImgHeight = pdfHeight;
        newImgWidth = newImgHeight * aspectRatio;
      }
      
      // Center the image if it's smaller than the page
      const xOffset = (pdfWidth - newImgWidth) / 2;
      const yOffset = (pdfHeight - newImgHeight) / 2;

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, newImgWidth, newImgHeight);
      pdf.save(`Invoice-${invoiceToView.invoiceNumber}.pdf`);
      toast({ title: "PDF Downloaded", description: `Invoice ${invoiceToView.invoiceNumber}.pdf downloaded.`});
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({ title: "PDF Generation Failed", description: "Could not generate PDF.", variant: "destructive"});
    } finally {
      setIsDownloadingPDF(false);
    }
  };


  const loadAndPrepareEmailTemplate = (invoice: InvoiceDisplay, useDefault: boolean = false) => {
    let template = DEFAULT_EMAIL_TEMPLATE;
    if (!useDefault) {
        const storedTemplateString = localStorage.getItem(LOCAL_STORAGE_EMAIL_TEMPLATE_KEY);
        if (storedTemplateString) {
            try {
                template = JSON.parse(storedTemplateString);
            } catch (e) {
                console.error("Failed to parse saved email template", e);
                template = DEFAULT_EMAIL_TEMPLATE;
            }
        }
    }

    let processedSubject = template.subject;
    let processedBody = template.body;
    const dueDateFormatted = format(invoice.dueDate, 'PPP');
    const companyNameForTpl = companyProfileDetails?.name || "Your Company";

    const placeholders = {
        '{{clientName}}': invoice.clientName || 'Client',
        '{{invoiceNumber}}': invoice.invoiceNumber,
        '{{amount}}': invoice.amount.toFixed(2),
        '{{dueDate}}': dueDateFormatted,
        '{{companyName}}': companyNameForTpl,
    };

    for (const [key, value] of Object.entries(placeholders)) {
        processedSubject = processedSubject.replace(new RegExp(key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), String(value));
        processedBody = processedBody.replace(new RegExp(key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), String(value));
    }
    setEmailSubject(processedSubject);
    setEmailBody(processedBody);
  };

  const handleOpenEmailDialog = (invoice: InvoiceDisplay) => {
    if (!invoice.clientEmail) {
        toast({ title: "Missing Client Email", description: "Cannot send email without client's email address.", variant: "destructive"});
        return;
    }
    setInvoiceForEmail(invoice);
    loadAndPrepareEmailTemplate(invoice);
    setIsEmailPreviewDialogOpen(true);
  };

  const handleSendEmail = () => {
    if (!invoiceForEmail || !invoiceForEmail.clientEmail) return;

    const mailtoLink = `mailto:${invoiceForEmail.clientEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    if (typeof window !== "undefined") {
        window.location.href = mailtoLink;
    }
    toast({ title: "Email Client Opened", description: `Preparing email for invoice ${invoiceForEmail.invoiceNumber}.`});
    setIsEmailPreviewDialogOpen(false);
    setInvoiceForEmail(null);
  };

  const handleSaveTemplate = () => {
    const currentTemplateText: EmailTemplate = { subject: emailSubject, body: emailBody };
    localStorage.setItem(LOCAL_STORAGE_EMAIL_TEMPLATE_KEY, JSON.stringify(currentTemplateText));
    toast({ title: "Template Saved", description: "Your current email content is saved as the default template."});
  };

  const handleRevertToDefaultTemplate = () => {
    if (invoiceForEmail) {
        loadAndPrepareEmailTemplate(invoiceForEmail, true);
        toast({ title: "Template Reset", description: "Email content reset to the original default."});
    }
  };

  const handleAddItem = () => {
    const newItem: InvoiceItem = { id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0 };
    setCurrentInvoice(prev => ({
      ...prev,
      items: [...(prev.items || []), newItem]
    }));
  };

  const handleItemChange = (itemId: string, field: keyof InvoiceItem, value: string | number) => {
    setCurrentInvoice(prev => {
        const updatedItems = (prev.items || []).map(item =>
            item.id === itemId ? { ...item, [field]: typeof value === 'string' && (field === 'quantity' || field === 'unitPrice') ? parseFloat(value) || 0 : value } : item
        );
        return { ...prev, items: updatedItems };
    });
  };

  const handleRemoveItem = (itemId: string) => {
     setCurrentInvoice(prev => ({
      ...prev,
      items: (prev.items || []).filter(item => item.id !== itemId)
    }));
  };

  useEffect(() => {
    if (currentInvoice.items && currentInvoice.items.length > 0) {
      const totalAmount = currentInvoice.items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);
      setCurrentInvoice(prev => ({ ...prev, amount: totalAmount }));
    } else if ((currentInvoice.items || []).length === 0 ) {
        if (currentInvoice.amount === undefined || currentInvoice.amount === null) {
             setCurrentInvoice(prev => ({ ...prev, amount: 0}));
        }
    }
  }, [currentInvoice.items]);

  const handleClientNameInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const typedValue = e.target.value;
    setCurrentInvoice(prev => ({
      ...prev,
      clientName: typedValue,
    }));
    if (typedValue.trim() !== '' || existingClients.length > 0) {
      setIsClientPopoverOpen(true);
    } else {
      setIsClientPopoverOpen(false);
    }
  };

  const handleClientSuggestionClick = (client: ExistingClient) => {
    setCurrentInvoice(prev => ({
      ...prev,
      clientName: client.name,
      clientEmail: client.email || prev.clientEmail || '', 
    }));
    setIsClientPopoverOpen(false);
    clientNameInputRef.current?.focus();
  };

  const handleClientNameInputFocus = () => {
    if (currentInvoice.clientName || existingClients.length > 0) {
      setIsClientPopoverOpen(true);
    }
  };
  
  const handleClientNameInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setTimeout(() => {
      if (popoverContentRef.current && !popoverContentRef.current.contains(document.activeElement)) {
        setIsClientPopoverOpen(false);
      }
    }, 150);
  };


  const filteredClientSuggestions = useMemo(() => {
    const currentName = currentInvoice.clientName?.toLowerCase() || '';
    if (!currentName && isClientPopoverOpen) { 
        return existingClients;
    }
    if (!currentName) {
        return [];
    }
    return existingClients.filter(client =>
      client.name.toLowerCase().includes(currentName)
    );
  }, [currentInvoice.clientName, existingClients, isClientPopoverOpen]);

  const isNewClient = useMemo(() => {
    if (!currentInvoice.clientName || currentInvoice.clientName.trim() === '') return false;
    return !existingClients.some(c => c.name.toLowerCase() === currentInvoice.clientName!.toLowerCase());
  }, [currentInvoice.clientName, existingClients]);


  if (isLoading && invoices.length === 0 && !authIsLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <PageTitle title="Invoicing" subtitle="Manage your customer invoices efficiently." icon={Receipt}>
        <Button onClick={handleCreateNew} disabled={isSaving || isLoading || isFetchingCompanyProfile}>
          <PlusCircle className="mr-2 h-4 w-4" /> Create New Invoice
        </Button>
      </PageTitle>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-center gap-2 justify-between">
            <CardTitle className="font-headline">All Invoices</CardTitle>
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search invoices..."
                className="pl-8 sm:w-[250px] md:w-[300px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={(isLoading && invoices.length === 0) || isFetchingCompanyProfile}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(isLoading || isFetchingCompanyProfile) && invoices.length === 0 && (
             <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading data...</span>
            </div>
          )}
          {isLoading && invoices.length > 0 && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2">Refreshing invoices...</span>
            </div>
          )}
          <Table>
            <TableCaption>{filteredInvoices.length === 0 && !isLoading ? "No invoices found." : filteredInvoices.length > 0 ? "A list of your recent invoices." : isLoading ? "Loading invoices..." : "No invoices match your search."}</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Issued Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                  <TableCell>{invoice.clientName}</TableCell>
                  <TableCell className="text-right">${invoice.amount.toFixed(2)}</TableCell>
                  <TableCell>{format(invoice.issuedDate, 'PP')}</TableCell>
                  <TableCell>{format(invoice.dueDate, 'PP')}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(invoice.status)} className={`${invoice.status === 'Paid' ? 'bg-accent text-accent-foreground hover:bg-accent/80' : ''} ${invoice.status === 'Overdue' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/80' : ''}`}>
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isSaving}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenViewInvoiceDialog(invoice)}><Eye className="mr-2 h-4 w-4" /> View / Print / Download</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditInvoice(invoice)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenEmailDialog(invoice)} disabled={!invoice.clientEmail}><Mail className="mr-2 h-4 w-4" /> Email</DropdownMenuItem>
                        {/* Removed standalone Download, now part of View dialog */}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => promptDeleteInvoice(invoice.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invoice Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) { setCurrentInvoice({}); setIsEditing(false); setIsClientPopoverOpen(false); } }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-headline">{isEditing ? 'Edit Invoice' : 'Create New Invoice'}</DialogTitle>
            <DialogDescription>
              {isEditing ? `Update details for invoice ${currentInvoice.invoiceNumber || ''}.` : 'Fill in the details for the new invoice.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} id="invoice-form-explicit" className="space-y-4 overflow-y-auto flex-grow p-1 pr-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="relative">
                  <Label htmlFor="clientName">Client Name</Label>
                  <Popover open={isClientPopoverOpen} onOpenChange={setIsClientPopoverOpen}>
                    <PopoverTrigger asChild>
                       <div> 
                        <Input
                          id="clientName"
                          ref={clientNameInputRef}
                          value={currentInvoice.clientName || ''}
                          onChange={handleClientNameInputChange}
                          onFocus={handleClientNameInputFocus}
                          onBlur={handleClientNameInputBlur}
                          placeholder="Enter client name"
                          required
                          autoComplete="off"
                          disabled={isSaving}
                          className="w-full"
                        />
                      </div>
                    </PopoverTrigger>
                    {isClientPopoverOpen && (
                      <PopoverContent
                        ref={popoverContentRef}
                        className="w-[--radix-popover-trigger-width] p-0 max-h-60 overflow-y-auto"
                        side="bottom"
                        align="start"
                        onOpenAutoFocus={(e) => e.preventDefault()} 
                      >
                        <ScrollArea className="max-h-56">
                          {filteredClientSuggestions.length > 0 ? (
                            filteredClientSuggestions.map((client) => (
                              <div
                                key={client.name}
                                className="px-3 py-2 text-sm hover:bg-accent cursor-pointer"
                                onMouseDown={() => handleClientSuggestionClick(client)}
                              >
                                {client.name}
                                {client.email && <span className="text-xs text-muted-foreground ml-2">({client.email})</span>}
                              </div>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-sm text-muted-foreground">
                              {currentInvoice.clientName && currentInvoice.clientName.trim() !== '' ? 'No matching clients found.' : (existingClients.length > 0 ? 'Type to search clients or select from list...' : 'No existing clients. Type to add.')}
                            </div>
                          )}
                        </ScrollArea>
                      </PopoverContent>
                    )}
                  </Popover>
                   {isNewClient && currentInvoice.clientName && currentInvoice.clientName.trim() !== '' && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center">
                      <UserPlus className="h-3 w-3 mr-1 text-accent" />
                      New client: '{currentInvoice.clientName}' will be added.
                    </p>
                  )}
                </div>


                <div>
                    <Label htmlFor="clientEmail">Client Email (Optional)</Label>
                    <Input
                        id="clientEmail"
                        type="email"
                        value={currentInvoice.clientEmail || ''}
                        onChange={(e) => setCurrentInvoice({ ...currentInvoice, clientEmail: e.target.value })}
                        placeholder="Enter client email"
                        disabled={isSaving}
                    />
                </div>
                 <div>
                    <Label htmlFor="invoiceNumber">Invoice Number</Label>
                    <Input id="invoiceNumber" value={currentInvoice.invoiceNumber || ''} onChange={(e) => setCurrentInvoice({ ...currentInvoice, invoiceNumber: e.target.value })} required disabled={isSaving || isEditing} />
                </div>
                <div>
                    <Label htmlFor="issuedDate">Issued Date</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal" disabled={isSaving}>
                            <CalendarIconLucide className="mr-2 h-4 w-4" />
                            {currentInvoice.issuedDate ? format(currentInvoice.issuedDate, 'PPP') : <span>Pick a date</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={currentInvoice.issuedDate} onSelect={(date) => setCurrentInvoice({...currentInvoice, issuedDate: date})} initialFocus disabled={isSaving}/></PopoverContent>
                    </Popover>
                </div>
                 <div>
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal" disabled={isSaving}>
                            <CalendarIconLucide className="mr-2 h-4 w-4" />
                            {currentInvoice.dueDate ? format(currentInvoice.dueDate, 'PPP') : <span>Pick a date</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={currentInvoice.dueDate} onSelect={(date) => setCurrentInvoice({...currentInvoice, dueDate: date})} initialFocus disabled={isSaving} /></PopoverContent>
                    </Popover>
                </div>
                 <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={currentInvoice.status || 'Draft'} onValueChange={(value: InvoiceDisplay['status']) => setCurrentInvoice({ ...currentInvoice, status: value })} disabled={isSaving}>
                    <SelectTrigger id="status"><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Paid">Paid</SelectItem>
                      <SelectItem value="Overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center">
                <Label>Invoice Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddItem} disabled={isSaving}><PlusCircle className="mr-2 h-4 w-4" /> Add Item</Button>
              </div>
              {(currentInvoice.items || []).map((item) => (
                <div key={item.id} className="flex gap-2 items-end p-2 border rounded-md bg-muted/30">
                  <div className="flex-grow space-y-1">
                    <Label htmlFor={`item-desc-${item.id}`} className="text-xs">Description</Label>
                    <Input id={`item-desc-${item.id}`} value={item.description} onChange={e => handleItemChange(item.id, 'description', e.target.value)} placeholder="Service or Product" disabled={isSaving} />
                  </div>
                  <div className="w-20 space-y-1">
                     <Label htmlFor={`item-qty-${item.id}`} className="text-xs">Qty</Label>
                    <Input id={`item-qty-${item.id}`} type="number" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', e.target.value)} min="0" disabled={isSaving} />
                  </div>
                   <div className="w-24 space-y-1">
                    <Label htmlFor={`item-price-${item.id}`} className="text-xs">Unit Price</Label>
                    <Input id={`item-price-${item.id}`} type="number" value={item.unitPrice} onChange={e => handleItemChange(item.id, 'unitPrice', e.target.value)} min="0" step="0.01" disabled={isSaving} />
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => handleRemoveItem(item.id)} disabled={isSaving}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
               { (currentInvoice.items || []).length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No items added. Total amount can be set manually.</p>}
            </div>

            <div>
                <Label htmlFor="amount">Total Amount ($)</Label>
                <Input id="amount" type="number" value={currentInvoice.amount === undefined || currentInvoice.amount === null ? '' : currentInvoice.amount.toFixed(2)} onChange={(e) => setCurrentInvoice({ ...currentInvoice, amount: parseFloat(e.target.value) || 0 })} placeholder="Calculated if items exist, or set manually" disabled={(currentInvoice.items || []).length > 0 || isSaving} required min="0" step="0.01" />
            </div>

            <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea id="notes" value={currentInvoice.notes || ''} onChange={(e) => setCurrentInvoice({ ...currentInvoice, notes: e.target.value })} placeholder="e.g., Payment terms, thank you message" disabled={isSaving} />
            </div>

          </form>
          <DialogFooter className="mt-auto pt-4 border-t">
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={() => { setIsFormOpen(false); setCurrentInvoice({}); setIsEditing(false); setIsClientPopoverOpen(false); }} disabled={isSaving}>Cancel</Button>
            </DialogClose>
            <Button type="submit" form="invoice-form-explicit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditing ? 'Save Changes' : 'Create Invoice')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog open={isViewInvoiceDialogOpen} onOpenChange={(open) => { setIsViewInvoiceDialogOpen(open); if (!open) setInvoiceToView(null); }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="font-headline text-2xl">Invoice Details</DialogTitle>
            <DialogDescription>
              Viewing Invoice {invoiceToView?.invoiceNumber}. Use actions below to print or download.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-grow overflow-y-auto">
            <div ref={invoicePrintRef} className="invoice-view-container p-6 bg-card text-card-foreground">
              {isFetchingCompanyProfile && <div className="text-center p-10"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /> <p>Loading company details...</p></div>}
              {!isFetchingCompanyProfile && invoiceToView && companyProfileDetails && (
                <>
                  {/* Invoice Header */}
                  <header className="mb-8">
                    <div className="grid grid-cols-2 gap-8 items-start">
                      <div>
                         <Image src="https://placehold.co/200x80.png?text=Your+Logo" alt="Company Logo" width={150} height={60} className="mb-4" data-ai-hint="company logo" />
                        <h2 className="text-2xl font-bold text-primary">{companyProfileDetails.name}</h2>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">{companyProfileDetails.address}</p>
                        {companyProfileDetails.email && <p className="text-sm text-muted-foreground">Email: {companyProfileDetails.email}</p>}
                        {companyProfileDetails.phone && <p className="text-sm text-muted-foreground">Phone: {companyProfileDetails.phone}</p>}
                        {companyProfileDetails.website && <p className="text-sm text-muted-foreground">Website: <a href={companyProfileDetails.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{companyProfileDetails.website}</a></p>}
                        {companyProfileDetails.gstin && <p className="text-sm text-muted-foreground">GSTIN/Tax ID: {companyProfileDetails.gstin}</p>}
                      </div>
                      <div className="text-right">
                        <h1 className="text-4xl font-bold uppercase text-foreground mb-2">Invoice</h1>
                        <p className="text-md"><span className="font-semibold">Invoice #:</span> {invoiceToView.invoiceNumber}</p>
                        <p className="text-md"><span className="font-semibold">Date Issued:</span> {format(invoiceToView.issuedDate, 'PPP')}</p>
                        <p className="text-md"><span className="font-semibold">Date Due:</span> {format(invoiceToView.dueDate, 'PPP')}</p>
                        <Badge variant={getStatusBadgeVariant(invoiceToView.status)} className={`mt-2 text-sm px-3 py-1 ${invoiceToView.status === 'Paid' ? 'bg-accent text-accent-foreground' : invoiceToView.status === 'Overdue' ? 'bg-destructive text-destructive-foreground' : ''}`}>
                          {invoiceToView.status}
                        </Badge>
                      </div>
                    </div>
                  </header>

                  {/* Client Details */}
                  <section className="mb-8 p-4 bg-muted/30 rounded-lg">
                    <h3 className="text-lg font-semibold text-foreground mb-2">Bill To:</h3>
                    <p className="font-medium text-foreground">{invoiceToView.clientName}</p>
                    {invoiceToView.clientEmail && <p className="text-sm text-muted-foreground">{invoiceToView.clientEmail}</p>}
                    {/* Placeholder for client address - add if available in future */}
                  </section>

                  {/* Items Table */}
                  <section className="mb-8">
                    <Table className="border">
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="w-[50px]">#</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(invoiceToView.items || []).map((item, index) => (
                          <TableRow key={item.id}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{item.description}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">${item.unitPrice.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-medium">${(item.quantity * item.unitPrice).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                        {(!invoiceToView.items || invoiceToView.items.length === 0) && (
                           <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-4">No line items for this invoice.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </section>
                  
                  {/* Totals Section */}
                  <section className="flex justify-end mb-8">
                    <div className="w-full max-w-xs space-y-2">
                       {/* Placeholder for Subtotal, Tax if needed in future */}
                       <div className="flex justify-between items-center border-t pt-2">
                         <p className="text-lg font-semibold text-foreground">Grand Total:</p>
                         <p className="text-lg font-bold text-primary">${invoiceToView.amount.toFixed(2)}</p>
                       </div>
                    </div>
                  </section>

                  {/* Notes */}
                  {invoiceToView.notes && (
                    <section className="mb-8 p-4 bg-muted/30 rounded-lg">
                      <h4 className="font-semibold text-foreground mb-1">Notes:</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoiceToView.notes}</p>
                    </section>
                  )}

                  {/* Footer */}
                  <footer className="text-center text-sm text-muted-foreground pt-8 border-t">
                    <p>Thank you for your business!</p>
                    <p>{companyProfileDetails.name} - Payment is due by {format(invoiceToView.dueDate, 'PPP')}.</p>
                  </footer>
                </>
              )}
            </div>
          </ScrollArea>
          
          <DialogFooter className="p-6 border-t bg-background no-print">
             <Button type="button" variant="outline" onClick={handlePrintInvoice} disabled={isDownloadingPDF}>
                <Printer className="mr-2 h-4 w-4" /> Print Invoice
             </Button>
             <Button type="button" onClick={handleDownloadPDF} disabled={isDownloadingPDF}>
                {isDownloadingPDF ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                {isDownloadingPDF ? "Downloading..." : "Download PDF"}
             </Button>
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={isDownloadingPDF}>Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Email Preview Dialog */}
      <Dialog open={isEmailPreviewDialogOpen} onOpenChange={(open) => { setIsEmailPreviewDialogOpen(open); if (!open) setInvoiceForEmail(null); }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-headline">Compose Email</DialogTitle>
            <DialogDescription>
              Preview and edit the email for invoice {invoiceForEmail?.invoiceNumber} to {invoiceForEmail?.clientName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="emailTo">To:</Label>
              <Input id="emailTo" value={invoiceForEmail?.clientEmail || ''} readOnly disabled className="bg-muted/50"/>
            </div>
            <div>
              <Label htmlFor="emailSubject">Subject:</Label>
              <Input id="emailSubject" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="emailBody">Body:</Label>
              <Textarea id="emailBody" value={emailBody} onChange={(e) => setEmailBody(e.target.value)} rows={10} />
            </div>
          </div>
          <DialogFooter className="justify-between flex-wrap gap-2">
            <div className="flex gap-2 flex-wrap">
                 <Button type="button" variant="outline" onClick={handleRevertToDefaultTemplate}>Use Original Default</Button>
                 <Button type="button" variant="secondary" onClick={handleSaveTemplate}>
                    <Save className="mr-2 h-4 w-4" /> Save Current as My Default
                 </Button>
            </div>
            <div className="flex gap-2 flex-wrap">
                <DialogClose asChild>
                    <Button type="button" variant="ghost">Cancel</Button>
                </DialogClose>
                <Button type="button" onClick={handleSendEmail}>
                    <Mail className="mr-2 h-4 w-4" /> Send Email
                </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Delete Invoice Alert Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the invoice
              and remove its data from Firestore.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setInvoiceToDeleteId(null)} disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteInvoice} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

