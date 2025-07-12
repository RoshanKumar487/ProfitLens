
'use client';

import React, { useState, useCallback } from 'react';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar as CalendarIcon, FileBarChart, Loader2, FileText, User, TrendingDown, Receipt as ReceiptIcon, DollarSign, Banknote, ChevronDown, Package } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, getDocs, query, where, orderBy, Timestamp, collectionGroup, type QueryDocumentSnapshot, type DocumentData } from 'firebase/firestore';
import { downloadCsv } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';


// Local interfaces for Firestore data structures
interface EmployeeFirestore { name: string; position: string; salary: number; description?: string; profilePictureUrl?: string; associatedFileName?: string; associatedFileUrl?: string; addedBy?: string; createdAt: Timestamp; updatedAt?: Timestamp; }
interface ExpenseFirestore { date: Timestamp; amount: number; category: string; vendor?: string; description?: string; addedBy?: string; employeeName?: string; }
interface InvoiceItem { id: string; description: string; quantity: number; unitPrice: number; }
interface InvoiceFirestore { invoiceNumber: string; clientName: string; clientEmail?: string; amount: number; subtotal: number; discountAmount: number; taxAmount: number; issuedDate: Timestamp; dueDate: Timestamp; status: string; notes?: string; items?: InvoiceItem[]; }
interface RevenueEntryFirestore { date: Timestamp; amount: number; source: string; description?: string; }
interface BankTransactionFirestore { date: Timestamp; amount: number; type: 'deposit' | 'withdrawal'; category: string; description: string; accountId: string; }
interface ProductFirestore { name: string; sku: string; category: string; itemType: 'Goods' | 'Service'; unit: string; salePrice: number; purchasePrice: number; gstRate: number; quantity?: number; lowStockThreshold?: number; customFields?: { [key: string]: string; }; createdAt: Timestamp; updatedAt?: Timestamp; }


export default function ReportsPage() {
  const { user, isLoading: authIsLoading } = useAuth();
  const { toast } = useToast();

  // State for each report type using separate from/to dates
  const [employeeFromDate, setEmployeeFromDate] = useState<Date | undefined>();
  const [employeeToDate, setEmployeeToDate] = useState<Date | undefined>();
  const [isExportingEmployees, setIsExportingEmployees] = useState(false);

  const [expenseFromDate, setExpenseFromDate] = useState<Date | undefined>();
  const [expenseToDate, setExpenseToDate] = useState<Date | undefined>();
  const [isExportingExpenses, setIsExportingExpenses] = useState(false);

  const [invoiceFromDate, setInvoiceFromDate] = useState<Date | undefined>();
  const [invoiceToDate, setInvoiceToDate] = useState<Date | undefined>();
  const [isExportingInvoices, setIsExportingInvoices] = useState(false);

  const [revenueFromDate, setRevenueFromDate] = useState<Date | undefined>();
  const [revenueToDate, setRevenueToDate] = useState<Date | undefined>();
  const [isExportingRevenue, setIsExportingRevenue] = useState(false);

  const [bankTransactionFromDate, setBankTransactionFromDate] = useState<Date | undefined>();
  const [bankTransactionToDate, setBankTransactionToDate] = useState<Date | undefined>();
  const [isExportingBankTransactions, setIsExportingBankTransactions] = useState(false);
  
  const [productFromDate, setProductFromDate] = useState<Date | undefined>();
  const [productToDate, setProductToDate] = useState<Date | undefined>();
  const [isExportingProducts, setIsExportingProducts] = useState(false);
  

  const handleExport = useCallback(async (
    exportFormat: 'csv' | 'pdf',
    reportType: string,
    collectionName: string,
    fromDate: Date | undefined,
    toDate: Date | undefined,
    dateField: string,
    headers: string[],
    dataMapper: (doc: QueryDocumentSnapshot<DocumentData>) => Record<string, any> | Record<string, any>[],
    setIsExporting: React.Dispatch<React.SetStateAction<boolean>>,
    useCollectionGroup: boolean = false
  ) => {
    if (!user || !user.companyId) {
      toast({ title: 'Authentication Error', description: 'User not authenticated.', variant: 'destructive' });
      return;
    }
    if (!fromDate || !toDate) {
      toast({ title: 'Date Range Required', description: `Please select a 'From' and 'To' date for the ${reportType} report.`, variant: 'destructive' });
      return;
    }

    setIsExporting(true);
    try {
      const ref = useCollectionGroup ? collectionGroup(db, collectionName) : collection(db, collectionName);
      const q = query(
        ref,
        where('companyId', '==', user.companyId),
        where(dateField, '>=', Timestamp.fromDate(fromDate)),
        where(dateField, '<=', Timestamp.fromDate(new Date(toDate.setHours(23, 59, 59, 999)))),
        orderBy(dateField, 'asc')
      );
      const querySnapshot = await getDocs(q);

      const dataToExport = querySnapshot.docs.flatMap(docSnap => {
        const mappedData = dataMapper(docSnap);
        return Array.isArray(mappedData) ? mappedData : [mappedData];
      });

      if (dataToExport.length === 0) {
        toast({ title: 'No Data', description: `No ${reportType.toLowerCase()} found in the selected date range.`, variant: 'default' });
        setIsExporting(false);
        return;
      }

      const filenameBase = `InventoryOS_${reportType}_${format(fromDate, 'yyyyMMdd')}_to_${format(toDate, 'yyyyMMdd')}`;
      
      if (exportFormat === 'csv') {
        const csvRows = [
          headers.join(','),
          ...dataToExport.map(row => headers.map(header => `"${String(row[header] ?? '').replace(/"/g, '""')}"`).join(','))
        ];
        const csvString = csvRows.join('\n');
        downloadCsv(csvString, `${filenameBase}.csv`);
        toast({ title: 'Export Successful', description: `${dataToExport.length} records exported to CSV.` });
      } else { // PDF logic
        const { default: jsPDF } = await import('jspdf');
        await import('jspdf-autotable'); // For side effects
        const doc = new jsPDF({
          orientation: 'landscape',
        });
        
        doc.text(`${reportType} Report`, 14, 16);
        doc.setFontSize(10);
        doc.text(`Date Range: ${format(fromDate, 'yyyy-MM-dd')} to ${format(toDate, 'yyyy-MM-dd')}`, 14, 22);

        (doc as any).autoTable({
          head: [headers],
          body: dataToExport.map(row => headers.map(header => String(row[header] ?? ''))),
          startY: 28,
          headStyles: { fillColor: [30, 78, 140] }, // Blue header
          styles: { fontSize: 7, cellPadding: 2 },
          margin: { top: 28 },
        });

        doc.save(`${filenameBase}.pdf`);
        toast({ title: 'Export Successful', description: `${dataToExport.length} records exported to PDF.` });
      }

    } catch (error: any) {
      console.error(`Error exporting ${reportType}:`, error);
      toast({ title: 'Export Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  }, [user, toast]);

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

  const renderReportCard = (
      title: string,
      description: string,
      icon: React.ElementType,
      fromDate: Date | undefined,
      setFromDate: React.Dispatch<React.SetStateAction<Date | undefined>>,
      toDate: Date | undefined,
      setToDate: React.Dispatch<React.SetStateAction<Date | undefined>>,
      isExporting: boolean,
      onExport: (exportFormat: 'csv' | 'pdf') => void,
      dateFieldLabel: string
  ) => {
    const IconComponent = icon;
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
                    <Button variant={"outline"} className="w-full sm:w-[240px] justify-start text-left font-normal" disabled={isExporting}>
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
                    <Button variant={"outline"} className="w-full sm:w-[240px] justify-start text-left font-normal" disabled={isExporting || !fromDate}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {toDate ? format(toDate, "LLL dd, y") : <span>Pick 'to' {dateFieldLabel} date</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={toDate}
                        onSelect={setToDate}
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
                        <Button disabled={isExporting || !fromDate || !toDate} className="w-full sm:w-auto">
                             {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                             Export
                             <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => onExport('csv')}>Export as CSV</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onExport('pdf')}>Export as PDF</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardContent>
        </Card>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageTitle title="Reports" subtitle="Export your business data to CSV or PDF." icon={FileBarChart} />
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {renderReportCard(
            'Employee Report',
            'Export employee data including salary and position.',
            User,
            employeeFromDate,
            setEmployeeFromDate,
            employeeToDate,
            setEmployeeToDate,
            isExportingEmployees,
            (exportFormat) => handleExport(
                exportFormat,
                'Team', 'employees', employeeFromDate, employeeToDate, 'createdAt',
                ['ID', 'Name', 'Position', 'Salary', 'Description', 'Added By', 'Profile Picture URL', 'Associated File Name', 'Associated File URL', 'Created At', 'Updated At'],
                (doc) => {
                    const data = doc.data() as EmployeeFirestore;
                    return {
                        'ID': doc.id,
                        'Name': data.name, 
                        'Position': data.position, 
                        'Salary': data.salary,
                        'Description': data.description || '', 
                        'Added By': data.addedBy || 'N/A',
                        'Profile Picture URL': data.profilePictureUrl || '',
                        'Associated File Name': data.associatedFileName || '', 
                        'Associated File URL': data.associatedFileUrl || '',
                        'Created At': format(data.createdAt.toDate(), 'yyyy-MM-dd HH:mm:ss'),
                        'Updated At': data.updatedAt ? format(data.updatedAt.toDate(), 'yyyy-MM-dd HH:mm:ss') : 'N/A'
                    };
                },
                setIsExportingEmployees
            ),
            'creation'
        )}
        {renderReportCard(
            'Itemized Sales Report',
            'Export a detailed list of all sold items.',
            ReceiptIcon,
            invoiceFromDate,
            setInvoiceFromDate,
            invoiceToDate,
            setInvoiceToDate,
            isExportingInvoices,
            (exportFormat) => handleExport(
                exportFormat,
                'Sales & Orders', 'invoices', invoiceFromDate, invoiceToDate, 'issuedDate',
                ['Invoice Number', 'Invoice Status', 'Issued Date', 'Due Date', 'Client Name', 'Item Description', 'Item Quantity', 'Item Unit Price', 'Item Total'],
                (doc) => {
                    const data = doc.data() as InvoiceFirestore;
                    if (!data.items || data.items.length === 0) {
                        return [{
                            'Invoice Number': data.invoiceNumber,
                            'Invoice Status': data.status,
                            'Issued Date': format(data.issuedDate.toDate(), 'yyyy-MM-dd'),
                            'Due Date': format(data.dueDate.toDate(), 'yyyy-MM-dd'),
                            'Client Name': data.clientName,
                            'Item Description': 'N/A - Invoice total only',
                            'Item Quantity': 1,
                            'Item Unit Price': data.amount.toFixed(2),
                            'Item Total': data.amount.toFixed(2)
                        }];
                    }
                    return data.items.map(item => ({
                        'Invoice Number': data.invoiceNumber,
                        'Invoice Status': data.status,
                        'Issued Date': format(data.issuedDate.toDate(), 'yyyy-MM-dd'),
                        'Due Date': format(data.dueDate.toDate(), 'yyyy-MM-dd'),
                        'Client Name': data.clientName,
                        'Item Description': item.description,
                        'Item Quantity': item.quantity,
                        'Item Unit Price': item.unitPrice.toFixed(2),
                        'Item Total': (item.quantity * item.unitPrice).toFixed(2)
                    }));
                },
                setIsExportingInvoices
            ),
            'issued'
        )}
        {renderReportCard(
            'Expense Report',
            'Export all recorded expenses within a date range.',
            TrendingDown,
            expenseFromDate,
            setExpenseFromDate,
            expenseToDate,
            setExpenseToDate,
            isExportingExpenses,
            (exportFormat) => handleExport(
                exportFormat,
                'Expenses', 'expenses', expenseFromDate, expenseToDate, 'date',
                ['Date', 'Amount', 'Category', 'Vendor', 'Description', 'Employee Name', 'Added By'],
                (doc) => {
                    const data = doc.data() as ExpenseFirestore;
                    return {
                        'Date': format(data.date.toDate(), 'yyyy-MM-dd'),
                        'Amount': data.amount,
                        'Category': data.category,
                        'Vendor': data.vendor || '',
                        'Description': data.description || '',
                        'Employee Name': data.employeeName || 'N/A',
                        'Added By': data.addedBy || 'N/A'
                    };
                },
                setIsExportingExpenses
            ),
            'expense'
        )}
        {renderReportCard(
            'Products & Services Report',
            'Export your entire item catalog with stock levels.',
            Package,
            productFromDate,
            setProductFromDate,
            productToDate,
            setProductToDate,
            isExportingProducts,
            (exportFormat) => {
                const customHeaders = productSettings?.customFields.map(f => f.label) || [];
                const allHeaders = ['ID', 'Name', 'SKU', 'Category', 'Item Type', 'Unit', ...customHeaders, 'Sale Price', 'Purchase Price', 'GST Rate (%)', 'Stock Quantity', 'Low Stock Threshold', 'Created At'];
                
                handleExport(
                    exportFormat,
                    'Products & Services', 'products', productFromDate, productToDate, 'createdAt',
                    allHeaders,
                    (doc) => {
                        const data = doc.data() as ProductFirestore;
                        const customFieldsData: Record<string, string> = {};
                        if (productSettings?.customFields) {
                            for (const field of productSettings.customFields) {
                                customFieldsData[field.label] = data.customFields?.[field.id] || '';
                            }
                        }

                        return {
                            'ID': doc.id,
                            'Name': data.name,
                            'SKU': data.sku,
                            'Category': data.category,
                            'Item Type': data.itemType,
                            'Unit': data.unit,
                            ...customFieldsData,
                            'Sale Price': data.salePrice.toFixed(2),
                            'Purchase Price': data.purchasePrice.toFixed(2),
                            'GST Rate (%)': data.gstRate.toFixed(2),
                            'Stock Quantity': data.quantity ?? 'N/A',
                            'Low Stock Threshold': data.lowStockThreshold ?? 'N/A',
                            'Created At': format(data.createdAt.toDate(), 'yyyy-MM-dd HH:mm:ss'),
                        };
                    },
                    setIsExportingProducts
                )
            },
            'creation'
        )}
      </div>
    </div>
  );
}
