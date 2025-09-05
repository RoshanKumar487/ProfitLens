
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Receipt, PlusCircle, Save, Loader2, Calendar as CalendarIconLucide, Trash2, Settings, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { type InvoiceSettings } from '@/app/settings/actions';
import { v4 as uuidv4 } from 'uuid';
import { Checkbox } from '@/components/ui/checkbox';
import { MOCK_INVOICE_SETTINGS, MOCK_USER } from '@/lib/mock-data';
import PageTitle from '@/components/PageTitle';

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

export default function NewInvoicePage() {
    const { currencySymbol } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const [currentInvoice, setCurrentInvoice] = useState<Partial<InvoiceDisplay>>({
            status: 'Draft',
            items: [], // Start with an empty array
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
        setCurrentInvoice(prev => ({
            ...prev,
            issuedDate: new Date(),
            dueDate: new Date(new Date().setDate(new Date().getDate() + (invoiceSettings?.defaultPaymentTermsDays || 30))),
            items: [{ id: uuidv4(), description: '', hsnNo: invoiceSettings?.defaultHsnCode || '', quantity: 1, unitPrice: 0, customFields: {} }]
        }));
    }, [invoiceSettings]);

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
            id: uuidv4(), 
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
        if ((currentInvoice.items || []).length <= 1) {
            toast({ title: 'Cannot remove', description: 'You must have at least one item in the invoice.', variant: 'destructive' });
            return;
        }
        setCurrentInvoice(prev => prev ? ({ ...prev, items: (prev.items || []).filter(item => item.id !== itemId) }) : null)
    };

    return (
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
            <PageTitle title="Create New Invoice" subtitle="Fill in the details to generate a new invoice." icon={Receipt}>
                 <Button variant="outline" asChild>
                    <Link href="/invoicing"><ArrowLeft className="mr-2 h-4 w-4"/>Back to Invoices</Link>
                </Button>
                <Button variant="outline" asChild>
                    <Link href="/settings"><Settings className="mr-2 h-4 w-4"/>Settings</Link>
                </Button>
                 <Button onClick={handleFormSubmit} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Create Invoice
                </Button>
            </PageTitle>

            <form onSubmit={handleFormSubmit}>
                <div className="max-w-4xl mx-auto p-8 bg-background rounded-lg shadow-lg border">
                    {/* Header */}
                    <header className="flex justify-between items-start mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-primary">{MOCK_USER.companyName}</h1>
                            <p className="text-muted-foreground text-sm">Invoice</p>
                        </div>
                        <div className="text-right">
                            <Label htmlFor="invoiceNumber" className="text-muted-foreground">Invoice #</Label>
                            <Input id="invoiceNumber" className="text-right font-bold text-lg h-9 w-40 mt-1" value={currentInvoice.invoiceNumber || ''} onChange={(e) => setCurrentInvoice({...currentInvoice, invoiceNumber: e.target.value})} required/>
                        </div>
                    </header>

                    {/* Client & Dates */}
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 border rounded-lg p-6">
                        <div className="space-y-3">
                            <h3 className="font-semibold">Bill To:</h3>
                            <Input placeholder="Client Name" className="font-bold" value={currentInvoice.clientName || ''} onChange={(e) => setCurrentInvoice({...currentInvoice, clientName: e.target.value})} required />
                            <Input placeholder="Client Email" type="email" value={currentInvoice.clientEmail || ''} onChange={(e) => setCurrentInvoice({...currentInvoice, clientEmail: e.target.value})}/>
                            <Input placeholder="Client GSTIN" value={currentInvoice.clientGstin || ''} onChange={(e) => setCurrentInvoice({...currentInvoice, clientGstin: e.target.value})}/>
                            <Textarea placeholder="Client Billing Address" value={currentInvoice.clientAddress || ''} onChange={(e) => setCurrentInvoice({...currentInvoice, clientAddress: e.target.value})} rows={3}/>
                        </div>
                        <div className="space-y-3 md:text-right flex flex-col justify-between">
                            <div className="space-y-1">
                                <Label>Issued Date</Label>
                                <Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left"><CalendarIconLucide className="mr-2 h-4 w-4" />{currentInvoice.issuedDate ? format(currentInvoice.issuedDate, 'PPP') : ''}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={currentInvoice.issuedDate} onSelect={(d) => setCurrentInvoice({...currentInvoice, issuedDate: d!})}/></PopoverContent></Popover>
                            </div>
                            <div className="space-y-1">
                                <Label>Due Date</Label>
                                <Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left"><CalendarIconLucide className="mr-2 h-4 w-4" />{currentInvoice.dueDate ? format(currentInvoice.dueDate, 'PPP') : ''}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={currentInvoice.dueDate} onSelect={(d) => setCurrentInvoice({...currentInvoice, dueDate: d!})}/></PopoverContent></Popover>
                            </div>
                        </div>
                    </section>

                    {/* Items Table */}
                    <section className="mb-8">
                        <div className="w-full">
                            {/* Table Header */}
                            <div className="grid grid-cols-12 gap-2 text-sm font-semibold text-muted-foreground px-2 py-1">
                                <div className="col-span-5">Description</div>
                                <div className="col-span-2 text-right">Quantity</div>
                                <div className="col-span-2 text-right">Price</div>
                                <div className="col-span-2 text-right">Total</div>
                                <div className="col-span-1"></div>
                            </div>
                             {/* Table Body */}
                            <div className="space-y-2">
                            {(currentInvoice.items || []).map((item, index) => (
                                <div key={item.id} className="grid grid-cols-12 gap-2 items-start p-2 rounded-md hover:bg-muted/50">
                                    <div className="col-span-5">
                                        <Input placeholder="Item description" value={item.description} onChange={e => handleItemChange(item.id, 'description', e.target.value)} />
                                        <div className="flex gap-2 mt-1">
                                            <Input placeholder="HSN" className="text-xs h-7" value={item.hsnNo || ''} onChange={e => handleItemChange(item.id, 'hsnNo', e.target.value)} />
                                            {invoiceSettings?.customItemColumns.map(col => (
                                                <Input key={col.id} placeholder={col.label} className="text-xs h-7" value={item.customFields?.[col.id] || ''} onChange={e => handleCustomFieldChange(item.id, col.id, e.target.value)} />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <Input type="number" placeholder="1" className="text-right" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', e.target.value)} />
                                    </div>
                                    <div className="col-span-2">
                                        <Input type="number" placeholder="0.00" className="text-right" value={item.unitPrice} onChange={e => handleItemChange(item.id, 'unitPrice', e.target.value)} />
                                    </div>
                                    <div className="col-span-2 text-right font-medium pr-2 pt-2">
                                        {currencySymbol}{(item.quantity * item.unitPrice).toFixed(2)}
                                    </div>
                                    <div className="col-span-1 flex justify-center items-center pt-1">
                                        <Button type="button" variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => handleRemoveItem(item.id)}><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                            ))}
                            </div>
                        </div>
                        <Button type="button" className="mt-2" variant="outline" onClick={handleAddItem}><PlusCircle className="mr-2 h-4 w-4"/>Add Item</Button>
                    </section>

                    {/* Footer */}
                    <footer className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t">
                        <div className="space-y-2">
                            <Label>Notes / Terms</Label>
                            <Textarea placeholder="Thank you for your business." value={currentInvoice.notes || ''} onChange={(e) => setCurrentInvoice({...currentInvoice, notes: e.target.value})} />
                        </div>
                        <div className="space-y-3">
                             <div className="flex justify-between items-center"><span className="text-muted-foreground">Subtotal</span><span className="font-medium">{currencySymbol}{(currentInvoice.subtotal || 0).toFixed(2)}</span></div>
                             <div className="flex justify-between items-center">
                                 <div className="flex items-center gap-2">
                                     <Select value={currentInvoice.discountType || 'fixed'} onValueChange={(v: DiscountType) => setCurrentInvoice({...currentInvoice, discountType: v})}>
                                        <SelectTrigger className="w-28 h-8"><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="fixed">Fixed ({currencySymbol})</SelectItem>
                                            <SelectItem value="percentage">%</SelectItem>
                                        </SelectContent>
                                     </Select>
                                      <Input type="number" className="w-24 h-8" value={currentInvoice.discountValue || 0} onChange={(e) => setCurrentInvoice({...currentInvoice, discountValue: parseFloat(e.target.value) || 0})} />
                                 </div>
                                 <span className="font-medium text-destructive">- {currencySymbol}{(currentInvoice.discountAmount || 0).toFixed(2)}</span>
                             </div>
                             <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                    <Label>Tax Rate</Label>
                                    <Input type="number" className="w-20 h-8" value={currentInvoice.taxRate || 0} onChange={(e) => setCurrentInvoice({...currentInvoice, taxRate: parseFloat(e.target.value) || 0})} disabled={currentInvoice.isRcmApplicable} />
                                    <span className="text-muted-foreground text-sm">%</span>
                                    <div className="flex items-center space-x-2 pl-4"><Checkbox id="rcm" checked={currentInvoice.isRcmApplicable} onCheckedChange={(checked) => setCurrentInvoice({...currentInvoice, isRcmApplicable: !!checked})} /><Label htmlFor="rcm" className="text-sm font-medium">RCM</Label></div>
                                  </div>
                                 <span className="font-medium">{currentInvoice.isRcmApplicable ? "N/A" : `+ ${currencySymbol}${(currentInvoice.taxAmount || 0).toFixed(2)}`}</span>
                             </div>
                             <Separator className="my-2" />
                             <div className="flex justify-between items-center text-xl font-bold text-primary"><span >Grand Total</span><span>{currencySymbol}{(currentInvoice.amount || 0).toFixed(2)}</span></div>
                        </div>
                    </footer>
                </div>
            </form>
        </div>
    );
}
