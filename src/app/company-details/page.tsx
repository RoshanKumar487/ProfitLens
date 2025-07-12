'use client';

import React, { useState, useEffect, type FormEvent } from 'react';
import PageTitle from '@/components/PageTitle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Building, Loader2, Save, Image as ImageIcon, Copy, PenSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { COUNTRIES } from '@/lib/countries';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { saveCompanyDetails } from './actions';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import SignaturePad from '@/components/SignaturePad';

interface CompanyDetailsFirestore {
  name: string;
  address: string; // Street address
  city: string;
  state: string; // State or Province
  country: string;
  gstin: string;
  pan?: string;
  phone: string;
  email: string;
  website: string;
  accountNumber?: string;
  ifscCode?: string;
  bankName?: string;
  branch?: string;
  signatureUrl?: string;
  signatureStoragePath?: string;
  stampUrl?: string;
  stampStoragePath?: string;
  publicCompanyId?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export default function CompanyDetailsPage() {
  const { user, isLoading: authIsLoading } = useAuth();
  const [companyDetails, setCompanyDetails] = useState<Partial<CompanyDetailsFirestore>>({});
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [stampFile, setStampFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [stampPreview, setStampPreview] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false);
  const { toast } = useToast();
  
  const handleCopyId = () => {
    if (companyDetails.publicCompanyId) {
        navigator.clipboard.writeText(companyDetails.publicCompanyId);
        toast({ title: 'Copied!', description: 'Company ID copied to clipboard.' });
    }
  };

  useEffect(() => {
    const fetchCompanyDetails = async () => {
      if (authIsLoading) {
        setIsFetching(true);
        return;
      }
      if (!user || !user.companyId) {
        setIsFetching(false);
        return;
      }

      setIsFetching(true);
      try {
        const docRef = doc(db, 'companyProfiles', user.companyId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          let data = docSnap.data() as Partial<CompanyDetailsFirestore>;

          if (!data.publicCompanyId) {
            console.log("Generating missing publicCompanyId for company:", user.companyId);
            try {
              const generateUniquePublicId = async (): Promise<string> => {
                let publicId: string = '';
                let isUnique = false;
                let attempts = 0;
                const maxAttempts = 10;
                
                while (!isUnique && attempts < maxAttempts) {
                    publicId = Math.floor(100000 + Math.random() * 900000).toString();
                    const q = query(collection(db, 'companyProfiles'), where('publicCompanyId', '==', publicId));
                    const snapshot = await getDocs(q);
                    isUnique = snapshot.empty;
                    if (!isUnique) {
                      console.warn(`Company ID collision for ${publicId}, attempt ${attempts + 1}`);
                    }
                    attempts++;
                }
        
                if (!isUnique) {
                    throw new Error("Could not generate a unique Company ID. Please try again later.");
                }
                return publicId;
              };
              
              const newPublicId = await generateUniquePublicId();
              
              await updateDoc(docRef, { publicCompanyId: newPublicId });
              data = { ...data, publicCompanyId: newPublicId };

              toast({
                title: 'Company ID Generated',
                description: `A new 6-digit Company ID has been generated for your company.`,
              });

            } catch (idError: any) {
               console.error("Failed to generate and save unique public ID:", idError);
               toast({
                 title: 'Error Generating ID',
                 description: idError.message || 'Could not generate a unique company ID.',
                 variant: 'destructive',
               });
            }
          }

          setCompanyDetails(data);
          setSignaturePreview(data.signatureUrl || null);
          setStampPreview(data.stampUrl || null);
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
  }, [user, authIsLoading, toast]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'signature' | 'stamp') => {
    const file = e.target.files?.[0] || null;
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({ title: 'File Too Large', description: 'Image must be less than 2MB.', variant: 'destructive' });
        return;
      }
      if (fileType === 'signature') {
        setSignatureFile(file);
        setSignaturePreview(URL.createObjectURL(file));
      } else {
        setStampFile(file);
        setStampPreview(URL.createObjectURL(file));
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCompanyDetails(prev => ({ ...prev, [name]: value }));
  };
  
  const handleCountryChange = (value: string) => {
    setCompanyDetails(prev => ({...prev, country: value}));
  };
  
  const handleSave = async (signatureDataUrl?: string | null) => {
    if (!user || !user.companyId) {
      toast({ title: 'Save Failed', description: 'User not authenticated.', variant: 'destructive' });
      return;
    }
    if (!companyDetails.name || !companyDetails.address || !companyDetails.city || !companyDetails.state || !companyDetails.country || !companyDetails.gstin) {
        toast({ title: "Missing Information", description: "Company Name, Address, City, State, Country and GSTIN/Tax ID are required.", variant: "destructive" });
        return;
    }

    setIsSaving(true);
    const detailsPayload = { ...companyDetails };

    const result = await saveCompanyDetails(user.companyId, detailsPayload, { signatureFile, stampFile, signatureDataUrl });

    toast({
      title: result.success ? 'Details Saved' : 'Save Failed',
      description: result.message,
      variant: result.success ? 'default' : 'destructive',
    });

    if (result.success && result.updatedDetails) {
        setCompanyDetails(prev => ({...prev, ...result.updatedDetails}));
        if(result.updatedDetails.signatureUrl) setSignaturePreview(result.updatedDetails.signatureUrl);
        if(result.updatedDetails.stampUrl) setStampPreview(result.updatedDetails.stampUrl);
    }
    
    setIsSaving(false);
    setIsSignatureDialogOpen(false);
    setSignatureFile(null); // Clear file after saving
  };
  
  const handleSignatureSave = (dataUrl: string) => {
    setSignaturePreview(dataUrl);
    handleSave(dataUrl);
  };


  if (isFetching || authIsLoading) {
    return (
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <PageTitle title="Company Details" subtitle="Manage your business information." icon={Building} />
        <Card className="max-w-2xl mx-auto"><CardHeader><Skeleton className="h-6 w-1/2" /><Skeleton className="h-4 w-3/4 mt-2" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-10 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (!user && !authIsLoading) {
    return (
       <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <PageTitle title="Company Details" subtitle="Manage your business information." icon={Building} />
        <Card className="max-w-2xl mx-auto"><CardHeader><CardTitle className="font-headline">Access Denied</CardTitle></CardHeader><CardContent><p>Please sign in to manage your company details.</p></CardContent></Card>
      </div>
    )
  }


  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageTitle title="Company Details" subtitle="Manage your business information." icon={Building} />

      <Card className="max-w-2xl mx-auto">
        <CardHeader><CardTitle>Company Identifier</CardTitle><CardDescription>Share this 6-digit ID with new employees to ensure they join the correct company profile.</CardDescription></CardHeader>
        <CardContent><div className="flex items-center gap-2 p-2 border rounded-md bg-muted"><Input readOnly value={companyDetails.publicCompanyId || 'Not generated'} className="bg-background font-mono text-sm tracking-widest" /><Button type="button" size="icon" variant="outline" onClick={handleCopyId} disabled={!companyDetails.publicCompanyId}><Copy className="h-4 w-4" /></Button></div></CardContent>
      </Card>

      <Card className="max-w-2xl mx-auto">
        <CardHeader><CardTitle className="font-headline">Business Information</CardTitle><CardDescription>Update your company's official details. This information may be used in invoices or other documents.</CardDescription></CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
            <div><Label htmlFor="name">Company Name</Label><Input id="name" name="name" value={companyDetails.name || ''} onChange={handleChange} placeholder="e.g., Acme Corp Ltd." required disabled={isSaving}/></div>
            <div><Label htmlFor="address">Street Address</Label><Textarea id="address" name="address" value={companyDetails.address || ''} onChange={handleChange} placeholder="e.g., 123 Main Street" rows={2} required disabled={isSaving} /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label htmlFor="city">City</Label><Input id="city" name="city" value={companyDetails.city || ''} onChange={handleChange} placeholder="e.g., Anytown" required disabled={isSaving}/></div>
              <div><Label htmlFor="state">State / Province</Label><Input id="state" name="state" value={companyDetails.state || ''} onChange={handleChange} placeholder="e.g., CA or Ontario" required disabled={isSaving}/></div>
            </div>
            <div><Label htmlFor="country">Country</Label><Select value={companyDetails.country} onValueChange={handleCountryChange} required disabled={isSaving}><SelectTrigger id="country"><SelectValue placeholder="Select a country" /></SelectTrigger><SelectContent>{COUNTRIES.map((c) => (<SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>))}</SelectContent></Select></div>
            <Separator className="my-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label htmlFor="gstin">GSTIN / Tax ID</Label><Input id="gstin" name="gstin" value={companyDetails.gstin || ''} onChange={handleChange} placeholder="e.g., 22AAAAA0000A1Z5" required disabled={isSaving} /></div>
              <div><Label htmlFor="pan">PAN Number</Label><Input id="pan" name="pan" value={companyDetails.pan || ''} onChange={handleChange} placeholder="e.g., ABCDE1234F" disabled={isSaving} /></div>
            </div>
            <Separator className="my-4" />
            <div className="space-y-2"><h3 className="text-md font-medium">Bank Details (Optional)</h3><p className="text-xs text-muted-foreground">These details will be shown on invoices for bank transfers.</p></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label htmlFor="bankName">Bank Name</Label><Input id="bankName" name="bankName" value={companyDetails.bankName || ''} onChange={handleChange} placeholder="e.g., State Bank of India" disabled={isSaving} /></div>
                <div><Label htmlFor="accountNumber">Account Number</Label><Input id="accountNumber" name="accountNumber" value={companyDetails.accountNumber || ''} onChange={handleChange} placeholder="e.g., 1234567890" disabled={isSaving} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label htmlFor="ifscCode">IFSC Code</Label><Input id="ifscCode" name="ifscCode" value={companyDetails.ifscCode || ''} onChange={handleChange} placeholder="e.g., SBIN0001234" disabled={isSaving}/></div>
                <div><Label htmlFor="branch">Branch</Label><Input id="branch" name="branch" value={companyDetails.branch || ''} onChange={handleChange} placeholder="e.g., Main Street Branch" disabled={isSaving}/></div>
            </div>
            <Separator className="my-4" />
            <div className="space-y-2"><h3 className="text-md font-medium">Contact Details</h3></div>
            <div><Label htmlFor="phone">Phone Number (Optional)</Label><Input id="phone" name="phone" type="tel" value={companyDetails.phone || ''} onChange={handleChange} placeholder="e.g., +1-555-123-4567" disabled={isSaving} /></div>
            <div><Label htmlFor="email">Contact Email (Optional)</Label><Input id="email" name="email" type="email" value={companyDetails.email || ''} onChange={handleChange} placeholder="e.g., contact@example.com" disabled={isSaving} /></div>
            <div><Label htmlFor="website">Website (Optional)</Label><Input id="website" name="website" type="url" value={companyDetails.website || ''} onChange={handleChange} placeholder="e.g., https://www.example.com" disabled={isSaving} /></div>
            <Separator className="my-4" />
            <div className="space-y-3"><h3 className="text-md font-medium">Invoice Assets</h3></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div>
                <Label>Signature Image</Label>
                <div className="mt-2 p-2 border rounded-md min-h-[100px] flex items-center justify-center bg-muted/30">
                  {signaturePreview ? <Image src={signaturePreview} alt="Signature Preview" width={150} height={75} className="object-contain h-20" /> : <p className="text-sm text-muted-foreground">No signature set</p>}
                </div>
                <div className="flex gap-2 mt-2">
                  <Button type="button" variant="outline" size="sm" asChild><Label className="cursor-pointer">Upload <Input type="file" accept="image/png, image/jpeg" onChange={(e) => handleFileChange(e, 'signature')} className="hidden" disabled={isSaving} /></Label></Button>
                  <Dialog open={isSignatureDialogOpen} onOpenChange={setIsSignatureDialogOpen}><DialogTrigger asChild><Button type="button" variant="outline" size="sm"><PenSquare className="mr-2 h-4 w-4"/>Draw</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Draw Signature</DialogTitle><DialogDescription>Draw your signature in the box below. It will be saved and used on invoices.</DialogDescription></DialogHeader><SignaturePad onSave={handleSignatureSave} isSaving={isSaving} /></DialogContent></Dialog>
                </div>
              </div>
              <div>
                <Label>Company Stamp</Label>
                 <div className="mt-2 p-2 border rounded-md min-h-[100px] flex items-center justify-center bg-muted/30">
                  {stampPreview ? <Image src={stampPreview} alt="Stamp Preview" width={100} height={100} className="object-contain h-24 w-24" /> : <p className="text-sm text-muted-foreground">No stamp set</p>}
                </div>
                <Button type="button" variant="outline" size="sm" asChild className="mt-2"><Label className="cursor-pointer">Upload Stamp<Input type="file" accept="image/png, image/jpeg" onChange={(e) => handleFileChange(e, 'stamp')} className="hidden" disabled={isSaving}/></Label></Button>
              </div>
            </div>
            <CardFooter className="px-0 pt-6">
              <Button type="submit" disabled={isSaving || isFetching} className="w-full sm:w-auto ml-auto">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save Details
              </Button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
