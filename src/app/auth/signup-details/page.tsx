
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { completeSignUp } from '../actions';
import { CompanyDetailsSchema, type CompanyDetailsInput } from '@/lib/schemas';
import { Loader2 } from 'lucide-react';
import { COUNTRIES } from '@/lib/countries';
import { useAuth } from '@/contexts/AuthContext';

export default function SignupDetailsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<CompanyDetailsInput>({
    resolver: zodResolver(CompanyDetailsSchema),
    defaultValues: {
      userName: '',
      companyName: '',
      country: '',
    },
  });

  const onSubmit = async (data: CompanyDetailsInput) => {
    setError(null);
    const result = await completeSignUp(data);

    if (result.success) {
      toast({ title: 'Welcome!', description: 'Your account is all set up.' });
      router.push('/dashboard');
      router.refresh();
    } else {
      setError(result.error || 'An unknown error occurred.');
    }
  };
  
  if (!user) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Verifying session...</p>
            </div>
        </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent p-4">
      <Card className="w-full max-w-md">
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle>Almost there!</CardTitle>
            <CardDescription>Tell us a bit about you and your company.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Form {...form}>
              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="userName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Jane Doe" {...field} disabled={form.formState.isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Acme Inc." {...field} disabled={form.formState.isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
               <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={form.formState.isSubmitting}>
                           <FormControl>
                             <SelectTrigger>
                                <SelectValue placeholder="Select your country" />
                             </SelectTrigger>
                           </FormControl>
                            <SelectContent>
                                {COUNTRIES.map((country) => (
                                    <SelectItem key={country.code} value={country.code}>{country.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Form>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Let's Get Started
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
