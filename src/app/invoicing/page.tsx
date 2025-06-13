
'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
import { Receipt, PlusCircle, Search, MoreHorizontal, Edit, Trash2, Eye, Mail, Download, Calendar as CalendarIconLucide } from 'lucide-react'; // Renamed Calendar to avoid conflict
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
import { Calendar } from '@/components/ui/calendar'; // ShadCN Calendar
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';


interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail?: string;
  amount: number;
  dueDate: Date;
  status: 'Paid' | 'Pending' | 'Overdue' | 'Draft';
  issuedDate: Date;
  items?: InvoiceItem[];
  notes?: string;
}

const initialMockInvoices: Invoice[] = [
  { id: '1', invoiceNumber: 'INV001', clientName: 'Acme Corp', clientEmail: 'contact@acme.com', amount: 1200.50, dueDate: new Date('2024-08-15'), status: 'Paid', issuedDate: new Date('2024-07-15'), items: [{id: 'item1', description: 'Web Design', quantity:1, unitPrice: 1000}, {id: 'item2', description: 'Hosting', quantity:1, unitPrice: 200.50}] },
  { id: '2', invoiceNumber: 'INV002', clientName: 'Beta LLC', clientEmail: 'info@betallc.com', amount: 850.00, dueDate: new Date('2024-07-25'), status: 'Overdue', issuedDate: new Date('2024-06-25') },
  { id: '3', invoiceNumber: 'INV003', clientName: 'Gamma Inc', clientEmail: 'accounts@gammainc.com', amount: 2500.75, dueDate: new Date('2024-09-01'), status: 'Pending', issuedDate: new Date('2024-08-01') },
  { id: '4', invoiceNumber: 'INV004', clientName: 'Delta Co', clientEmail: 'billing@deltaco.com', amount: 500.00, dueDate: new Date('2024-08-20'), status: 'Pending', issuedDate: new Date('2024-07-20') },
  { id: '5', invoiceNumber: 'INV005', clientName: 'Epsilon Ltd', clientEmail: 'finance@epsilon.com', amount: 150.00, dueDate: new Date('2024-07-10'), status: 'Draft', issuedDate: new Date('2024-07-01') },
];


export default function InvoicingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<Partial<Invoice>>({});
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [invoiceToDeleteId, setInvoiceToDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const storedInvoices = localStorage.getItem('bizsight-invoices');
    if (storedInvoices) {
      const parsedInvoices = JSON.parse(storedInvoices).map((inv: Invoice) => ({
        ...inv,
        dueDate: new Date(inv.dueDate),
        issuedDate: new Date(inv.issuedDate),
      }));
      setInvoices(parsedInvoices);
    } else {
       setInvoices(initialMockInvoices); 
    }
  }, []);

  useEffect(() => {
     if (invoices.length > 0 || localStorage.getItem('bizsight-invoices')) {
        localStorage.setItem('bizsight-invoices', JSON.stringify(invoices));
     }
  }, [invoices]);

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
  
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentInvoice.clientName || !currentInvoice.amount === undefined || !currentInvoice.issuedDate || !currentInvoice.dueDate) { // amount can be 0
        toast({ title: "Missing Fields", description: "Please fill all required invoice details (Client Name, Amount, Issued Date, Due Date).", variant: "destructive" });
        return;
    }
     if (currentInvoice.amount < 0) {
        toast({ title: "Invalid Amount", description: "Amount cannot be negative.", variant: "destructive" });
        return;
    }


    const newInvoiceNumber = `INV${(invoices.length + 1).toString().padStart(3, '0')}`;
    const finalInvoice: Invoice = {
      id: isEditing && currentInvoice.id ? currentInvoice.id : crypto.randomUUID(),
      invoiceNumber: isEditing && currentInvoice.invoiceNumber ? currentInvoice.invoiceNumber : newInvoiceNumber,
      clientName: currentInvoice.clientName!,
      clientEmail: currentInvoice.clientEmail,
      amount: Number(currentInvoice.amount) || 0,
      issuedDate: currentInvoice.issuedDate!,
      dueDate: currentInvoice.dueDate!,
      status: currentInvoice.status || 'Draft',
      items: currentInvoice.items || [],
      notes: currentInvoice.notes
    };

    if (isEditing) {
      setInvoices(invoices.map(inv => inv.id === finalInvoice.id ? finalInvoice : inv));
      toast({ title: "Invoice Updated", description: `Invoice ${finalInvoice.invoiceNumber} updated successfully.` });
    } else {
      setInvoices([finalInvoice, ...invoices]);
      toast({ title: "Invoice Created", description: `Invoice ${finalInvoice.invoiceNumber} created successfully.` });
    }
    
    setIsFormOpen(false);
    setCurrentInvoice({});
    setIsEditing(false);
  };

  const handleCreateNew = () => {
    setCurrentInvoice({ issuedDate: new Date(), dueDate: new Date(new Date().setDate(new Date().getDate() + 30)), status: 'Draft', items: [], amount: 0 }); // Default due date 30 days from now
    setIsEditing(false);
    setIsFormOpen(true);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setCurrentInvoice(invoice);
    setIsEditing(true);
    setIsFormOpen(true);
  };

  const promptDeleteInvoice = (id: string) => {
    setInvoiceToDeleteId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteInvoice = () => {
    if (invoiceToDeleteId) {
        setInvoices(invoices.filter(inv => inv.id !== invoiceToDeleteId));
        toast({ title: "Invoice Deleted", description: "The invoice has been removed.", variant: "destructive" });
        setInvoiceToDeleteId(null);
    }
    setIsDeleteDialogOpen(false);
  };
  
  const handleViewInvoice = (invoice: Invoice) => {
    // Placeholder for viewing - could open a new dialog/page with detailed view
    toast({ title: "View Invoice", description: `Details for ${invoice.invoiceNumber} would be shown here.`});
  };

  const handleEmailInvoice = (invoice: Invoice) => {
    if (typeof window === "undefined") {
        toast({ title: "Email Invoice", description: `Invoice ${invoice.invoiceNumber} would be prepared for email on the client.`});
        return;
    }

    const companyDetailsString = localStorage.getItem('bizsight-company-details');
    let companyName = "Your Company"; // Default
    if (companyDetailsString) {
        try {
        const companyDetails = JSON.parse(companyDetailsString);
        if (companyDetails.name) {
            companyName = companyDetails.name;
        }
        } catch (e) {
        console.error("Failed to parse company details from localStorage", e);
        }
    }

    const subject = encodeURIComponent(`Invoice ${invoice.invoiceNumber} from ${companyName}`);
    const bodyLines = [
        `Dear ${invoice.clientName || 'Client'},`,
        ``,
        `Please find details for invoice ${invoice.invoiceNumber} regarding your recent services/products.`,
        ``,
        `Amount: $${invoice.amount.toFixed(2)}`,
        `Due Date: ${format(invoice.dueDate, 'PPP')}`,
        ``,
        `You can view the full invoice details by logging into your portal (if applicable) or find it attached if this were a real email system.`,
        ``,
        `Thank you for your business!`,
        ``,
        `Sincerely,`,
        `${companyName}`
    ];
    const body = encodeURIComponent(bodyLines.join('\n'));

    const mailtoLink = `mailto:${invoice.clientEmail || ''}?subject=${subject}&body=${body}`;

    window.location.href = mailtoLink;
    toast({ title: "Email Client Opened", description: `Preparing email for invoice ${invoice.invoiceNumber}.`});
  };

  const handleDownloadInvoice = (invoice: Invoice) => {
    // Placeholder for download
    toast({ title: "Download PDF", description: `PDF for invoice ${invoice.invoiceNumber} would be generated.`});
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
    } else if ((currentInvoice.items || []).length === 0 && !isEditing) { // If items are empty and not editing, allow manual amount or default to 0
        // Amount can be manually set if no items, or defaults to 0 from handleCreateNew
    }
  }, [currentInvoice.items, isEditing]);


  return (
    <div className="space-y-6">
      <PageTitle title="Invoicing" subtitle="Manage your customer invoices efficiently." icon={Receipt}>
        <Button onClick={handleCreateNew}>
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
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>{filteredInvoices.length === 0 ? "No invoices found." : `A list of your recent invoices.`}</TableCaption>
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
                  <TableCell>{format(new Date(invoice.issuedDate), 'PP')}</TableCell>
                  <TableCell>{format(new Date(invoice.dueDate), 'PP')}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(invoice.status)} className={`${invoice.status === 'Paid' ? 'bg-accent text-accent-foreground hover:bg-accent/80' : ''} ${invoice.status === 'Overdue' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/80' : ''}`}>
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewInvoice(invoice)}><Eye className="mr-2 h-4 w-4" /> View</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditInvoice(invoice)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEmailInvoice(invoice)} disabled={!invoice.clientEmail}><Mail className="mr-2 h-4 w-4" /> Email</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownloadInvoice(invoice)}><Download className="mr-2 h-4 w-4" /> Download PDF</DropdownMenuItem>
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

      <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) { setCurrentInvoice({}); setIsEditing(false); } }}>
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
                    <Input id="clientName" value={currentInvoice.clientName || ''} onChange={(e) => setCurrentInvoice({ ...currentInvoice, clientName: e.target.value })} required />
                </div>
                <div>
                    <Label htmlFor="clientEmail">Client Email (Optional)</Label>
                    <Input id="clientEmail" type="email" value={currentInvoice.clientEmail || ''} onChange={(e) => setCurrentInvoice({ ...currentInvoice, clientEmail: e.target.value })} />
                </div>
                <div>
                    <Label htmlFor="issuedDate">Issued Date</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIconLucide className="mr-2 h-4 w-4" />
                            {currentInvoice.issuedDate ? format(currentInvoice.issuedDate, 'PPP') : <span>Pick a date</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={currentInvoice.issuedDate} onSelect={(date) => setCurrentInvoice({...currentInvoice, issuedDate: date})} initialFocus /></PopoverContent>
                    </Popover>
                </div>
                 <div>
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIconLucide className="mr-2 h-4 w-4" />
                            {currentInvoice.dueDate ? format(currentInvoice.dueDate, 'PPP') : <span>Pick a date</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={currentInvoice.dueDate} onSelect={(date) => setCurrentInvoice({...currentInvoice, dueDate: date})} initialFocus /></PopoverContent>
                    </Popover>
                </div>
                 <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={currentInvoice.status || 'Draft'} onValueChange={(value: Invoice['status']) => setCurrentInvoice({ ...currentInvoice, status: value })}>
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
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Invoice Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddItem}><PlusCircle className="mr-2 h-4 w-4" /> Add Item</Button>
              </div>
              {(currentInvoice.items || []).map((item, index) => (
                <div key={item.id} className="flex gap-2 items-end p-2 border rounded-md bg-muted/30">
                  <div className="flex-grow space-y-1">
                    <Label htmlFor={`item-desc-${item.id}`} className="text-xs">Description</Label>
                    <Input id={`item-desc-${item.id}`} value={item.description} onChange={e => handleItemChange(item.id, 'description', e.target.value)} placeholder="Service or Product" />
                  </div>
                  <div className="w-20 space-y-1">
                     <Label htmlFor={`item-qty-${item.id}`} className="text-xs">Qty</Label>
                    <Input id={`item-qty-${item.id}`} type="number" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', e.target.value)} min="0" />
                  </div>
                   <div className="w-24 space-y-1">
                    <Label htmlFor={`item-price-${item.id}`} className="text-xs">Unit Price</Label>
                    <Input id={`item-price-${item.id}`} type="number" value={item.unitPrice} onChange={e => handleItemChange(item.id, 'unitPrice', e.target.value)} min="0" step="0.01" />
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => handleRemoveItem(item.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>

            <div>
                <Label htmlFor="amount">Total Amount ($)</Label>
                <Input id="amount" type="number" value={currentInvoice.amount === undefined ? '' : currentInvoice.amount.toFixed(2)} onChange={(e) => setCurrentInvoice({ ...currentInvoice, amount: parseFloat(e.target.value) || 0 })} placeholder="Calculated automatically if items exist" disabled={(currentInvoice.items || []).length > 0} required min="0" step="0.01" />
            </div>

            <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea id="notes" value={currentInvoice.notes || ''} onChange={(e) => setCurrentInvoice({ ...currentInvoice, notes: e.target.value })} placeholder="e.g., Payment terms, thank you message" />
            </div>

          </form>
          <DialogFooter className="mt-auto pt-4 border-t">
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={() => { setIsFormOpen(false); setCurrentInvoice({}); setIsEditing(false); }}>Cancel</Button>
            </DialogClose>
            <Button type="submit" form="invoice-form-explicit">{isEditing ? 'Save Changes' : 'Create Invoice'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the invoice
              and remove its data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setInvoiceToDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteInvoice} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

