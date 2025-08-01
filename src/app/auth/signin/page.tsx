
'use client';

import React from 'react';
import Link from 'next/link';
import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { signIn } from '../actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      Sign In
    </Button>
  );
}

export default function SignInPage() {
  const [state, formAction] = useActionState(signIn, undefined);
  const { toast } = useToast();

  useEffect(() => {
    if (state?.error) {
      toast({
        title: 'Sign In Failed',
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
            <CardTitle className="text-2xl">Sign In</CardTitle>
            <CardDescription>Enter your credentials to access your account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
              Don&apos;t have an account?{' '}
              <Link href="/auth/signup" className="font-semibold text-primary underline-offset-4 hover:underline">
                Sign up
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
