
'use client';

import React from 'react';
import PageTitle from '@/components/PageTitle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Building, Copy } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function CompanyDetailsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const handleCopyId = () => {
    if (user?.companyId) {
        navigator.clipboard.writeText(user.companyId);
        toast({ title: 'Copied!', description: 'Company ID copied to clipboard.' });
    }
  };
  
  const handleSave = () => {
    toast({ title: 'Action Disabled', description: 'Cannot save data without a backend connection.', variant: 'destructive' });
  };
  
  if (!user) {
    return (
       <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <PageTitle title="Company Details" subtitle="Manage your business information." icon={Building} />
        <Card className="max-w-2xl mx-auto"><CardHeader><CardTitle>Access Denied</CardTitle></CardHeader><CardContent><p>Please sign in to manage your company details.</p></CardContent></Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageTitle title="Company Details" subtitle="Manage your business information." icon={Building} />

      <Card className="max-w-2xl mx-auto">
        <CardHeader><CardTitle>Company Identifier</CardTitle><CardDescription>Share this ID with new employees to ensure they join the correct company profile.</CardDescription></CardHeader>
        <CardContent><div className="flex items-center gap-2 p-2 border rounded-md bg-muted"><Input readOnly value={user.publicCompanyId || 'Not generated'} className="bg-background font-mono text-sm tracking-widest" /><Button type="button" size="icon" variant="outline" onClick={handleCopyId} disabled={!user.publicCompanyId}><Copy className="h-4 w-4" /></Button></div></CardContent>
      </Card>

      <Card className="max-w-2xl mx-auto">
        <CardHeader><CardTitle className="font-headline">Business Information</CardTitle><CardDescription>This information may be used in invoices or other documents. Saving is disabled.</CardDescription></CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div><Label htmlFor="name">Company Name</Label><Input id="name" name="name" value={user.companyName || ''} disabled/></div>
             <div><Label htmlFor="email">Contact Email</Label><Input id="email" name="email" type="email" value={user.email || ''} disabled /></div>
          </div>
        </CardContent>
         <CardFooter>
            <Button onClick={handleSave} className="w-full sm:w-auto ml-auto" disabled>Save Details</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
