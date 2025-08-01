
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Receipt, PlusCircle, Save, Loader2, Calendar as CalendarIconLucide, Trash2, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { type InvoiceSettings, type CustomItemColumn } from '@/app/settings/actions';
import { v4 as uuidv4 } from 'uuid';
import { Checkbox } from '@/components/ui/checkbox';


interface InvoiceItem {
  id: string;
  description: string;
  hsnNo?: string;
  quantity: number;
  unitPrice: number;
  customFields?: { [key: string]: string };
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
  isRcmApplicable: boolean;
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

const MOCK_INVOICE_SETTINGS: InvoiceSettings = {
    customItemColumns: [{id: 'col1', label: 'S/N'}],
    defaultHsnCode: '',
    defaultNotes: 'Thank you for your business. Please make the payment by the due date.',
    defaultPaymentTermsDays: 30
};

export default function NewInvoicePage() {
    const { currencySymbol } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const [currentInvoice, setCurrentInvoice] = useState<Partial<InvoiceDisplay>>({
            issuedDate: new Date(),
            dueDate: new Date(new Date().setDate(new Date().getDate() + 30)),
            status: 'Draft',
            items: [{ id: crypto.randomUUID(), description: '', hsnNo: '', quantity: 1, unitPrice: 0, customFields: {} }],
            invoiceNumber: `INV${(Date.now()).toString().slice(-6)}`,
            clientName: '',
            notes: MOCK_INVOICE_SETTINGS.defaultNotes,
            discountType: 'fixed',
            discountValue: 0,
            taxRate: 0,
            isRcmApplicable: false,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [invoiceSettings] = useState<InvoiceSettings | null>(MOCK_INVOICE_SETTINGS);
    
    useEffect(() => {
        if (!currentInvoice) return;
        const subtotal = (currentInvoice.items || []).reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0);
        const discountValue = parseFloat(String(currentInvoice.discountValue) || '0');
        let discountAmount = 0;
        if (currentInvoice.discountType === 'percentage') {
            discountAmount = subtotal * (discountValue / 100);
        } else {
            discountAmount = discountValue;
        }
        
        const taxRate = currentInvoice.isRcmApplicable ? 0 : parseFloat(String(currentInvoice.taxRate) || '0');
        const taxableAmount = subtotal - discountAmount;
        const taxAmount = taxableAmount * (taxRate / 100);
        const total = taxableAmount + taxAmount;

        setCurrentInvoice(prev => prev ? ({ 
            ...prev, 
            subtotal: isNaN(subtotal) ? 0 : subtotal,
            discountAmount: isNaN(discountAmount) ? 0 : discountAmount,
            taxAmount: isNaN(taxAmount) ? 0 : taxAmount,
            amount: isNaN(total) ? 0 : total,
        }) : null);
    }, [currentInvoice?.items, currentInvoice?.discountType, currentInvoice?.discountValue, currentInvoice?.taxRate, currentInvoice?.isRcmApplicable]);


    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        toast({ title: "Action Disabled", description: "Cannot create new invoices in this demo.", variant: "destructive" });
    };
    
    const handleAddItem = () => {
        const newItem: InvoiceItem = { 
            id: crypto.randomUUID(), 
            description: '', 
            hsnNo: invoiceSettings?.defaultHsnCode || '', 
            quantity: 1, 
            unitPrice: 0, 
            customFields: {} 
        };
        setCurrentInvoice(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
    };

    const handleItemChange = (itemId: string, field: keyof Omit<InvoiceItem, 'id' | 'customFields'>, value: string | number) => {
        setCurrentInvoice(prev => prev ? ({
            ...prev,
            items: (prev.items || []).map(item =>
                item.id === itemId ? { ...item, [field]: typeof value === 'string' && (field === 'quantity' || field === 'unitPrice') ? parseFloat(value) || 0 : value } : item
            )
        }) : null);
    };
    
    const handleCustomFieldChange = (itemId: string, fieldId: string, value: string) => {
        setCurrentInvoice(prev => {
            if (!prev) return null;
            const newItems = (prev.items || []).map(item => {
                if (item.id === itemId) {
                    return {
                        ...item,
                        customFields: {
                            ...(item.customFields || {}),
                            [fieldId]: value,
                        },
                    };
                }
                return item;
            });
            return { ...prev, items: newItems };
        });
    };

    const handleRemoveItem = (itemId: string) => {
        setCurrentInvoice(prev => prev ? ({ ...prev, items: (prev.items || []).filter(item => item.id !== itemId) }) : null)
    };

    return (
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
            <PageTitle title="Create New Invoice" subtitle="Fill in the details to generate a new invoice." icon={Receipt}>
                <Button variant="outline" asChild>
                    <Link href="/settings"><Settings className="mr-2 h-4 w-4"/>Settings</Link>
                </Button>
            </PageTitle>

            <form onSubmit={handleFormSubmit}>
                <Card className="max-w-4xl mx-auto shadow-lg">
                    <CardHeader>
                        <CardTitle>Client & Invoice Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><Label htmlFor="clientName">Client Name</Label><Input id="clientName" value={currentInvoice.clientName || ''} onChange={(e) => setCurrentInvoice({...currentInvoice, clientName: e.target.value})} required/></div>
                            <div><Label htmlFor="invoiceNumber">Invoice Number</Label><Input id="invoiceNumber" value={currentInvoice.invoiceNumber || ''} onChange={(e) => setCurrentInvoice({...currentInvoice, invoiceNumber: e.target.value})} required/></div>
                        </div>
                        <div><Label htmlFor="clientEmail">Client Email</Label><Input id="clientEmail" type="email" value={currentInvoice.clientEmail || ''} onChange={(e) => setCurrentInvoice({...currentInvoice, clientEmail: e.target.value})}/></div>
                        <div><Label htmlFor="clientGstin">Client GSTIN</Label><Input id="clientGstin" value={currentInvoice.clientGstin || ''} onChange={(e) => setCurrentInvoice({...currentInvoice, clientGstin: e.target.value})}/></div>
                        <div><Label htmlFor="clientAddress">Billing Address</Label><Textarea id="clientAddress" value={currentInvoice.clientAddress || ''} onChange={(e) => setCurrentInvoice({...currentInvoice, clientAddress: e.target.value})} rows={3}/></div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><Label>Issued Date</Label><Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start"><CalendarIconLucide className="mr-2 h-4 w-4" />{currentInvoice.issuedDate ? format(currentInvoice.issuedDate, 'PPP') : ''}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={currentInvoice.issuedDate} onSelect={(d) => setCurrentInvoice({...currentInvoice, issuedDate: d!})}/></PopoverContent></Popover></div>
                            <div><Label>Due Date</Label><Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start"><CalendarIconLucide className="mr-2 h-4 w-4" />{currentInvoice.dueDate ? format(currentInvoice.dueDate, 'PPP') : ''}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={currentInvoice.dueDate} onSelect={(d) => setCurrentInvoice({...currentInvoice, dueDate: d!})}/></PopoverContent></Popover></div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="max-w-4xl mx-auto shadow-lg mt-6">
                    <CardHeader><CardTitle>Invoice Items</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        {(currentInvoice.items || []).map((item) => (
                            <div key={item.id} className="p-3 border rounded-md bg-muted/30 space-y-3">
                                <div className="flex justify-between items-start gap-2">
                                    <div className="flex-grow space-y-1"><Label htmlFor={`item-desc-${item.id}`}>Description</Label><Input id={`item-desc-${item.id}`} value={item.description} onChange={e => handleItemChange(item.id, 'description', e.target.value)} /></div>
                                    <Button type="button" variant="ghost" size="icon" className="text-destructive h-8 w-8 mt-6" onClick={() => handleRemoveItem(item.id)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    <div className="space-y-1"><Label htmlFor={`item-qty-${item.id}`}>Qty</Label><Input id={`item-qty-${item.id}`} type="number" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', e.target.value)} /></div>
                                    <div className="space-y-1"><Label htmlFor={`item-price-${item.id}`}>Unit Price</Label><Input id={`item-price-${item.id}`} type="number" value={item.unitPrice} onChange={e => handleItemChange(item.id, 'unitPrice', e.target.value)} /></div>
                                    <div className="space-y-1"><Label htmlFor={`item-hsn-${item.id}`}>HSN No.</Label><Input id={`item-hsn-${item.id}`} value={item.hsnNo || ''} onChange={e => handleItemChange(item.id, 'hsnNo', e.target.value)} /></div>
                                    {invoiceSettings?.customItemColumns.map(col => (
                                        <div key={col.id} className="space-y-1"><Label htmlFor={`item-custom-${item.id}-${col.id}`}>{col.label}</Label><Input id={`item-custom-${item.id}-${col.id}`} value={item.customFields?.[col.id] || ''} onChange={e => handleCustomFieldChange(item.id, col.id, e.target.value)} /></div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        <Button type="button" className="w-full" variant="outline" onClick={handleAddItem}><PlusCircle className="mr-2 h-4 w-4"/>Add Item</Button>
                    </CardContent>
                </Card>

                <Card className="max-w-4xl mx-auto shadow-lg mt-6">
                    <CardHeader><CardTitle>Summary & Terms</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-2 items-end">
                                    <div><Label>Discount Type</Label><Select value={currentInvoice.discountType || 'fixed'} onValueChange={(v: DiscountType) => setCurrentInvoice({...currentInvoice, discountType: v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="fixed">Fixed ({currencySymbol})</SelectItem><SelectItem value="percentage">Percentage (%)</SelectItem></SelectContent></Select></div>
                                    <div><Label>Discount Value</Label><Input type="number" value={currentInvoice.discountValue || 0} onChange={(e) => setCurrentInvoice({...currentInvoice, discountValue: parseFloat(e.target.value) || 0})} /></div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1"><Label>Tax Rate (%)</Label><Input type="number" value={currentInvoice.taxRate || 0} onChange={(e) => setCurrentInvoice({...currentInvoice, taxRate: parseFloat(e.target.value) || 0})} disabled={currentInvoice.isRcmApplicable} /></div>
                                    <div className="flex items-center space-x-2 pt-6"><Checkbox id="rcm" checked={currentInvoice.isRcmApplicable} onCheckedChange={(checked) => setCurrentInvoice({...currentInvoice, isRcmApplicable: !!checked})} /><Label htmlFor="rcm" className="text-sm font-medium">RCM</Label></div>
                                </div>
                            </div>
                            <div className="space-y-2 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                                <h4 className="font-medium text-center mb-2">Summary</h4>
                                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal:</span><span className="font-medium">{currencySymbol}{(currentInvoice.subtotal || 0).toFixed(2)}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Discount:</span><span className="font-medium text-destructive">- {currencySymbol}{(currentInvoice.discountAmount || 0).toFixed(2)}</span></div>
                                {currentInvoice.isRcmApplicable ? (<div className="flex justify-between text-sm"><span className="text-muted-foreground">Tax:</span><span className="font-medium">RCM Applicable</span></div>) : (<div className="flex justify-between text-sm"><span className="text-muted-foreground">Tax ({currentInvoice.taxRate || 0}%):</span><span className="font-medium text-chart-2">+ {currencySymbol}{(currentInvoice.taxAmount || 0).toFixed(2)}</span></div>)}
                                <Separator className="my-2" />
                                <div className="flex justify-between text-lg font-bold"><span>Grand Total:</span><span>{currencySymbol}{(currentInvoice.amount || 0).toFixed(2)}</span></div>
                            </div>
                        </div>
                        <div><Label>Notes / Terms</Label><Textarea value={currentInvoice.notes || ''} onChange={(e) => setCurrentInvoice({...currentInvoice, notes: e.target.value})} /></div>
                    </CardContent>
                    <CardHeader className="p-6 pt-0 flex-row justify-end gap-2">
                        <Button variant="outline" asChild type="button"><Link href="/invoicing">Cancel</Link></Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Create Invoice
                        </Button>
                    </CardHeader>
                </Card>
            </form>
        </div>
    );
}
