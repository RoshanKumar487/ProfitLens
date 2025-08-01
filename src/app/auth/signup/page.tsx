
'use client';

import React from 'react';
import Link from 'next/link';
import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { signUp } from '../actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      Create Account
    </Button>
  );
}

export default function SignUpPage() {
  const [state, formAction] = useActionState(signUp, undefined);
  const { toast } = useToast();

  useEffect(() => {
    if (state?.error) {
      toast({
        title: 'Sign Up Failed',
        description: state.error,
        variant: 'destructive',
      });
    }
  }, [state, toast]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <form action={formAction}>
          <CardHeader>
            <CardTitle className="text-2xl">Sign Up</CardTitle>
            <CardDescription>Create your account to get started.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" name="name" placeholder="John Doe" required />
            </div>
             <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input id="companyName" name="companyName" placeholder="Acme Inc." required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="m@example.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-4">
            <SubmitButton />
            <div className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/auth/signin" className="font-semibold text-primary underline-offset-4 hover:underline">
                Sign in
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
