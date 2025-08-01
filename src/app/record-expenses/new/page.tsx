
'use client';

import React, { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, TrendingDown, Save, Loader2, Search } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { searchEmployees, addExpense } from '../actions'; 

const EXPENSE_CATEGORIES = [
  'Software & Subscriptions', 'Marketing & Advertising', 'Office Supplies',
  'Utilities', 'Rent & Lease', 'Salary / Advance', 'Travel',
  'Meals & Entertainment', 'Professional Services', 'Other',
];

interface EmployeeSuggestion {
    id: string;
    name: string;
}

export default function NewExpensePage() {
  const { user, currencySymbol } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [vendor, setVendor] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [employeeName, setEmployeeName] = useState('');
  const [employeeSuggestions, setEmployeeSuggestions] = useState<EmployeeSuggestion[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeSuggestion | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);


  useEffect(() => {
    if (employeeName.trim().length < 1 || !user?.companyId) {
        setEmployeeSuggestions([]);
        setShowSuggestions(false);
        if (selectedEmployee) setSelectedEmployee(null);
        return;
    }

    if (selectedEmployee && employeeName !== selectedEmployee.name) {
        setSelectedEmployee(null);
    }

    const timer = setTimeout(async () => {
        setIsSearching(true);
        // This remains a mock search as it's not part of the SQLite scope
        setEmployeeSuggestions([]);
        setShowSuggestions(true);
        setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [employeeName, selectedEmployee, user?.companyId]);

  const handleSelectEmployee = (employee: EmployeeSuggestion) => {
    setSelectedEmployee(employee);
    setEmployeeName(employee.name);
    setShowSuggestions(false);
  };


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
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
    
    const finalEmployeeName = category === 'Salary / Advance' ? employeeName : undefined;

    const result = await addExpense({
      date: format(date, 'yyyy-MM-dd'),
      amount: amountNum,
      category: category,
      description: description || undefined,
      vendor: vendor || undefined,
      employeeName: finalEmployeeName,
    });

    if (result.success) {
      toast({ title: 'Expense Recorded', description: result.message });
      router.push('/record-expenses');
    } else {
      toast({ title: 'Save Failed', description: result.message, variant: 'destructive' });
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageTitle title="New Expense Entry" subtitle="Log a new business expenditure." icon={TrendingDown} />
      <Card className="max-w-2xl mx-auto shadow-lg">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Expense Details</CardTitle>
            <CardDescription>Enter the details of the expense incurred.</CardDescription>
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
              <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g., 75.50" required min="0.01" step="0.01" disabled={isSaving} />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory} disabled={isSaving}>
                <SelectTrigger id="category" required><SelectValue placeholder="Select a category" /></SelectTrigger>
                <SelectContent>{EXPENSE_CATEGORIES.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}</SelectContent>
              </Select>
            </div>

            {category === 'Salary / Advance' ? (
                <div className="relative">
                    <Label htmlFor="employeeName">Employee Name</Label>
                     <div className="flex items-center gap-2">
                        <Input 
                            id="employeeName" 
                            value={employeeName} 
                            onChange={(e) => setEmployeeName(e.target.value)} 
                            placeholder="Enter employee name for salary/advance" 
                            autoComplete="off" 
                            disabled={isSaving}
                        />
                    </div>
                </div>
            ) : (
                <div>
                    <Label htmlFor="vendor">Vendor (Optional)</Label>
                    <Input id="vendor" value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="e.g., AWS, Staples" disabled={isSaving}/>
                </div>
            )}
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g., Monthly server costs, Printer paper" disabled={isSaving}/>
            </div>
          </CardContent>
          <CardHeader className="p-6 pt-0">
             <div className="flex justify-end gap-2">
                <Button variant="outline" asChild type="button">
                    <Link href="/record-expenses">Cancel</Link>
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Record Expense
                </Button>
            </div>
          </CardHeader>
        </form>
      </Card>
    </div>
  );
}
