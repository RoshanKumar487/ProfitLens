
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CalendarIcon, TrendingUp, Save, Loader2, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, addDoc, getDocs, query, where, orderBy, limit, Timestamp, serverTimestamp } from 'firebase/firestore';
import { updateRevenueEntry, deleteRevenueEntry, type RevenueUpdateData } from './actions';

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

  // State for editing and deleting
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
      const q = query(entriesRef, where('companyId', '==', user.companyId), orderBy('date', 'desc'), limit(5));
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
      setNewEntryDate(new Date());
      setNewEntryAmount('');
      setNewEntrySource('');
      setNewEntryDescription('');
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
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="ml-2">Loading authentication...</p></div>;
  }

  if (!user && !authIsLoading) {
     return (
      <div className="space-y-6">
        <PageTitle title="Record Revenue" subtitle="Log your daily or transaction-based income." icon={TrendingUp} />
        <Card className="shadow-lg"><CardHeader><CardTitle>Access Denied</CardTitle></CardHeader><CardContent><p>Please sign in to record revenue.</p></CardContent></Card>
      </div>
    )
  }

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
            <form onSubmit={handleNewEntrySubmit} className="space-y-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal" disabled={isSaving}>
                      <CalendarIcon className="mr-2 h-4 w-4" />{newEntryDate ? format(newEntryDate, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={newEntryDate} onSelect={setNewEntryDate} initialFocus disabled={isSaving}/></PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="amount">Amount ({currency})</Label>
                <Input id="amount" type="number" value={newEntryAmount} onChange={(e) => setNewEntryAmount(e.target.value)} placeholder="e.g., 150.00" required min="0.01" step="0.01" disabled={isSaving}/>
              </div>

              <div>
                <Label htmlFor="source">Source</Label>
                <Input id="source" value={newEntrySource} onChange={(e) => setNewEntrySource(e.target.value)} placeholder="e.g., Client A Payment, Product Sale" required disabled={isSaving}/>
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea id="description" value={newEntryDescription} onChange={(e) => setNewEntryDescription(e.target.value)} placeholder="e.g., Payment for project X" disabled={isSaving}/>
              </div>

              <Button type="submit" className="w-full" disabled={isSaving || isLoadingEntries}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
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
                        <p className="text-sm text-muted-foreground">{entry.source}</p>
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
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No revenue recorded yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

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
