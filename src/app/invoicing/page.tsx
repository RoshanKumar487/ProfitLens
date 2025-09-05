
'use client';

import React, { useState } from 'react';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Receipt, MoreHorizontal, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { MOCK_INVOICES, type InvoiceDisplay } from '@/lib/mock-data';


export default function InvoicingPage() {
  const { user, isLoading: authIsLoading, currencySymbol } = useAuth();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<InvoiceDisplay[]>(MOCK_INVOICES);
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = (invoiceId: string) => {
    setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
    toast({ title: 'Invoice Deleted', description: 'The invoice has been removed from the list.'});
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

  if (authIsLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)] p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-12 w-12" />
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
      <PageTitle title="Invoicing" subtitle="Create, manage, and track all your customer invoices." icon={Receipt}>
        <Button asChild>
            <Link href="/invoicing/new"><PlusCircle className="mr-2 h-4 w-4" /> Create Invoice</Link>
        </Button>
      </PageTitle>

      <Card className="shadow-lg">
        <CardHeader>
            <CardTitle className="font-headline">All Invoices</CardTitle>
        </CardHeader>
        <CardContent>
            <Table>
                <TableCaption>{!isLoading && invoices.length === 0 ? "No invoices found." : "A list of your recent invoices."}</TableCaption>
                <TableHeader>
                <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Issued Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
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
                            <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-[70px] rounded-full" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                        </TableRow>
                    ))
                ) : invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell>{invoice.clientName}</TableCell>
                    <TableCell className="text-right">{currencySymbol}{invoice.amount.toFixed(2)}</TableCell>
                    <TableCell>{format(invoice.issuedDate, 'PP')}</TableCell>
                    <TableCell>{format(invoice.dueDate, 'PP')}</TableCell>
                    <TableCell><Badge variant="outline" className={getStatusBadgeVariant(invoice.status)}>{invoice.status}</Badge></TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                         <DropdownMenuContent align="end">
                           <DropdownMenuItem asChild><Link href={`/invoicing/${invoice.id}/view`}>View / Print</Link></DropdownMenuItem>
                           <DropdownMenuItem asChild><Link href={`/invoicing/new?from=${invoice.id}`}>Duplicate</Link></DropdownMenuItem>
                           <DropdownMenuItem onClick={() => handleDelete(invoice.id)} className="text-destructive focus:text-destructive">Delete</DropdownMenuItem>
                         </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}
