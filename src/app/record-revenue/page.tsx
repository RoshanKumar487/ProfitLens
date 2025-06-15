
'use client';

import React, { useState, useEffect, FormEvent, useCallback } from 'react';
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
import { collection, addDoc, getDocs, query, where, orderBy, limit, Timestamp, serverTimestamp } from 'firebase/firestore';

interface RevenueEntryFirestore {
  id: string; // Firestore document ID
  date: Timestamp; 
  amount: number;
  source: string;
  description?: string;
  companyId: string;
  createdAt: Timestamp;
}

interface RevenueEntryDisplay {
  id: string;
  date: Date; // For display
  amount: number;
  source: string;
  description?: string;
}

export default function RecordRevenuePage() {
  const { user, isLoading: authIsLoading } = useAuth();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [amount, setAmount] = useState<string>('');
  const [source, setSource] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [recentEntries, setRecentEntries] = useState<RevenueEntryDisplay[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const fetchRevenueEntries = useCallback(async () => {
    if (authIsLoading) {
      setIsLoadingEntries(true);
      return;
    }
    if (!user || !user.companyId) {
      setIsLoadingEntries(false);
      setRecentEntries([]);
      console.log("RecordRevenue: User or companyId not found for fetching entries.");
      return;
    }

    setIsLoadingEntries(true);
    try {
      const entriesRef = collection(db, 'revenueEntries');
      const q = query(entriesRef, where('companyId', '==', user.companyId), orderBy('date', 'desc'), limit(5));
      const querySnapshot = await getDocs(q);
      
      const fetchedEntries = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data() as Omit<RevenueEntryFirestore, 'id'>;
        return {
          id: docSnap.id,
          date: data.date.toDate(), // Convert Timestamp to Date for display
          amount: data.amount,
          source: data.source,
          description: data.description,
        };
      });
      setRecentEntries(fetchedEntries);
      console.log("RecordRevenue: Fetched", fetchedEntries.length, "entries for companyId:", user.companyId);
    } catch (error: any) {
      console.error('Error fetching revenue entries from Firestore:', error);
      toast({
        title: 'Error Loading Entries',
        description: error.message || 'Could not load recent revenue entries from Firestore.',
        variant: 'destructive',
      });
      setRecentEntries([]);
    } finally {
      setIsLoadingEntries(false);
    }
  }, [user, user?.companyId, authIsLoading, toast]);

  useEffect(() => {
    fetchRevenueEntries();
  }, [fetchRevenueEntries]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !user.companyId) {
      toast({ title: 'Authentication Error', description: 'User not authenticated.', variant: 'destructive' });
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
      source,
      description,
      companyId: user.companyId,
      createdAt: serverTimestamp(),
    };

    try {
      const docRef = await addDoc(collection(db, 'revenueEntries'), newEntryPayload);
      
      // Optimistically update UI or refetch
      fetchRevenueEntries(); // Refetch to get the latest list including the new one
      
      toast({
        title: 'Revenue Recorded',
        description: `Successfully recorded $${amountNum.toFixed(2)} from ${source}.`,
      });
      console.log("RecordRevenue: Saved new entry with ID:", docRef.id);

      setDate(new Date());
      setAmount('');
      setSource('');
      setDescription('');
    } catch (error: any) {
      console.error('Error saving revenue entry to Firestore:', error);
      toast({
        title: 'Save Failed',
        description: error.message || 'Could not save revenue entry to Firestore.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageTitle title="Record Revenue" subtitle="Log your daily or transaction-based income." icon={TrendingUp} />

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">New Revenue Entry</CardTitle>
            <CardDescription>Enter the details of the revenue received.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      disabled={isSaving}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                      disabled={isSaving}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g., 150.00"
                  required
                  min="0.01"
                  step="0.01"
                  disabled={isSaving}
                />
              </div>

              <div>
                <Label htmlFor="source">Source</Label>
                <Input
                  id="source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="e.g., Client A Payment, Product Sale"
                  required
                  disabled={isSaving}
                />
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Payment for project X, Sale of 10 units of Y"
                  disabled={isSaving}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSaving || isLoadingEntries}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {isSaving ? 'Saving...' : 'Record Revenue'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">Recent Revenue Entries</CardTitle>
            <CardDescription>Last 5 recorded revenue entries from Firestore.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingEntries ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="p-3 bg-muted/50 rounded-lg border border-border animate-pulse">
                  <div className="flex justify-between items-center">
                    <div className="h-5 bg-muted rounded w-1/4"></div>
                    <div className="h-4 bg-muted rounded w-1/5"></div>
                  </div>
                  <div className="h-4 bg-muted rounded w-1/2 mt-1"></div>
                  <div className="h-3 bg-muted rounded w-3/4 mt-1"></div>
                </div>
              ))
            ) : recentEntries.length > 0 ? (
              recentEntries.map(entry => (
                <div key={entry.id} className="p-3 bg-muted/50 rounded-lg border border-border">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-foreground">${entry.amount.toFixed(2)}</span>
                    <span className="text-xs text-muted-foreground">{format(entry.date, 'PP')}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{entry.source}</p>
                  {entry.description && <p className="text-xs text-muted-foreground mt-1">{entry.description}</p>}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No revenue recorded in Firestore yet for this company.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
