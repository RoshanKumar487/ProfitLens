
'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, TrendingUp, Save, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface RevenueEntry {
  id: string; // MongoDB _id as string
  date: Date; // Will be Date object in state, string from/to API
  amount: number;
  source: string;
  description?: string;
}

export default function RecordRevenuePage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [amount, setAmount] = useState<string>('');
  const [source, setSource] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [recentEntries, setRecentEntries] = useState<RevenueEntry[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchRevenueEntries = async () => {
      setIsLoadingEntries(true);
      try {
        const response = await fetch('/api/revenue-entries');
        if (!response.ok) {
          throw new Error('Failed to fetch entries');
        }
        const data = await response.json();
        // Ensure date is parsed into Date object
        setRecentEntries(data.map((entry: any) => ({...entry, date: parseISO(entry.date)})));
      } catch (error) {
        console.error('Error fetching revenue entries:', error);
        toast({
          title: 'Error Loading Entries',
          description: 'Could not load recent revenue entries.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingEntries(false);
      }
    };

    fetchRevenueEntries();
  }, [toast]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!date || !amount || !source) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in date, amount, and source.',
        variant: 'destructive',
      });
      return;
    }
    
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
        toast({
            title: 'Invalid Amount',
            description: 'Amount must be a positive number.',
            variant: 'destructive',
        });
        return;
    }


    setIsSaving(true);
    const newEntryPayload = {
      date: date.toISOString(), // Send as ISO string
      amount: amountNum,
      source,
      description,
    };

    try {
      const response = await fetch('/api/revenue-entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newEntryPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save entry');
      }
      
      const savedEntry = await response.json();

      // Add new entry to the top and keep list to 5
      setRecentEntries(prevEntries => 
        [{ ...savedEntry, date: parseISO(savedEntry.date) }, ...prevEntries].slice(0, 5)
      );
      
      toast({
        title: 'Revenue Recorded',
        description: `Successfully recorded $${amountNum.toFixed(2)} from ${source}.`,
      });

      // Reset form
      setDate(new Date());
      setAmount('');
      setSource('');
      setDescription('');
    } catch (error: any) {
      console.error('Error saving revenue entry:', error);
      toast({
        title: 'Save Failed',
        description: error.message || 'Could not save revenue entry.',
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
            <CardDescription>Last 5 recorded revenue entries.</CardDescription>
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
                    {/* Ensure entry.date is a Date object before formatting */}
                    <span className="text-xs text-muted-foreground">{entry.date instanceof Date ? format(entry.date, 'PP') : format(parseISO(entry.date as unknown as string), 'PP')}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{entry.source}</p>
                  {entry.description && <p className="text-xs text-muted-foreground mt-1">{entry.description}</p>}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No revenue recorded yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
