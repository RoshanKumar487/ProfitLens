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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, TrendingDown, Save } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const EXPENSE_CATEGORIES = [
  'Software & Subscriptions',
  'Marketing & Advertising',
  'Office Supplies',
  'Utilities',
  'Rent & Lease',
  'Salaries & Wages',
  'Travel',
  'Meals & Entertainment',
  'Professional Services',
  'Other',
];

interface ExpenseEntry {
  id: string;
  date: Date;
  amount: number;
  category: string;
  description?: string;
  vendor?: string;
}

export default function RecordExpensesPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [vendor, setVendor] = useState<string>('');
  const [recentEntries, setRecentEntries] = useState<ExpenseEntry[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const storedExpenses = localStorage.getItem('bizsight-expenses');
    if (storedExpenses) {
      setRecentEntries(JSON.parse(storedExpenses).map((entry: ExpenseEntry) => ({...entry, date: new Date(entry.date)})));
    }
  }, []);

  useEffect(() => {
    if (recentEntries.length > 0 || localStorage.getItem('bizsight-expenses')) {
      localStorage.setItem('bizsight-expenses', JSON.stringify(recentEntries));
    }
  }, [recentEntries]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !amount || !category) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in date, amount, and category.',
        variant: 'destructive',
      });
      return;
    }
    
    const newEntry: ExpenseEntry = {
      id: crypto.randomUUID(),
      date,
      amount: parseFloat(amount),
      category,
      description,
      vendor,
    };

    const updatedEntries = [newEntry, ...recentEntries].slice(0, 5); // Keep last 5
    setRecentEntries(updatedEntries);
    
    toast({
      title: 'Expense Recorded',
      description: `Successfully recorded $${amount} for ${category}.`,
    });

    // Reset form
    setDate(new Date());
    setAmount('');
    setCategory('');
    setDescription('');
    setVendor('');
  };

  return (
    <div className="space-y-6">
      <PageTitle title="Record Expenses" subtitle="Log your business expenditures." icon={TrendingDown} />

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">New Expense Entry</CardTitle>
            <CardDescription>Enter the details of the expense incurred.</CardDescription>
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
                  placeholder="e.g., 75.50"
                  required
                  min="0.01"
                  step="0.01"
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory} required>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="vendor">Vendor (Optional)</Label>
                <Input
                  id="vendor"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  placeholder="e.g., AWS, Staples"
                />
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Monthly server costs, Printer paper"
                />
              </div>

              <Button type="submit" className="w-full">
                <Save className="mr-2 h-4 w-4" /> Record Expense
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">Recent Expense Entries</CardTitle>
            <CardDescription>Last 5 recorded expense entries.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentEntries.length > 0 ? (
              recentEntries.map(entry => (
                <div key={entry.id} className="p-3 bg-muted/50 rounded-lg border border-border">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-foreground">${entry.amount.toFixed(2)}</span>
                    <span className="text-xs text-muted-foreground">{format(new Date(entry.date), 'PP')}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{entry.category}{entry.vendor ? ` - ${entry.vendor}` : ''}</p>
                  {entry.description && <p className="text-xs text-muted-foreground mt-1">{entry.description}</p>}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No expenses recorded yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
