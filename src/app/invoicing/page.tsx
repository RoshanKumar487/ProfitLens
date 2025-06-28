'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Receipt, PlusCircle, Search, MoreHorizontal, Edit, Trash2, ArrowUp, ArrowDown, ChevronsUpDown, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Simplified interfaces for this version
interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface InvoiceDisplay {
  id: string;
  invoiceNumber: string;
  clientName: string;
  amount: number;
  dueDate: Date;
  status: 'Paid' | 'Pending' | 'Overdue' | 'Draft';
  issuedDate: Date;
  items: InvoiceItem[];
}

export default function InvoicingPage() {
  const { user, isLoading: authIsLoading, currencySymbol } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceDisplay[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  const [sortConfig, setSortConfig] = useState<{ key: keyof InvoiceDisplay; direction: 'ascending' | 'descending' }>({ key: 'issuedDate', direction: 'descending' });

  const fetchInvoices = useCallback(async () => {
    if (!user || !user.companyId) {
      setInvoices([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const invoicesColRef = collection(db, 'invoices');
      const qInvoices = query(invoicesColRef, where('companyId', '==', user.companyId), orderBy('createdAt', 'desc'));
      const invoiceSnapshot = await getDocs(qInvoices);
      const fetchedInvoices = invoiceSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          invoiceNumber: data.invoiceNumber,
          clientName: data.clientName,
          amount: data.amount,
          dueDate: (data.dueDate as Timestamp).toDate(),
          status: data.status,
          issuedDate: (data.issuedDate as Timestamp).toDate(),
          items: data.items || [],
        } as InvoiceDisplay;
      });
      setInvoices(fetchedInvoices);
    } catch (error: any) {
      console.error('[InvoicingPage fetchInvoices] Error fetching invoices:', error);
      toast({ title: 'Error Fetching Invoices', description: `Could not load invoices. ${error.message || 'An unknown error occurred.'}`, variant: 'destructive' });
      setInvoices([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authIsLoading) {
        fetchInvoices();
    }
  }, [user, authIsLoading, fetchInvoices]);


  const filteredInvoices = useMemo(() => {
    return invoices.filter(
      (invoice) =>
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.status.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [invoices, searchTerm]);
  
  const sortedInvoices = useMemo(() => {
    let sortableItems = [...filteredInvoices];
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
  }, [filteredInvoices, sortConfig]);

  const requestSort = (key: keyof InvoiceDisplay) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIcon = (key: keyof InvoiceDisplay) => {
    if (sortConfig.key !== key) {
        return <ChevronsUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />;
    }
    if (sortConfig.direction === 'ascending') {
        return <ArrowUp className="ml-2 h-4 w-4" />;
    }
    return <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const getStatusBadgeVariant = (status: InvoiceDisplay['status']): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'Paid':
        return 'default';
      case 'Pending':
        return 'secondary';
      case 'Overdue':
        return 'destructive';
      case 'Draft':
        return 'outline';
      default:
        return 'outline';
    }
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
          <div className="flex flex-col sm:flex-row items-center gap-2 justify-between">
            <CardTitle className="font-headline">All Invoices</CardTitle>
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search invoices..."
                className="pl-8 sm:w-[250px] md:w-[300px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={(isLoading && invoices.length === 0)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
             <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                <span className="ml-2">Loading invoices...</span>
            </div>
          )}
          {!isLoading && (
            <Table>
                <TableCaption>{sortedInvoices.length === 0 ? "No invoices found." : "A list of your recent invoices."}</TableCaption>
                <TableHeader>
                <TableRow>
                    <TableHead><Button variant="ghost" onClick={() => requestSort('invoiceNumber')} className="-ml-4 h-auto p-1 text-xs sm:text-sm">Number {getSortIcon('invoiceNumber')}</Button></TableHead>
                    <TableHead><Button variant="ghost" onClick={() => requestSort('clientName')} className="-ml-4 h-auto p-1 text-xs sm:text-sm">Client {getSortIcon('clientName')}</Button></TableHead>
                    <TableHead className="text-right"><Button variant="ghost" onClick={() => requestSort('amount')} className="h-auto p-1 text-xs sm:text-sm">Amount {getSortIcon('amount')}</Button></TableHead>
                    <TableHead className="hidden md:table-cell"><Button variant="ghost" onClick={() => requestSort('issuedDate')} className="-ml-4 h-auto p-1 text-xs sm:text-sm">Issued Date {getSortIcon('issuedDate')}</Button></TableHead>
                    <TableHead className="hidden md:table-cell"><Button variant="ghost" onClick={() => requestSort('dueDate')} className="-ml-4 h-auto p-1 text-xs sm:text-sm">Due Date {getSortIcon('dueDate')}</Button></TableHead>
                    <TableHead><Button variant="ghost" onClick={() => requestSort('status')} className="-ml-4 h-auto p-1 text-xs sm:text-sm">Status {getSortIcon('status')}</Button></TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {sortedInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell>{invoice.clientName}</TableCell>
                    <TableCell className="text-right">{currencySymbol}{invoice.amount.toFixed(2)}</TableCell>
                    <TableCell className="hidden md:table-cell">{format(invoice.issuedDate, 'PP')}</TableCell>
                    <TableCell className="hidden md:table-cell">{format(invoice.dueDate, 'PP')}</TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(invoice.status)}>{invoice.status}</Badge></TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem disabled>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" disabled>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
