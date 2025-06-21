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
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { COUNTRIES } from '@/lib/countries';


interface CompanyDetailsFirestore {
  name: string;
  address: string; // Street address
  city: string;
  state: string; // State or Province
  country: string;
  gstin: string;
  phone: string;
  email: string;
  website: string;
  accountNumber?: string;
  ifscCode?: string;
  createdAt?: Timestamp; // Added for consistency, usually set on creation
  updatedAt?: Timestamp;
}

export default function CompanyDetailsPage() {
  const { user, isLoading: authIsLoading } = useAuth();
  const [companyDetails, setCompanyDetails] = useState<CompanyDetailsFirestore>({
    name: '',
    address: '',
    city: '',
    state: '',
    country: '',
    gstin: '',
    phone: '',
    email: '',
    website: '',
    accountNumber: '',
    ifscCode: '',
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
        console.log("CompanyDetails: User or companyId not found for fetching.");
        setCompanyDetails({ name: '', address: '', city: '', state: '', country: '', gstin: '', phone: '', email: '', website: '', accountNumber: '', ifscCode: '' });
        return;
      }

      setIsFetching(true);
      try {
        const docRef = doc(db, 'companyProfiles', user.companyId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as Partial<CompanyDetailsFirestore>;
          setCompanyDetails({
            name: data.name || '',
            address: data.address || '',
            city: data.city || '',
            state: data.state || '',
            country: data.country || '',
            gstin: data.gstin || '',
            phone: data.phone || '',
            email: data.email || '',
            website: data.website || '',
            accountNumber: data.accountNumber || '',
            ifscCode: data.ifscCode || '',
            createdAt: data.createdAt, // Persist if exists
            updatedAt: data.updatedAt,
          });
          console.log("CompanyDetails: Fetched details for companyId:", user.companyId);
        } else {
          console.log("CompanyDetails: No details found for companyId:", user.companyId, ". Initializing empty form.");
          // This case should be less common now as profile is created on signup
          setCompanyDetails({ name: user.displayName || '', address: '', city: '', state: '', country: '', gstin: '', phone: '', email: user.email || '', website: '', accountNumber: '', ifscCode: '' });
        }
      } catch (error: any) {
        console.error('Error fetching company details from Firestore:', error);
        toast({
          title: 'Error Loading Details',
          description: error.message || 'Could not load company details from Firestore.',
          variant: 'destructive',
        });
        setCompanyDetails({ name: '', address: '', city: '', state: '', country: '', gstin: '', phone: '', email: '', website: '', accountNumber: '', ifscCode: '' });
      } finally {
        setIsFetching(false);
      }
    };

    fetchCompanyDetails();
  }, [user, authIsLoading, toast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCompanyDetails(prev => ({ ...prev, [name]: value }));
  };
  
  const handleCountryChange = (value: string) => {
    setCompanyDetails(prev => ({...prev, country: value}));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user || !user.companyId) {
      toast({ title: "Save Failed", description: "User not authenticated.", variant: "destructive" });
      return;
    }
    if (!companyDetails.name || !companyDetails.address || !companyDetails.city || !companyDetails.state || !companyDetails.country || !companyDetails.gstin) {
        toast({ title: "Missing Information", description: "Company Name, Address, City, State, Country and GSTIN/Tax ID are required.", variant: "destructive" });
        return;
    }

    setIsSaving(true);
    try {
      const docRef = doc(db, 'companyProfiles', user.companyId);
      const detailsToSave: CompanyDetailsFirestore = {
        name: companyDetails.name,
        address: companyDetails.address,
        city: companyDetails.city,
        state: companyDetails.state,
        country: companyDetails.country,
        gstin: companyDetails.gstin,
        phone: companyDetails.phone || '',
        email: companyDetails.email || '',
        website: companyDetails.website || '',
        accountNumber: companyDetails.accountNumber || '',
        ifscCode: companyDetails.ifscCode || '',
        createdAt: companyDetails.createdAt || Timestamp.now(), // Preserve or set if new
        updatedAt: Timestamp.now(),
      };
      await setDoc(docRef, detailsToSave, { merge: true }); 
      
      setCompanyDetails(detailsToSave); 
      toast({
        title: 'Details Saved',
        description: 'Company information updated. Currency may update on next refresh.',
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
            {[...Array(8)].map((_, i) => ( // Increased skeleton count
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
              <Label htmlFor="address">Street Address</Label>
              <Textarea
                id="address"
                name="address"
                value={companyDetails.address}
                onChange={handleChange}
                placeholder="e.g., 123 Main Street"
                rows={2}
                required
                disabled={isSaving}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  name="city"
                  value={companyDetails.city}
                  onChange={handleChange}
                  placeholder="e.g., Anytown"
                  required
                  disabled={isSaving}
                />
              </div>
              <div>
                <Label htmlFor="state">State / Province</Label>
                <Input
                  id="state"
                  name="state"
                  value={companyDetails.state}
                  onChange={handleChange}
                  placeholder="e.g., CA or Ontario"
                  required
                  disabled={isSaving}
                />
              </div>
            </div>
            <div>
                <Label htmlFor="country">Country</Label>
                 <Select value={companyDetails.country} onValueChange={handleCountryChange} required disabled={isSaving}>
                    <SelectTrigger id="country">
                        <SelectValue placeholder="Select a country" />
                    </SelectTrigger>
                    <SelectContent>
                        {COUNTRIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                            {c.name}
                        </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
             <Separator className="my-4" />
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
             <Separator className="my-4" />
             <div className="space-y-2">
                <h3 className="text-md font-medium">Bank Details (Optional)</h3>
                <p className="text-xs text-muted-foreground">These details will be shown on invoices for bank transfers.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="accountNumber">Account Number</Label>
                    <Input
                        id="accountNumber"
                        name="accountNumber"
                        value={companyDetails.accountNumber || ''}
                        onChange={handleChange}
                        placeholder="e.g., 1234567890"
                        disabled={isSaving}
                    />
                </div>
                <div>
                    <Label htmlFor="ifscCode">IFSC / SWIFT Code</Label>
                    <Input
                        id="ifscCode"
                        name="ifscCode"
                        value={companyDetails.ifscCode || ''}
                        onChange={handleChange}
                        placeholder="e.g., SBIN0001234 or SWIFT code"
                        disabled={isSaving}
                    />
                </div>
            </div>
            <Separator className="my-4" />
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
              <Label htmlFor="email">Contact Email (Optional)</Label>
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
