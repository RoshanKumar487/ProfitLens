
'use client';

import React, { useState, useEffect, type FormEvent } from 'react';
import PageTitle from '@/components/PageTitle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Building, Loader2, Save } from 'lucide-react';

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
  const [isSaving, setIsSaving] = useState(false);
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
             if (response.status === 404) {
                errorMessage = `API route /api/company-details not found (404). Please verify the route exists and the server is correctly configured. Server logs may provide more details.`;
             } else if (response.status === 500) {
                errorMessage = `Server Error (500): Received an HTML error page instead of JSON. This usually means a critical server-side issue, often related to database configuration (e.g., missing or incorrect MONGODB_URI in .env) or an unhandled error in the API route. Please check your server logs for the specific error.`;
             } else {
                errorMessage = `Received an unexpected non-JSON response from the server (Status: ${response.status} - ${response.statusText}). This often indicates a server-side error. Please check server logs.`;
             }
           }
          throw new Error(errorMessage);
        }
        const data = await response.json();
        setCompanyDetails(data);
      } catch (error: any) {
        console.error('Error fetching company details:', error);
        let description = error.message || 'Could not load company details. Please try again later.';
        // The more specific error message is now constructed above, so we directly use error.message here.
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

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      const response = await fetch('/api/company-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(companyDetails),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to save details.';
        try {
          const errorData = await response.json();
          if (errorData && errorData.message) {
            errorMessage = errorData.message;
          } else {
            errorMessage = `Request failed: ${response.statusText} (Status: ${response.status})`;
          }
        } catch (jsonError) {
          console.error('Failed to parse API error response as JSON (save):', jsonError);
           if (response.status === 404) {
             errorMessage = `API route /api/company-details (POST) not found (404). Please verify the route exists and the server is correctly configured.`;
          } else if (response.status === 500) {
              errorMessage = `Server Error (500) when saving: Received an HTML error page instead of JSON. This points to a critical server-side issue (e.g., database configuration error like MONGODB_URI, or an unhandled error in the API POST route). Please check your server logs for details.`;
           } else if (response.status === 400 && typeof response.bodyUsed && !response.bodyUsed) {
             // If it's a 400 and body hasn't been read, try to read it.
             try {
                const errorBody = await response.text(); // Or response.json() if you expect JSON for 400
                if (errorBody.toLowerCase().includes("invalid json")) {
                    errorMessage = 'Server Error: Invalid JSON data sent in the request body when saving.';
                } else {
                    errorMessage = `Bad Request (400): ${errorBody || response.statusText}`;
                }
             } catch (bodyReadError) {
                errorMessage = `Bad Request (400), and failed to read error body. Status: ${response.statusText}`;
             }
           }
            else {
             errorMessage = `Received an unexpected non-JSON response from the server when saving (Status: ${response.status} - ${response.statusText}). Check server logs.`;
          }
        }
        throw new Error(errorMessage);
      }

      const savedData = await response.json();
      setCompanyDetails(savedData);
      toast({
        title: 'Details Saved',
        description: 'Company information updated successfully.',
      });

    } catch (error: any) {
      console.error('Error saving company details:', error);
      let description = error.message || 'Could not save company details. Please try again later.';
      toast({
        title: 'Save Failed',
        description: description,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };


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
             <div className="h-10 bg-muted rounded w-full sm:w-auto animate-pulse mt-4"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageTitle title="Company Details" subtitle="Manage your business information." icon={Building} />

      <Card className="shadow-lg max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="font-headline">Business Information</CardTitle>
          <CardDescription>Update your company's official details. This information may be used in invoices or other documents.</CardDescription>
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
                disabled={isSaving}
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
                disabled={isSaving}
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
                disabled={isSaving}
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
                disabled={isSaving}
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
                disabled={isSaving}
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
                disabled={isSaving}
              />
            </div>
            <Button type="submit" disabled={isSaving || isLoading} className="w-full sm:w-auto">
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Details
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
