
'use client';

import React, { useState, useEffect, type FormEvent } from 'react';
import PageTitle from '@/components/PageTitle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
// import { Button } from '@/components/ui/button'; // Save button removed
import { useToast } from '@/hooks/use-toast';
import { Building, Loader2 } from 'lucide-react'; // Save icon removed

interface CompanyDetails {
  name: string;
  address: string;
  gstin: string;
  phone: string;
  email: string;
  website: string;
}

export default function CompanyDetailsPage() {
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails>({
    name: '',
    address: '',
    gstin: '',
    phone: '',
    email: '',
    website: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  // isSaving state and handleSave function removed
  const { toast } = useToast();

  useEffect(() => {
    const fetchCompanyDetails = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/company-details');
        if (!response.ok) {
           let errorMessage = 'Failed to fetch details.';
           try {
             const errorData = await response.json();
             if (errorData && errorData.message) {
               errorMessage = errorData.message;
             } else {
                errorMessage = `Request failed: ${response.statusText} (Status: ${response.status})`;
             }
           } catch (jsonError) {
             console.error('Failed to parse API error response as JSON (fetch):', jsonError);
             errorMessage = `The server returned an unexpected response (not valid JSON). Status: ${response.status} (${response.statusText}). This often means the API route encountered an error and sent HTML instead. Please check server logs.`;
           }
          throw new Error(errorMessage);
        }
        const data = await response.json();
        setCompanyDetails(data);
      } catch (error: any) {
        console.error('Error fetching company details:', error);
        let description = error.message || 'Could not load company details. Please try again later.';
        if (typeof error.message === 'string') {
          if (error.message.includes('Invalid scheme') || error.message.includes('mongodb://') || error.message.includes('mongodb+srv://')) {
            description = 'The server reported an issue with the database connection string (MONGODB_URI). Please ensure it\'s correctly configured in your .env file and starts with "mongodb://" or "mongodb+srv://".';
          } else if (error.message.includes('Failed to connect') || error.message.includes('ECONNREFUSED')) {
            description = 'The server could not connect to the database. Please check your MONGODB_URI, network settings, and ensure your database server is running and accessible.';
          }
        }
        toast({
          title: 'Error Loading Details',
          description: description,
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanyDetails();
  }, [toast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCompanyDetails(prev => ({ ...prev, [name]: value }));
  };

  // handleSave function removed

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageTitle title="Company Details" subtitle="Manage your business information." icon={Building} />
        <Card className="shadow-lg max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="font-headline">Business Information</CardTitle>
            <CardDescription>Loading company details...</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-muted rounded w-1/4 animate-pulse"></div>
                <div className="h-10 bg-muted rounded w-full animate-pulse"></div>
              </div>
            ))}
            {/* Placeholder for save button removed */}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageTitle title="Company Details" subtitle="View your business information." icon={Building} />

      <Card className="shadow-lg max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="font-headline">Business Information</CardTitle>
          <CardDescription>View your company's official details. This information may be used in invoices or other documents.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Form no longer submits */}
          <form className="space-y-4">
            <div>
              <Label htmlFor="name">Company Name</Label>
              <Input
                id="name"
                name="name"
                value={companyDetails.name}
                onChange={handleChange}
                placeholder="e.g., Acme Corp Ltd."
                required
                // disabled prop related to saving removed
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
                // disabled prop related to saving removed
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
                // disabled prop related to saving removed
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
                // disabled prop related to saving removed
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
                // disabled prop related to saving removed
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
                // disabled prop related to saving removed
              />
            </div>
            {/* Save Button removed */}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
