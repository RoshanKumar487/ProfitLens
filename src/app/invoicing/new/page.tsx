
'use client';

import React, { useState, useMemo, useEffect, type FormEvent, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Receipt, PlusCircle, UserPlus, Save, Loader2, Calendar as CalendarIconLucide, Percent, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { collection, addDoc, getDocs, doc, query, where, orderBy, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';


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

interface ExistingClient {
  name: string;
  email?: string;
  address?: string;
  gstin?: string;
}

const LOCAL_STORAGE_NOTES_TEMPLATE_KEY = 'profitlens-invoice-notes-template-v1';
const LOCAL_STORAGE_TAX_RATE_KEY = 'profitlens-invoice-tax-rate-v1';
const LOCAL_STORAGE_DISCOUNT_TYPE_KEY = 'profitlens-invoice-discount-type-v1';
const LOCAL_STORAGE_DISCOUNT_VALUE_KEY = 'profitlens-invoice-discount-value-v1';


export default function NewInvoicePage() {
    const { user, currencySymbol } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const [currentInvoice, setCurrentInvoice] = useState<Partial<InvoiceDisplay & {invoiceNumber?: string}>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [existingClients, setExistingClients] = useState<ExistingClient[]>([]);
    const [isClientSuggestionsVisible, setIsClientSuggestionsVisible] = useState(false);
    const [invoices, setInvoices] = useState<InvoiceDisplay[]>([]);


    // Initialize form with defaults on mount
    useEffect(() => {
        const savedNotes = localStorage.getItem(LOCAL_STORAGE_NOTES_TEMPLATE_KEY) || 'Full payment is due upon receipt. Late payments may incur additional charges.';
        const savedTaxRate = parseFloat(localStorage.getItem(LOCAL_STORAGE_TAX_RATE_KEY) || '0');
        const savedDiscountType = (localStorage.getItem(LOCAL_STORAGE_DISCOUNT_TYPE_KEY) as DiscountType) || 'fixed';
        const savedDiscountValue = parseFloat(localStorage.getItem(LOCAL_STORAGE_DISCOUNT_VALUE_KEY) || '0');

        setCurrentInvoice({
            issuedDate: new Date(),
            dueDate: new Date(new Date().setDate(new Date().getDate() + 30)),
            status: 'Draft',
            items: [{ id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0 }],
            invoiceNumber: `INV${(Date.now()).toString().slice(-6)}`,
            clientName: '',
            clientEmail: '',
            clientAddress: '',
            clientGstin: '',
            notes: savedNotes,
            subtotal: 0,
            discountType: savedDiscountType,
            discountValue: savedDiscountValue,
            discountAmount: 0,
            taxRate: savedTaxRate,
            taxAmount: 0,
            amount: 0,
        });
    }, []);
    
    // Fetch existing clients to provide suggestions
    useEffect(() => {
        if (!user || !user.companyId) return;

        const fetchExistingClientsData = async () => {
            const invoicesColRef = collection(db, 'invoices');
            const qInvoices = query(invoicesColRef, where('companyId', '==', user.companyId), orderBy('createdAt', 'desc'));
            const invoiceSnapshot = await getDocs(qInvoices);
            
            const fetchedInvoices = invoiceSnapshot.docs.map(docSnap => {
                const data = docSnap.data();
                return {
                    id: docSnap.id,
                    ...data,
                    issuedDate: (data.issuedDate as Timestamp).toDate(),
                    dueDate: (data.dueDate as Timestamp).toDate(),
                } as InvoiceDisplay;
            });
            setInvoices(fetchedInvoices);

            const clientsMap = new Map<string, ExistingClient>();
            fetchedInvoices.forEach(inv => {
                if (inv.clientName) {
                    const existingEntry = clientsMap.get(inv.clientName.toLowerCase());
                    clientsMap.set(inv.clientName.toLowerCase(), { 
                        name: inv.clientName,
                        email: inv.clientEmail || existingEntry?.email || '',
                        address: inv.clientAddress || existingEntry?.address || '',
                        gstin: inv.clientGstin || existingEntry?.gstin || ''
                    });
                }
            });
            setExistingClients(Array.from(clientsMap.values()));
        };

        fetchExistingClientsData();
    }, [user]);

    // Recalculate totals whenever items or discounts/taxes change
    useEffect(() => {
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
    }, [currentInvoice.items, currentInvoice.discountType, currentInvoice.discountValue, currentInvoice.taxRate]);


    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !user.companyId) {
            toast({ title: "Authentication Error", description: "User not authenticated.", variant: "destructive" });
            return;
        }
        if (!currentInvoice.clientName || currentInvoice.amount === undefined || !currentInvoice.issuedDate || !currentInvoice.dueDate) {
            toast({ title: "Missing Fields", description: "Client Name, Amount, Issued Date, and Due Date are required.", variant: "destructive" });
            return;
        }
        if (currentInvoice.amount < 0) {
            toast({ title: "Invalid Amount", description: "Amount cannot be negative.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        const invoiceDataToSave = {
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
            issuedDate: Timestamp.fromDate(currentInvoice.issuedDate),
            dueDate: Timestamp.fromDate(currentInvoice.dueDate),
            status: currentInvoice.status || 'Draft',
            items: currentInvoice.items || [],
            notes: currentInvoice.notes || '',
            companyId: user.companyId,
            invoiceNumber: currentInvoice.invoiceNumber || `INV${(Date.now()).toString().slice(-6)}`,
            createdAt: serverTimestamp(),
        };

        try {
            await addDoc(collection(db, 'invoices'), invoiceDataToSave);
            toast({ title: "Invoice Created", description: `Invoice ${invoiceDataToSave.invoiceNumber} created successfully.` });

            // Save settings as default
            localStorage.setItem(LOCAL_STORAGE_TAX_RATE_KEY, String(currentInvoice.taxRate || '0'));
            localStorage.setItem(LOCAL_STORAGE_DISCOUNT_TYPE_KEY, currentInvoice.discountType || 'fixed');
            localStorage.setItem(LOCAL_STORAGE_DISCOUNT_VALUE_KEY, String(currentInvoice.discountValue || '0'));
            
            router.push('/invoicing');
        } catch (error: any) {
            toast({ title: "Save Failed", description: `Could not save invoice: ${error.message}`, variant: "destructive" });
        } finally {
            setIsSaving(false);
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
    
    const handleClientNameInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const typedValue = e.target.value;
        setCurrentInvoice(prev => ({ ...prev, clientName: typedValue }));
        setIsClientSuggestionsVisible(typedValue.length > 0);
    };

    const handleClientSuggestionClick = (client: ExistingClient) => {
        const mostRecentInvoice = invoices
          .filter(inv => inv.clientName === client.name)
          .sort((a, b) => b.issuedDate.getTime() - a.issuedDate.getTime())[0];

        if (mostRecentInvoice) {
          setCurrentInvoice({
            ...mostRecentInvoice,
            id: undefined, 
            invoiceNumber: `INV${(Date.now()).toString().slice(-6)}`,
            issuedDate: new Date(),
            dueDate: new Date(new Date().setDate(new Date().getDate() + 30)),
            status: 'Draft',
          });
        } else {
          setCurrentInvoice(prev => ({ ...prev, clientName: client.name, clientEmail: client.email || '', clientAddress: client.address || '', clientGstin: client.gstin || '' }));
        }
        setIsClientSuggestionsVisible(false);
    };
    
    const handleSaveNotesAsDefault = useCallback(() => {
        if (currentInvoice.notes && currentInvoice.notes.trim().length > 0) {
            localStorage.setItem(LOCAL_STORAGE_NOTES_TEMPLATE_KEY, currentInvoice.notes);
            toast({ title: "Default Notes Saved", description: "Your notes will be used for new invoices." });
        } else {
            toast({ title: "Cannot Save Empty Notes", variant: "destructive" });
        }
    }, [currentInvoice.notes, toast]);

    const filteredClientSuggestions = useMemo(() => {
        const currentName = currentInvoice.clientName?.toLowerCase() || '';
        if (!currentName) return [];
        return existingClients.filter(client => client.name.toLowerCase().includes(currentName));
    }, [currentInvoice.clientName, existingClients]);
    
    const isNewClient = useMemo(() => {
        if (!currentInvoice.clientName) return false;
        return !existingClients.some(c => c.name.toLowerCase() === currentInvoice.clientName!.toLowerCase());
    }, [currentInvoice.clientName, existingClients]);

    return (
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
            <PageTitle title="Create New Invoice" subtitle="Fill in the details to generate a new invoice." icon={Receipt} />

            <Card className="max-w-4xl mx-auto shadow-lg">
                <form onSubmit={handleFormSubmit}>
                    <CardContent className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="clientName">Client Name</Label>
                                <div className="relative">
                                    <Input
                                        id="clientName"
                                        value={currentInvoice.clientName || ''}
                                        onChange={handleClientNameInputChange}
                                        onFocus={() => { if ((currentInvoice.clientName || '').length > 0) setIsClientSuggestionsVisible(true); }}
                                        onBlur={() => setTimeout(() => setIsClientSuggestionsVisible(false), 150)}
                                        placeholder="Enter client name"
                                        required
                                        autoComplete="off"
                                        disabled={isSaving}
                                        className="w-full"
                                    />
                                    {isClientSuggestionsVisible && filteredClientSuggestions.length > 0 && (
                                        <Card className="absolute z-10 w-full mt-1 shadow-lg max-h-60 overflow-y-auto p-0">
                                            <CardContent className="p-0">
                                                <ScrollArea className="max-h-56">
                                                    {filteredClientSuggestions.map((client) => (
                                                    <div key={client.name} className="px-3 py-2 text-sm hover:bg-accent cursor-pointer" onMouseDown={() => handleClientSuggestionClick(client)}>
                                                        {client.name}
                                                        {client.email && <span className="text-xs text-muted-foreground ml-2">({client.email})</span>}
                                                    </div>
                                                    ))}
                                                </ScrollArea>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                                {isNewClient && (
                                    <p className="text-xs text-muted-foreground mt-1 flex items-center">
                                    <UserPlus className="h-3 w-3 mr-1 text-chart-2" />
                                    New client: '{currentInvoice.clientName}' will be added.
                                    </p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="clientEmail">Client Email</Label>
                                <Input id="clientEmail" type="email" value={currentInvoice.clientEmail || ''} onChange={(e) => setCurrentInvoice({ ...currentInvoice, clientEmail: e.target.value })} placeholder="Enter client email" disabled={isSaving} />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="clientGstin">Client GSTIN</Label>
                            <Input id="clientGstin" value={currentInvoice.clientGstin || ''} onChange={(e) => setCurrentInvoice({ ...currentInvoice, clientGstin: e.target.value })} placeholder="Enter client's GSTIN (optional)" disabled={isSaving} />
                        </div>
                        <div>
                            <Label htmlFor="clientAddress">Client Address</Label>
                            <Textarea id="clientAddress" value={currentInvoice.clientAddress || ''} onChange={(e) => setCurrentInvoice({ ...currentInvoice, clientAddress: e.target.value })} placeholder="Enter client's billing address" disabled={isSaving} rows={3} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

                        <Separator/>
                        <div className="space-y-2 pt-2">
                            <div className="flex justify-between items-center">
                                <Label className="text-base font-medium">Invoice Items</Label>
                                <Button type="button" variant="outline" size="sm" onClick={handleAddItem} disabled={isSaving}><PlusCircle className="mr-2 h-4 w-4" /> Add Item</Button>
                            </div>
                            {(currentInvoice.items || []).map((item) => (
                                <div key={item.id} className="grid grid-cols-[1fr,auto,auto,auto] sm:grid-cols-[2fr_1fr_1fr_auto] items-end gap-2 p-2 border rounded-md bg-muted/30">
                                    <div className="space-y-1">
                                        <Label htmlFor={`item-desc-${item.id}`} className="text-xs">Description</Label>
                                        <Input id={`item-desc-${item.id}`} value={item.description} onChange={e => handleItemChange(item.id, 'description', e.target.value)} placeholder="Service or Product" disabled={isSaving} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor={`item-qty-${item.id}`} className="text-xs">Qty</Label>
                                        <Input id={`item-qty-${item.id}`} type="number" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', e.target.value)} min="0" disabled={isSaving} className="w-20" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor={`item-price-${item.id}`} className="text-xs">Unit Price</Label>
                                        <Input id={`item-price-${item.id}`} type="number" value={item.unitPrice} onChange={e => handleItemChange(item.id, 'unitPrice', e.target.value)} min="0" step="0.01" disabled={isSaving} className="w-24"/>
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => handleRemoveItem(item.id)} disabled={isSaving}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            ))}
                        </div>

                        <Separator/>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <Label htmlFor="discountType">Discount Type</Label>
                                        <Select value={currentInvoice.discountType || 'fixed'} onValueChange={(value: DiscountType) => setCurrentInvoice(prev => ({ ...prev, discountType: value }))} disabled={isSaving}>
                                            <SelectTrigger><SelectValue/></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="fixed">Fixed ({currencySymbol})</SelectItem>
                                                <SelectItem value="percentage">Percentage (%)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label htmlFor="discountValue">Discount Value</Label>
                                        <Input id="discountValue" type="number" value={currentInvoice.discountValue || ''} onChange={(e) => setCurrentInvoice(prev => ({...prev, discountValue: e.target.value}))} min="0" step="0.01" disabled={isSaving} />
                                    </div>
                                </div>
                                <div>
                                    <Label htmlFor="taxRate">Tax Rate (%)</Label>
                                    <Input id="taxRate" type="number" value={currentInvoice.taxRate || ''} onChange={(e) => setCurrentInvoice(prev => ({...prev, taxRate: e.target.value}))} min="0" step="0.01" placeholder="e.g. 5 or 12.5" disabled={isSaving} />
                                </div>
                            </div>
                            <div className="space-y-2 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                                <h4 className="font-medium text-center mb-2">Summary</h4>
                                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal:</span><span className="font-medium">{currencySymbol}{(currentInvoice.subtotal || 0).toFixed(2)}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Discount:</span><span className="font-medium text-destructive">- {currencySymbol}{(currentInvoice.discountAmount || 0).toFixed(2)}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tax ({currentInvoice.taxRate || 0}%):</span><span className="font-medium text-chart-2">+ {currencySymbol}{(currentInvoice.taxAmount || 0).toFixed(2)}</span></div>
                                <Separator className="my-2" />
                                <div className="flex justify-between text-lg font-bold"><span>Grand Total:</span><span>{currencySymbol}{(currentInvoice.amount || 0).toFixed(2)}</span></div>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <Label htmlFor="notes">Notes / Terms (Optional)</Label>
                                <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={handleSaveNotesAsDefault} disabled={isSaving}>Save as Default</Button>
                            </div>
                            <Textarea id="notes" value={currentInvoice.notes || ''} onChange={(e) => setCurrentInvoice({ ...currentInvoice, notes: e.target.value })} placeholder="e.g., Payment terms, thank you message" disabled={isSaving} />
                        </div>
                    </CardContent>
                    <CardHeader className="p-6 pt-0">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" asChild type="button">
                            <Link href="/invoicing">Cancel</Link>
                        </Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Create Invoice
                        </Button>
                      </div>
                    </CardHeader>
                </form>
            </Card>
        </div>
    );
}
