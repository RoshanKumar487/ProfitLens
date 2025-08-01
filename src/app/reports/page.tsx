
'use client';

import React, { useState, useCallback } from 'react';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar as CalendarIcon, FileBarChart, Loader2, FileText, User, TrendingDown, Receipt as ReceiptIcon, DollarSign, Banknote, ChevronDown, Package } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { downloadCsv } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';


export default function ReportsPage() {
  const { user, isLoading: authIsLoading } = useAuth();
  const { toast } = useToast();

  const handleDisabledExport = () => {
    toast({ title: "Export Disabled", description: "Data exporting is disabled without a backend connection.", variant: "destructive" });
  };
  
  const ReportCard = ({ title, description, icon: IconComponent, dateFieldLabel }: { title: string, description: string, icon: React.ElementType, dateFieldLabel: string }) => {
    const [fromDate, setFromDate] = useState<Date | undefined>();
    const [toDate, setToDate] = useState<Date | undefined>();
    const currentYear = new Date().getFullYear();

    return (
        <Card className="shadow-lg">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <IconComponent className="h-8 w-8 text-primary" />
                    <div>
                        <CardTitle className="font-headline">{title}</CardTitle>
                        <CardDescription>{description}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-2 items-center flex-wrap">
                 <Popover>
                    <PopoverTrigger asChild>
                    <Button variant={"outline"} className="w-full sm:w-[240px] justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {fromDate ? format(fromDate, "LLL dd, y") : <span>Pick 'from' {dateFieldLabel} date</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={fromDate}
                        onSelect={setFromDate}
                        captionLayout="dropdown-buttons"
                        fromYear={currentYear - 20}
                        toYear={currentYear}
                        initialFocus
                    />
                    </PopoverContent>
                </Popover>
                 <Popover>
                    <PopoverTrigger asChild>
                    <Button variant={"outline"} className="w-full sm:w-[240px] justify-start text-left font-normal" disabled={!fromDate}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {toDate ? format(toDate, "LLL dd, y") : <span>Pick 'to' {dateFieldLabel} date</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={toDate}
                        disabled={{ before: fromDate }}
                        captionLayout="dropdown-buttons"
                        fromYear={currentYear - 20}
                        toYear={currentYear}
                        initialFocus
                    />
                    </PopoverContent>
                </Popover>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button disabled={!fromDate || !toDate} className="w-full sm:w-auto">
                             <FileText className="mr-2 h-4 w-4" />
                             Export
                             <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={handleDisabledExport}>Export as CSV</DropdownMenuItem>
                        <DropdownMenuItem onClick={handleDisabledExport}>Export as PDF</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardContent>
        </Card>
    );
  };

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
        <PageTitle title="Reports" subtitle="Export your business data." icon={FileBarChart} />
        <Card className="shadow-lg">
          <CardHeader><CardTitle>Access Denied</CardTitle></CardHeader>
          <CardContent><p>Please sign in to generate reports.</p></CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageTitle title="Reports" subtitle="Export your business data to CSV or PDF." icon={FileBarChart} />
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <ReportCard title="Employee Report" description="Export employee data including salary and position." icon={User} dateFieldLabel="creation" />
        <ReportCard title="Itemized Sales Report" description="Export a detailed list of all sold items from invoices." icon={ReceiptIcon} dateFieldLabel="issued" />
        <ReportCard title="Expense Report" description="Export all recorded expenses within a date range." icon={TrendingDown} dateFieldLabel="expense" />
        <ReportCard title="Products & Services Report" description="Export your entire item catalog with stock levels." icon={Package} dateFieldLabel="creation" />
      </div>
    </div>
  );
}
