
'use client';

import React, { useState, useEffect } from 'react';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { TrendingUp, MoreHorizontal, Loader2, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

interface RevenueEntryDisplay {
    id: string;
    date: string;
    amount: number;
    source: string;
    description?: string;
}

const MOCK_REVENUE: RevenueEntryDisplay[] = [
    { id: '1', date: '2024-07-28', amount: 5000, source: 'Client Payment', description: 'Milestone 2 for Project X' },
    { id: '2', date: '2024-07-26', amount: 1200, source: 'Product Sales', description: 'Online store sales' },
];

export default function RecordRevenuePage() {
  const { user, isLoading: authIsLoading, currencySymbol } = useAuth();

  const [recentEntries, setRecentEntries] = useState<RevenueEntryDisplay[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);

  useEffect(() => {
    // Mock fetching revenue
    setIsLoadingEntries(true);
    setTimeout(() => {
        setRecentEntries(MOCK_REVENUE);
        setIsLoadingEntries(false);
    }, 1000);
  }, []);

  if (authIsLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageTitle title="Record Revenue" subtitle="Log your daily or transaction-based income." icon={TrendingUp}>
        <Button asChild>
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
              <TableCaption>{!isLoadingEntries && recentEntries.length === 0 ? "No revenue recorded yet." : "A list of your revenue entries"}</TableCaption>
              <TableHeader>
                  <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-[50px] text-right">Actions</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
              {isLoadingEntries ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[90px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-[70px] ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : recentEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                        No revenue entries found. Click "Record Revenue" to get started.
                    </TableCell>
                </TableRow>
              ) : recentEntries.map(entry => (
                  <TableRow key={entry.id}>
                      <TableCell>{format(new Date(entry.date), 'PP')}</TableCell>
                      <TableCell className="font-medium">{entry.source}</TableCell>
                      <TableCell className="max-w-xs truncate" title={entry.description}>{entry.description || '-'}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">{currencySymbol}{entry.amount.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" disabled><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                  <DropdownMenuItem disabled><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                                  <DropdownMenuItem disabled className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
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
