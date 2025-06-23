
'use client';

import React, { useState, useEffect, FormEvent, useCallback, useMemo } from 'react';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CalendarIcon, TrendingUp, Save, Loader2, MoreHorizontal, Edit, Trash2, Search, ArrowUp, ArrowDown, ChevronsUpDown, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, addDoc, getDocs, query, where, orderBy, Timestamp, serverTimestamp } from 'firebase/firestore';
import { updateRevenueEntry, deleteRevenueEntry, type RevenueUpdateData } from './actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';

interface RevenueEntryFirestore {
  id?: string; 
  date: Timestamp; 
  amount: number;
  source: string;
  description?: string;
  companyId: string;
  createdAt: Timestamp;
}

interface RevenueEntryDisplay {
  id: string;
  date: Date; 
  amount: number;
  source: string;
  description?: string;
}

export default function RecordRevenuePage() {
  const { user, isLoading: authIsLoading } = useAuth();
  const currency = user?.currencySymbol || '$';

  // State for new entry
  const [newEntryDate, setNewEntryDate] = useState<Date | undefined>(new Date());
  const [newEntryAmount, setNewEntryAmount] = useState<string>('');
  const [newEntrySource, setNewEntrySource] = useState<string>('');
  const [newEntryDescription, setNewEntryDescription] = useState<string>('');
  
  const [recentEntries, setRecentEntries] = useState<RevenueEntryDisplay[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof RevenueEntryDisplay; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });

  // State for dialogs
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentRevenue, setCurrentRevenue] = useState<RevenueEntryDisplay | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [revenueToDeleteId, setRevenueToDeleteId] = useState<string | null>(null);

  const fetchRevenueEntries = useCallback(async () => {
    if (authIsLoading) return;
    if (!user || !user.companyId) {
      setIsLoadingEntries(false);
      setRecentEntries([]);
      return;
    }

    setIsLoadingEntries(true);
    try {
      const entriesRef = collection(db, 'revenueEntries');
      const q = query(entriesRef, where('companyId', '==', user.companyId), orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const fetchedEntries = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data() as Omit<RevenueEntryFirestore, 'id'>;
        return {
          id: docSnap.id,
          date: data.date.toDate(),
          amount: data.amount,
          source: data.source,
          description: data.description || '',
        };
      });
      setRecentEntries(fetchedEntries);
    } catch (error: any) {
      toast({ title: 'Error Loading Entries', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoadingEntries(false);
    }
  }, [user, authIsLoading, toast]);

  useEffect(() => {
    fetchRevenueEntries();
  }, [fetchRevenueEntries]);

  const filteredEntries = useMemo(() => {
    if (!searchTerm) {
      return recentEntries;
    }
    const lowercasedTerm = searchTerm.toLowerCase();
    return recentEntries.filter(entry => 
      entry.source.toLowerCase().includes(lowercasedTerm) ||
      (entry.description && entry.description.toLowerCase().includes(lowercasedTerm))
    );
  }, [recentEntries, searchTerm]);

  const sortedEntries = useMemo(() => {
    let sortableItems = [...filteredEntries];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredEntries, sortConfig]);

  const requestSort = (key: keyof RevenueEntryDisplay) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIcon = (key: keyof RevenueEntryDisplay) => {
    if (sortConfig.key !== key) {
        return <ChevronsUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />;
    }
    if (sortConfig.direction === 'ascending') {
        return <ArrowUp className="ml-2 h-4 w-4" />;
    }
    return <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const resetNewEntryForm = () => {
    setNewEntryDate(new Date());
    setNewEntryAmount('');
    setNewEntrySource('');
    setNewEntryDescription('');
  };

  const handleNewEntrySubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !user.companyId) {
      toast({ title: 'Authentication Error', variant: 'destructive' });
      return;
    }
    if (!newEntryDate || !newEntryAmount || !newEntrySource) {
      toast({ title: 'Missing Information', description: 'Please fill in date, amount, and source.', variant: 'destructive' });
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
      source: newEntrySource,
      description: newEntryDescription || '',
      companyId: user.companyId,
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, 'revenueEntries'), newEntryPayload);
      fetchRevenueEntries(); 
      toast({ title: 'Revenue Recorded', description: `Successfully recorded ${currency}${amountNum.toFixed(2)} from ${newEntrySource}.` });
      resetNewEntryForm();
      setIsAddDialogOpen(false);
    } catch (error: any) {
      toast({ title: 'Save Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClick = (revenue: RevenueEntryDisplay) => {
    setCurrentRevenue(revenue);
    setIsEditDialogOpen(true);
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRevenue) return;

    const amountNum = parseFloat(String(currentRevenue.amount));
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({ title: 'Invalid Amount', variant: 'destructive' });
      return;
    }
    if (!currentRevenue.date || !currentRevenue.source) {
      toast({ title: 'Missing Information', description: 'Date and source are required.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    const updatePayload: RevenueUpdateData = {
        date: currentRevenue.date,
        amount: amountNum,
        source: currentRevenue.source,
        description: currentRevenue.description || '',
    };
    
    const result = await updateRevenueEntry(currentRevenue.id, updatePayload);
    toast({ title: result.success ? 'Success' : 'Error', description: result.message, variant: result.success ? 'default' : 'destructive' });
    
    if (result.success) {
        setIsEditDialogOpen(false);
        fetchRevenueEntries();
    }
    setIsSaving(false);
  };
  
  const handleDeleteClick = (id: string) => {
    setRevenueToDeleteId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!revenueToDeleteId) return;
    setIsSaving(true);
    const result = await deleteRevenueEntry(revenueToDeleteId);
    toast({ title: result.success ? 'Success' : 'Error', description: result.message, variant: result.success ? 'default' : 'destructive' });
    
    if (result.success) {
      fetchRevenueEntries();
    }
    setRevenueToDeleteId(null);
    setIsDeleteDialogOpen(false);
    setIsSaving(false);
  };

  if (authIsLoading) {
    return <div className="flex justify-center items-center h-64 p-4 sm:p-6 lg:p-8"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="ml-2">Loading authentication...</p></div>;
  }

  if (!user && !authIsLoading) {
     return (
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <PageTitle title="Record Revenue" subtitle="Log your daily or transaction-based income." icon={TrendingUp} />
        <Card className="shadow-lg"><CardHeader><CardTitle>Access Denied</CardTitle></CardHeader><CardContent><p>Please sign in to record revenue.</p></CardContent></Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageTitle title="Record Revenue" subtitle="Log your daily or transaction-based income." icon={TrendingUp}>
        <Button onClick={() => { resetNewEntryForm(); setIsAddDialogOpen(true); }} disabled={isSaving || isLoadingEntries}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Record Revenue
        </Button>
      </PageTitle>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-center gap-2 justify-between">
              <div className="flex-1">
                  <CardTitle className="font-headline">Revenue Entries</CardTitle>
                  <CardDescription>A list of your recorded revenue entries.</CardDescription>
              </div>
              <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                  type="search"
                  placeholder="Filter by source..."
                  className="pl-8 sm:w-[200px] md:w-[250px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={isLoadingEntries && recentEntries.length === 0}
                  />
              </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
              <TableCaption>{!isLoadingEntries && sortedEntries.length === 0 ? "No revenue recorded yet." : "A list of your revenue entries."}</TableCaption>
              <TableHeader>
                  <TableRow>
                      <TableHead>
                          <Button variant="ghost" onClick={() => requestSort('date')} className="-ml-4 h-auto p-1 text-xs sm:text-sm">Date {getSortIcon('date')}</Button>
                      </TableHead>
                      <TableHead>
                            <Button variant="ghost" onClick={() => requestSort('source')} className="-ml-4 h-auto p-1 text-xs sm:text-sm">Source {getSortIcon('source')}</Button>
                      </TableHead>
                      <TableHead className="text-right">
                            <Button variant="ghost" onClick={() => requestSort('amount')} className="h-auto p-1 text-xs sm:text-sm">Amount {getSortIcon('amount')}</Button>
                      </TableHead>
                      <TableHead className="w-[50px] text-right">Actions</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
              {isLoadingEntries ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[90px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-3/4" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-[70px] ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : sortedEntries.map(entry => (
                  <TableRow key={entry.id}>
                      <TableCell>{format(entry.date, 'PP')}</TableCell>
                      <TableCell>
                          <div className="font-medium">{entry.source}</div>
                          {entry.description && <div className="text-xs text-muted-foreground max-w-xs truncate" title={entry.description}>{entry.description}</div>}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600">{currency}{entry.amount.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditClick(entry)}><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDeleteClick(entry.id)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                          </DropdownMenu>
                      </TableCell>
                  </TableRow>
              ))}
              </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Revenue Entry</DialogTitle>
            <DialogDescription>Enter the details of the revenue received.</DialogDescription>
          </DialogHeader>
          <form id="new-revenue-form" onSubmit={handleNewEntrySubmit} className="space-y-4 py-2">
            <div>
              <Label htmlFor="new-date">Date</Label>
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
              <Label htmlFor="new-amount">Amount ({currency})</Label>
              <Input id="new-amount" type="number" value={newEntryAmount} onChange={(e) => setNewEntryAmount(e.target.value)} placeholder="e.g., 150.00" required min="0.01" step="0.01" disabled={isSaving}/>
            </div>
            <div>
              <Label htmlFor="new-source">Source</Label>
              <Input id="new-source" value={newEntrySource} onChange={(e) => setNewEntrySource(e.target.value)} placeholder="e.g., Client A Payment, Product Sale" required disabled={isSaving}/>
            </div>
            <div>
              <Label htmlFor="new-description">Description (Optional)</Label>
              <Textarea id="new-description" value={newEntryDescription} onChange={(e) => setNewEntryDescription(e.target.value)} placeholder="e.g., Payment for project X" disabled={isSaving}/>
            </div>
          </form>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" onClick={resetNewEntryForm} disabled={isSaving}>Cancel</Button></DialogClose>
            <Button type="submit" form="new-revenue-form" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isSaving ? 'Saving...' : 'Record Revenue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

       {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Revenue Entry</DialogTitle>
            <DialogDescription>Update the details for this revenue entry.</DialogDescription>
          </DialogHeader>
          {currentRevenue && (
          <form id="edit-revenue-form" onSubmit={handleUpdateSubmit} className="space-y-4">
              <div>
                <Label htmlFor="edit-date">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal" disabled={isSaving}>
                      <CalendarIcon className="mr-2 h-4 w-4" />{currentRevenue.date ? format(currentRevenue.date, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={currentRevenue.date} onSelect={(date) => setCurrentRevenue(prev => prev ? {...prev, date: date!} : null)} initialFocus disabled={isSaving}/></PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="edit-amount">Amount ({currency})</Label>
                <Input id="edit-amount" type="number" value={currentRevenue.amount} onChange={(e) => setCurrentRevenue(prev => prev ? {...prev, amount: parseFloat(e.target.value) || 0} : null)} required min="0.01" step="0.01" disabled={isSaving} />
              </div>
              <div>
                <Label htmlFor="edit-source">Source</Label>
                <Input id="edit-source" value={currentRevenue.source} onChange={(e) => setCurrentRevenue(prev => prev ? {...prev, source: e.target.value} : null)} required disabled={isSaving}/>
              </div>
              <div>
                <Label htmlFor="edit-description">Description (Optional)</Label>
                <Textarea id="edit-description" value={currentRevenue.description} onChange={(e) => setCurrentRevenue(prev => prev ? {...prev, description: e.target.value} : null)} disabled={isSaving}/>
              </div>
          </form>
          )}
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" disabled={isSaving}>Cancel</Button></DialogClose>
            <Button type="submit" form="edit-revenue-form" disabled={isSaving}>
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
            <AlertDialogDescription>This will permanently delete the revenue entry. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRevenueToDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
