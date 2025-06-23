
'use client';

import React, { useState, type FormEvent, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UserPlus, Loader2, AlertTriangle, Building, Search, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { COUNTRIES } from '@/lib/countries';
import { Alert, AlertTitle } from '@/components/ui/alert';

export default function SignUpPage() {
  // User fields
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Company fields
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  
  // Company Search State
  const [companyList, setCompanyList] = useState<{ id: string; name: string }[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<{ id: string; name: string } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showCompanyList, setShowCompanyList] = useState(false);

  const { signUp, isLoading, error } = useAuth();
  const { toast } = useToast();
  const [pageError, setPageError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pendingApproval, setPendingApproval] = useState(false);

  useEffect(() => {
    if (searchParams.get('status') === 'pending_approval') {
      setPendingApproval(true);
    }
  }, [searchParams]);

  const isNewCompany = useMemo(() => !selectedCompany, [selectedCompany]);

  useEffect(() => {
    if (companyName.trim().length < 1) {
      setCompanyList([]);
      setShowCompanyList(false);
      setSelectedCompany(null);
      return;
    }
    if (selectedCompany && companyName !== selectedCompany.name) {
        setSelectedCompany(null);
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const response = await fetch(`/api/companies?q=${encodeURIComponent(companyName)}`);
      if (response.ok) {
        const data = await response.json();
        setCompanyList(data);
        setShowCompanyList(true);
      }
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [companyName, selectedCompany]);


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPageError(null);
    if (!displayName || !email || !password || !confirmPassword || !companyName) {
      setPageError("Your name, email, password, and company name are required.");
      return;
    }
    if (isNewCompany && (!companyAddress || !city || !state || !country)) {
        setPageError("Address, city, state, and country are required for a new company.");
        return;
    }
    if (password !== confirmPassword) {
      setPageError("Passwords do not match.");
      return;
    }

    const companyInfo = {
      id: selectedCompany?.id,
      name: companyName,
      address: companyAddress,
      city: city,
      stateOrProvince: state,
      country: country,
    };

    const result = await signUp(email, password, displayName, companyInfo);

    if (result.status === 'pending') {
      router.push('/auth/signup?status=pending_approval');
    }
    // AuthContext handles redirect to dashboard for 'approved' status
  };

  const handleSelectCompany = (company: { id: string; name: string }) => {
    setSelectedCompany(company);
    setCompanyName(company.name);
    setShowCompanyList(false);
  };
  
  if (pendingApproval) {
    return (
       <div className="flex flex-col items-center justify-center min-h-screen py-8">
            <PageTitle title="Request Sent" icon={CheckCircle} />
            <Card className="w-full max-w-md shadow-xl">
                 <CardHeader>
                    <CardTitle className="text-2xl font-headline">Approval Pending</CardTitle>
                    <CardDescription>Your request to join has been sent to the company's administrator.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">You will be able to sign in once your request has been approved. Please check back later.</p>
                     <Button asChild className="w-full mt-4">
                        <Link href="/auth/signin">Back to Sign In</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-8">
      <PageTitle title="Sign Up" subtitle="Create your ProfitLens account." icon={UserPlus} />
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Create an Account</CardTitle>
          <CardDescription>Join an existing company or create a new one.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {pageError && (
              <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>{pageError}</AlertTitle></Alert>
            )}
            {error && (
              <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>{error.message}</AlertTitle></Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="displayName">Your Full Name</Label>
                <Input id="displayName" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g., John Doe" required disabled={isLoading} />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required disabled={isLoading} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a strong password" required disabled={isLoading} />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter your password" required disabled={isLoading} />
              </div>
            </div>
            
            <Separator className="my-6" />
            <h3 className="text-lg font-medium flex items-center gap-2"><Building className="h-5 w-5 text-primary" /> Company Information</h3>

            <div className="relative">
              <Label htmlFor="companyName">Company Name</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="companyName"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Type to find your company..."
                  required
                  autoComplete="off"
                  disabled={isLoading}
                />
                 {isSearching && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              {showCompanyList && companyList.length > 0 && (
                <Card className="absolute z-10 w-full mt-1 shadow-lg max-h-48 overflow-y-auto">
                  <CardContent className="p-2">
                    {companyList.map((company) => (
                      <div key={company.id} onMouseDown={() => handleSelectCompany(company)} className="p-2 text-sm rounded-md hover:bg-accent cursor-pointer">
                        {company.name}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
               {selectedCompany && (
                 <p className="text-xs mt-1 text-green-600 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> You are requesting to join an existing company.</p>
               )}
            </div>

            {isNewCompany && (
                <div className="space-y-4 pt-2 border-t mt-4">
                    <p className="text-sm text-muted-foreground">This looks like a new company. Please provide its details.</p>
                    <div>
                        <Label htmlFor="companyAddress">Company Address (Street)</Label>
                        <Input id="companyAddress" type="text" value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} placeholder="e.g., 123 Main St" required={isNewCompany} disabled={isLoading} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                        <Label htmlFor="city">City</Label>
                        <Input id="city" type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g., Anytown" required={isNewCompany} disabled={isLoading} />
                        </div>
                        <div>
                        <Label htmlFor="state">State / Province</Label>
                        <Input id="state" type="text" value={state} onChange={(e) => setState(e.target.value)} placeholder="e.g., CA or Ontario" required={isNewCompany} disabled={isLoading} />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="country">Country</Label>
                        <Select value={country} onValueChange={setCountry} required={isNewCompany} disabled={isLoading}>
                            <SelectTrigger id="country"><SelectValue placeholder="Select a country" /></SelectTrigger>
                            <SelectContent>{COUNTRIES.map((c) => (<SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>))}</SelectContent>
                        </Select>
                    </div>
                </div>
            )}
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              {isNewCompany ? 'Create Account & Company' : 'Request to Join'}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/auth/signin" className="font-medium text-primary hover:underline">
              Sign In
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
