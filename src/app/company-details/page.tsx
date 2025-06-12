
'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import PageTitle from '@/components/PageTitle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Building, Save } from 'lucide-react';

interface CompanyDetails {
  name: string;
  address: string;
  gstin: string;
  phone: string;
  email: string;
  website: string;
}

const LOCAL_STORAGE_KEY = 'bizsight-company-details';

export default function CompanyDetailsPage() {
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails>({
    name: '',
    address: '',
    gstin: '',
    phone: '',
    email: '',
    website: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    const storedDetails = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedDetails) {
      setCompanyDetails(JSON.parse(storedDetails));
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCompanyDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(companyDetails));
    toast({
      title: 'Details Saved',
      description: 'Your company details have been updated successfully.',
    });
  };

  return (
    <div className="space-y-6">
      <PageTitle title="Company Details" subtitle="Manage your business information." icon={Building} />

      <Card className="shadow-lg max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="font-headline">Business Information</CardTitle>
          <CardDescription>Enter and save your company's official details here. This information may be used in invoices or other documents.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label htmlFor="name">Company Name</Label>
              <Input
                id="name"
                name="name"
                value={companyDetails.name}
                onChange={handleChange}
                placeholder="e.g., Acme Corp Ltd."
                required
              />
            </div>
            <div>
              <Label htmlFor="address">Full Address</Label>
              <Textarea
                id="address"
                name="address"
                value={companyDetails.address}
                onChange={handleChange}
                placeholder="e.g., 123 Main Street, Anytown, ST 12345"
                rows={3}
                required
              />
            </div>
            <div>
              <Label htmlFor="gstin">GSTIN / Tax ID</Label>
              <Input
                id="gstin"
                name="gstin"
                value={companyDetails.gstin}
                onChange={handleChange}
                placeholder="e.g., 22AAAAA0000A1Z5"
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number (Optional)</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={companyDetails.phone}
                onChange={handleChange}
                placeholder="e.g., +1-555-123-4567"
              />
            </div>
            <div>
              <Label htmlFor="email">Email Address (Optional)</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={companyDetails.email}
                onChange={handleChange}
                placeholder="e.g., contact@example.com"
              />
            </div>
            <div>
              <Label htmlFor="website">Website (Optional)</Label>
              <Input
                id="website"
                name="website"
                type="url"
                value={companyDetails.website}
                onChange={handleChange}
                placeholder="e.g., https://www.example.com"
              />
            </div>
            <Button type="submit" className="w-full sm:w-auto">
              <Save className="mr-2 h-4 w-4" /> Save Details
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
