'use client';

import React, { useState, useEffect, type FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Receipt, Save, Loader2, Calendar as CalendarIconLucide, Trash2, Eye, PlusCircle } from 'lucide-react';
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
import { updateInvoice } from '../actions';
import { Skeleton } from '@/components/ui/skeleton';
import { getInvoiceSettings, type InvoiceSettings } from '@/app/settings/actions';

interface InvoiceItem {
  id: string;
  description: string;
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
  amount: number;
  dueDate: Date;
  status: 'Paid' | 'Pending' | 'Overdue' | 'Draft';
  issuedDate: Date;
  items: InvoiceItem[];
  notes?: string;
}

export default function EditInvoicePage() {
    const { user, currencySymbol, isLoading: authLoading } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const params = useParams();
    const invoiceId = params.id as string;

    const [invoice, setInvoice] = useState<InvoiceDisplay | null>(null);
    const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (authLoading) return;
        if (!user || !invoiceId) {
            router.push('/auth/signin');
            return;
        }

        const fetchInvoice = async () => {
            setIsLoading(true);
            try {
                const [settings, invoiceSnap] = await Promise.all([
                    getInvoiceSettings(user.companyId!),
                    getDoc(doc(db, 'invoices', invoiceId))
                ]);
                
                setInvoiceSettings(settings);

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

            } catch (error) {
                toast({ title: "Error", description: "Failed to load invoice data.", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };

        fetchInvoice();
    }, [invoiceId, user, authLoading, router, toast]);

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
        const newItem: InvoiceItem = { id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0, customFields: {} };
        setInvoice(prev => prev ? ({ ...prev, items: [...(prev.items || []), newItem] }) : null);
    };

    const handleItemChange = (itemId: string, field: keyof Omit<InvoiceItem, 'customFields'>, value: string | number) => {
        setInvoice(prev => prev ? ({
            ...prev,
            items: (prev.items || []).map(item =>
                item.id === itemId ? { ...item, [field]: typeof value === 'string' && (field === 'quantity' || field === 'unitPrice') ? parseFloat(value) || 0 : value } : item
            )
        }) : null);
    };

    const handleCustomFieldChange = (itemId: string, fieldId: string, value: string) => {
        setInvoice(prev => {
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
        setInvoice(prev => prev ? ({ ...prev, items: (prev.items || []).filter(item => item.id !== itemId) }) : null);
    };
    
    const handleValueChange = (field: keyof Omit<InvoiceDisplay, 'items'>, value: any) => {
        setInvoice(prev => prev ? ({ ...prev, [field]: value }) : null);
    };


    if (isLoading || authLoading || !invoice) {
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
            <PageTitle title={`Edit Invoice ${invoice.invoiceNumber}`} subtitle={`Editing invoice for ${invoice.clientName}`} icon={Receipt}>
                <Button variant="outline" asChild>
                    <Link href={`/invoicing/${invoice.id}/view`}>
                        <Eye className="mr-2 h-4 w-4" /> View & Print
                    </Link>
                </Button>
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
                            <Input id="clientEmail" type="email" value={invoice.clientEmail || ''} onChange={(e) => handleValueChange('clientEmail', e.target.value)} disabled={isSaving}/>
                        </div>
                        <div>
                            <Label htmlFor="clientGstin">Client GSTIN</Label>
                            <Input id="clientGstin" value={invoice.clientGstin || ''} onChange={(e) => handleValueChange('clientGstin', e.target.value)} disabled={isSaving} />
                        </div>
                        <div>
                            <Label htmlFor="clientAddress">Client Address</Label>
                            <Textarea id="clientAddress" value={invoice.clientAddress || ''} onChange={(e) => handleValueChange('clientAddress', e.target.value)} disabled={isSaving} rows={3} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <Label>Issued Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild><Button variant="outline" className="w-full justify-start"><CalendarIconLucide className="mr-2 h-4 w-4" />{invoice.issuedDate ? format(invoice.issuedDate, 'PPP') : 'Pick a date'}</Button></PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={invoice.issuedDate} onSelect={(d) => handleValueChange('issuedDate', d)}/></PopoverContent>
                                </Popover>
                            </div>
                            <div>
                                <Label>Due Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild><Button variant="outline" className="w-full justify-start"><CalendarIconLucide className="mr-2 h-4 w-4" />{invoice.dueDate ? format(invoice.dueDate, 'PPP') : 'Pick a date'}</Button></PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={invoice.dueDate} onSelect={(d) => handleValueChange('dueDate', d)}/></PopoverContent>
                                </Popover>
                            </div>
                            <div>
                                <Label>Status</Label>
                                <Select value={invoice.status} onValueChange={(v: InvoiceDisplay['status']) => handleValueChange('status', v)}>
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
                                <div key={item.id} className="p-3 border rounded-md bg-muted/30 space-y-3">
                                    <div className="grid grid-cols-[1fr,auto,auto,auto] sm:grid-cols-[2fr_1fr_1fr_auto] items-end gap-2">
                                        <div className="space-y-1"><Label htmlFor={`item-desc-${item.id}`} className="text-xs">Description</Label><Input id={`item-desc-${item.id}`} value={item.description} onChange={e => handleItemChange(item.id, 'description', e.target.value)} disabled={isSaving} /></div>
                                        <div className="space-y-1"><Label htmlFor={`item-qty-${item.id}`} className="text-xs">Qty</Label><Input id={`item-qty-${item.id}`} type="number" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', e.target.value)} disabled={isSaving} className="w-20" /></div>
                                        <div className="space-y-1"><Label htmlFor={`item-price-${item.id}`} className="text-xs">Unit Price</Label><Input id={`item-price-${item.id}`} type="number" value={item.unitPrice} onChange={e => handleItemChange(item.id, 'unitPrice', e.target.value)} disabled={isSaving} className="w-24"/></div>
                                        <Button type="button" variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => handleRemoveItem(item.id)} disabled={isSaving}><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                        {invoiceSettings?.customItemColumns.map(col => (
                                            <div key={col.id} className="space-y-1">
                                                <Label htmlFor={`item-custom-${item.id}-${col.id}`} className="text-xs">{col.label}</Label>
                                                <Input 
                                                    id={`item-custom-${item.id}-${col.id}`}
                                                    value={item.customFields?.[col.id] || ''}
                                                    onChange={e => handleCustomFieldChange(item.id, col.id, e.target.value)}
                                                    disabled={isSaving}
                                                />
                                            </div>
                                        ))}
                                    </div>
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

                        <div><Label>Notes / Terms</Label><Textarea value={invoice.notes || ''} onChange={(e) => handleValueChange('notes', e.target.value)} /></div>

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
        </div>
    );
}
