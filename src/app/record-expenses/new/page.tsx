
'use client';

import React, { useState, FormEvent, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, addDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import Link from 'next/link';
import { searchEmployees } from '../actions'; // Import the new server action

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
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [vendor, setVendor] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  
  // State for new employee search field
  const [employeeName, setEmployeeName] = useState('');
  const [employeeSuggestions, setEmployeeSuggestions] = useState<EmployeeSuggestion[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeSuggestion | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);


  useEffect(() => {
    // Pre-fill form from URL query parameters
    const urlAmount = searchParams.get('amount');
    const urlVendor = searchParams.get('vendor');
    const urlDescription = searchParams.get('description');
    const urlCategory = searchParams.get('category');
    const urlDate = searchParams.get('date');

    if (urlAmount) setAmount(urlAmount);
    if (urlVendor) setVendor(urlVendor);
    if (urlDescription) setDescription(urlDescription);
    if (urlCategory && EXPENSE_CATEGORIES.includes(urlCategory)) {
        setCategory(urlCategory);
    }
    if (urlDate) {
        const parsedDate = new Date(urlDate);
        if (!isNaN(parsedDate.getTime())) {
            setDate(parsedDate);
        }
    }
  }, [searchParams]);

  // Effect for searching employees
  useEffect(() => {
    if (employeeName.trim().length < 1) {
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
        try {
            // Use the Server Action instead of fetch
            const data = await searchEmployees(employeeName);
            setEmployeeSuggestions(data);
            setShowSuggestions(true);
        } catch (error) {
             console.error("Failed to fetch employees", error);
             toast({
                title: 'Search Failed',
                description: 'Could not fetch employee list.',
                variant: 'destructive'
            });
        }
        setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [employeeName, selectedEmployee, toast]);

  const handleSelectEmployee = (employee: EmployeeSuggestion) => {
    setSelectedEmployee(employee);
    setEmployeeName(employee.name);
    setShowSuggestions(false);
  };


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !user.companyId) {
      toast({ title: 'Authentication Error', variant: 'destructive' });
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
    
    // Determine employee details to save
    const finalEmployeeId = selectedEmployee ? selectedEmployee.id : null;
    const finalEmployeeName = employeeName || null;

    const newEntryPayload = {
      date: Timestamp.fromDate(date),
      amount: amountNum,
      category: category,
      description: description || '',
      vendor: vendor || '', // Keep vendor for non-advance expenses
      employeeId: finalEmployeeId,
      employeeName: finalEmployeeName,
      companyId: user.companyId,
      createdAt: serverTimestamp(),
      addedById: user.uid,
      addedBy: user.displayName || user.email || 'System'
    };

    try {
      await addDoc(collection(db, 'expenses'), newEntryPayload);
      toast({ title: 'Expense Recorded', description: `Successfully recorded ${currencySymbol}${amountNum.toFixed(2)} for ${category}.` });
      router.push('/record-expenses');
    } catch (error: any) {
      toast({ title: 'Save Failed', description: error.message, variant: 'destructive' });
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
                            placeholder="Type to search existing employees or enter new name" 
                            autoComplete="off" 
                            disabled={isSaving}
                            onFocus={() => setShowSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        />
                        {isSearching && <Loader2 className="h-4 w-4 animate-spin" />}
                    </div>
                    {showSuggestions && employeeSuggestions.length > 0 && (
                        <Card className="absolute z-10 w-full mt-1 shadow-lg max-h-48 overflow-y-auto">
                            <CardContent className="p-2">
                                {employeeSuggestions.map((employee) => (
                                    <div key={employee.id} onMouseDown={() => handleSelectEmployee(employee)} className="p-2 text-sm rounded-md hover:bg-accent cursor-pointer">
                                        {employee.name}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
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
