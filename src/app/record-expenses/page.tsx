
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CalendarIcon, TrendingDown, Save, Loader2, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, addDoc, getDocs, query, where, orderBy, limit, Timestamp, serverTimestamp } from 'firebase/firestore';
import { updateExpenseEntry, deleteExpenseEntry, type ExpenseUpdateData } from './actions';

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
  addedById: string;
  addedBy: string;
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
  addedBy: string;
}

export default function RecordExpensesPage() {
  const { user, isLoading: authIsLoading } = useAuth();
  const currency = user?.currencySymbol || '$';
  
  // State for new entry form
  const [newEntryDate, setNewEntryDate] = useState<Date | undefined>(new Date());
  const [newEntryAmount, setNewEntryAmount] = useState<string>('');
  const [newEntryCategory, setNewEntryCategory] = useState<string>('');
  const [newEntryDescription, setNewEntryDescription] = useState<string>('');
  const [newEntryVendor, setNewEntryVendor] = useState<string>('');
  
  const [recentEntries, setRecentEntries] = useState<ExpenseEntryDisplay[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // State for editing and deleting
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentExpense, setCurrentExpense] = useState<ExpenseEntryDisplay | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [expenseToDeleteId, setExpenseToDeleteId] = useState<string | null>(null);

  const fetchExpenseEntries = useCallback(async () => {
    if (authIsLoading) return;
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
          description: data.description || '',
          vendor: data.vendor || '',
          addedBy: data.addedBy || 'N/A',
        };
      });
      setRecentEntries(fetchedEntries);
    } catch (error: any) {
      console.error('Error fetching expense entries:', error);
      toast({ title: 'Error Loading Entries', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoadingEntries(false);
    }
  }, [user, authIsLoading, toast]);

  useEffect(() => {
    fetchExpenseEntries();
  }, [fetchExpenseEntries]);

  const handleNewEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.companyId) {
      toast({ title: 'Authentication Error', description: 'User not authenticated.', variant: 'destructive' });
      return;
    }
    if (!newEntryDate || !newEntryAmount || !newEntryCategory) {
      toast({ title: 'Missing Information', description: 'Please fill in date, amount, and category.', variant: 'destructive' });
      return;
    }
    
    const amountNum = parseFloat(newEntryAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({ title: 'Invalid Amount', description: 'Amount must be a positive number.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    const newEntryPayload = {
      date: Timestamp.fromDate(newEntryDate),
      amount: amountNum,
      category: newEntryCategory,
      description: newEntryDescription || '',
      vendor: newEntryVendor || '',
      companyId: user.companyId,
      createdAt: serverTimestamp(),
      addedById: user.uid,
      addedBy: user.displayName || user.email || 'System'
    };

    try {
      await addDoc(collection(db, 'expenses'), newEntryPayload);
      fetchExpenseEntries();
      toast({ title: 'Expense Recorded', description: `Successfully recorded ${currency}${amountNum.toFixed(2)} for ${newEntryCategory}.` });
      setNewEntryDate(new Date());
      setNewEntryAmount('');
      setNewEntryCategory('');
      setNewEntryDescription('');
      setNewEntryVendor('');
    } catch (error: any) {
      toast({ title: 'Save Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleEditClick = (expense: ExpenseEntryDisplay) => {
    setCurrentExpense(expense);
    setIsEditDialogOpen(true);
  };
  
  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentExpense) return;

    const amountNum = parseFloat(String(currentExpense.amount));
     if (isNaN(amountNum) || amountNum <= 0) {
      toast({ title: 'Invalid Amount', description: 'Amount must be a positive number.', variant: 'destructive' });
      return;
    }
    if (!currentExpense.date || !currentExpense.category) {
       toast({ title: 'Missing Information', description: 'Date and category are required.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    const updatePayload: ExpenseUpdateData = {
        date: currentExpense.date,
        amount: amountNum,
        category: currentExpense.category,
        description: currentExpense.description || '',
        vendor: currentExpense.vendor || '',
    };
    
    const result = await updateExpenseEntry(currentExpense.id, updatePayload);
    toast({ title: result.success ? 'Success' : 'Error', description: result.message, variant: result.success ? 'default' : 'destructive' });
    
    if (result.success) {
        setIsEditDialogOpen(false);
        fetchExpenseEntries();
    }
    setIsSaving(false);
  };

  const handleDeleteClick = (id: string) => {
    setExpenseToDeleteId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!expenseToDeleteId) return;
    setIsSaving(true);
    const result = await deleteExpenseEntry(expenseToDeleteId);
    toast({ title: result.success ? 'Success' : 'Error', description: result.message, variant: result.success ? 'default' : 'destructive' });
    
    if (result.success) {
      fetchExpenseEntries();
    }
    setExpenseToDeleteId(null);
    setIsDeleteDialogOpen(false);
    setIsSaving(false);
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
            <form onSubmit={handleNewEntrySubmit} className="space-y-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal" disabled={isSaving}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newEntryDate ? format(newEntryDate, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={newEntryDate} onSelect={setNewEntryDate} initialFocus disabled={isSaving}/></PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="amount">Amount ({currency})</Label>
                <Input id="amount" type="number" value={newEntryAmount} onChange={(e) => setNewEntryAmount(e.target.value)} placeholder="e.g., 75.50" required min="0.01" step="0.01" disabled={isSaving} />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={newEntryCategory} onValueChange={setNewEntryCategory} disabled={isSaving}>
                  <SelectTrigger id="category" required><SelectValue placeholder="Select a category" /></SelectTrigger>
                  <SelectContent>{EXPENSE_CATEGORIES.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="vendor">Vendor (Optional)</Label>
                <Input id="vendor" value={newEntryVendor} onChange={(e) => setNewEntryVendor(e.target.value)} placeholder="e.g., AWS, Staples" disabled={isSaving}/>
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea id="description" value={newEntryDescription} onChange={(e) => setNewEntryDescription(e.target.value)} placeholder="e.g., Monthly server costs, Printer paper" disabled={isSaving}/>
              </div>

              <Button type="submit" className="w-full" disabled={isSaving || isLoadingEntries}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
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
                  <div className="flex justify-between items-center"><div className="h-5 bg-muted rounded w-1/4"></div><div className="h-4 bg-muted rounded w-1/5"></div></div>
                  <div className="h-4 bg-muted rounded w-1/2 mt-1"></div><div className="h-3 bg-muted rounded w-3/4 mt-1"></div>
                </div>
              ))
            ) : recentEntries.length > 0 ? (
              recentEntries.map(entry => (
                <div key={entry.id} className="group p-3 bg-muted/50 rounded-lg border border-border">
                  <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2">
                           <span className="font-semibold text-foreground">{currency}{entry.amount.toFixed(2)}</span>
                           <span className="text-xs text-muted-foreground">{format(entry.date, 'PP')}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{entry.category}{entry.vendor ? ` - ${entry.vendor}` : ''}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 opacity-50 group-hover:opacity-100 transition-opacity"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditClick(entry)}><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteClick(entry.id)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {entry.description && <p className="text-xs text-muted-foreground mt-1">{entry.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1">Added by: <span className="font-medium">{entry.addedBy}</span></p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No expenses recorded yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

       {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            <DialogDescription>Update the details for this expense entry.</DialogDescription>
          </DialogHeader>
          {currentExpense && (
          <form id="edit-expense-form" onSubmit={handleUpdateSubmit} className="space-y-4">
              <div>
                <Label htmlFor="edit-date">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal" disabled={isSaving}>
                      <CalendarIcon className="mr-2 h-4 w-4" />{currentExpense.date ? format(currentExpense.date, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={currentExpense.date} onSelect={(date) => setCurrentExpense(prev => prev ? {...prev, date: date!} : null)} initialFocus disabled={isSaving}/></PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="edit-amount">Amount ({currency})</Label>
                <Input id="edit-amount" type="number" value={currentExpense.amount} onChange={(e) => setCurrentExpense(prev => prev ? {...prev, amount: parseFloat(e.target.value) || 0} : null)} required min="0.01" step="0.01" disabled={isSaving} />
              </div>
              <div>
                <Label htmlFor="edit-category">Category</Label>
                <Select value={currentExpense.category} onValueChange={(value) => setCurrentExpense(prev => prev ? {...prev, category: value} : null)} disabled={isSaving}>
                  <SelectTrigger required><SelectValue /></SelectTrigger>
                  <SelectContent>{EXPENSE_CATEGORIES.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-vendor">Vendor (Optional)</Label>
                <Input id="edit-vendor" value={currentExpense.vendor} onChange={(e) => setCurrentExpense(prev => prev ? {...prev, vendor: e.target.value} : null)} disabled={isSaving}/>
              </div>
              <div>
                <Label htmlFor="edit-description">Description (Optional)</Label>
                <Textarea id="edit-description" value={currentExpense.description} onChange={(e) => setCurrentExpense(prev => prev ? {...prev, description: e.target.value} : null)} disabled={isSaving}/>
              </div>
          </form>
          )}
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" disabled={isSaving}>Cancel</Button></DialogClose>
            <Button type="submit" form="edit-expense-form" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the expense entry. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setExpenseToDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
