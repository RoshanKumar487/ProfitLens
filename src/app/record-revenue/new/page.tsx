
'use client';

import React, { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, TrendingUp, Save, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, addDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import Link from 'next/link';

export default function NewRevenuePage() {
  const { user, currencySymbol } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [amount, setAmount] = useState<string>('');
  const [source, setSource] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !user.companyId) {
      toast({ title: 'Authentication Error', variant: 'destructive' });
      return;
    }
    if (!date || !amount || !source) {
      toast({ title: 'Missing Information', description: 'Please fill in date, amount, and source.', variant: 'destructive' });
      return;
    }
    
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({ title: 'Invalid Amount', description: 'Amount must be a positive number.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    const newEntryPayload = {
      date: Timestamp.fromDate(date), 
      amount: amountNum,
      source: source,
      description: description || '',
      companyId: user.companyId,
      createdAt: serverTimestamp(),
      addedById: user.uid,
      addedBy: user.displayName || user.email || 'System'
    };

    try {
      await addDoc(collection(db, 'revenueEntries'), newEntryPayload);
      toast({ title: 'Revenue Recorded', description: `Successfully recorded ${currencySymbol}${amountNum.toFixed(2)} from ${source}.` });
      router.push('/record-revenue');
    } catch (error: any) {
      toast({ title: 'Save Failed', description: error.message, variant: 'destructive' });
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageTitle title="New Revenue Entry" subtitle="Log an income entry for your business." icon={TrendingUp} />
      <Card className="max-w-2xl mx-auto shadow-lg">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Revenue Details</CardTitle>
            <CardDescription>Enter the details of the revenue received.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal" disabled={isSaving}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={setDate} initialFocus disabled={isSaving}/></PopoverContent>
              </Popover>
            </div>
            <div>
              <Label htmlFor="amount">Amount ({currencySymbol})</Label>
              <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g., 150.00" required min="0.01" step="0.01" disabled={isSaving}/>
            </div>
            <div>
              <Label htmlFor="source">Source</Label>
              <Input id="source" value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g., Client A Payment, Product Sale" required disabled={isSaving}/>
            </div>
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g., Payment for project X" disabled={isSaving}/>
            </div>
          </CardContent>
          <CardHeader className="p-6 pt-0">
             <div className="flex justify-end gap-2">
                <Button variant="outline" asChild type="button">
                    <Link href="/record-revenue">Cancel</Link>
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Record Revenue
                </Button>
            </div>
          </CardHeader>
        </form>
      </Card>
    </div>
  );
}

    