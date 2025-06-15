
'use client';

import React, { useState, useMemo, useEffect, type FormEvent, useCallback } from 'react';
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

interface InvoiceFirestore {
  id?: string; // Firestore document ID
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
  items: InvoiceItem[]; // Ensure items is not optional for display
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
  // For currentInvoice in form, use InvoiceDisplay but with optional fields for new invoice creation
  const [currentInvoice, setCurrentInvoice] = useState<Partial<InvoiceDisplay & {invoiceNumber?: string}>>({});
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [invoiceToDeleteId, setInvoiceToDeleteId] = useState<string | null>(null);

  const [isEmailPreviewDialogOpen, setIsEmailPreviewDialogOpen] = useState(false);
  const [invoiceForEmail, setInvoiceForEmail] = useState<InvoiceDisplay | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [companyNameForEmail, setCompanyNameForEmail] = useState("Your Company");

  const [isLoadingPage, setIsLoadingPage] = useState(true); // Unified loading state for the page
  const [isSaving, setIsSaving] = useState(false); 

  const [existingClientNames, setExistingClientNames] = useState<string[]>([]);
  const [clientNameSearch, setClientNameSearch] = useState(''); 
  const [isClientPopoverOpen, setIsClientPopoverOpen] = useState(false);

  const fetchInvoices = useCallback(async () => {
    if (authIsLoading) {
      console.log('[InvoicingPage fetchInvoices] Auth is loading. Aborting fetch.');
      setIsLoadingPage(true);
      return;
    }
    if (!user || !user.companyId) {
      console.log('[InvoicingPage fetchInvoices] User or companyId not available. Clearing invoices.');
      setInvoices([]);
      setExistingClientNames([]);
      setIsLoadingPage(false);
      return;
    }
    console.log(`[InvoicingPage fetchInvoices] Called for companyId: ${user.companyId}`);
    setIsLoadingPage(true); 
    try {
      const invoicesColRef = collection(db, 'invoices');
      const q = query(invoicesColRef, where('companyId', '==', user.companyId), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      console.log(`[InvoicingPage fetchInvoices] Firestore query returned ${querySnapshot.docs.length} documents.`);
      
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
          notes: data.notes,
        } as InvoiceDisplay;
      });

      setInvoices(fetchedInvoices);
      console.log(`[InvoicingPage fetchInvoices] ${fetchedInvoices.length} invoices set to state.`);

      const uniqueNames = Array.from(new Set(fetchedInvoices.map(inv => inv.clientName).filter(Boolean)));
      setExistingClientNames(uniqueNames.sort());
      console.log(`[InvoicingPage fetchInvoices] Existing client names set:`, uniqueNames);

    } catch (error: any) {
      console.error('[InvoicingPage fetchInvoices] Error fetching invoices:', error);
      toast({
        title: 'Error Fetching Invoices',
        description: `Could not load invoices. ${error.message || 'An unknown error occurred.'}`,
        variant: 'destructive',
      });
      setInvoices([]); 
    } finally {
      setIsLoadingPage(false);
      console.log('[InvoicingPage fetchInvoices] Finished. isLoadingPage set to false.');
    }
  }, [user, user?.companyId, authIsLoading, toast]); 


  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);


  useEffect(() => {
     // Fetch company name for email template, from Firestore if possible
     const fetchCompanyDetailsForEmail = async () => {
        if (user && user.companyId) {
            try {
                const docRef = doc(db, 'companyProfiles', user.companyId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists() && docSnap.data().name) {
                    setCompanyNameForEmail(docSnap.data().name);
                } else {
                    setCompanyNameForEmail("Your Company Name");
                }
            } catch (error) {
                console.error("Failed to fetch company details from Firestore for email:", error);
                setCompanyNameForEmail("Your Company Name");
            }
        } else {
             setCompanyNameForEmail("Your Company Name");
        }
    };
    if (!authIsLoading) { // Fetch only after auth state is resolved
        fetchCompanyDetailsForEmail();
    }
  }, [user, user?.companyId, authIsLoading]);


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

    // Ensure dates are Date objects before converting to Timestamp
    const issuedDateForFirestore = currentInvoice.issuedDate instanceof Date ? Timestamp.fromDate(currentInvoice.issuedDate) : Timestamp.fromDate(new Date(currentInvoice.issuedDate!));
    const dueDateForFirestore = currentInvoice.dueDate instanceof Date ? Timestamp.fromDate(currentInvoice.dueDate) : Timestamp.fromDate(new Date(currentInvoice.dueDate!));


    const invoiceDataToSaveCore = {
      clientName: currentInvoice.clientName!,
      clientEmail: currentInvoice.clientEmail,
      amount: Number(currentInvoice.amount) || 0,
      issuedDate: issuedDateForFirestore,
      dueDate: dueDateForFirestore,
      status: currentInvoice.status || 'Draft',
      items: currentInvoice.items || [],
      notes: currentInvoice.notes,
      companyId: user.companyId,
    };


    try {
      if (isEditing && currentInvoice.id) {
        const invoiceRef = doc(db, 'invoices', currentInvoice.id);
        await updateDoc(invoiceRef, {
            ...invoiceDataToSaveCore,
            invoiceNumber: currentInvoice.invoiceNumber!, // Keep existing number on edit
        });
        toast({ title: "Invoice Updated", description: `Invoice ${currentInvoice.invoiceNumber} updated successfully.` });
      } else {
        const newInvoiceNumber = currentInvoice.invoiceNumber || `INV${(Date.now()).toString().slice(-6)}`;
        const invoicesColRef = collection(db, 'invoices');
        const docRef = await addDoc(invoicesColRef, {
            ...invoiceDataToSaveCore,
            invoiceNumber: newInvoiceNumber,
            createdAt: serverTimestamp(),
        });
        // If default INV number was generated and we want ID based one.
        // if (newInvoiceNumber.startsWith('INV') && newInvoiceNumber.length > 9) { // Heuristic for generated
        //     const finalInvNum = `INV${docRef.id.substring(0, 6).toUpperCase()}`;
        //     await updateDoc(docRef, { invoiceNumber: finalInvNum });
        // }
        toast({ title: "Invoice Created", description: `Invoice ${newInvoiceNumber} created successfully.` });
      }
      fetchInvoices(); 
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
        invoiceNumber: `INV${(Date.now()).toString().slice(-6)}` 
    });
    setClientNameSearch('');
    setIsEditing(false);
    setIsFormOpen(true);
  };

  const handleEditInvoice = (invoice: InvoiceDisplay) => {
    setCurrentInvoice({
        ...invoice, // invoice already has Dates
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
  
  const handleViewInvoice = (invoice: InvoiceDisplay) => {
    const issuedDateStr = format(invoice.issuedDate, 'PP');
    const dueDateStr = format(invoice.dueDate, 'PP');

    const invoiceDetails = `
      Invoice #: ${invoice.invoiceNumber}
      Client: ${invoice.clientName}
      Amount: $${invoice.amount.toFixed(2)}
      Status: ${invoice.status}
      Issued: ${issuedDateStr}
      Due: ${dueDateStr}
      ${invoice.clientEmail ? `Client Email: ${invoice.clientEmail}` : ''}
      ${invoice.notes ? `Notes: ${invoice.notes}` : ''}
      Items:
      ${(invoice.items || []).map(item => `- ${item.description} (Qty: ${item.quantity}, Price: $${item.unitPrice.toFixed(2)})`).join('\n      ') || '  No items detailed.'}
    `;
    alert(invoiceDetails); 
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
                template = DEFAULT_EMAIL_TEMPLATE; // Fallback to default
            }
        }
    }
    
    let processedSubject = template.subject;
    let processedBody = template.body;
    const dueDateFormatted = format(invoice.dueDate, 'PPP');

    const placeholders = {
        '{{clientName}}': invoice.clientName || 'Client',
        '{{invoiceNumber}}': invoice.invoiceNumber,
        '{{amount}}': invoice.amount.toFixed(2),
        '{{dueDate}}': dueDateFormatted,
        '{{companyName}}': companyNameForEmail,
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


  const handleDownloadInvoice = (invoice: InvoiceDisplay) => {
    const issuedDateFormatted = format(invoice.issuedDate, 'yyyy-MM-dd');
    const dueDateFormatted = format(invoice.dueDate, 'yyyy-MM-dd');

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
      // If items are removed and no items are left, explicitly set amount to 0 if not already set.
      // User can still override this manually if needed.
      if (currentInvoice.amount !== 0) { // only update if not already 0 to avoid infinite loop
        setCurrentInvoice(prev => ({ ...prev, amount: 0}));
      }
    }
  }, [currentInvoice.items, currentInvoice.amount]);


  if (isLoadingPage && invoices.length === 0) { 
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <PageTitle title="Invoicing" subtitle="Manage your customer invoices efficiently." icon={Receipt}>
        <Button onClick={handleCreateNew} disabled={isSaving || isLoadingPage}>
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
                disabled={isLoadingPage && invoices.length === 0} 
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingPage && invoices.length > 0 && ( 
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2">Refreshing invoices...</span>
            </div>
          )}
          <Table>
            <TableCaption>{filteredInvoices.length === 0 && !isLoadingPage ? "No invoices found." : filteredInvoices.length > 0 ? "A list of your recent invoices." : isLoadingPage ? "Loading invoices..." : "No invoices match your search."}</TableCaption>
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
                            const typedName = e.target.value;
                            let newClientEmail = currentInvoice.clientEmail || '';
                            const matchedClient = existingClientNames.find(name => name.toLowerCase() === typedName.toLowerCase());

                            if (matchedClient) { // If typed name matches an existing client
                                const clientInvoices = invoices.filter(inv => inv.clientName === matchedClient);
                                const latestEmail = clientInvoices.sort((a, b) => b.issuedDate.getTime() - a.issuedDate.getTime())[0]?.clientEmail;
                                newClientEmail = latestEmail || '';
                            } else { // If typed name does NOT match any existing client or is a partial new name
                                // If currentInvoice.clientName was an existing client and now it's different (not matching another existing client)
                                if (currentInvoice.clientName && existingClientNames.includes(currentInvoice.clientName) && !matchedClient) {
                                    newClientEmail = ''; // Clear email if changing from a known client to a new one
                                }
                                // else, retain current newClientEmail (could be manually entered or from a previous match)
                            }
                            
                            setCurrentInvoice(prev => ({ ...prev, clientName: typedName, clientEmail: newClientEmail }));
                            setClientNameSearch(typedName); // For popover filtering
                            setIsClientPopoverOpen(typedName.length > 0 || existingClientNames.length > 0);
                        }}
                        onFocus={() => {
                            setIsClientPopoverOpen((currentInvoice.clientName || '').length > 0 || existingClientNames.length > 0);
                        }}
                        onBlur={() => setTimeout(() => setIsClientPopoverOpen(false), 150)} 
                        placeholder="Type or select client"
                        required
                        autoComplete="off"
                        disabled={isSaving}
                      />
                    </PopoverTrigger>
                    {isClientPopoverOpen && (
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <div className="max-h-48 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md">
                          {(() => {
                            const filteredClients = existingClientNames.filter(name => name.toLowerCase().includes(clientNameSearch.toLowerCase()));
                            if (filteredClients.length > 0) {
                              return filteredClients.map(name => (
                                <div
                                  key={name}
                                  className="p-2 hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm"
                                  onMouseDown={() => { 
                                    const clientInvoices = invoices.filter(inv => inv.clientName === name);
                                    const latestEmail = clientInvoices.sort((a, b) => b.issuedDate.getTime() - a.issuedDate.getTime())[0]?.clientEmail;
                                    setCurrentInvoice(prev => ({ ...prev, clientName: name, clientEmail: latestEmail || '' }));
                                    setClientNameSearch(name); 
                                    setIsClientPopoverOpen(false);
                                  }}
                                >
                                  {name}
                                </div>
                              ));
                            } else if (clientNameSearch.length > 0 && existingClientNames.length === 0) {
                                return <div className="p-2 text-sm text-muted-foreground">No existing clients. Type to add.</div>;
                            } else if (clientNameSearch.length > 0) {
                              return <div className="p-2 text-sm text-muted-foreground">No matching clients. Type to add.</div>;
                            } else if (existingClientNames.length > 0) { // Show all if search is empty but clients exist
                               return existingClientNames.map(name => (
                                <div
                                  key={name}
                                  className="p-2 hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm"
                                  onMouseDown={() => { 
                                    const clientInvoices = invoices.filter(inv => inv.clientName === name);
                                    const latestEmail = clientInvoices.sort((a, b) => b.issuedDate.getTime() - a.issuedDate.getTime())[0]?.clientEmail;
                                    setCurrentInvoice(prev => ({ ...prev, clientName: name, clientEmail: latestEmail || '' }));
                                    setClientNameSearch(name); 
                                    setIsClientPopoverOpen(false);
                                  }}
                                >
                                  {name}
                                </div>
                              ));
                            }
                            return <div className="p-2 text-sm text-muted-foreground">Type client name.</div>;
                          })()}
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
                    <Label htmlFor="invoiceNumber">Invoice Number</Label>
                    <Input id="invoiceNumber" value={currentInvoice.invoiceNumber || ''} onChange={(e) => setCurrentInvoice({ ...currentInvoice, invoiceNumber: e.target.value })} required disabled={isSaving} />
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
