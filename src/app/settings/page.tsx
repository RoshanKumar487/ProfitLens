
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, PlusCircle, Trash2, Loader2, Save, Info, Palette, Database } from 'lucide-react';
import { getInvoiceSettings, saveInvoiceSettings, type InvoiceSettings, type CustomItemColumn } from './actions';
import { v4 as uuidv4 } from 'uuid';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useTheme } from 'next-themes';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function SettingsPage() {
  const { user, isLoading: authIsLoading } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  
  const [settings, setSettings] = useState<InvoiceSettings>({ customItemColumns: [], defaultPaymentTermsDays: 30, defaultHsnCode: '' });
  const [newColumnName, setNewColumnName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!user || !user.companyId) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
        const fetchedSettings = await getInvoiceSettings(user.companyId);
        setSettings(fetchedSettings);
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

  const handleAddColumn = () => {
    if (!newColumnName.trim()) {
        toast({ title: 'Column name cannot be empty', variant: 'destructive' });
        return;
    }
    const newColumn: CustomItemColumn = {
        id: uuidv4(),
        label: newColumnName.trim(),
    };
    setSettings(prev => ({
        ...prev,
        customItemColumns: [...prev.customItemColumns, newColumn],
    }));
    setNewColumnName('');
  };

  const handleColumnLabelChange = (id: string, newLabel: string) => {
    setSettings(prev => ({
      ...prev,
      customItemColumns: prev.customItemColumns.map(col =>
        col.id === id ? { ...col, label: newLabel } : col
      ),
    }));
  };

  const handleDeleteColumn = (id: string) => {
    setSettings(prev => ({
        ...prev,
        customItemColumns: prev.customItemColumns.filter(col => col.id !== id),
    }));
  };

  const handleSaveChanges = async () => {
    if (!user || !user.companyId) {
        toast({ title: 'Error', description: 'You must be logged in to save settings.', variant: 'destructive' });
        return;
    }
    setIsSaving(true);
    const result = await saveInvoiceSettings(user.companyId, settings);
    toast({
        title: result.success ? 'Success' : 'Error',
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
    });
    setIsSaving(false);
  };
  
  if (authIsLoading || isLoading) {
    return (
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
            <PageTitle title="Settings" subtitle="Customize your application experience." icon={Settings} />
             <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-1/3" />
                        <Skeleton className="h-4 w-2/3" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </CardContent>
                    <CardFooter>
                        <Skeleton className="h-10 w-32 ml-auto" />
                    </CardFooter>
                </Card>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-1/3" />
                        <Skeleton className="h-4 w-2/3" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-6 w-full" />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageTitle title="Settings" subtitle="Customize your application experience." icon={Settings} />

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card>
            <CardHeader>
                <CardTitle>Invoice Settings</CardTitle>
                <CardDescription>
                    Manage default values and custom fields for your invoices.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-4 pt-2">
                    <h3 className="text-md font-semibold text-foreground">Default Values</h3>
                    <div>
                        <Label htmlFor="payment-terms">Default Payment Terms (Days)</Label>
                        <Input
                            id="payment-terms"
                            type="number"
                            value={settings.defaultPaymentTermsDays ?? 30}
                            onChange={(e) => setSettings(prev => ({...prev, defaultPaymentTermsDays: parseInt(e.target.value, 10) || 0}))}
                            disabled={isSaving}
                            placeholder="e.g., 30"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Sets the default due date for new invoices.</p>
                    </div>
                    <div>
                        <Label htmlFor="hsn-code">Default HSN Code</Label>
                        <Input
                            id="hsn-code"
                            value={settings.defaultHsnCode ?? ''}
                            onChange={(e) => setSettings(prev => ({...prev, defaultHsnCode: e.target.value}))}
                            disabled={isSaving}
                            placeholder="Enter a default HSN code"
                        />
                        <p className="text-xs text-muted-foreground mt-1">This HSN code will be pre-filled for every new item you add.</p>
                    </div>
                </div>

                <Separator className="my-6" />

                <div className="space-y-4">
                     <h3 className="text-md font-semibold text-foreground">Custom Item Columns</h3>
                     <p className="text-sm text-muted-foreground">Add or remove custom columns for your invoice items.</p>
                    <div className="space-y-2">
                        {settings.customItemColumns.length > 0 ? (
                        settings.customItemColumns.map(col => (
                            <div key={col.id} className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                            <Input 
                                value={col.label} 
                                onChange={(e) => handleColumnLabelChange(col.id, e.target.value)}
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
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Column
                        </Button>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="justify-end">
                 <Button onClick={handleSaveChanges} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Invoice Settings
                </Button>
            </CardFooter>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5 text-primary" />
                    Appearance
                </CardTitle>
                <CardDescription>
                    Choose how ProfitLens looks and feels. Your selection will be saved automatically.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <RadioGroup
                    value={theme}
                    onValueChange={setTheme}
                    className="space-y-1"
                >
                    <Label className="flex items-center gap-3 p-3 rounded-md hover:bg-accent cursor-pointer" htmlFor="light">
                        <RadioGroupItem value="light" id="light" />
                        Light
                    </Label>
                    <Label className="flex items-center gap-3 p-3 rounded-md hover:bg-accent cursor-pointer" htmlFor="dark">
                        <RadioGroupItem value="dark" id="dark" />
                        Dark
                    </Label>
                    <Label className="flex items-center gap-3 p-3 rounded-md hover:bg-accent cursor-pointer" htmlFor="system">
                        <RadioGroupItem value="system" id="system" />
                        System
                    </Label>
                </RadioGroup>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    Data Backup & Integrations
                </CardTitle>
                <CardDescription>
                    Configure automatic backups of your company data to external services.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                        <svg role="img" viewBox="0 0 24 24" className="h-8 w-8 text-gray-500" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><title>Google Drive</title><path d="M2.203 17.585l3.983-6.9L2.203 3.785h7.965l3.983 6.9-3.983 6.9H2.203zM13.882 24l4.03-6.9-4.03-6.9h8.013L22 17.1l-4.105 6.9h-4.013zm-6.22-9.712l-3.983-6.9h7.965l4.029 6.9-4.029 6.9H3.679l3.983-6.9z"/></svg>
                        <div>
                            <h3 className="font-semibold">Google Drive Backup</h3>
                            <p className="text-xs text-muted-foreground">Not connected</p>
                        </div>
                    </div>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" disabled>Connect</Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>This feature requires backend setup.</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Feature in Development</AlertTitle>
                    <AlertDescription>
                        Automatic weekly backups are a planned feature. A full integration requires secure, server-side handling of authentication and scheduled tasks which needs to be set up separately.
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>

      </div>

    </div>
  );
}
