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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, TrendingDown, Save, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, addDoc, getDocs, query, where, orderBy, limit, Timestamp, serverTimestamp } from 'firebase/firestore';

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

interface ExpenseEntryFirestore {
  id?: string; 
  date: Timestamp;
  amount: number;
  category: string;
  description?: string;
  vendor?: string;
  companyId: string;
  createdAt: Timestamp;
}

interface ExpenseEntryDisplay {
  id: string;
  date: Date; 
  amount: number;
  category: string;
  description?: string;
  vendor?: string;
}

export default function RecordExpensesPage() {
  const { user, isLoading: authIsLoading } = useAuth();
  const currency = user?.currencySymbol || '$';
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [vendor, setVendor] = useState<string>('');
  const [recentEntries, setRecentEntries] = useState<ExpenseEntryDisplay[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const fetchExpenseEntries = useCallback(async () => {
    if (authIsLoading) {
      setIsLoadingEntries(true);
      return;
    }
    if (!user || !user.companyId) {
      setIsLoadingEntries(false);
      setRecentEntries([]);
      return;
    }

    setIsLoadingEntries(true);
    try {
      const entriesRef = collection(db, 'expenses');
      const q = query(entriesRef, where('companyId', '==', user.companyId), orderBy('date', 'desc'), limit(5));
      const querySnapshot = await getDocs(q);
      
      const fetchedEntries = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data() as Omit<ExpenseEntryFirestore, 'id'>;
        return {
          id: docSnap.id,
          date: data.date.toDate(),
          amount: data.amount,
          category: data.category,
          description: data.description,
          vendor: data.vendor,
        };
      });
      setRecentEntries(fetchedEntries);
    } catch (error: any) {
      console.error('Error fetching expense entries:', error);
      toast({
        title: 'Error Loading Entries',
        description: error.message,
        variant: 'destructive',
      });
      setRecentEntries([]);
    } finally {
      setIsLoadingEntries(false);
    }
  }, [user, authIsLoading, toast]);

  useEffect(() => {
    fetchExpenseEntries();
  }, [fetchExpenseEntries]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.companyId) {
      toast({ title: 'Authentication Error', description: 'User not authenticated.', variant: 'destructive' });
      return;
    }
    if (!date || !amount || !category) {
      toast({ title: 'Missing Information', description: 'Please fill in date, amount, and category.', variant: 'destructive' });
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
      category,
      description: description || '',
      vendor: vendor || '',
      companyId: user.companyId,
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, 'expenses'), newEntryPayload);
      fetchExpenseEntries();
      toast({
        title: 'Expense Recorded',
        description: `Successfully recorded ${currency}${amountNum.toFixed(2)} for ${category}.`,
      });
      setDate(new Date());
      setAmount('');
      setCategory('');
      setDescription('');
      setVendor('');
    } catch (error: any) {
      console.error('Error saving expense entry:', error);
      toast({
        title: 'Save Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (authIsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
         <p className="ml-2">Loading authentication...</p>
      </div>
    );
  }

  if (!user && !authIsLoading) {
     return (
      <div className="space-y-6">
        <PageTitle title="Record Expenses" subtitle="Log your business expenditures." icon={TrendingDown} />
        <Card className="shadow-lg">
          <CardHeader><CardTitle>Access Denied</CardTitle></CardHeader>
          <CardContent><p>Please sign in to record expenses.</p></CardContent>
        </Card>
      </div>
    )
  }


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
                <Label htmlFor="amount">Amount ({currency})</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g., 75.50"
                  required
                  min="0.01"
                  step="0.01"
                  disabled={isSaving}
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory} disabled={isSaving}>
                  <SelectTrigger id="category" required>
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
                  disabled={isSaving}
                />
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Monthly server costs, Printer paper"
                  disabled={isSaving}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSaving || isLoadingEntries}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {isSaving ? 'Saving...' : 'Record Expense'}
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
                    <span className="font-semibold text-foreground">{currency}{entry.amount.toFixed(2)}</span>
                    <span className="text-xs text-muted-foreground">{format(entry.date, 'PP')}</span>
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
