
'use client';

import React, { useState } from 'react';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { TrendingDown, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

interface ExpenseEntryDisplay {
  id: string;
  date: Date;
  amount: number;
  category: string;
  description?: string;
  vendor?: string;
  employeeName?: string;
}

const MOCK_EXPENSES: ExpenseEntryDisplay[] = [
    { id: '1', date: new Date(), amount: 75.50, category: 'Office Supplies', vendor: 'Staples', description: 'Printer paper and pens.' },
    { id: '2', date: new Date(Date.now() - 2 * 86400000), amount: 1200, category: 'Software & Subscriptions', vendor: 'Adobe Inc.', description: 'Creative Cloud Subscription' },
    { id: '3', date: new Date(Date.now() - 5 * 86400000), amount: 5000, category: 'Salary / Advance', employeeName: 'Alice Johnson' },
];

export default function RecordExpensesPage() {
  const { user, isLoading: authIsLoading } = useAuth();
  const currency = user?.currencySymbol || '$';
  
  const [recentEntries] = useState<ExpenseEntryDisplay[]>(MOCK_EXPENSES);
  const isLoadingEntries = false;

  if (authIsLoading) {
    return (
      <div className="flex justify-center items-center h-64 p-4 sm:p-6 lg:p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
         <p className="ml-2">Loading authentication...</p>
      </div>
    );
  }

  if (!user && !authIsLoading) {
     return (
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <PageTitle title="Record Expenses" subtitle="Log your business expenditures." icon={TrendingDown} />
        <Card className="shadow-lg">
          <CardHeader><CardTitle>Access Denied</CardTitle></CardHeader>
          <CardContent><p>Please sign in to record expenses.</p></CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageTitle title="Record Expenses" subtitle="This is a read-only view of your business expenditures." icon={TrendingDown} />

      <Card className="shadow-lg">
        <CardHeader>
            <CardTitle className="font-headline">Expense History</CardTitle>
            <CardDescription>A list of your recorded expense entries.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>{!isLoadingEntries && recentEntries.length === 0 ? 'No expenses recorded yet.' : `A list of recent expenses.`}</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category/Vendor</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[50px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingEntries ? (
                 [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-[60px] ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : recentEntries.map(entry => (
                  <TableRow key={entry.id}>
                    <TableCell>{format(entry.date, 'PP')}</TableCell>
                    <TableCell>
                      <div className="font-medium">{entry.category}</div>
                      {entry.vendor && <div className="text-xs text-muted-foreground">{entry.vendor}</div>}
                    </TableCell>
                    <TableCell className="max-w-xs truncate" title={entry.description}>{entry.description || '-'}</TableCell>
                    <TableCell>{entry.employeeName || '-'}</TableCell>
                    <TableCell className="text-right font-semibold">{currency}{entry.amount.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" disabled><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem disabled>Edit</DropdownMenuItem>
                            <DropdownMenuItem disabled className="text-destructive">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
