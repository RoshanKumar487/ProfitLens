'use client';

import React, { useState, useEffect } from 'react';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, TrendingUp, Save } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface RevenueEntry {
  id: string;
  date: Date;
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
  const { toast } = useToast();

  useEffect(() => {
    const storedRevenue = localStorage.getItem('bizsight-revenue');
    if (storedRevenue) {
      setRecentEntries(JSON.parse(storedRevenue).map((entry: RevenueEntry) => ({...entry, date: new Date(entry.date)})));
    }
  }, []);
  
  useEffect(() => {
    if (recentEntries.length > 0 || localStorage.getItem('bizsight-revenue')) {
        localStorage.setItem('bizsight-revenue', JSON.stringify(recentEntries));
    }
  }, [recentEntries]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !amount || !source) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in date, amount, and source.',
        variant: 'destructive',
      });
      return;
    }

    const newEntry: RevenueEntry = {
      id: crypto.randomUUID(),
      date,
      amount: parseFloat(amount),
      source,
      description,
    };
    
    const updatedEntries = [newEntry, ...recentEntries].slice(0, 5); // Keep last 5
    setRecentEntries(updatedEntries);
    
    toast({
      title: 'Revenue Recorded',
      description: `Successfully recorded $${amount} from ${source}.`,
    });

    // Reset form
    setDate(new Date());
    setAmount('');
    setSource('');
    setDescription('');
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
                />
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Payment for project X, Sale of 10 units of Y"
                />
              </div>

              <Button type="submit" className="w-full">
                <Save className="mr-2 h-4 w-4" /> Record Revenue
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
            {recentEntries.length > 0 ? (
              recentEntries.map(entry => (
                <div key={entry.id} className="p-3 bg-muted/50 rounded-lg border border-border">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-foreground">${entry.amount.toFixed(2)}</span>
                    <span className="text-xs text-muted-foreground">{format(new Date(entry.date), 'PP')}</span>
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
