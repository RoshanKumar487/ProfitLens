'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, PlusCircle, Trash2, Loader2, Save, Info, Palette, Database, HandCoins, Receipt } from 'lucide-react';
import { getInvoiceSettings, saveInvoiceSettings, type InvoiceSettings, type CustomItemColumn } from './actions';
import { getPayrollSettings, savePayrollSettings, type PayrollSettings, type CustomPayrollField } from './actions';
import { v4 as uuidv4 } from 'uuid';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useTheme } from 'next-themes';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export default function SettingsPage() {
  const { user, isLoading: authIsLoading } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings>({ customItemColumns: [], defaultPaymentTermsDays: 30, defaultHsnCode: '', defaultNotes: '' });
  const [payrollSettings, setPayrollSettings] = useState<PayrollSettings>({ customFields: [], pfPercentage: 0, esiPercentage: 0 });
  const [newInvoiceColumnName, setNewInvoiceColumnName] = useState('');
  const [newPayrollFieldName, setNewPayrollFieldName] = useState('');
  const [newPayrollFieldType, setNewPayrollFieldType] = useState<'number' | 'string' | 'date'>('number');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!user || !user.companyId) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
        const [fetchedInvoiceSettings, fetchedPayrollSettings] = await Promise.all([
            getInvoiceSettings(user.companyId),
            getPayrollSettings(user.companyId),
        ]);
        setInvoiceSettings(fetchedInvoiceSettings);
        setPayrollSettings(fetchedPayrollSettings);
    } catch (error: any) {
        toast({ title: 'Error', description: `Could not load settings: ${error.message}`, variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authIsLoading) {
        fetchSettings();
    }
  }, [authIsLoading, fetchSettings]);

  // Invoice Settings Handlers
  const handleAddInvoiceColumn = () => {
    if (!newInvoiceColumnName.trim()) return;
    const newColumn: CustomItemColumn = { id: uuidv4(), label: newInvoiceColumnName.trim() };
    setInvoiceSettings(prev => ({ ...prev, customItemColumns: [...prev.customItemColumns, newColumn] }));
    setNewInvoiceColumnName('');
  };

  const handleInvoiceColumnLabelChange = (id: string, newLabel: string) => {
    setInvoiceSettings(prev => ({ ...prev, customItemColumns: prev.customItemColumns.map(col => col.id === id ? { ...col, label: newLabel } : col)}));
  };

  const handleDeleteInvoiceColumn = (id: string) => {
    setInvoiceSettings(prev => ({ ...prev, customItemColumns: prev.customItemColumns.filter(col => col.id !== id) }));
  };

  const handleSaveInvoiceSettings = async () => {
    if (!user || !user.companyId) return;
    setIsSaving(true);
    const result = await saveInvoiceSettings(user.companyId, invoiceSettings);
    toast({ title: result.success ? 'Success' : 'Error', description: result.message, variant: result.success ? 'default' : 'destructive' });
    setIsSaving(false);
  };

  // Payroll Settings Handlers
  const handleAddPayrollField = () => {
    if (!newPayrollFieldName.trim()) return;
    const newField: CustomPayrollField = { 
      id: uuidv4(), 
      label: newPayrollFieldName.trim(),
      type: newPayrollFieldType,
    };
    setPayrollSettings(prev => ({ ...prev, customFields: [...prev.customFields, newField] }));
    setNewPayrollFieldName('');
    setNewPayrollFieldType('number');
  };

  const handlePayrollFieldLabelChange = (id: string, newLabel: string) => {
    setPayrollSettings(prev => ({...prev, customFields: prev.customFields.map(f => f.id === id ? { ...f, label: newLabel } : f)}));
  };
  
  const handlePayrollFieldTypeChange = (id: string, newType: 'number' | 'string' | 'date') => {
    setPayrollSettings(prev => ({
      ...prev,
      customFields: prev.customFields.map(f => f.id === id ? { ...f, type: newType } : f)
    }));
  };

  const handleDeletePayrollField = (id: string) => {
    setPayrollSettings(prev => ({...prev, customFields: prev.customFields.filter(f => f.id !== id)}));
  };

  const handleSavePayrollSettings = async () => {
    if (!user || !user.companyId) return;
    setIsSaving(true);
    const result = await savePayrollSettings(user.companyId, payrollSettings);
    toast({ title: result.success ? 'Success' : 'Error', description: result.message, variant: result.success ? 'default' : 'destructive' });
    setIsSaving(false);
  };
  
  if (authIsLoading || isLoading) {
    return (
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
            <PageTitle title="Settings" subtitle="Customize your application experience." icon={Settings} />
             <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader><Skeleton className="h-6 w-1/3" /><Skeleton className="h-4 w-2/3 mt-2" /></CardHeader>
                        <CardContent className="space-y-4"><Skeleton className="h-20 w-full" /></CardContent>
                        <CardFooter><Skeleton className="h-10 w-32 ml-auto" /></CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageTitle title="Settings" subtitle="Customize your application experience." icon={Settings} />

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5 text-primary"/>Invoice Settings</CardTitle><CardDescription>Manage default values and custom fields for your invoices.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2"><Label htmlFor="payment-terms">Default Payment Terms (Days)</Label><Input id="payment-terms" type="number" value={invoiceSettings.defaultPaymentTermsDays ?? 30} onChange={(e) => setInvoiceSettings(prev => ({...prev, defaultPaymentTermsDays: parseInt(e.target.value, 10) || 0}))} disabled={isSaving} placeholder="e.g., 30" /><p className="text-xs text-muted-foreground mt-1">Sets the default due date for new invoices.</p></div>
                <div className="space-y-2"><Label htmlFor="hsn-code">Default HSN Code</Label><Input id="hsn-code" value={invoiceSettings.defaultHsnCode ?? ''} onChange={(e) => setInvoiceSettings(prev => ({...prev, defaultHsnCode: e.target.value}))} disabled={isSaving} placeholder="Enter a default HSN code" /><p className="text-xs text-muted-foreground mt-1">This HSN code will be pre-filled for new items.</p></div>
                <div className="space-y-2"><Label htmlFor="default-notes">Default Notes/Terms</Label><Textarea id="default-notes" value={invoiceSettings.defaultNotes ?? ''} onChange={(e) => setInvoiceSettings(prev => ({...prev, defaultNotes: e.target.value}))} disabled={isSaving} placeholder="e.g., Thank you for your business." rows={3} /><p className="text-xs text-muted-foreground mt-1">This text will appear by default on new invoices.</p></div>
                <Separator className="my-4" />
                <div className="space-y-2"><h3 className="text-md font-semibold text-foreground">Custom Item Columns</h3><p className="text-sm text-muted-foreground">Add or remove custom columns for your invoice items.</p></div>
                <div className="space-y-2">
                    {invoiceSettings.customItemColumns.length > 0 ? invoiceSettings.customItemColumns.map(col => (<div key={col.id} className="flex items-center gap-2 p-2 border rounded-md bg-muted/50"><Input value={col.label} onChange={(e) => handleInvoiceColumnLabelChange(col.id, e.target.value)} disabled={isSaving} className="font-medium" /><Button variant="ghost" size="icon" onClick={() => handleDeleteInvoiceColumn(col.id)} disabled={isSaving}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>)) : (<p className="text-sm text-muted-foreground text-center py-4">No custom columns added.</p>)}
                </div>
                <div className="flex items-end gap-2 pt-4 border-t"><div className="flex-grow"><Label htmlFor="new-column-name">New Column Name</Label><Input id="new-column-name" value={newInvoiceColumnName} onChange={e => setNewInvoiceColumnName(e.target.value)} placeholder="e.g., Serial Number" disabled={isSaving} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddInvoiceColumn(); }}}/></div><Button onClick={handleAddInvoiceColumn} disabled={isSaving}><PlusCircle className="mr-2 h-4 w-4" /> Add</Button></div>
            </CardContent>
            <CardFooter className="justify-end"><Button onClick={handleSaveInvoiceSettings} disabled={isSaving}>{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save Invoice Settings</Button></CardFooter>
        </Card>
        
         <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><HandCoins className="h-5 w-5 text-primary" />Payroll Settings</CardTitle><CardDescription>Manage rates and custom fields for your payroll records.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2"><h3 className="text-md font-semibold text-foreground">Statutory Contribution Rates</h3></div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label htmlFor="pf-percentage">PF Contribution (%)</Label><Input id="pf-percentage" type="number" min="0" step="0.01" value={payrollSettings.pfPercentage ?? 0} onChange={(e) => setPayrollSettings(p => ({...p, pfPercentage: parseFloat(e.target.value) || 0}))} disabled={isSaving} /></div>
                    <div className="space-y-2"><Label htmlFor="esi-percentage">ESI Contribution (%)</Label><Input id="esi-percentage" type="number" min="0" step="0.01" value={payrollSettings.esiPercentage ?? 0} onChange={(e) => setPayrollSettings(p => ({...p, esiPercentage: parseFloat(e.target.value) || 0}))} disabled={isSaving} /></div>
                 </div>
                <Separator />
                <div className="space-y-2"><h3 className="text-md font-semibold text-foreground">Custom Payroll Fields</h3></div>
                <div className="space-y-2">
                    {payrollSettings.customFields.length > 0 ? payrollSettings.customFields.map(field => (
                        <div key={field.id} className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                            <Input value={field.label} onChange={(e) => handlePayrollFieldLabelChange(field.id, e.target.value)} disabled={isSaving} className="font-medium" />
                            <Select value={field.type} onValueChange={(v) => handlePayrollFieldTypeChange(field.id, v as any)} disabled={isSaving}>
                                <SelectTrigger className="w-[120px] h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="number">Number</SelectItem>
                                    <SelectItem value="string">String</SelectItem>
                                    <SelectItem value="date">Date</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" onClick={() => handleDeletePayrollField(field.id)} disabled={isSaving}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                    )) : (<p className="text-sm text-muted-foreground text-center py-4">No custom fields added.</p>)}
                </div>
                 <div className="flex items-end gap-2 pt-4 border-t">
                    <div className="flex-grow">
                        <Label htmlFor="new-payroll-field">New Field Name</Label>
                        <Input id="new-payroll-field" value={newPayrollFieldName} onChange={e => setNewPayrollFieldName(e.target.value)} placeholder="e.g., Health Insurance" disabled={isSaving} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddPayrollField(); }}}/>
                    </div>
                    <div className="w-[120px]">
                      <Label htmlFor="new-payroll-field-type">Type</Label>
                      <Select value={newPayrollFieldType} onValueChange={(v) => setNewPayrollFieldType(v as any)} disabled={isSaving}>
                        <SelectTrigger id="new-payroll-field-type" className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="string">String</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleAddPayrollField} disabled={isSaving} className="self-end h-10">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add
                    </Button>
                </div>
            </CardContent>
            <CardFooter className="justify-end"><Button onClick={handleSavePayrollSettings} disabled={isSaving}>{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save Payroll Settings</Button></CardFooter>
        </Card>

        <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5 text-primary" />Appearance</CardTitle><CardDescription>Choose how ProfitLens looks and feels. Your selection is saved automatically.</CardDescription></CardHeader>
            <CardContent>
                <RadioGroup value={theme} onValueChange={setTheme} className="space-y-1">
                    <Label className="flex items-center gap-3 p-3 rounded-md hover:bg-accent cursor-pointer" htmlFor="light"><RadioGroupItem value="light" id="light" />Light</Label>
                    <Label className="flex items-center gap-3 p-3 rounded-md hover:bg-accent cursor-pointer" htmlFor="dark"><RadioGroupItem value="dark" id="dark" />Dark</Label>
                    <Label className="flex items-center gap-3 p-3 rounded-md hover:bg-accent cursor-pointer" htmlFor="system"><RadioGroupItem value="system" id="system" />System</Label>
                </RadioGroup>
            </CardContent>
        </Card>

        <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-primary" />Data Backup & Integrations</CardTitle><CardDescription>Configure automatic backups of your company data to external services.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                        <svg role="img" viewBox="0 0 24 24" className="h-8 w-8 text-gray-500" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><title>Google Drive</title><path d="M2.203 17.585l3.983-6.9L2.203 3.785h7.965l3.983 6.9-3.983 6.9H2.203zM13.882 24l4.03-6.9-4.03-6.9h8.013L22 17.1l-4.105 6.9h-4.013zm-6.22-9.712l-3.983-6.9h7.965l4.029 6.9-4.029 6.9H3.679l3.983-6.9z"/></svg>
                        <div><h3 className="font-semibold">Google Drive Backup</h3><p className="text-xs text-muted-foreground">Not connected</p></div>
                    </div>
                    <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="outline" disabled>Connect</Button></TooltipTrigger><TooltipContent><p>This feature requires backend setup.</p></TooltipContent></Tooltip></TooltipProvider>
                </div>
                <Alert><Info className="h-4 w-4" /><AlertTitle>Feature in Development</AlertTitle><AlertDescription>Automatic weekly backups are a planned feature. A full integration requires secure, server-side handling of authentication and scheduled tasks which needs to be set up separately.</AlertDescription></Alert>
            </CardContent>
        </Card>

      </div>
    </div>
  );
}
