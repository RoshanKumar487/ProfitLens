
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
import { CalendarIcon, TrendingUp, Save, Loader2, MoreHorizontal, Edit, Trash2, ArrowUp, ArrowDown, ChevronsUpDown, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, getDocs, query, where, orderBy, Timestamp, limit, startAfter, endBefore, limitToLast, type QueryDocumentSnapshot, type DocumentData } from 'firebase/firestore';
import { updateRevenueEntry, deleteRevenueEntry, type RevenueUpdateData } from './actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import Link from 'next/link';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

interface RevenueEntryFirestore {
  id?: string; 
  date: Timestamp; 
  amount: number;
  source: string;
  description?: string;
  companyId: string;
  addedById: string;
  addedBy: string;
  createdAt: Timestamp;
}

interface RevenueEntryDisplay {
  id: string;
  date: Date; 
  amount: number;
  source: string;
  description?: string;
  addedBy: string;
  createdAt: Timestamp;
}

const RECORDS_PER_PAGE = 20;

export default function RecordRevenuePage() {
  const { user, isLoading: authIsLoading } = useAuth();
  const currency = user?.currencySymbol || '$';

  const [recentEntries, setRecentEntries] = useState<RevenueEntryDisplay[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const [sortConfig, setSortConfig] = useState<{ key: keyof RevenueEntryDisplay; direction: 'desc' | 'asc' }>({ key: 'date', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [firstVisible, setFirstVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentRevenue, setCurrentRevenue] = useState<RevenueEntryDisplay | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [revenueToDeleteId, setRevenueToDeleteId] = useState<string | null>(null);

  const fetchRevenueEntries = useCallback(async (direction: 'next' | 'prev' | 'reset' = 'reset') => {
    if (authIsLoading || !user || !user.companyId) {
      setIsLoadingEntries(false);
      setRecentEntries([]);
      return;
    }

    setIsLoadingEntries(true);
    try {
      const entriesRef = collection(db, 'revenueEntries');
      let q;

      const baseQuery = [
        where('companyId', '==', user.companyId),
        orderBy(sortConfig.key, sortConfig.direction),
      ];
      if (sortConfig.key !== 'createdAt') {
        baseQuery.push(orderBy('createdAt', sortConfig.direction));
      }

      if (direction === 'next' && lastVisible) {
        q = query(entriesRef, ...baseQuery, startAfter(lastVisible), limit(RECORDS_PER_PAGE));
      } else if (direction === 'prev' && firstVisible) {
        q = query(entriesRef, ...baseQuery, endBefore(firstVisible), limitToLast(RECORDS_PER_PAGE));
      } else { // reset
        q = query(entriesRef, ...baseQuery, limit(RECORDS_PER_PAGE));
      }
      
      const querySnapshot = await getDocs(q);
      
      const fetchedEntries = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data() as Omit<RevenueEntryFirestore, 'id'>;
        return {
          id: docSnap.id,
          ...data,
          date: data.date.toDate(),
          addedBy: data.addedBy || 'N/A',
        } as RevenueEntryDisplay;
      });
      setRecentEntries(fetchedEntries);

      if (querySnapshot.docs.length > 0) {
        setFirstVisible(querySnapshot.docs[0]);
        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
      }
    } catch (error: any) {
      toast({ title: 'Error Loading Entries', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoadingEntries(false);
    }
  }, [user, authIsLoading, toast, sortConfig, lastVisible, firstVisible]);

  useEffect(() => {
    if (!authIsLoading) {
      handleSortChange('date');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authIsLoading]);

  useEffect(() => {
    if (!authIsLoading && user) {
        fetchRevenueEntries('reset');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortConfig]);
  
  const handlePageChange = (direction: 'next' | 'prev') => {
    let newPage = currentPage;
    if (direction === 'next') newPage++;
    if (direction === 'prev' && currentPage > 1) newPage--;
    setCurrentPage(newPage);
    fetchRevenueEntries(direction);
  };

  const handleSortChange = (key: keyof RevenueEntryDisplay) => {
    let direction: 'desc' | 'asc' = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setCurrentPage(1);
    setFirstVisible(null);
    setLastVisible(null);
    setSortConfig({ key, direction });
  };
  
  const getSortIcon = (key: keyof RevenueEntryDisplay) => {
    if (sortConfig.key !== key) {
        return <ChevronsUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />;
    }
    if (sortConfig.direction === 'asc') {
        return <ArrowUp className="ml-2 h-4 w-4" />;
    }
    return <ArrowDown className="ml-2 h-4 w-4" />;
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
        fetchRevenueEntries('reset');
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
      fetchRevenueEntries('reset');
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
        <Button asChild disabled={isSaving || isLoadingEntries}>
          <Link href="/record-revenue/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Record Revenue
          </Link>
        </Button>
      </PageTitle>

      <Card className="shadow-lg">
        <CardHeader>
            <CardTitle className="font-headline">Revenue Entries</CardTitle>
            <CardDescription>A list of your recorded revenue entries.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
              <TableCaption>{!isLoadingEntries && recentEntries.length === 0 ? "No revenue recorded yet." : `Page ${currentPage} of revenue entries.`}</TableCaption>
              <TableHeader>
                  <TableRow>
                      <TableHead>
                          <Button variant="ghost" onClick={() => handleSortChange('date')} className="-ml-4 h-auto p-1 text-xs sm:text-sm">Date {getSortIcon('date')}</Button>
                      </TableHead>
                      <TableHead>
                            <Button variant="ghost" onClick={() => handleSortChange('source')} className="-ml-4 h-auto p-1 text-xs sm:text-sm">Source {getSortIcon('source')}</Button>
                      </TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Added By</TableHead>
                      <TableHead className="text-right">
                            <Button variant="ghost" onClick={() => handleSortChange('amount')} className="h-auto p-1 text-xs sm:text-sm">Amount {getSortIcon('amount')}</Button>
                      </TableHead>
                      <TableHead className="w-[50px] text-right">Actions</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
              {isLoadingEntries ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[90px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-[70px] ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : recentEntries.map(entry => (
                  <TableRow key={entry.id}>
                      <TableCell>{format(entry.date, 'PP')}</TableCell>
                      <TableCell className="font-medium">{entry.source}</TableCell>
                      <TableCell className="max-w-xs truncate" title={entry.description}>{entry.description || '-'}</TableCell>
                      <TableCell>{entry.addedBy}</TableCell>
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
           <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-muted-foreground">
                Page {currentPage}
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); handlePageChange('prev'); }} className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''} />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext href="#" onClick={(e) => { e.preventDefault(); handlePageChange('next'); }} className={recentEntries.length < RECORDS_PER_PAGE ? 'pointer-events-none opacity-50' : ''} />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
        </CardContent>
      </Card>
      
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
