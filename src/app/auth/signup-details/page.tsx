
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Building } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { completeSignUp } from '../actions';

export default function SignUpDetailsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();

  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && user) {
        // User already has a profile, shouldn't be here
        router.push('/dashboard');
    }
  }, [user, isAuthLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !companyName) {
        toast({ title: 'Missing Information', description: 'Please enter your name and company name.', variant: 'destructive'});
        return;
    }
    setIsSubmitting(true);
    
    const result = await completeSignUp({ name, companyName });
    
    if (result.success) {
        toast({ title: 'Profile Complete!', description: 'Welcome to your new dashboard.' });
        router.push('/dashboard');
    } else {
        toast({ title: 'An Error Occurred', description: result.error, variant: 'destructive'});
        setIsSubmitting(false);
    }
  };

  if (isAuthLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="text-2xl">One Last Step</CardTitle>
            <CardDescription>Tell us a bit about yourself and your company to get started.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2"><User className="h-4 w-4" />Your Full Name</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} required disabled={isSubmitting}/>
            </div>
             <div className="space-y-2">
                <Label htmlFor="companyName" className="flex items-center gap-2"><Building className="h-4 w-4" />Company Name</Label>
                <Input id="companyName" value={companyName} onChange={e => setCompanyName(e.target.value)} required disabled={isSubmitting}/>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Let's Go!
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
