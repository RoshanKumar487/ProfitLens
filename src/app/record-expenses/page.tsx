
'use client';

import React, { useState, useEffect } from 'react';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { TrendingDown, MoreHorizontal, Loader2, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

interface Expense {
  id?: string;
  date: string; // Stored as YYYY-MM-DD string
  amount: number;
  category: string;
  vendor?: string;
  description?: string;
  employeeName?: string;
}

const MOCK_EXPENSES: Expense[] = [
    { id: '1', date: '2024-07-28', amount: 55.00, category: 'Office Supplies', vendor: 'Staples', description: 'Printer paper and pens' },
    { id: '2', date: '2024-07-27', amount: 1500.00, category: 'Salary / Advance', employeeName: 'Alice Johnson', description: 'Salary advance for July' },
    { id: '3', date: '2024-07-25', amount: 250.00, category: 'Software & Subscriptions', vendor: 'Figma', description: 'Monthly subscription' },
];

export default function RecordExpensesPage() {
  const { user, currencySymbol, isLoading: authIsLoading } = useAuth();
  
  const [recentEntries, setRecentEntries] = useState<Expense[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);

  useEffect(() => {
    setIsLoadingEntries(true);
    // Mock fetching expenses
    setTimeout(() => {
        setRecentEntries(MOCK_EXPENSES);
        setIsLoadingEntries(false);
    }, 1000);
  }, []);


  if (authIsLoading) {
    return (
      <div className="flex justify-center items-center h-64 p-4 sm:p-6 lg:p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
         <p className="ml-2">Loading authentication...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageTitle title="Record Expenses" subtitle="A log of your business expenditures." icon={TrendingDown}>
         <Button asChild>
            <Link href="/record-expenses/new"><PlusCircle className="mr-2 h-4 w-4" /> New Expense</Link>
        </Button>
      </PageTitle>

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
                    <TableCell>{format(new Date(entry.date), 'PP')}</TableCell>
                    <TableCell>
                      <div className="font-medium">{entry.category}</div>
                      {entry.vendor && <div className="text-xs text-muted-foreground">{entry.vendor}</div>}
                    </TableCell>
                    <TableCell className="max-w-xs truncate" title={entry.description}>{entry.description || '-'}</TableCell>
                    <TableCell>{entry.employeeName || '-'}</TableCell>
                    <TableCell className="text-right font-semibold">{currencySymbol}{entry.amount.toFixed(2)}</TableCell>
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
