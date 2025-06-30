
'use client';

import React, { useState, useMemo, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Receipt, PlusCircle, UserPlus, Save, Loader2, Calendar as CalendarIconLucide, Trash2, ArrowLeft, Settings } from 'lucide-react';
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
import { collection, getDocs, query, where, orderBy, Timestamp, getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { createInvoice } from '../actions';
import { getInvoiceSettings, saveInvoiceSettings, type InvoiceSettings, type CustomItemColumn } from '@/app/settings/actions';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { v4 as uuidv4 } from 'uuid';


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
}

const LOCAL_STORAGE_TAX_RATE_KEY = 'profitlens-invoice-tax-rate-v1';
const LOCAL_STORAGE_DISCOUNT_TYPE_KEY = 'profitlens-invoice-discount-type-v1';
const LOCAL_STORAGE_DISCOUNT_VALUE_KEY = 'profitlens-invoice-discount-value-v1';


export default function NewInvoicePage() {
    const { user, currencySymbol } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const [companyDetails, setCompanyDetails] = useState<CompanyDetailsFirestore | null>(null);
    const [currentInvoice, setCurrentInvoice] = useState<Partial<InvoiceDisplay>>({
            issuedDate: new Date(),
            dueDate: new Date(new Date().setDate(new Date().getDate() + 30)),
            status: 'Draft',
            items: [{ id: crypto.randomUUID(), description: '', hsnNo: '', quantity: 1, unitPrice: 0, customFields: {} }],
            invoiceNumber: `INV${(Date.now()).toString().slice(-6)}`,
            clientName: '',
            clientEmail: '',
            clientAddress: '',
            clientGstin: '',
            notes: 'Thank you for your business. Please make the payment by the due date.',
            subtotal: 0,
            discountType: 'fixed',
            discountValue: 0,
            discountAmount: 0,
            taxRate: 0,
            taxAmount: 0,
            amount: 0,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [existingClients, setExistingClients] = useState<ExistingClient[]>([]);
    const [isClientSuggestionsVisible, setIsClientSuggestionsVisible] = useState(false);
    const [invoices, setInvoices] = useState<InvoiceDisplay[]>([]);
    const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
    const [tempSettings, setTempSettings] = useState<InvoiceSettings>({ customItemColumns: [] });
    const [newColumnName, setNewColumnName] = useState('');


    useEffect(() => {
        const savedTaxRate = parseFloat(localStorage.getItem(LOCAL_STORAGE_TAX_RATE_KEY) || '0');
        const savedDiscountType = (localStorage.getItem(LOCAL_STORAGE_DISCOUNT_TYPE_KEY) as DiscountType) || 'fixed';
        const savedDiscountValue = parseFloat(localStorage.getItem(LOCAL_STORAGE_DISCOUNT_VALUE_KEY) || '0');

        setCurrentInvoice(prev => ({
            ...prev,
            taxRate: savedTaxRate,
            discountType: savedDiscountType,
            discountValue: savedDiscountValue,
        }));
    }, []);
    
    useEffect(() => {
        if (!user || !user.companyId) return;

        const fetchInitialData = async () => {
            setIsLoading(true);
            const companyId = user.companyId;

            const invoicesColRef = collection(db, 'invoices');
            const qInvoices = query(invoicesColRef, where('companyId', '==', companyId), orderBy('createdAt', 'desc'));
            const companyDocRef = doc(db, 'companyProfiles', companyId);
            
            try {
                const [invoiceSnapshot, settings, companySnap] = await Promise.all([
                    getDocs(qInvoices),
                    getInvoiceSettings(companyId),
                    getDoc(companyDocRef)
                ]);

                if(companySnap.exists()) {
                  setCompanyDetails(companySnap.data() as CompanyDetailsFirestore);
                }

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
                setInvoiceSettings(settings);
                setTempSettings(settings);
            } catch (e) {
                toast({ title: "Error", description: "Could not load initial invoicing data." });
            } finally {
                setIsLoading(false);
            }
        };

        fetchInitialData();
    }, [user, toast]);

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
            toast({ title: "Authentication Error", variant: "destructive" });
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
        
        const invoiceDataForAction = {
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
            issuedDate: currentInvoice.issuedDate,
            dueDate: currentInvoice.dueDate,
            status: currentInvoice.status || 'Draft',
            items: currentInvoice.items || [],
            notes: currentInvoice.notes || '',
            invoiceNumber: currentInvoice.invoiceNumber || `INV${(Date.now()).toString().slice(-6)}`,
        };

        const result = await createInvoice(invoiceDataForAction, user.companyId, user.uid, user.displayName || user.email!);

        if (result.success) {
            toast({ title: "Invoice Created", description: result.message });
            localStorage.setItem(LOCAL_STORAGE_TAX_RATE_KEY, String(currentInvoice.taxRate || '0'));
            localStorage.setItem(LOCAL_STORAGE_DISCOUNT_TYPE_KEY, currentInvoice.discountType || 'fixed');
            localStorage.setItem(LOCAL_STORAGE_DISCOUNT_VALUE_KEY, String(currentInvoice.discountValue || '0'));
            router.push('/invoicing');
        } else {
            toast({ title: "Save Failed", description: result.message, variant: "destructive" });
        }
        setIsSaving(false);
    };
    
    const handleAddItem = () => {
        const newItem: InvoiceItem = { id: crypto.randomUUID(), description: '', hsnNo: '', quantity: 1, unitPrice: 0, customFields: {} };
        setCurrentInvoice(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
    };

    const handleItemChange = (itemId: string, field: keyof Omit<InvoiceItem, 'id' | 'customFields'>, value: string | number) => {
        setCurrentInvoice(prev => ({
            ...prev,
            items: (prev.items || []).map(item =>
                item.id === itemId ? { ...item, [field]: typeof value === 'string' && (field === 'quantity' || field === 'unitPrice') ? parseFloat(value) || 0 : value } : item
            )
        }));
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
          const newItems = (mostRecentInvoice.items || []).map(item => ({...item, id: crypto.randomUUID()}));
          setCurrentInvoice({
            ...currentInvoice,
            ...mostRecentInvoice,
            items: newItems,
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
    
    const filteredClientSuggestions = useMemo(() => {
        const currentName = currentInvoice.clientName?.toLowerCase() || '';
        if (!currentName) return [];
        return existingClients.filter(client => client.name.toLowerCase().includes(currentName));
    }, [currentInvoice.clientName, existingClients]);
        
    const fullCompanyAddress = companyDetails ? [
        companyDetails.address,
        companyDetails.city,
        companyDetails.state,
        companyDetails.country
    ].filter(Boolean).join('\\n') : '';

    // Settings Dialog Logic
    const handleAddColumn = () => {
        if (!newColumnName.trim()) return;
        const newColumn: CustomItemColumn = { id: uuidv4(), label: newColumnName.trim() };
        setTempSettings(prev => ({ ...prev, customItemColumns: [...prev.customItemColumns, newColumn] }));
        setNewColumnName('');
    };

    const handleSettingsColumnLabelChange = (id: string, newLabel: string) => {
        setTempSettings(prev => ({
            ...prev,
            customItemColumns: prev.customItemColumns.map(col => col.id === id ? { ...col, label: newLabel } : col)
        }));
    };

    const handleDeleteColumn = (id: string) => {
        setTempSettings(prev => ({
            ...prev,
            customItemColumns: prev.customItemColumns.filter(col => col.id !== id)
        }));
    };

    const handleSaveSettings = async () => {
        if (!user || !user.companyId) return;
        setIsSaving(true);
        const result = await saveInvoiceSettings(user.companyId, tempSettings);
        if (result.success) {
            setInvoiceSettings(tempSettings);
            toast({ title: 'Settings Saved' });
            setIsSettingsDialogOpen(false);
        } else {
            toast({ title: 'Error', description: result.message, variant: 'destructive' });
        }
        setIsSaving(false);
    };


    return (
        <div className="bg-muted">
            <header className="bg-background/80 border-b shadow-sm sticky top-14 sm:top-16 z-20 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto flex justify-between items-center px-4 py-2">
                    <div className="flex items-center gap-2">
                        <Receipt className="h-5 w-5 text-primary" />
                        <h1 className="text-lg font-bold truncate">Create New Invoice</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" asChild type="button">
                            <Link href="/invoicing">Cancel</Link>
                        </Button>
                        <Button onClick={handleFormSubmit} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Create Invoice
                        </Button>
                    </div>
                </div>
            </header>

            <main className="p-4 sm:p-8">
                {isLoading ? (
                    <div className="bg-white shadow-lg mx-auto w-[210mm] min-h-[297mm] p-8 flex items-center justify-center">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                ) : (
                <div className="bg-white text-gray-800 font-sans text-xs w-[210mm] min-h-[297mm] mx-auto flex flex-col p-8 shadow-2xl">
                    <form onSubmit={handleFormSubmit}>
                        <header className="flex justify-between items-start mb-4">
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">{companyDetails?.name || 'Your Company Name'}</h1>
                                <p className="whitespace-pre-line text-xs text-gray-600">{fullCompanyAddress || 'Your Company Address'}</p>
                            </div>
                            <div className="text-right">
                                <h2 className="text-4xl font-light text-gray-700 tracking-widest">INVOICE</h2>
                            </div>
                        </header>

                        <section className="flex border-y-2 border-gray-900">
                            <div className="w-7/12 border-r border-gray-900 p-2">
                                <table className="text-xs w-full">
                                    <tbody>
                                        <tr>
                                            <td className="font-bold py-1 pr-4">Invoice#</td>
                                            <td className="font-bold py-1"><Input className="h-6 text-xs p-1" value={currentInvoice.invoiceNumber || ''} onChange={(e) => setCurrentInvoice({...currentInvoice, invoiceNumber: e.target.value})} required/></td>
                                        </tr>
                                        <tr>
                                            <td className="font-bold py-1 pr-4">Invoice Date</td>
                                            <td className="py-1">
                                                <Popover>
                                                    <PopoverTrigger asChild><Button variant="link" className="h-6 p-1 text-xs">{format(currentInvoice.issuedDate!, 'dd MMM yyyy')}</Button></PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={currentInvoice.issuedDate} onSelect={(date) => setCurrentInvoice({...currentInvoice, issuedDate: date!})}/></PopoverContent>
                                                </Popover>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="font-bold py-1 pr-4">Terms</td>
                                            <td className="py-1">Due on Receipt</td>
                                        </tr>
                                         <tr>
                                            <td className="font-bold py-1 pr-4">Due Date</td>
                                            <td className="py-1">
                                                <Popover>
                                                    <PopoverTrigger asChild><Button variant="link" className="h-6 p-1 text-xs">{format(currentInvoice.dueDate!, 'dd MMM yyyy')}</Button></PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={currentInvoice.dueDate} onSelect={(date) => setCurrentInvoice({...currentInvoice, dueDate: date!})}/></PopoverContent>
                                                </Popover>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div className="w-5/12 p-2 relative">
                                <h3 className="text-xs text-gray-600 font-bold mb-1">Bill To</h3>
                                <div className="relative">
                                    <Input 
                                        className="font-bold text-xl h-8 p-1 mb-1" 
                                        placeholder="Client Name" 
                                        value={currentInvoice.clientName || ''} 
                                        onChange={handleClientNameInputChange}
                                        onFocus={() => setIsClientSuggestionsVisible(true)}
                                        onBlur={() => setTimeout(() => setIsClientSuggestionsVisible(false), 200)}
                                        autoComplete="off"
                                        required
                                    />
                                    {isClientSuggestionsVisible && filteredClientSuggestions.length > 0 && (
                                        <div className="absolute z-10 w-full mt-1 shadow-lg max-h-40 overflow-y-auto bg-white border rounded-md">
                                            {filteredClientSuggestions.map((client, idx) => (
                                                <div key={idx} onMouseDown={() => handleClientSuggestionClick(client)} className="p-2 text-sm hover:bg-accent cursor-pointer">
                                                    {client.name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <Textarea 
                                    className="whitespace-pre-line text-xs p-1 h-16 leading-tight" 
                                    placeholder="Client Address" 
                                    value={currentInvoice.clientAddress || ''} 
                                    onChange={(e) => setCurrentInvoice({...currentInvoice, clientAddress: e.target.value})}
                                />
                                <Input 
                                    className="text-xs h-6 p-1 mt-1" 
                                    placeholder="Client GSTIN" 
                                    value={currentInvoice.clientGstin || ''} 
                                    onChange={(e) => setCurrentInvoice({...currentInvoice, clientGstin: e.target.value})}
                                />
                            </div>
                        </section>

                        <main className="flex-grow mt-4">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="bg-[#0A2B58] text-white">
                                        <th className="p-1 w-8 text-center font-normal">#</th>
                                        <th className="p-1 font-normal flex items-center gap-1">
                                            Item & Description
                                            <Button type="button" size="icon" variant="ghost" className="h-5 w-5 text-white/80 hover:text-white hover:bg-white/20" onClick={() => { setTempSettings(invoiceSettings || { customItemColumns: [] }); setIsSettingsDialogOpen(true); }}>
                                                <PlusCircle className="h-3 w-3" />
                                            </Button>
                                        </th>
                                        <th className="p-1 w-24 font-normal">HSN No.</th>
                                        {invoiceSettings?.customItemColumns.map(col => (
                                            <th key={col.id} className="p-1 w-24 font-normal text-right">{col.label}</th>
                                        ))}
                                        <th className="p-1 w-16 text-right font-normal">Qty</th>
                                        <th className="p-1 w-20 text-right font-normal">Rate</th>
                                        <th className="p-1 w-24 text-right font-normal">Amount</th>
                                        <th className="p-1 w-8 text-center font-normal"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(currentInvoice.items || []).map((item, index) => (
                                        <tr key={item.id} className="border-b align-top">
                                            <td className="p-1 text-center">{index + 1}</td>
                                            <td className="p-1">
                                                <Textarea 
                                                  className="p-1 h-10 text-xs resize-none hover:h-20 focus:h-20 transition-all duration-200" 
                                                  placeholder="Item Description" 
                                                  value={item.description} 
                                                  onChange={e => handleItemChange(item.id, 'description', e.target.value)} 
                                                />
                                            </td>
                                            <td className="p-1 align-top"><Input className="h-10 text-xs p-1" placeholder="HSN" value={item.hsnNo || ''} onChange={e => handleItemChange(item.id, 'hsnNo', e.target.value)} /></td>
                                            {invoiceSettings?.customItemColumns.map(col => (
                                                <td key={col.id} className="p-1 align-top">
                                                    <Input className="h-10 text-xs p-1 text-right" value={item.customFields?.[col.id] || ''} onChange={e => handleCustomFieldChange(item.id, col.id, e.target.value)} />
                                                </td>
                                            ))}
                                            <td className="p-1 align-top"><Input className="h-10 text-xs p-1 text-right" type="number" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', e.target.value)} /></td>
                                            <td className="p-1 align-top"><Input className="h-10 text-xs p-1 text-right" type="number" value={item.unitPrice} onChange={e => handleItemChange(item.id, 'unitPrice', e.target.value)} /></td>
                                            <td className="p-1 text-right">{currencySymbol}{(item.quantity * item.unitPrice).toFixed(2)}</td>
                                            <td className="p-1 text-center"><Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleRemoveItem(item.id)}><Trash2 className="h-3 w-3"/></Button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <Button type="button" size="sm" variant="outline" className="mt-2" onClick={handleAddItem}><PlusCircle className="mr-2 h-4 w-4"/>Add Item</Button>
                        </main>
                        
                        <footer className="mt-auto pt-4">
                             <div className="flex justify-end mb-2">
                                <div className="w-1/3">
                                    <div className="flex justify-between py-1 border-b">
                                        <span>Sub Total</span>
                                        <span className="text-right">{currencySymbol}{(currentInvoice.subtotal || 0).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-between items-start">
                                <div className="w-1/2 text-xs">
                                    <p className="font-bold">Terms & Conditions</p>
                                    <Textarea className="p-1 h-16 text-xs" value={currentInvoice.notes || ''} onChange={(e) => setCurrentInvoice({...currentInvoice, notes: e.target.value})} />
                                </div>
                                <div className="w-1/3">
                                    <table className="w-full text-sm font-bold">
                                        <tbody>
                                            <tr className="text-black">
                                                <td className="p-2">
                                                    <Select value={currentInvoice.discountType || 'fixed'} onValueChange={(v: DiscountType) => setCurrentInvoice({...currentInvoice, discountType: v})}><SelectTrigger className="h-7 text-xs"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="fixed">Discount ({currencySymbol})</SelectItem><SelectItem value="percentage">Discount (%)</SelectItem></SelectContent></Select>
                                                </td>
                                                <td className="p-2 text-right"><Input className="h-7 text-xs text-right p-1" type="number" value={currentInvoice.discountValue || 0} onChange={e => setCurrentInvoice({...currentInvoice, discountValue: parseFloat(e.target.value) || 0})} /></td>
                                            </tr>
                                            <tr className="bg-[#EBF4FF] text-black">
                                                <td className="p-2"><Input className="h-7 text-xs p-1 bg-transparent border-0" value={`Tax Rate (%)`} readOnly/></td>
                                                <td className="p-2 text-right"><Input className="h-7 text-xs text-right p-1" type="number" value={currentInvoice.taxRate || 0} onChange={e => setCurrentInvoice({...currentInvoice, taxRate: parseFloat(e.target.value) || 0})} /></td>
                                            </tr>
                                            <tr className="bg-[#EBF4FF] text-black">
                                                <td className="p-2">Total</td>
                                                <td className="p-2 text-right">{currencySymbol}{(currentInvoice.amount || 0).toFixed(2)}</td>
                                            </tr>
                                            <tr className="bg-[#0A2B58] text-white">
                                                <td className="p-2">Balance Due</td>
                                                <td className="p-2 text-right">{currencySymbol}{(currentInvoice.amount || 0).toFixed(2)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </footer>
                    </form>
                </div>
                )}
            </main>

             <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Manage Custom Invoice Columns</DialogTitle>
                        <CardDescription>Add, rename, or remove custom columns for your invoice items.</CardDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {tempSettings.customItemColumns.length > 0 ? (
                            tempSettings.customItemColumns.map(col => (
                                <div key={col.id} className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                                <Input 
                                    value={col.label} 
                                    onChange={(e) => handleSettingsColumnLabelChange(col.id, e.target.value)}
                                    disabled={isSaving}
                                    className="font-medium" />
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteColumn(col.id)} disabled={isSaving}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                                </div>
                            ))
                            ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No custom columns added yet.</p>
                            )}
                        </div>

                        <div className="flex items-end gap-2 pt-4 border-t">
                            <div className="flex-grow">
                            <Label htmlFor="new-column-name">New Column Name</Label>
                            <Input
                                id="new-column-name"
                                value={newColumnName}
                                onChange={e => setNewColumnName(e.target.value)}
                                placeholder="e.g., Serial Number"
                                disabled={isSaving}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddColumn(); }}}
                            />
                            </div>
                            <Button onClick={handleAddColumn} disabled={isSaving}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add
                            </Button>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSettingsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveSettings} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Settings
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
    
