
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Receipt, PlusCircle, MoreHorizontal, Edit, Trash2, ArrowUp, ArrowDown, ChevronsUpDown, Loader2, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { collection, getDocs, query, where, orderBy, Timestamp, limit, startAfter, endBefore, limitToLast, type QueryDocumentSnapshot, type DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { deleteInvoice } from './actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext } from '@/components/ui/pagination';


interface InvoiceDisplay {
  id: string;
  invoiceNumber: string;
  clientName: string;
  amount: number;
  dueDate: Date;
  status: 'Paid' | 'Pending' | 'Overdue' | 'Draft';
  issuedDate: Date;
  createdAt: Timestamp; // Keep as timestamp for sorting
}

const RECORDS_PER_PAGE = 20;

export default function InvoicingPage() {
  const { user, isLoading: authIsLoading, currencySymbol } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  
  const [sortConfig, setSortConfig] = useState<{ key: keyof InvoiceDisplay; direction: 'desc' | 'asc' }>({ key: 'issuedDate', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [invoiceToDeleteId, setInvoiceToDeleteId] = useState<string | null>(null);

  const [firstVisible, setFirstVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  const fetchInvoices = useCallback(async (direction: 'next' | 'prev' | 'reset' = 'reset') => {
    if (!user || !user.companyId) {
      setInvoices([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const invoicesColRef = collection(db, 'invoices');
      let q;
      
      const baseQuery = [
        where('companyId', '==', user.companyId),
        orderBy(sortConfig.key, sortConfig.direction),
        orderBy('createdAt', sortConfig.direction)
      ];

      if (direction === 'next' && lastVisible) {
        q = query(invoicesColRef, ...baseQuery, startAfter(lastVisible), limit(RECORDS_PER_PAGE));
      } else if (direction === 'prev' && firstVisible) {
        q = query(invoicesColRef, ...baseQuery, endBefore(firstVisible), limitToLast(RECORDS_PER_PAGE));
      } else { // reset
        q = query(invoicesColRef, ...baseQuery, limit(RECORDS_PER_PAGE));
      }

      const querySnapshot = await getDocs(q);
      const fetchedInvoices = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          issuedDate: (data.issuedDate as Timestamp).toDate(),
          dueDate: (data.dueDate as Timestamp).toDate(),
        } as InvoiceDisplay;
      });

      setInvoices(fetchedInvoices);

      if (querySnapshot.docs.length > 0) {
        setFirstVisible(querySnapshot.docs[0]);
        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
      } else if (direction === 'prev' && currentPage > 1) {
        // if we go back and there are no results, refetch the first page
        fetchInvoices('reset');
      }

    } catch (error: any) {
      console.error('[InvoicingPage fetchInvoices] Error fetching invoices:', error);
      toast({ title: 'Error Fetching Invoices', description: `Could not load invoices. ${error.message || 'An unknown error occurred.'}`, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast, sortConfig, lastVisible, firstVisible, currentPage]);

  useEffect(() => {
    if (!authIsLoading) {
        handleSortChange(sortConfig.key);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authIsLoading]);
  
  const handlePageChange = (direction: 'next' | 'prev') => {
      let newPage = currentPage;
      if (direction === 'next') newPage++;
      if (direction === 'prev' && currentPage > 1) newPage--;
      setCurrentPage(newPage);
      fetchInvoices(direction);
  };
  
  const handleSortChange = (key: keyof InvoiceDisplay) => {
    let direction: 'desc' | 'asc' = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setCurrentPage(1);
    setFirstVisible(null);
    setLastVisible(null);
    setSortConfig({ key, direction });
  };

  useEffect(() => {
    if (!authIsLoading && user) {
        fetchInvoices('reset');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortConfig]);
  
  const getSortIcon = (key: keyof InvoiceDisplay) => {
    if (sortConfig.key !== key) {
        return <ChevronsUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />;
    }
    if (sortConfig.direction === 'asc') {
        return <ArrowUp className="ml-2 h-4 w-4" />;
    }
    return <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const getStatusBadgeVariant = (status: InvoiceDisplay['status']) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleDeleteClick = (id: string) => {
    setInvoiceToDeleteId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!invoiceToDeleteId) return;
    setIsDeleting(true);
    const result = await deleteInvoice(invoiceToDeleteId);
    if (result.success) {
      toast({ title: 'Invoice Deleted', description: result.message });
      fetchInvoices('reset');
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' });
    }
    setIsDeleting(false);
    setIsDeleteDialogOpen(false);
    setInvoiceToDeleteId(null);
  };

  if (authIsLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)] p-4 sm:p-6 lg:p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-2">Loading authentication...</p>
      </div>
    );
  }

  if (!user && !authIsLoading) {
     return (
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <PageTitle title="Invoicing" subtitle="Manage your customer invoices efficiently." icon={Receipt} />
        <Card className="shadow-lg">
          <CardHeader><CardTitle>Access Denied</CardTitle></CardHeader>
          <CardContent><p>Please sign in to manage invoices.</p></CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageTitle title="Invoicing" subtitle="Manage your customer invoices efficiently." icon={Receipt}>
        <Button asChild disabled={isLoading}>
          <Link href="/invoicing/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Invoice
          </Link>
        </Button>
      </PageTitle>

      <Card className="shadow-lg">
        <CardHeader>
            <CardTitle className="font-headline">All Invoices</CardTitle>
        </CardHeader>
        <CardContent>
            <Table>
                <TableCaption>{!isLoading && invoices.length === 0 ? "No invoices found." : `Page ${currentPage} of invoices.`}</TableCaption>
                <TableHeader>
                <TableRow>
                    <TableHead><Button variant="ghost" onClick={() => handleSortChange('invoiceNumber')} className="-ml-4 h-auto p-1 text-xs sm:text-sm">Number {getSortIcon('invoiceNumber')}</Button></TableHead>
                    <TableHead><Button variant="ghost" onClick={() => handleSortChange('clientName')} className="-ml-4 h-auto p-1 text-xs sm:text-sm">Client {getSortIcon('clientName')}</Button></TableHead>
                    <TableHead className="text-right"><Button variant="ghost" onClick={() => handleSortChange('amount')} className="h-auto p-1 text-xs sm:text-sm">Amount {getSortIcon('amount')}</Button></TableHead>
                    <TableHead className="hidden md:table-cell"><Button variant="ghost" onClick={() => handleSortChange('issuedDate')} className="-ml-4 h-auto p-1 text-xs sm:text-sm">Issued Date {getSortIcon('issuedDate')}</Button></TableHead>
                    <TableHead className="hidden md:table-cell"><Button variant="ghost" onClick={() => handleSortChange('dueDate')} className="-ml-4 h-auto p-1 text-xs sm:text-sm">Due Date {getSortIcon('dueDate')}</Button></TableHead>
                    <TableHead><Button variant="ghost" onClick={() => handleSortChange('status')} className="-ml-4 h-auto p-1 text-xs sm:text-sm">Status {getSortIcon('status')}</Button></TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {isLoading ? (
                    [...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
                            <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-[100px]" /></TableCell>
                            <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-[100px]" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-[70px] rounded-full" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                        </TableRow>
                    ))
                ) : invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell>{invoice.clientName}</TableCell>
                    <TableCell className="text-right">{currencySymbol}{invoice.amount.toFixed(2)}</TableCell>
                    <TableCell className="hidden md:table-cell">{format(invoice.issuedDate, 'PP')}</TableCell>
                    <TableCell className="hidden md:table-cell">{format(invoice.dueDate, 'PP')}</TableCell>
                    <TableCell><Badge variant="outline" className={getStatusBadgeVariant(invoice.status)}>{invoice.status}</Badge></TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                             <DropdownMenuItem asChild>
                                <Link href={`/invoicing/${invoice.id}/view`}>
                                    <Eye className="mr-2 h-4 w-4" /> View / Print
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href={`/invoicing/${invoice.id}`}>
                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDeleteClick(invoice.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
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
                        <PaginationNext href="#" onClick={(e) => { e.preventDefault(); handlePageChange('next'); }} className={invoices.length < RECORDS_PER_PAGE ? 'pointer-events-none opacity-50' : ''} />
                    </PaginationItem>
                    </PaginationContent>
                </Pagination>
             </div>
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the invoice.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
