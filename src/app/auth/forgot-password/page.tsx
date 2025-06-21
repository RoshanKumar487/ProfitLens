'use client';

import React, { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Mail, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);
  const { sendPasswordReset } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email) {
      setError("Email address is required.");
      return;
    }

    setIsSending(true);
    try {
      await sendPasswordReset(email);
      setIsSent(true);
      toast({
        title: "Email Sent",
        description: "A password reset link has been sent to your email address.",
      });
    } catch (err: any) {
      setError(err.message || "An unknown error occurred.");
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] py-8">
      <PageTitle title="Forgot Password" subtitle="Enter your email to receive a reset link." icon={Mail} />
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Reset Your Password</CardTitle>
          <CardDescription>We'll send a password reset link to your email.</CardDescription>
        </CardHeader>
        <CardContent>
          {isSent ? (
            <Alert variant="default" className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Check Your Inbox</AlertTitle>
              <p className="text-sm text-green-700">
                A password reset link has been sent to <strong>{email}</strong>. Please follow the instructions in the email to reset your password.
              </p>
               <Button asChild className="w-full mt-4">
                  <Link href="/auth/signin">Back to Sign In</Link>
               </Button>
            </Alert>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{error}</AlertTitle>
                </Alert>
              )}
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={isSending}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSending}>
                {isSending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                Send Reset Link
              </Button>
            </form>
          )}
          {!isSent && (
             <p className="mt-6 text-center text-sm text-muted-foreground">
                Remember your password?{' '}
                <Link href="/auth/signin" className="font-medium text-primary hover:underline">
                Sign In
                </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
