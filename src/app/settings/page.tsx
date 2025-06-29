
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, PlusCircle, Trash2, Loader2, Save, Info } from 'lucide-react';
import { getInvoiceSettings, saveInvoiceSettings, type InvoiceSettings, type CustomItemColumn } from './actions';
import { v4 as uuidv4 } from 'uuid';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function SettingsPage() {
  const { user, isLoading: authIsLoading } = useAuth();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState<InvoiceSettings>({ customItemColumns: [] });
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
            <PageTitle title="Invoice Settings" subtitle="Customize your invoice fields and columns." icon={Settings} />
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/3" />
                    <Skeleton className="h-4 w-2/3" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageTitle title="Invoice Settings" subtitle="Customize your invoice fields and columns." icon={Settings}>
        <Button onClick={handleSaveChanges} disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </PageTitle>

      <Card>
        <CardHeader>
          <CardTitle>Custom Invoice Item Columns</CardTitle>
          <CardDescription>
            Add or remove custom columns that will appear in the items section of your invoices.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {settings.customItemColumns.length > 0 ? (
              settings.customItemColumns.map(col => (
                <div key={col.id} className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                  <Input value={col.label} disabled className="font-medium" />
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
                placeholder="e.g., HSN Code, Serial Number"
                disabled={isSaving}
              />
            </div>
            <Button onClick={handleAddColumn} disabled={isSaving}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Column
            </Button>
          </div>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>What's Next?</AlertTitle>
            <AlertDescription>
                After saving your columns, they need to be integrated into the invoice creation form and templates. This requires further development.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
