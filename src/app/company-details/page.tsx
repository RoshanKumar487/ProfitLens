
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
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

interface CompanyDetailsFirestore {
  name: string;
  address: string;
  gstin: string;
  phone: string;
  email: string;
  website: string;
  updatedAt?: Timestamp;
}

export default function CompanyDetailsPage() {
  const { user, isLoading: authIsLoading } = useAuth();
  const [companyDetails, setCompanyDetails] = useState<CompanyDetailsFirestore>({
    name: '',
    address: '',
    gstin: '',
    phone: '',
    email: '',
    website: '',
  });
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchCompanyDetails = async () => {
      if (authIsLoading) {
        setIsFetching(true);
        return;
      }
      if (!user || !user.companyId) {
        setIsFetching(false);
        toast({
          title: 'Authentication Error',
          description: 'User or company information not available. Please sign in.',
          variant: 'destructive',
        });
        console.log("CompanyDetails: User or companyId not found for fetching.");
        return;
      }

      setIsFetching(true);
      try {
        const docRef = doc(db, 'companyProfiles', user.companyId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setCompanyDetails(docSnap.data() as CompanyDetailsFirestore);
          console.log("CompanyDetails: Fetched details for companyId:", user.companyId);
        } else {
          console.log("CompanyDetails: No details found for companyId:", user.companyId, ". Initializing empty form.");
          // Initialize with empty strings to ensure controlled components
          setCompanyDetails({ name: '', address: '', gstin: '', phone: '', email: '', website: '' });
        }
      } catch (error: any) {
        console.error('Error fetching company details from Firestore:', error);
        toast({
          title: 'Error Loading Details',
          description: error.message || 'Could not load company details from Firestore.',
          variant: 'destructive',
        });
      } finally {
        setIsFetching(false);
      }
    };

    fetchCompanyDetails();
  }, [user, user?.companyId, authIsLoading, toast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCompanyDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user || !user.companyId) {
      toast({ title: "Save Failed", description: "User not authenticated.", variant: "destructive" });
      return;
    }
    if (!companyDetails.name || !companyDetails.address || !companyDetails.gstin) {
        toast({ title: "Missing Information", description: "Company Name, Address, and GSTIN are required.", variant: "destructive" });
        return;
    }

    setIsSaving(true);
    try {
      const docRef = doc(db, 'companyProfiles', user.companyId);
      // Ensure all optional fields are at least empty strings if not provided
      const detailsToSave: CompanyDetailsFirestore = {
        name: companyDetails.name || '',
        address: companyDetails.address || '',
        gstin: companyDetails.gstin || '',
        phone: companyDetails.phone || '',
        email: companyDetails.email || '',
        website: companyDetails.website || '',
        updatedAt: Timestamp.now(),
      };
      await setDoc(docRef, detailsToSave, { merge: true }); 
      
      setCompanyDetails(detailsToSave); // Update local state with updatedAt and ensured strings
      toast({
        title: 'Details Saved',
        description: 'Company information updated successfully in Firestore.',
      });
      console.log("CompanyDetails: Saved details for companyId:", user.companyId);

    } catch (error: any) {
      console.error('Error saving company details to Firestore:', error);
      toast({
        title: 'Save Failed',
        description: error.message || 'Could not save company details to Firestore.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isFetching || authIsLoading) {
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

  if (!user && !authIsLoading) {
    return (
       <div className="space-y-6">
        <PageTitle title="Company Details" subtitle="Manage your business information." icon={Building} />
        <Card className="shadow-lg max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="font-headline">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Please sign in to manage your company details.</p>
            {/* Optionally, add a sign-in button/link here */}
          </CardContent>
        </Card>
      </div>
    )
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
            <Button type="submit" disabled={isSaving || isFetching} className="w-full sm:w-auto">
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
