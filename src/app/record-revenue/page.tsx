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
  date: Date; 
  amount: number;
  source: string;
  description?: string;
  addedBy: string;
}

export default function RecordRevenuePage() {
  const { user, isLoading: authIsLoading, currencySymbol } = useAuth();

  const [recentEntries, setRecentEntries] = useState<RevenueEntryDisplay[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);

  useEffect(() => {
    // This is now a mock fetch since we don't have a backend for revenue yet.
    setIsLoadingEntries(false);
    setRecentEntries([]);
  }, []);

  if (authIsLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) {
    // This should ideally not be reached due to middleware, but it's good practice
    return (
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
            <PageTitle title="Record Revenue" icon={TrendingUp} />
            <Card>
                <CardHeader><CardTitle>Access Denied</CardTitle></CardHeader>
                <CardContent><p>Please sign in to view this page.</p></CardContent>
            </Card>
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
            <CardDescription>A list of your recorded revenue entries. (Note: Data is not persistent yet)</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
              <TableCaption>{!isLoadingEntries && recentEntries.length === 0 ? "No revenue recorded yet." : "A list of your revenue entries"}</TableCaption>
              <TableHeader>
                  <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Added By</TableHead>
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
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-[70px] ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : recentEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                        No revenue entries found. Click "Record Revenue" to get started.
                    </TableCell>
                </TableRow>
              ) : recentEntries.map(entry => (
                  <TableRow key={entry.id}>
                      <TableCell>{format(entry.date, 'PP')}</TableCell>
                      <TableCell className="font-medium">{entry.source}</TableCell>
                      <TableCell className="max-w-xs truncate" title={entry.description}>{entry.description || '-'}</TableCell>
                      <TableCell>{entry.addedBy}</TableCell>
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