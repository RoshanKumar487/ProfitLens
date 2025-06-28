
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
import { Receipt, PlusCircle, Search, MoreHorizontal, Edit, Trash2, Mail, Calendar as CalendarIconLucide, Save, Loader2, UserPlus, Printer, Percent, ArrowUp, ArrowDown, ChevronsUpDown, Download } from 'lucide-react';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription as CardDesc } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, Timestamp, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { sendInvoiceEmailAction } from './actions'; 
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import InvoiceTemplateModern from './InvoiceTemplateModern';
import InvoiceTemplateIndian from './InvoiceTemplateIndian';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import Link from 'next/link';


interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

type DiscountType = 'fixed' | 'percentage';

interface InvoiceFirestore {
  id?: string; 
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
  amount: number; // This is the final total

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
  clientAddress?: string;
  clientGstin?: string;
}

interface ExistingClient {
  name: string;
  email?: string;
  address?: string;
  gstin?: string;
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

const LOCAL_STORAGE_EMAIL_TEMPLATE_KEY = 'profitlens-invoice-email-template-v2';
const LOCAL_STORAGE_NOTES_TEMPLATE_KEY = 'profitlens-invoice-notes-template-v1';
const LOCAL_STORAGE_TAX_RATE_KEY = 'profitlens-invoice-tax-rate-v1';
const LOCAL_STORAGE_DISCOUNT_TYPE_KEY = 'profitlens-invoice-discount-type-v1';
const LOCAL_STORAGE_DISCOUNT_VALUE_KEY = 'profitlens-invoice-discount-value-v1';
const LOCAL_STORAGE_DEFAULT_TEMPLATE_KEY = 'profitlens-default-invoice-template';


const getDefaultEmailBody = (currency: string) => `
Dear {{clientName}},

Please find invoice {{invoiceNumber}} detailed below.
Total Amount: ${currency}{{amount}}
Due Date: {{dueDate}}

If you have any questions, please let us know.

Thank you for your business!

Sincerely,
{{companyName}}
`;

const DEFAULT_EMAIL_SUBJECT_TEMPLATE = "Invoice {{invoiceNumber}} from {{companyName}}";


export default function InvoicingPage() {
  const { user, isLoading: authIsLoading } = useAuth();
  const currency = user?.currencySymbol || '$';
  const [invoices, setInvoices] = useState<InvoiceDisplay[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<Partial<InvoiceDisplay & {invoiceNumber?: string}>>({});
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [invoiceToDeleteId, setInvoiceToDeleteId] = useState<string | null>(null);

  const [isEmailPreviewDialogOpen, setIsEmailPreviewDialogOpen] = useState(false);
  const [invoiceForEmail, setInvoiceForEmail] = useState<InvoiceDisplay | null>(null);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBodyUserText, setEmailBodyUserText] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  
  const [companyProfileDetails, setCompanyProfileDetails] = useState<CompanyDetailsFirestore | null>(null);
  const [isFetchingCompanyProfile, setIsFetchingCompanyProfile] = useState(true);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);


  const [existingClients, setExistingClients] = useState<ExistingClient[]>([]);
  const invoicePrintRef = useRef<HTMLDivElement>(null);

  const [isViewInvoiceDialogOpen, setIsViewInvoiceDialogOpen] = useState(false);
  const [invoiceToView, setInvoiceToView] = useState<InvoiceDisplay | null>(null);
  
  const [sortConfig, setSortConfig] = useState<{ key: keyof InvoiceDisplay; direction: 'ascending' | 'descending' }>({ key: 'issuedDate', direction: 'descending' });
  const [isClientSuggestionsVisible, setIsClientSuggestionsVisible] = useState(false);
  
  type TemplateName = 'modern' | 'indian';
  const [template, setTemplate] = useState<TemplateName>('modern');


  useEffect(() => {
    const savedTemplate = localStorage.getItem(LOCAL_STORAGE_DEFAULT_TEMPLATE_KEY) as TemplateName;
    if (savedTemplate) {
      setTemplate(savedTemplate);
    }
  }, []);

  const handleSetDefaultTemplate = (templateName: TemplateName) => {
    localStorage.setItem(LOCAL_STORAGE_DEFAULT_TEMPLATE_KEY, templateName);
    toast({
      title: 'Default Template Set',
      description: `Your default invoice template is now "${templateName === 'modern' ? 'Modern' : 'Indian GST'}".`,
    });
  };

  useEffect(() => {
    if (!isEditDialogOpen) return;

    const subtotal = (currentInvoice.items || []).reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0);

    const discountValue = parseFloat(String(currentInvoice.discountValue) || '0');
    let discountAmount = 0;
    if (currentInvoice.discountType === 'percentage') {
        discountAmount = subtotal * (discountValue / 100);
    } else {
        discountAmount = discountValue;
    }

    const taxRate = parseFloat(String(currentInvoice.taxRate) || '0');
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * (taxRate / 100);
    
    const total = taxableAmount + taxAmount;

    setCurrentInvoice(prev => ({ 
        ...prev, 
        subtotal: isNaN(subtotal) ? 0 : subtotal,
        discountAmount: isNaN(discountAmount) ? 0 : discountAmount,
        taxAmount: isNaN(taxAmount) ? 0 : taxAmount,
        amount: isNaN(total) ? 0 : total,
    }));
  }, [currentInvoice.items, currentInvoice.discountType, currentInvoice.discountValue, currentInvoice.taxRate, isEditDialogOpen]);


  const fetchCompanyProfile = useCallback(async () => {
    if (user && user.companyId) {
      setIsFetchingCompanyProfile(true);
      try {
        const docRef = doc(db, 'companyProfiles', user.companyId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setCompanyProfileDetails({
            name: data.name || 'Your Company',
            address: data.address || '',
            city: data.city || '',
            state: data.state || '',
            country: data.country || '',
            gstin: data.gstin || '',
            pan: data.pan || '',
            phone: data.phone || '',
            email: data.email || '',
            website: data.website || '',
            accountNumber: data.accountNumber || '',
            ifscCode: data.ifscCode || '',
            bankName: data.bankName || '',
            branch: data.branch || '',
            signatureUrl: data.signatureUrl || '',
            stampUrl: data.stampUrl || '',
          });
        } else {
          setCompanyProfileDetails({ name: 'Your Company Name', address: 'Your Address', city: '', state: '', country: '', gstin: 'Your GSTIN', phone: '', email: '', website: '', accountNumber: '', ifscCode: '', bankName: '' });
        }
      } catch (error) {
        console.error("[InvoicingPage fetchCompanyProfile] Failed to fetch company details from Firestore:", error);
        setCompanyProfileDetails({ name: 'Your Company Name', address: 'Your Address', city: '', state: '', country: '', gstin: 'Your GSTIN', phone: '', email: '', website: '', accountNumber: '', ifscCode: '', bankName: '' });
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
    if (!authIsLoading && user) {
      fetchCompanyProfile();
    } else if (!authIsLoading && !user) {
        setIsFetchingCompanyProfile(false);
        setCompanyProfileDetails(null);
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
      const qInvoices = query(invoicesColRef, where('companyId', '==', user.companyId), orderBy('createdAt', 'desc'));
      const invoiceSnapshot = await getDocs(qInvoices);
      const fetchedInvoices = invoiceSnapshot.docs.map(docSnap => {
        const data = docSnap.data() as Omit<InvoiceFirestore, 'id'>;
        return {
          id: docSnap.id, invoiceNumber: data.invoiceNumber, clientName: data.clientName, clientEmail: data.clientEmail, clientAddress: data.clientAddress,
          clientGstin: data.clientGstin,
          subtotal: data.subtotal || 0, discountType: data.discountType || 'fixed', discountValue: data.discountValue || 0, discountAmount: data.discountAmount || 0,
          taxRate: data.taxRate || 0, taxAmount: data.taxAmount || 0, amount: data.amount, dueDate: data.dueDate.toDate(), status: data.status,
          issuedDate: data.issuedDate.toDate(), items: data.items || [], notes: data.notes || '',
        } as InvoiceDisplay;
      });
      setInvoices(fetchedInvoices);

      const clientsMap = new Map<string, ExistingClient>();
      fetchedInvoices.forEach(inv => {
        if (inv.clientName) {
            const existingEntry = clientsMap.get(inv.clientName.toLowerCase());
            clientsMap.set(inv.clientName.toLowerCase(), { 
                name: inv.clientName, email: inv.clientEmail || existingEntry?.email || '', address: inv.clientAddress || existingEntry?.address || '', gstin: inv.clientGstin || existingEntry?.gstin || ''
            });
        }
      });
      setExistingClients(Array.from(clientsMap.values()));

    } catch (error: any) {
      console.error('[InvoicingPage fetchInvoices] Error fetching invoices:', error);
      toast({ title: 'Error Fetching Invoices', description: `Could not load invoices. ${error.message || 'An unknown error occurred.'}`, variant: 'destructive' });
      setInvoices([]); setExistingClients([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (authIsLoading) {
      setIsLoading(true); return;
    }
    if (!user || !user.companyId) {
      setIsLoading(false); setInvoices([]); setExistingClients([]); return;
    }
    fetchInvoices();
  }, [user, authIsLoading, fetchInvoices]);


  const filteredInvoices = useMemo(() => {
    return invoices.filter(
      (invoice) =>
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.status.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [invoices, searchTerm]);
  
  const sortedInvoices = useMemo(() => {
    let sortableItems = [...filteredInvoices];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredInvoices, sortConfig]);

  const requestSort = (key: keyof InvoiceDisplay) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIcon = (key: keyof InvoiceDisplay) => {
    if (sortConfig.key !== key) {
        return <ChevronsUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />;
    }
    if (sortConfig.direction === 'ascending') {
        return <ArrowUp className="ml-2 h-4 w-4" />;
    }
    return <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const getStatusBadgeVariant = (status: InvoiceDisplay['status']): 'default' | 'secondary' | 'destructive' | 'outline' => {
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
    if (!user || !user.companyId || !currentInvoice.id) {
      toast({ title: "Authentication or Data Error", variant: "destructive" });
      return;
    }
    if (!currentInvoice.clientName || currentInvoice.amount === undefined || !currentInvoice.issuedDate || !currentInvoice.dueDate) {
        toast({ title: "Missing Fields", description: "Please fill all required invoice details.", variant: "destructive" });
        return;
    }

    setIsSaving(true);
    const issuedDateForFirestore = Timestamp.fromDate(currentInvoice.issuedDate);
    const dueDateForFirestore = Timestamp.fromDate(currentInvoice.dueDate);

    const invoiceDataToUpdate = {
      clientName: currentInvoice.clientName!,
      clientEmail: currentInvoice.clientEmail || '', 
      clientAddress: currentInvoice.clientAddress || '',
      clientGstin: currentInvoice.clientGstin || '',
      subtotal: currentInvoice.subtotal || 0,
      discountType: currentInvoice.discountType || 'fixed',
      discountValue: Number(currentInvoice.discountValue) || 0,
      discountAmount: currentInvoice.discountAmount || 0,
      taxRate: Number(currentInvoice.taxRate) || 0,
      taxAmount: currentInvoice.taxAmount || 0,
      amount: Number(currentInvoice.amount) || 0,
      issuedDate: issuedDateForFirestore,
      dueDate: dueDateForFirestore,
      status: currentInvoice.status || 'Draft',
      items: currentInvoice.items || [],
      notes: currentInvoice.notes || '',
    };

    try {
      const invoiceRef = doc(db, 'invoices', currentInvoice.id);
      await updateDoc(invoiceRef, invoiceDataToUpdate);
      toast({ title: "Invoice Updated", description: `Invoice ${currentInvoice.invoiceNumber} updated successfully.` });
      
      localStorage.setItem(LOCAL_STORAGE_TAX_RATE_KEY, String(currentInvoice.taxRate || '0'));
      localStorage.setItem(LOCAL_STORAGE_DISCOUNT_TYPE_KEY, currentInvoice.discountType || 'fixed');
      localStorage.setItem(LOCAL_STORAGE_DISCOUNT_VALUE_KEY, String(currentInvoice.discountValue || '0'));

      fetchInvoices();
      setIsEditDialogOpen(false);
      setCurrentInvoice({});
    } catch (error: any) {
      toast({ title: "Update Failed", description: `Could not update invoice. ${error.message}`, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditInvoice = (invoice: InvoiceDisplay) => {
    setCurrentInvoice({ 
      ...invoice,
      notes: invoice.notes || '',
      clientAddress: invoice.clientAddress || '',
      clientGstin: invoice.clientGstin || '',
    });
    setIsEditDialogOpen(true);
  };

  const promptDeleteInvoice = (id: string) => {
    setInvoiceToDeleteId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteInvoice = async () => {
    if (invoiceToDeleteId && user && user.companyId) {
        setIsSaving(true);
        try {
            const invoiceRef = doc(db, 'invoices', invoiceToDeleteId);
            await deleteDoc(invoiceRef);
            toast({ title: "Invoice Deleted", description: "The invoice has been removed."});
            fetchInvoices();
            setInvoiceToDeleteId(null);
        } catch (error: any) {
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

  const handlePrintInvoice = async () => {
    if (!invoicePrintRef.current || !invoiceToView) return;
    setIsPrinting(true);

    try {
        const canvas = await html2canvas(invoicePrintRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgProps = pdf.getImageProperties(imgData);
        const imgAspectRatio = imgProps.width / imgProps.height;

        let finalWidth, finalHeight;
        if (imgAspectRatio > pdfWidth / pdfHeight) {
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
            };
        } else {
             toast({ title: "Print Error", description: "Could not open print window. Please check your pop-up blocker.", variant: "destructive"});
        }
    } catch (error) {
        toast({ title: "Print Failed", description: "Could not generate document for printing.", variant: "destructive" });
    } finally {
        setIsPrinting(false);
    }
  };
  
  const handleDownloadPdf = async () => {
    if (!invoicePrintRef.current || !invoiceToView) return;
    setIsDownloadingPdf(true);

    try {
        const canvas = await html2canvas(invoicePrintRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgProps = pdf.getImageProperties(imgData);
        const imgAspectRatio = imgProps.width / imgProps.height;
        let finalWidth, finalHeight;
        if (imgAspectRatio > pdfWidth / pdfHeight) {
          finalWidth = pdfWidth;
          finalHeight = pdfWidth / imgAspectRatio;
        } else {
          finalHeight = pdfHeight;
          finalWidth = pdfHeight * imgAspectRatio;
        }
        const x = (pdfWidth - finalWidth) / 2;
        const y = (pdfHeight - finalHeight) / 2;
        pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
        pdf.save(`Invoice_${invoiceToView.invoiceNumber}.pdf`);
        toast({ title: "PDF Downloaded", description: `Invoice ${invoiceToView.invoiceNumber}.pdf has been saved.` });
    } catch (error) {
        toast({ title: "PDF Download Failed", description: "Could not generate PDF.", variant: "destructive" });
    } finally {
        setIsDownloadingPdf(false);
    }
  };

  const generateInvoiceHTMLForEmail = (invoice: InvoiceDisplay, company: CompanyDetailsFirestore | null): string => {
    let itemsHtml = '';
    if (invoice.items && invoice.items.length > 0) {
      invoice.items.forEach((item, index) => {
        itemsHtml += `
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;">${index + 1}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${item.description}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.quantity}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${currency}${item.unitPrice.toFixed(2)}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${currency}${(item.quantity * item.unitPrice).toFixed(2)}</td>
          </tr>
        `;
      });
    } else {
      itemsHtml = '<tr><td colspan="5" style="border: 1px solid #ddd; padding: 8px; text-align: center;">No line items.</td></tr>';
    }
  
    const companyName = company?.name || 'Your Company';
    const companyAddress = company?.address?.replace(/\n/g, '<br>') || 'Your Address';
    const clientAddressHtml = invoice.clientAddress ? `<p style="margin:2px 0; font-size: 0.9em; white-space: pre-wrap;">${invoice.clientAddress.replace(/\n/g, '<br>')}</p>` : '';
    const statusBadgeStyle = `display: inline-block; padding: 4px 8px; font-size: 0.8em; border-radius: 4px; color: white; background-color: ${invoice.status === 'Paid' ? '#28a745' : invoice.status === 'Overdue' ? '#dc3545' : '#6c757d'};`;
  
    return `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 800px; margin: auto; padding: 20px; border: 1px solid #eee;">
        <table style="width: 100%; margin-bottom: 20px;">
          <tr>
            <td style="vertical-align: top;">
              ${company?.name ? `<h1 style="color: #007bff; margin:0 0 10px 0;">${company.name}</h1>` : ''}
              <p style="margin:0; font-size: 0.9em;">${companyAddress}</p>
            </td>
            <td style="text-align: right; vertical-align: top;">
              <h2 style="text-transform: uppercase; margin:0 0 10px 0; font-size: 1.8em;">Invoice</h2>
              <p style="margin:2px 0;"><strong>Invoice #:</strong> ${invoice.invoiceNumber}</p>
              <p style="margin:2px 0;"><strong>Date Issued:</strong> ${format(invoice.issuedDate, 'PPP')}</p>
              <p style="margin-top: 5px;"><span style="${statusBadgeStyle}">${invoice.status}</span></p>
            </td>
          </tr>
        </table>
        <div style="margin-bottom: 20px; padding: 10px; background-color: #f8f9fa; border-radius: 5px;">
          <h3 style="margin:0 0 5px 0; font-size: 1.1em;">Bill To:</h3>
          <p style="margin:0; font-weight: bold;">${invoice.clientName}</p>
          ${invoice.clientEmail ? `<p style="margin:2px 0; font-size: 0.9em;">${invoice.clientEmail}</p>` : ''}
          ${clientAddressHtml}
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead style="background-color: #f0f0f0;">
            <tr>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">#</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Description</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Quantity</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Unit Price</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div style="text-align: right; margin-bottom: 20px; padding-top: 10px; border-top: 1px solid #eee;">
          <p style="font-size: 1.2em; font-weight: bold; margin:5px 0 0 0; padding-top: 5px; border-top: 1px solid #333;"><strong>Grand Total:</strong> ${currency}${invoice.amount.toFixed(2)}</p>
        </div>
        <div style="text-align: center; font-size: 0.8em; color: #777; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;">
          <p>Thank you for your business! Payment is due by ${format(invoice.dueDate, 'PPP')}.</p>
        </div>
      </div>
    `;
  };

  const loadAndPrepareEmailTemplate = (invoice: InvoiceDisplay, useDefault: boolean = false) => {
    let templateSubject = DEFAULT_EMAIL_SUBJECT_TEMPLATE;
    let templateUserText = getDefaultEmailBody(currency);

    if (!useDefault) {
        const storedTemplateString = localStorage.getItem(LOCAL_STORAGE_EMAIL_TEMPLATE_KEY);
        if (storedTemplateString) {
            try {
                const parsed = JSON.parse(storedTemplateString);
                if(parsed.subject) templateSubject = parsed.subject;
                if(parsed.bodyUserText) templateUserText = parsed.bodyUserText;
            } catch (e) {
                console.error("Failed to parse saved email template", e);
            }
        }
    }

    const companyNameForTpl = companyProfileDetails?.name || "Your Company";
    const placeholders = {
        '{{clientName}}': invoice.clientName || 'Client',
        '{{invoiceNumber}}': invoice.invoiceNumber,
        '{{amount}}': invoice.amount.toFixed(2),
        '{{dueDate}}': format(invoice.dueDate, 'PPP'),
        '{{companyName}}': companyNameForTpl,
    };

    let processedSubject = templateSubject;
    let processedUserText = templateUserText;

    for (const [key, value] of Object.entries(placeholders)) {
        processedSubject = processedSubject.replace(new RegExp(key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), String(value));
        processedUserText = processedUserText.replace(new RegExp(key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), String(value));
    }

    setEmailRecipient(invoice.clientEmail || '');
    setEmailSubject(processedSubject);
    setEmailBodyUserText(processedUserText);
  };

  const handleOpenEmailDialog = (invoice: InvoiceDisplay) => {
    if (!invoice.clientEmail) {
        toast({ title: "Missing Client Email", description: "Please edit the invoice to add an email address.", variant: "destructive"});
        return;
    }
    setInvoiceForEmail(invoice);
    loadAndPrepareEmailTemplate(invoice);
    setIsEmailPreviewDialogOpen(true);
  };

  const handleSendEmail = async () => {
    if (!invoiceForEmail || !emailRecipient) {
      toast({ title: "Missing Information", description: "Recipient email is required.", variant: "destructive" });
      return;
    }
    setIsSendingEmail(true);

    const userTextHtml = `<div style="white-space: pre-wrap; margin-bottom: 20px;">${emailBodyUserText.replace(/\n/g, '<br>')}</div>`;
    const invoiceDetailsHtml = generateInvoiceHTMLForEmail(invoiceForEmail, companyProfileDetails);

    const fullEmailHtmlBody = `
      <html><body><div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            ${userTextHtml}
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
              ${invoiceDetailsHtml}
            </div>
      </div></body></html>`;

    try {
      const result = await sendInvoiceEmailAction({ to: emailRecipient, subject: emailSubject, htmlBody: fullEmailHtmlBody, invoiceNumber: invoiceForEmail.invoiceNumber });
      if (result.success) {
        toast({ title: "Email Sent", description: result.message });
        setIsEmailPreviewDialogOpen(false);
      } else {
        toast({ title: "Email Failed", description: result.message, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Email Error", description: `An unexpected error occurred: ${error.message}`, variant: "destructive" });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSaveTemplate = () => {
    localStorage.setItem(LOCAL_STORAGE_EMAIL_TEMPLATE_KEY, JSON.stringify({ subject: emailSubject, bodyUserText: emailBodyUserText }));
    toast({ title: "Template Saved" });
  };

  const handleRevertToDefaultTemplate = () => {
    if (invoiceForEmail) {
        loadAndPrepareEmailTemplate(invoiceForEmail, true);
        toast({ title: "Template Reset" });
    }
  };

  const handleAddItem = () => {
    const newItem: InvoiceItem = { id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0 };
    setCurrentInvoice(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
  };

  const handleItemChange = (itemId: string, field: keyof InvoiceItem, value: string | number) => {
    setCurrentInvoice(prev => ({
        ...prev,
        items: (prev.items || []).map(item =>
            item.id === itemId ? { ...item, [field]: typeof value === 'string' && (field === 'quantity' || field === 'unitPrice') ? parseFloat(value) || 0 : value } : item
        )
    }));
  };

  const handleRemoveItem = (itemId: string) => {
     setCurrentInvoice(prev => ({ ...prev, items: (prev.items || []).filter(item => item.id !== itemId) }));
  };
  
  const handleSaveNotesAsDefault = useCallback(() => {
    if (currentInvoice.notes && currentInvoice.notes.trim().length > 0) {
        localStorage.setItem(LOCAL_STORAGE_NOTES_TEMPLATE_KEY, currentInvoice.notes);
        toast({ title: "Default Notes Saved" });
    } else {
        toast({ title: "Cannot Save Empty Notes", variant: "destructive" });
    }
  }, [currentInvoice.notes, toast]);

  if (authIsLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)] p-4 sm:p-6 lg:p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-2">Loading authentication...</p>
      </div>
    );
  }

  if (!user && !authIsLoading) {
     return (
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <PageTitle title="Invoicing" subtitle="Manage your customer invoices efficiently." icon={Receipt} />
        <Card className="shadow-lg">
          <CardHeader><CardTitle>Access Denied</CardTitle></CardHeader>
          <CardContent><p>Please sign in to manage invoices.</p></CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageTitle title="Invoicing" subtitle="Manage your customer invoices efficiently." icon={Receipt}>
        <Button asChild disabled={isSaving || isLoading || isFetchingCompanyProfile}>
          <Link href="/invoicing/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Invoice
          </Link>
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
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
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
            <TableCaption>{sortedInvoices.length === 0 && !isLoading ? "No invoices found." : "A list of your recent invoices."}</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead><Button variant="ghost" onClick={() => requestSort('invoiceNumber')} className="-ml-4 h-auto p-1 text-xs sm:text-sm">Number {getSortIcon('invoiceNumber')}</Button></TableHead>
                <TableHead><Button variant="ghost" onClick={() => requestSort('clientName')} className="-ml-4 h-auto p-1 text-xs sm:text-sm">Client {getSortIcon('clientName')}</Button></TableHead>
                <TableHead className="text-right"><Button variant="ghost" onClick={() => requestSort('amount')} className="h-auto p-1 text-xs sm:text-sm">Amount {getSortIcon('amount')}</Button></TableHead>
                <TableHead className="hidden md:table-cell"><Button variant="ghost" onClick={() => requestSort('issuedDate')} className="-ml-4 h-auto p-1 text-xs sm:text-sm">Issued Date {getSortIcon('issuedDate')}</Button></TableHead>
                <TableHead className="hidden md:table-cell"><Button variant="ghost" onClick={() => requestSort('dueDate')} className="-ml-4 h-auto p-1 text-xs sm:text-sm">Due Date {getSortIcon('dueDate')}</Button></TableHead>
                <TableHead><Button variant="ghost" onClick={() => requestSort('status')} className="-ml-4 h-auto p-1 text-xs sm:text-sm">Status {getSortIcon('status')}</Button></TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                  <TableCell>{invoice.clientName}</TableCell>
                  <TableCell className="text-right">{currency}{invoice.amount.toFixed(2)}</TableCell>
                  <TableCell className="hidden md:table-cell">{format(invoice.issuedDate, 'PP')}</TableCell>
                  <TableCell className="hidden md:table-cell">{format(invoice.dueDate, 'PP')}</TableCell>
                  <TableCell><Badge variant={getStatusBadgeVariant(invoice.status)}>{invoice.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" disabled={isSaving}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenViewInvoiceDialog(invoice)}><Printer className="mr-2 h-4 w-4" /> Print / View</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditInvoice(invoice)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenEmailDialog(invoice)} disabled={!invoice.clientEmail}><Mail className="mr-2 h-4 w-4" /> Email</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => promptDeleteInvoice(invoice.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { setIsEditDialogOpen(open); if (!open) setCurrentInvoice({}); }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-headline">Edit Invoice</DialogTitle>
            <DialogDescription>Update details for invoice {currentInvoice.invoiceNumber || ''}.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} id="invoice-form-explicit" className="space-y-4 overflow-y-auto flex-grow p-1 pr-3">
            {currentInvoice.id && (
                <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="clientName">Client Name</Label>
                        <Input id="clientName" value={currentInvoice.clientName || ''} onChange={(e) => setCurrentInvoice({...currentInvoice, clientName: e.target.value})} required disabled={isSaving} />
                    </div>
                    <div>
                        <Label htmlFor="clientEmail">Client Email</Label>
                        <Input id="clientEmail" type="email" value={currentInvoice.clientEmail || ''} onChange={(e) => setCurrentInvoice({ ...currentInvoice, clientEmail: e.target.value })} disabled={isSaving} />
                    </div>
                </div>
                 <div>
                    <Label htmlFor="clientGstin">Client GSTIN</Label>
                    <Input id="clientGstin" value={currentInvoice.clientGstin || ''} onChange={(e) => setCurrentInvoice({ ...currentInvoice, clientGstin: e.target.value })} placeholder="Enter client's GSTIN (optional)" disabled={isSaving} />
                </div>
                <div>
                    <Label htmlFor="clientAddress">Client Address</Label>
                    <Textarea id="clientAddress" value={currentInvoice.clientAddress || ''} onChange={(e) => setCurrentInvoice({ ...currentInvoice, clientAddress: e.target.value })} disabled={isSaving} rows={3}/>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <Label htmlFor="invoiceNumber">Invoice Number</Label>
                        <Input id="invoiceNumber" value={currentInvoice.invoiceNumber || ''} disabled />
                    </div>
                    <div>
                        <Label htmlFor="issuedDate">Issued Date</Label>
                        <Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal" disabled={isSaving}><CalendarIconLucide className="mr-2 h-4 w-4" />{currentInvoice.issuedDate ? format(currentInvoice.issuedDate, 'PPP') : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={currentInvoice.issuedDate} onSelect={(date) => setCurrentInvoice({...currentInvoice, issuedDate: date})} initialFocus disabled={isSaving}/></PopoverContent></Popover>
                    </div>
                    <div>
                        <Label htmlFor="dueDate">Due Date</Label>
                        <Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal" disabled={isSaving}><CalendarIconLucide className="mr-2 h-4 w-4" />{currentInvoice.dueDate ? format(currentInvoice.dueDate, 'PPP') : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={currentInvoice.dueDate} onSelect={(date) => setCurrentInvoice({...currentInvoice, dueDate: date})} initialFocus disabled={isSaving} /></PopoverContent></Popover>
                    </div>
                    <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={currentInvoice.status || 'Draft'} onValueChange={(value: InvoiceDisplay['status']) => setCurrentInvoice({ ...currentInvoice, status: value })} disabled={isSaving}><SelectTrigger id="status"><SelectValue placeholder="Select status" /></SelectTrigger><SelectContent><SelectItem value="Draft">Draft</SelectItem><SelectItem value="Pending">Pending</SelectItem><SelectItem value="Paid">Paid</SelectItem><SelectItem value="Overdue">Overdue</SelectItem></SelectContent></Select>
                    </div>
                </div>

                <Separator/>

                <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center"><Label className="text-base font-medium">Invoice Items</Label><Button type="button" variant="outline" size="sm" onClick={handleAddItem} disabled={isSaving}><PlusCircle className="mr-2 h-4 w-4" /> Add Item</Button></div>
                {(currentInvoice.items || []).map((item) => (
                    <div key={item.id} className="grid grid-cols-[1fr,auto,auto,auto] sm:grid-cols-[2fr_1fr_1fr_auto] items-end gap-2 p-2 border rounded-md bg-muted/30">
                    <div className="space-y-1"><Label htmlFor={`item-desc-${item.id}`} className="text-xs">Description</Label><Input id={`item-desc-${item.id}`} value={item.description} onChange={e => handleItemChange(item.id, 'description', e.target.value)} placeholder="Service or Product" disabled={isSaving} /></div>
                    <div className="space-y-1"><Label htmlFor={`item-qty-${item.id}`} className="text-xs">Qty</Label><Input id={`item-qty-${item.id}`} type="number" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', e.target.value)} min="0" disabled={isSaving} className="w-20" /></div>
                    <div className="space-y-1"><Label htmlFor={`item-price-${item.id}`} className="text-xs">Unit Price</Label><Input id={`item-price-${item.id}`} type="number" value={item.unitPrice} onChange={e => handleItemChange(item.id, 'unitPrice', e.target.value)} min="0" step="0.01" disabled={isSaving} className="w-24"/></div>
                    <Button type="button" variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => handleRemoveItem(item.id)} disabled={isSaving}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                ))}
                </div>

                <Separator/>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                            <div><Label htmlFor="discountType">Discount Type</Label><Select value={currentInvoice.discountType || 'fixed'} onValueChange={(value: DiscountType) => setCurrentInvoice(prev => ({ ...prev, discountType: value }))} disabled={isSaving}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="fixed">Fixed ({currency})</SelectItem><SelectItem value="percentage">Percentage (%)</SelectItem></SelectContent></Select></div>
                            <div><Label htmlFor="discountValue">Discount Value</Label><Input id="discountValue" type="number" value={currentInvoice.discountValue || ''} onChange={(e) => setCurrentInvoice(prev => ({...prev, discountValue: e.target.value}))} min="0" step="0.01" disabled={isSaving} /></div>
                        </div>
                        <div><Label htmlFor="taxRate">Tax Rate (%)</Label><Input id="taxRate" type="number" value={currentInvoice.taxRate || ''} onChange={(e) => setCurrentInvoice(prev => ({...prev, taxRate: e.target.value}))} min="0" step="0.01" placeholder="e.g. 5 or 12.5" disabled={isSaving} /></div>
                    </div>
                    <div className="space-y-2 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                        <h4 className="font-medium text-center mb-2">Summary</h4>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal:</span><span className="font-medium">{currency}{(currentInvoice.subtotal || 0).toFixed(2)}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Discount:</span><span className="font-medium text-destructive">- {currency}{(currentInvoice.discountAmount || 0).toFixed(2)}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tax ({currentInvoice.taxRate || 0}%):</span><span className="font-medium text-chart-2">+ {currency}{(currentInvoice.taxAmount || 0).toFixed(2)}</span></div>
                        <Separator className="my-2" /><div className="flex justify-between text-lg font-bold"><span>Grand Total:</span><span>{currency}{(currentInvoice.amount || 0).toFixed(2)}</span></div>
                    </div>
                </div>

                <div>
                <div className="flex justify-between items-center mb-1"><Label htmlFor="notes">Notes / Terms</Label><Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={handleSaveNotesAsDefault} disabled={isSaving}>Save as Default</Button></div>
                <Textarea id="notes" value={currentInvoice.notes || ''} onChange={(e) => setCurrentInvoice({ ...currentInvoice, notes: e.target.value })} disabled={isSaving} />
                </div>
                </>
            )}
          </form>
          <DialogFooter className="mt-auto pt-4 border-t">
            <DialogClose asChild><Button type="button" variant="outline" disabled={isSaving}>Cancel</Button></DialogClose>
            <Button type="submit" form="invoice-form-explicit" disabled={isSaving}>{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewInvoiceDialogOpen} onOpenChange={(open) => { setIsViewInvoiceDialogOpen(open); if (!open) setInvoiceToView(null); }}>
          <DialogContent className="max-w-4xl w-full h-[95vh] flex flex-col p-0 bg-gray-100 dark:bg-background">
              <DialogHeader className="p-4 sm:p-6 pb-2 border-b bg-background no-print"><DialogTitle className="font-headline text-xl">Invoice {invoiceToView?.invoiceNumber}</DialogTitle><DialogDescription>Preview of the invoice. You can print or download it.</DialogDescription></DialogHeader>
              <ScrollArea className="flex-grow bg-gray-200 dark:bg-zinc-800 p-4 sm:p-8">
                  {isFetchingCompanyProfile && <div className="text-center p-10"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /> <p>Loading company details...</p></div>}
                  {!isFetchingCompanyProfile && invoiceToView && companyProfileDetails && (
                      <>
                        {template === 'modern' ? (<InvoiceTemplateModern ref={invoicePrintRef} invoiceToView={invoiceToView} companyProfileDetails={companyProfileDetails} currencySymbol={currency} />) : (<InvoiceTemplateIndian ref={invoicePrintRef} invoiceToView={invoiceToView} companyProfileDetails={companyProfileDetails} currencySymbol={currency} />)}
                      </>
                  )}
              </ScrollArea>
            <DialogFooter className="p-4 sm:p-6 border-t bg-background no-print justify-between flex-wrap gap-2">
                <div className="flex-grow flex items-center gap-2">
                    <Label htmlFor="template-select">Template:</Label>
                     <Select value={template} onValueChange={(value) => setTemplate(value as TemplateName)}><SelectTrigger id="template-select" className="w-[180px]"><SelectValue placeholder="Select template" /></SelectTrigger><SelectContent><SelectItem value="modern">Modern</SelectItem><SelectItem value="indian">Indian GST</SelectItem></SelectContent></Select>
                    <Button variant="outline" size="sm" onClick={() => handleSetDefaultTemplate(template)}>Set as Default</Button>
                </div>
                <div className="flex gap-2">
                    <Button type="button" variant="secondary" onClick={handleDownloadPdf} disabled={isDownloadingPdf || isPrinting}>{isDownloadingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Download PDF</Button>
                    <Button type="button" variant="default" onClick={handlePrintInvoice} disabled={isDownloadingPdf || isPrinting}>
                        {isPrinting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                        {isPrinting ? 'Preparing...' : 'Print Invoice'}
                    </Button>
                </div>
            </DialogFooter>
          </DialogContent>
      </Dialog>

      <Dialog open={isEmailPreviewDialogOpen} onOpenChange={(open) => { setIsEmailPreviewDialogOpen(open); if (!open) setInvoiceForEmail(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader><DialogTitle className="font-headline">Compose Email</DialogTitle><DialogDescription>Preview and edit the email for invoice {invoiceForEmail?.invoiceNumber} to {invoiceForEmail?.clientName}.<br/>The body below is plain text. It will be formatted into an HTML email upon sending.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2 flex-grow overflow-y-auto pr-2">
            <div><Label htmlFor="emailTo">To:</Label><Input id="emailTo" value={emailRecipient} onChange={(e) => setEmailRecipient(e.target.value)} placeholder="recipient@example.com" required disabled={isSendingEmail}/></div>
            <div><Label htmlFor="emailSubject">Subject:</Label><Input id="emailSubject" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} disabled={isSendingEmail}/></div>
            <div><Label htmlFor="emailBodyUserText">Body (Plain Text):</Label><Textarea id="emailBodyUserText" value={emailBodyUserText} onChange={(e) => setEmailBodyUserText(e.target.value)} rows={10} disabled={isSendingEmail} placeholder="Your plain text message here..."/></div>
          </div>
          <DialogFooter className="justify-between flex-wrap gap-2 mt-auto pt-4 border-t">
            <div className="flex gap-2 flex-wrap"><Button type="button" variant="outline" onClick={handleRevertToDefaultTemplate} disabled={isSendingEmail}>Use Original Default</Button><Button type="button" variant="secondary" onClick={handleSaveTemplate} disabled={isSendingEmail}><Save className="mr-2 h-4 w-4" /> Save Current as My Default</Button></div>
            <div className="flex gap-2 flex-wrap"><DialogClose asChild><Button type="button" variant="ghost" disabled={isSendingEmail}>Cancel</Button></DialogClose><Button type="button" onClick={handleSendEmail} disabled={isSendingEmail || !emailRecipient}>{isSendingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}{isSendingEmail ? "Sending..." : "Send Email"}</Button></div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete the invoice.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setInvoiceToDeleteId(null)} disabled={isSaving}>Cancel</Button></AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteInvoice} className="bg-destructive hover:bg-destructive/90" disabled={isSaving}>{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
