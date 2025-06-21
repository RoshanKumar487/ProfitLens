
'use client';

import React, { useState, useCallback } from 'react';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar as CalendarIcon, FileBarChart, Loader2, FileText, User, TrendingDown, Receipt as ReceiptIcon, DollarSign, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { downloadCsv } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

// Local interfaces for Firestore data structures
interface EmployeeFirestore { name: string; position: string; salary: number; description?: string; profilePictureUrl?: string; associatedFileName?: string; createdAt: Timestamp; }
interface ExpenseFirestore { date: Timestamp; amount: number; category: string; vendor?: string; description?: string; }
interface InvoiceFirestore { invoiceNumber: string; clientName: string; clientEmail?: string; amount: number; issuedDate: Timestamp; dueDate: Timestamp; status: string; notes?: string; }
interface RevenueEntryFirestore { date: Timestamp; amount: number; source: string; description?: string; }
interface AppointmentFirestore { date: Timestamp; time?: string; title: string; location?: string; notes?: string; }


export default function ReportsPage() {
  const { user, isLoading: authIsLoading } = useAuth();
  const { toast } = useToast();

  // State for each report type
  const [employeeDateRange, setEmployeeDateRange] = useState<DateRange | undefined>();
  const [isExportingEmployees, setIsExportingEmployees] = useState(false);

  const [expenseDateRange, setExpenseDateRange] = useState<DateRange | undefined>();
  const [isExportingExpenses, setIsExportingExpenses] = useState(false);

  const [invoiceDateRange, setInvoiceDateRange] = useState<DateRange | undefined>();
  const [isExportingInvoices, setIsExportingInvoices] = useState(false);

  const [revenueDateRange, setRevenueDateRange] = useState<DateRange | undefined>();
  const [isExportingRevenue, setIsExportingRevenue] = useState(false);
  
  const [appointmentDateRange, setAppointmentDateRange] = useState<DateRange | undefined>();
  const [isExportingAppointments, setIsExportingAppointments] = useState(false);

  const handleExport = useCallback(async (
    reportType: 'Employees' | 'Expenses' | 'Invoices' | 'Revenue' | 'Appointments',
    collectionName: string,
    dateRange: DateRange | undefined,
    dateField: string,
    headers: string[],
    dataMapper: (docData: any) => Record<string, any>,
    setIsExporting: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    if (!user || !user.companyId) {
      toast({ title: 'Authentication Error', description: 'User not authenticated.', variant: 'destructive' });
      return;
    }
    if (!dateRange || !dateRange.from || !dateRange.to) {
      toast({ title: 'Date Range Required', description: `Please select a date range for the ${reportType} report.`, variant: 'destructive' });
      return;
    }

    setIsExporting(true);
    try {
      const collectionRef = collection(db, collectionName);
      const q = query(
        collectionRef,
        where('companyId', '==', user.companyId),
        where(dateField, '>=', Timestamp.fromDate(dateRange.from)),
        where(dateField, '<=', Timestamp.fromDate(new Date(dateRange.to.setHours(23, 59, 59, 999)))),
        orderBy(dateField, 'asc')
      );
      const querySnapshot = await getDocs(q);
      const dataToExport = querySnapshot.docs.map(docSnap => dataMapper(docSnap.data()));

      if (dataToExport.length === 0) {
        toast({ title: 'No Data', description: `No ${reportType.toLowerCase()} found in the selected date range.`, variant: 'default' });
        setIsExporting(false);
        return;
      }

      const csvRows = [
        headers.join(','),
        ...dataToExport.map(row => headers.map(header => `"${String(row[header] ?? '').replace(/"/g, '""')}"`).join(','))
      ];
      const csvString = csvRows.join('\n');
      const filename = `BizSight_${reportType}_${format(dateRange.from, 'yyyyMMdd')}_to_${format(dateRange.to, 'yyyyMMdd')}.csv`;
      downloadCsv(csvString, filename);
      toast({ title: 'Export Successful', description: `${dataToExport.length} ${reportType.toLowerCase()} exported.` });

    } catch (error: any) {
      console.error(`Error exporting ${reportType}:`, error);
      toast({ title: 'Export Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  }, [user, toast]);

  if (authIsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-2">Loading authentication...</p>
      </div>
    );
  }

  if (!user && !authIsLoading) {
     return (
      <div className="space-y-6">
        <PageTitle title="Reports" subtitle="Export your business data." icon={FileBarChart} />
        <Card className="shadow-lg">
          <CardHeader><CardTitle>Access Denied</CardTitle></CardHeader>
          <CardContent><p>Please sign in to generate reports.</p></CardContent>
        </Card>
      </div>
    )
  }

  const renderReportCard = (
      title: string,
      description: string,
      icon: React.ElementType,
      dateRange: DateRange | undefined,
      setDateRange: React.Dispatch<React.SetStateAction<DateRange | undefined>>,
      isExporting: boolean,
      onExport: () => void,
      dateFieldLabel: string
  ) => {
    const IconComponent = icon;
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
            <CardContent className="flex flex-col sm:flex-row gap-2 items-center">
                <Popover>
                    <PopoverTrigger asChild>
                    <Button variant={"outline"} className="w-full sm:w-[280px] justify-start text-left font-normal" disabled={isExporting}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                        dateRange.to ? (
                            <>
                            {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                            </>
                        ) : (
                            format(dateRange.from, "LLL dd, y")
                        )
                        ) : (
                        <span>Pick {dateFieldLabel} date range</span>
                        )}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                    />
                    </PopoverContent>
                </Popover>
                <Button onClick={onExport} disabled={isExporting || !dateRange?.from || !dateRange?.to} className="w-full sm:w-auto">
                    {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                    Export CSV
                </Button>
            </CardContent>
        </Card>
    )
  }

  return (
    <div className="space-y-6">
      <PageTitle title="Reports" subtitle="Export your business data to CSV." icon={FileBarChart} />
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {renderReportCard(
            'Employee Report',
            'Export employee data including salary and position.',
            User,
            employeeDateRange,
            setEmployeeDateRange,
            isExportingEmployees,
            () => handleExport(
                'Employees',
                'employees',
                employeeDateRange,
                'createdAt',
                ['Name', 'Position', 'Salary', 'Description', 'Profile Picture URL', 'Associated File Name', 'Created At'],
                (data: EmployeeFirestore) => ({
                    'Name': data.name,
                    'Position': data.position,
                    'Salary': data.salary,
                    'Description': data.description || '',
                    'Profile Picture URL': data.profilePictureUrl || '',
                    'Associated File Name': data.associatedFileName || '',
                    'Created At': format(data.createdAt.toDate(), 'yyyy-MM-dd HH:mm:ss'),
                }),
                setIsExportingEmployees
            ),
            'creation'
        )}
        {renderReportCard(
            'Expense Report',
            'Export a list of all expenses.',
            TrendingDown,
            expenseDateRange,
            setExpenseDateRange,
            isExportingExpenses,
            () => handleExport(
                'Expenses',
                'expenses',
                expenseDateRange,
                'date',
                ['Date', 'Amount', 'Category', 'Vendor', 'Description'],
                (data: ExpenseFirestore) => ({
                    'Date': format(data.date.toDate(), 'yyyy-MM-dd'),
                    'Amount': data.amount.toFixed(2),
                    'Category': data.category,
                    'Vendor': data.vendor || '',
                    'Description': data.description || '',
                }),
                setIsExportingExpenses
            ),
            'expense'
        )}
        {renderReportCard(
            'Invoice Report',
            'Export a list of all invoices.',
            ReceiptIcon,
            invoiceDateRange,
            setInvoiceDateRange,
            isExportingInvoices,
            () => handleExport(
                'Invoices',
                'invoices',
                invoiceDateRange,
                'issuedDate',
                ['Invoice Number', 'Client Name', 'Client Email', 'Amount', 'Issued Date', 'Due Date', 'Status', 'Notes'],
                (data: InvoiceFirestore) => ({
                    'Invoice Number': data.invoiceNumber,
                    'Client Name': data.clientName,
                    'Client Email': data.clientEmail || '',
                    'Amount': data.amount.toFixed(2),
                    'Issued Date': format(data.issuedDate.toDate(), 'yyyy-MM-dd'),
                    'Due Date': format(data.dueDate.toDate(), 'yyyy-MM-dd'),
                    'Status': data.status,
                    'Notes': data.notes || '',
                }),
                setIsExportingInvoices
            ),
            'issued'
        )}
        {renderReportCard(
            'Revenue Report',
            'Export a list of all revenue entries.',
            DollarSign,
            revenueDateRange,
            setRevenueDateRange,
            isExportingRevenue,
            () => handleExport(
                'Revenue',
                'revenueEntries',
                revenueDateRange,
                'date',
                ['Date', 'Amount', 'Source', 'Description'],
                (data: RevenueEntryFirestore) => ({
                    'Date': format(data.date.toDate(), 'yyyy-MM-dd'),
                    'Amount': data.amount.toFixed(2),
                    'Source': data.source,
                    'Description': data.description || '',
                }),
                setIsExportingRevenue
            ),
            'revenue'
        )}
         {renderReportCard(
            'Appointments Report',
            'Export your calendar appointments.',
            CalendarDays,
            appointmentDateRange,
            setAppointmentDateRange,
            isExportingAppointments,
            () => handleExport(
                'Appointments',
                'appointments',
                appointmentDateRange,
                'date',
                ['Date', 'Time', 'Title', 'Location', 'Notes'],
                (data: AppointmentFirestore) => ({
                    'Date': format(data.date.toDate(), 'yyyy-MM-dd'),
                    'Time': data.time || '',
                    'Title': data.title,
                    'Location': data.location || '',
                    'Notes': data.notes || '',
                }),
                setIsExportingAppointments
            ),
            'appointment'
        )}
      </div>
    </div>
  );
}
