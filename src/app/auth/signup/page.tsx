
'use client';

import React, { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UserPlus, Loader2, AlertTriangle, Building } from 'lucide-react'; // Removed MapPin, Home, Map as they are not used
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator'; // Added import for Separator

export default function SignUpPage() {
  const [displayName, setDisplayName] = useState(''); // User's full name
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  const { signUp, isLoading, error } = useAuth();
  const { toast } = useToast();
  const [pageError, setPageError] = useState<string | null>(null);


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPageError(null);
    if (!displayName || !email || !password || !confirmPassword || !companyName || !companyAddress || !city || !state) {
      setPageError("All fields are required.");
      toast({ title: "Missing Fields", description: "Please fill out all fields.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      setPageError("Passwords do not match.");
      toast({ title: "Password Mismatch", description: "Please ensure passwords match.", variant: "destructive" });
      return;
    }
    
    await signUp(email, password, displayName, companyName, companyAddress, city, state);
    
    // Error state from useAuth might be stale immediately after signUp resolves.
    // It's better to rely on the error returned by signUp or if AuthContext updates its error state reactively.
    // For now, checking `error` from `useAuth()` which should update if `signUp` sets an error in the context.
    if (useAuth().error) { 
        setPageError(useAuth().error!.message); // Ensure useAuth().error is not null before accessing message
    }
    // Navigation is handled by AuthContext on successful sign-up
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] py-8">
      <PageTitle title="Sign Up" subtitle="Create your BizSight account and set up your company." icon={UserPlus} />
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Create an Account</CardTitle>
          <CardDescription>Join BizSight to manage your business effectively.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
             {pageError && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4"/> {pageError}
              </div>
            )}
            {error && !pageError && ( // Display general auth context error if not already shown by pageError
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4"/> {error.message}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="displayName">Your Full Name</Label>
                <Input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g., John Doe"
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
            
            <Separator className="my-6" />
            <h3 className="text-lg font-medium flex items-center gap-2"><Building className="h-5 w-5 text-primary" /> Company Information</h3>

            <div>
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g., Acme Corp"
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <Label htmlFor="companyAddress">Company Address (Street)</Label>
              <Input
                id="companyAddress"
                type="text"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                placeholder="e.g., 123 Main St"
                required
                disabled={isLoading}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g., Anytown"
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <Label htmlFor="state">State / Province</Label>
                <Input
                  id="state"
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g., CA or Ontario"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Sign Up
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
