
'use client';

import React, { useState, useMemo, useEffect, FormEvent } from 'react';
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
import { Receipt, PlusCircle, Search, MoreHorizontal, Edit, Trash2, Eye, Mail, Download, Calendar as CalendarIconLucide, Save, Loader2, Briefcase } from 'lucide-react';
import { format, parseISO } from 'date-fns';
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
import { useAuth } from '@/contexts/AuthContext';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface Invoice {
  id: string; // Firestore document ID
  invoiceNumber: string;
  clientName: string;
  clientEmail?: string;
  amount: number;
  dueDate: Date | Timestamp;
  status: 'Paid' | 'Pending' | 'Overdue' | 'Draft';
  issuedDate: Date | Timestamp;
  items?: InvoiceItem[];
  notes?: string;
  companyId?: string; // For Firestore querying
  createdAt?: Timestamp; // For Firestore ordering
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
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<Partial<Invoice>>({});
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [invoiceToDeleteId, setInvoiceToDeleteId] = useState<string | null>(null);

  const [isEmailPreviewDialogOpen, setIsEmailPreviewDialogOpen] = useState(false);
  const [invoiceForEmail, setInvoiceForEmail] = useState<Invoice | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [companyNameForEmail, setCompanyNameForEmail] = useState("Your Company");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [existingClientNames, setExistingClientNames] = useState<string[]>([]);
  const [clientNameSearch, setClientNameSearch] = useState(''); // Used for the input field in the popover/combobox
  const [isClientPopoverOpen, setIsClientPopoverOpen] = useState(false);


  const fetchInvoices = React.useCallback(async () => {
    if (!user || !user.companyId) {
      console.log('[InvoicingPage fetchInvoices] User or companyId not available. Skipping fetch.');
      setInvoices([]);
      setIsLoading(false);
      return;
    }
    console.log(`[InvoicingPage fetchInvoices] Called for companyId: ${user.companyId}`);
    setIsLoading(true);
    try {
      const invoicesColRef = collection(db, 'invoices');
      const q = query(invoicesColRef, where('companyId', '==', user.companyId), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      console.log(`[InvoicingPage fetchInvoices] Firestore query returned ${querySnapshot.docs.length} documents.`);
      
      const fetchedInvoices = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data() as Omit<Invoice, 'id' | 'dueDate' | 'issuedDate' | 'createdAt'> & { dueDate: Timestamp, issuedDate: Timestamp, createdAt: Timestamp };
        return {
          id: docSnap.id,
          ...data,
          dueDate: data.dueDate.toDate(),
          issuedDate: data.issuedDate.toDate(),
          createdAt: data.createdAt, // Keep as Timestamp for potential future use if needed
        };
      });

      setInvoices(fetchedInvoices);
      console.log(`[InvoicingPage fetchInvoices] ${fetchedInvoices.length} invoices set to state.`);

      const uniqueNames = Array.from(new Set(fetchedInvoices.map((inv: Invoice) => inv.clientName).filter(Boolean)));
      setExistingClientNames(uniqueNames.sort());
      console.log(`[InvoicingPage fetchInvoices] Existing client names set:`, uniqueNames);

    } catch (error: any) {
      console.error('[InvoicingPage fetchInvoices] Error fetching invoices:', error);
      toast({
        title: 'Error Fetching Invoices',
        description: `Could not load invoices. ${error.message || ''}`,
        variant: 'destructive',
      });
      setInvoices([]); // Clear invoices on error
    } finally {
      setIsLoading(false);
      console.log('[InvoicingPage fetchInvoices] Finished. isLoading set to false.');
    }
  }, [user, toast]);


  useEffect(() => {
    console.log(`[InvoicingPage useEffect for fetch] authIsLoading: ${authIsLoading}, user: ${user ? user.uid : 'null'}, companyId: ${user?.companyId || 'null'}`);
    if (authIsLoading) {
      console.log("[InvoicingPage useEffect for fetch] Auth is loading, setting page isLoading to true.");
      setIsLoading(true); // Show page loading indicator while auth is resolving
      return;
    }
    if (user && user.companyId) {
      console.log("[InvoicingPage useEffect for fetch] User and companyId available, calling fetchInvoices.");
      fetchInvoices();
    } else {
      console.log("[InvoicingPage useEffect for fetch] No user or no companyId after auth. Clearing invoices and setting isLoading to false.");
      setInvoices([]); // Clear invoices if no user/companyId
      setIsLoading(false); // Ensure loading is stopped if no user
      setExistingClientNames([]);
    }
  }, [user, user?.companyId, authIsLoading, fetchInvoices]);


  useEffect(() => {
    // Fetch company name for email template from localStorage (or API in future)
     const fetchCompanyName = async () => {
        try {
            const response = await fetch('/api/company-details');
            if (response.ok) {
                const details = await response.json();
                if (details.name) {
                    setCompanyNameForEmail(details.name);
                } else {
                   setCompanyNameForEmail("Your Company Name"); // Fallback if not set
                }
            } else {
                 setCompanyNameForEmail("Your Company Name"); 
            }
        } catch (error) {
            console.error("Failed to fetch company details for email:", error);
            setCompanyNameForEmail("Your Company Name");
        }
    };
    fetchCompanyName();
  }, []);


  const filteredInvoices = useMemo(() => {
    return invoices.filter(
      (invoice) =>
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.status.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [invoices, searchTerm]);

  const getStatusBadgeVariant = (status: Invoice['status']) => {
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
    if (!currentInvoice.clientName || currentInvoice.amount === undefined || !currentInvoice.issuedDate || !currentInvoice.dueDate) { // amount can be 0
        toast({ title: "Missing Fields", description: "Please fill all required invoice details (Client Name, Amount, Issued Date, Due Date).", variant: "destructive" });
        return;
    }
     if (currentInvoice.amount < 0) {
        toast({ title: "Invalid Amount", description: "Amount cannot be negative.", variant: "destructive" });
        return;
    }

    setIsSaving(true);

    const invoiceDataToSave: Omit<Invoice, 'id' | 'createdAt'> & { createdAt?: any } = {
      invoiceNumber: currentInvoice.invoiceNumber || `INV${(Date.now()).toString().slice(-6)}`, // More unique temp number
      clientName: currentInvoice.clientName!,
      clientEmail: currentInvoice.clientEmail,
      amount: Number(currentInvoice.amount) || 0,
      issuedDate: currentInvoice.issuedDate instanceof Date ? Timestamp.fromDate(currentInvoice.issuedDate) : currentInvoice.issuedDate,
      dueDate: currentInvoice.dueDate instanceof Date ? Timestamp.fromDate(currentInvoice.dueDate) : currentInvoice.dueDate,
      status: currentInvoice.status || 'Draft',
      items: currentInvoice.items || [],
      notes: currentInvoice.notes,
      companyId: user.companyId,
    };


    try {
      if (isEditing && currentInvoice.id) {
        invoiceDataToSave.invoiceNumber = currentInvoice.invoiceNumber!; // Keep existing number
        const invoiceRef = doc(db, 'invoices', currentInvoice.id);
        await updateDoc(invoiceRef, invoiceDataToSave);
        toast({ title: "Invoice Updated", description: `Invoice ${invoiceDataToSave.invoiceNumber} updated successfully.` });
      } else {
        invoiceDataToSave.createdAt = serverTimestamp(); // Add createdAt for new invoices
        const invoicesColRef = collection(db, 'invoices');
        const docRef = await addDoc(invoicesColRef, invoiceDataToSave);
        // Auto-generate invoice number if not editing (more robustly if needed)
        if (!invoiceDataToSave.invoiceNumber || invoiceDataToSave.invoiceNumber.startsWith('INV000')) {
            const newInvNum = `INV${docRef.id.substring(0, 6).toUpperCase()}`;
            await updateDoc(docRef, { invoiceNumber: newInvNum });
            invoiceDataToSave.invoiceNumber = newInvNum;
        }
        toast({ title: "Invoice Created", description: `Invoice ${invoiceDataToSave.invoiceNumber} created successfully.` });
      }
      fetchInvoices(); // Refresh the list
      setIsFormOpen(false);
      setCurrentInvoice({});
      setClientNameSearch('');
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
        invoiceNumber: `INV${(Date.now()).toString().slice(-6)}` // Placeholder, can be refined upon save
    });
    setClientNameSearch('');
    setIsEditing(false);
    setIsFormOpen(true);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setCurrentInvoice({
        ...invoice,
        issuedDate: invoice.issuedDate instanceof Timestamp ? invoice.issuedDate.toDate() : invoice.issuedDate,
        dueDate: invoice.dueDate instanceof Timestamp ? invoice.dueDate.toDate() : invoice.dueDate,
    });
    setClientNameSearch(invoice.clientName || '');
    setIsEditing(true);
    setIsFormOpen(true);
  };

  const promptDeleteInvoice = (id: string) => {
    setInvoiceToDeleteId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteInvoice = async () => {
    if (invoiceToDeleteId) {
        try {
            setIsSaving(true);
            const invoiceRef = doc(db, 'invoices', invoiceToDeleteId);
            await deleteDoc(invoiceRef);
            toast({ title: "Invoice Deleted", description: "The invoice has been removed."});
            fetchInvoices(); // Refresh list
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
  
  const handleViewInvoice = (invoice: Invoice) => {
    // For now, using an alert. Could open a detailed view modal later.
    const invoiceDetails = `
      Invoice #: ${invoice.invoiceNumber}
      Client: ${invoice.clientName}
      Amount: $${invoice.amount.toFixed(2)}
      Status: ${invoice.status}
      Issued: ${invoice.issuedDate instanceof Date ? format(invoice.issuedDate, 'PP') : format(invoice.issuedDate.toDate(), 'PP')}
      Due: ${invoice.dueDate instanceof Date ? format(invoice.dueDate, 'PP') : format(invoice.dueDate.toDate(), 'PP')}
      ${invoice.clientEmail ? `Client Email: ${invoice.clientEmail}` : ''}
      ${invoice.notes ? `Notes: ${invoice.notes}` : ''}
      Items:
      ${(invoice.items || []).map(item => `- ${item.description} (Qty: ${item.quantity}, Price: $${item.unitPrice.toFixed(2)})`).join('\n      ') || '  No items detailed.'}
    `;
    // Using alert for simplicity, can be replaced with a modal
    alert(invoiceDetails); 
    // toast({ title: "View Invoice", description: `Details for ${invoice.invoiceNumber} shown in alert.`});
  };

  const loadAndPrepareEmailTemplate = (invoice: Invoice, useDefault: boolean = false) => {
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

    const placeholders = {
        '{{clientName}}': invoice.clientName || 'Client',
        '{{invoiceNumber}}': invoice.invoiceNumber,
        '{{amount}}': invoice.amount.toFixed(2),
        '{{dueDate}}': invoice.dueDate instanceof Date ? format(invoice.dueDate, 'PPP') : format(invoice.dueDate.toDate(), 'PPP'),
        '{{companyName}}': companyNameForEmail,
    };

    for (const [key, value] of Object.entries(placeholders)) {
        processedSubject = processedSubject.replace(new RegExp(key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), value);
        processedBody = processedBody.replace(new RegExp(key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), value);
    }
    setEmailSubject(processedSubject);
    setEmailBody(processedBody);
  };
  
  const handleOpenEmailDialog = (invoice: Invoice) => {
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


  const handleDownloadInvoice = (invoice: Invoice) => {
    // Basic text download for now
    const issuedDateFormatted = invoice.issuedDate instanceof Date ? format(invoice.issuedDate, 'yyyy-MM-dd') : format(invoice.issuedDate.toDate(), 'yyyy-MM-dd');
    const dueDateFormatted = invoice.dueDate instanceof Date ? format(invoice.dueDate, 'yyyy-MM-dd') : format(invoice.dueDate.toDate(), 'yyyy-MM-dd');

    let content = `Invoice Number: ${invoice.invoiceNumber}\n`;
    content += `Client: ${invoice.clientName}\n`;
    if (invoice.clientEmail) content += `Client Email: ${invoice.clientEmail}\n`;
    content += `Issued Date: ${issuedDateFormatted}\n`;
    content += `Due Date: ${dueDateFormatted}\n`;
    content += `Status: ${invoice.status}\n`;
    content += `Amount: $${invoice.amount.toFixed(2)}\n\n`;

    if (invoice.items && invoice.items.length > 0) {
      content += "Items:\n";
      invoice.items.forEach(item => {
        content += `- ${item.description} (Qty: ${item.quantity}, Unit Price: $${item.unitPrice.toFixed(2)}, Total: $${(item.quantity * item.unitPrice).toFixed(2)})\n`;
      });
      content += "\n";
    }

    if (invoice.notes) content += `Notes: ${invoice.notes}\n`;

    content += `\nThank you for your business!\n${companyNameForEmail}`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Invoice-${invoice.invoiceNumber}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    toast({ title: "Download Started", description: `Text file for invoice ${invoice.invoiceNumber} generated.`});
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
    } else if ((currentInvoice.items || []).length === 0 && (currentInvoice.amount === undefined || currentInvoice.amount === null)) {
      // If items are removed and amount becomes undefined/null, set it back to 0
      // Allows manual override if items array is empty
      setCurrentInvoice(prev => ({ ...prev, amount: 0}));
    }
  }, [currentInvoice.items]);


  if (isLoading && invoices.length === 0) { // Show full page loader only on initial load and no data
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <PageTitle title="Invoicing" subtitle="Manage your customer invoices efficiently." icon={Receipt}>
        <Button onClick={handleCreateNew} disabled={isSaving || isLoading}>
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
                disabled={isLoading}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && invoices.length > 0 && ( // Show subtle loading bar if refreshing data
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
                  <TableCell>{invoice.issuedDate instanceof Date ? format(invoice.issuedDate, 'PP') : format(invoice.issuedDate.toDate(), 'PP')}</TableCell>
                  <TableCell>{invoice.dueDate instanceof Date ? format(invoice.dueDate, 'PP') : format(invoice.dueDate.toDate(), 'PP')}</TableCell>
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
                        <DropdownMenuItem onClick={() => handleViewInvoice(invoice)}><Eye className="mr-2 h-4 w-4" /> View</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditInvoice(invoice)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenEmailDialog(invoice)} disabled={!invoice.clientEmail}><Mail className="mr-2 h-4 w-4" /> Email</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownloadInvoice(invoice)}><Download className="mr-2 h-4 w-4" /> Download</DropdownMenuItem>
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
      <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) { setCurrentInvoice({}); setIsEditing(false); setClientNameSearch(''); } }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-headline">{isEditing ? 'Edit Invoice' : 'Create New Invoice'}</DialogTitle>
            <DialogDescription>
              {isEditing ? `Update details for invoice ${currentInvoice.invoiceNumber || ''}.` : 'Fill in the details for the new invoice.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} id="invoice-form-explicit" className="space-y-4 overflow-y-auto flex-grow p-1 pr-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div>
                  <Label htmlFor="clientName">Client Name</Label>
                  <Popover open={isClientPopoverOpen} onOpenChange={setIsClientPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Input
                        id="clientName"
                        value={currentInvoice.clientName || ''}
                        onChange={(e) => {
                          setCurrentInvoice({ ...currentInvoice, clientName: e.target.value, clientEmail: existingClientNames.includes(e.target.value) ? currentInvoice.clientEmail : '' }); // Clear email if new client is typed
                          setClientNameSearch(e.target.value);
                          if (e.target.value.length > 0) { // Only open if there is text
                            setIsClientPopoverOpen(true);
                          } else {
                            setIsClientPopoverOpen(false);
                          }
                        }}
                        onClick={() => {
                          if ((currentInvoice.clientName || '').length > 0) setIsClientPopoverOpen(true);
                        }}
                        onBlur={() => setTimeout(() => setIsClientPopoverOpen(false), 150)} // Delay to allow click
                        placeholder="Type or select client"
                        required
                        autoComplete="off"
                        disabled={isSaving}
                      />
                    </PopoverTrigger>
                    {isClientPopoverOpen && clientNameSearch && existingClientNames.filter(name => name.toLowerCase().includes(clientNameSearch.toLowerCase())).length > 0 && (
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <div className="max-h-48 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md">
                          {existingClientNames
                            .filter(name => name.toLowerCase().includes(clientNameSearch.toLowerCase()))
                            .map(name => (
                              <div
                                key={name}
                                className="p-2 hover:bg-accent cursor-pointer text-sm"
                                onMouseDown={() => {
                                  const clientInvoices = invoices.filter(inv => inv.clientName === name);
                                  const latestEmail = clientInvoices.sort((a, b) => {
                                    const dateA = a.issuedDate instanceof Timestamp ? a.issuedDate.toMillis() : new Date(a.issuedDate).getTime();
                                    const dateB = b.issuedDate instanceof Timestamp ? b.issuedDate.toMillis() : new Date(b.issuedDate).getTime();
                                    return dateB - dateA;
                                  })[0]?.clientEmail;
                                  setCurrentInvoice({ ...currentInvoice, clientName: name, clientEmail: latestEmail || '' });
                                  setClientNameSearch(name);
                                  setIsClientPopoverOpen(false);
                                }}
                              >
                                {name}
                              </div>
                            ))}
                        </div>
                      </PopoverContent>
                    )}
                  </Popover>
                  {currentInvoice.clientName && !existingClientNames.includes(currentInvoice.clientName) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      <Briefcase className="inline h-3 w-3 mr-1" /> New client: "{currentInvoice.clientName}" will be added.
                    </p>
                  )}
                </div>

                <div>
                    <Label htmlFor="clientEmail">Client Email (Optional)</Label>
                    <Input id="clientEmail" type="email" value={currentInvoice.clientEmail || ''} onChange={(e) => setCurrentInvoice({ ...currentInvoice, clientEmail: e.target.value })} disabled={isSaving} />
                </div>
                <div>
                    <Label htmlFor="issuedDate">Issued Date</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal" disabled={isSaving}>
                            <CalendarIconLucide className="mr-2 h-4 w-4" />
                            {currentInvoice.issuedDate ? format(currentInvoice.issuedDate instanceof Timestamp ? currentInvoice.issuedDate.toDate() : currentInvoice.issuedDate, 'PPP') : <span>Pick a date</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={currentInvoice.issuedDate instanceof Timestamp ? currentInvoice.issuedDate.toDate() : currentInvoice.issuedDate} onSelect={(date) => setCurrentInvoice({...currentInvoice, issuedDate: date})} initialFocus /></PopoverContent>
                    </Popover>
                </div>
                 <div>
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal" disabled={isSaving}>
                            <CalendarIconLucide className="mr-2 h-4 w-4" />
                            {currentInvoice.dueDate ? format(currentInvoice.dueDate instanceof Timestamp ? currentInvoice.dueDate.toDate() : currentInvoice.dueDate, 'PPP') : <span>Pick a date</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={currentInvoice.dueDate instanceof Timestamp ? currentInvoice.dueDate.toDate() : currentInvoice.dueDate} onSelect={(date) => setCurrentInvoice({...currentInvoice, dueDate: date})} initialFocus /></PopoverContent>
                    </Popover>
                </div>
                 <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={currentInvoice.status || 'Draft'} onValueChange={(value: Invoice['status']) => setCurrentInvoice({ ...currentInvoice, status: value })} disabled={isSaving}>
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
                <Input id="amount" type="number" value={currentInvoice.amount === undefined ? '' : currentInvoice.amount.toFixed(2)} onChange={(e) => setCurrentInvoice({ ...currentInvoice, amount: parseFloat(e.target.value) || 0 })} placeholder="Calculated if items exist, or set manually" disabled={(currentInvoice.items || []).length > 0 || isSaving} required min="0" step="0.01" />
            </div>

            <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea id="notes" value={currentInvoice.notes || ''} onChange={(e) => setCurrentInvoice({ ...currentInvoice, notes: e.target.value })} placeholder="e.g., Payment terms, thank you message" disabled={isSaving} />
            </div>

          </form>
          <DialogFooter className="mt-auto pt-4 border-t">
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={() => { setIsFormOpen(false); setCurrentInvoice({}); setIsEditing(false); setClientNameSearch(''); }} disabled={isSaving}>Cancel</Button>
            </DialogClose>
            <Button type="submit" form="invoice-form-explicit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditing ? 'Save Changes' : 'Create Invoice')}
            </Button>
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

