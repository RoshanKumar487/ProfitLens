
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { HandCoins, Loader2, Save, Calendar as CalendarIcon, Settings, Printer, PlusCircle, Trash2, Search, Download, MoreHorizontal, Mail, Send } from 'lucide-react';
import { format, startOfMonth, getDaysInMonth } from 'date-fns';
import { getPayrollDataForPeriod, savePayrollData, deletePayrollRecord, sendPayslipEmail } from './actions';
import { getPayrollSettings, type PayrollSettings } from '../settings/actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import Link from 'next/link';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { v4 as uuidv4 } from 'uuid';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import PayslipTemplate from './PayslipTemplate';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { urlToDataUri } from '@/lib/utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Label } from '@/components/ui/label';

interface EmployeeWithPayroll {
  id: string; // employeeId for existing, tempId for new
  name: string;
  position?: string;
  uan?: string;
  joiningDate?: Date;
  profilePictureUrl?: string;
  payrollId: string | null;
  baseSalary: number; // Base salary from employee record
  workingDays: number;
  presentDays: number;
  otDays: number;
  advances: number;
  otherDeductions: number;
  status: 'Pending' | 'Paid';
  customFields: { [key: string]: any };
  isNew?: boolean;

  // Calculated fields, not stored in DB but computed on client
  proratedSalary?: number;
  overtimePay?: number;
  grossEarnings?: number;
  pfContribution?: number;
  esiContribution?: number;
  totalDeductions?: number;
  netPayment?: number;
}


const getInitials = (name: string = "") => {
  const names = name.split(' ');
  let initials = names[0] ? names[0][0] : '';
  if (names.length > 1 && names[names.length - 1]) {
    initials += names[names.length - 1][0];
  }
  return initials.toUpperCase();
};

export default function PayrollPage() {
  const { user, currencySymbol, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [payPeriod, setPayPeriod] = useState<Date>(startOfMonth(new Date()));
  const [payrollData, setPayrollData] = useState<EmployeeWithPayroll[]>([]);
  const [payrollSettings, setPayrollSettings] = useState<PayrollSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<EmployeeWithPayroll | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Paid'>('All');

  const payslipPrintRef = useRef<HTMLDivElement>(null);
  const [isPayslipDialogOpen, setIsPayslipDialogOpen] = useState(false);
  const [employeeForAction, setEmployeeForAction] = useState<EmployeeWithPayroll | null>(null);
  const [companyDetails, setCompanyDetails] = useState<any | null>(null);
  const [payslipImageDataUris, setPayslipImageDataUris] = useState<{ signature?: string; stamp?: string }>({});
  const [isPrinting, setIsPrinting] = useState(false);
  
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const fetchPayrollData = useCallback(async (period: Date) => {
    if (!user?.companyId || payrollSettings === null) return;
    setIsLoading(true);
    try {
      const periodString = format(period, 'yyyy-MM');
      const data = await getPayrollDataForPeriod(user.companyId, periodString);
      
      const daysInMonth = getDaysInMonth(period);

      const processedData = data.map(emp => {
        const processedCustomFields: { [key: string]: any } = {};
        if (emp.customFields && payrollSettings.customFields) {
            for (const field of payrollSettings.customFields) {
                const value = emp.customFields[field.id];
                if (field.type === 'date' && typeof value === 'string' && !isNaN(Date.parse(value))) {
                    processedCustomFields[field.id] = new Date(value);
                } else {
                    processedCustomFields[field.id] = value;
                }
            }
        }
        return { 
          ...emp, 
          baseSalary: emp.salary, // Rename for clarity
          workingDays: emp.workingDays || daysInMonth,
          presentDays: emp.presentDays || daysInMonth,
          otDays: emp.otDays || 0,
          customFields: processedCustomFields 
        };
      });
      
      setPayrollData(processedData);
    } catch (error: any) {
      toast({ title: "Error", description: `Could not fetch payroll data: ${error.message}`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user?.companyId, toast, payrollSettings]);

  const fetchSettings = useCallback(async () => {
    if (!user?.companyId) return;
    try {
      const settings = await getPayrollSettings(user.companyId);
      setPayrollSettings(settings);
    } catch (error: any) {
      toast({ title: "Error", description: `Could not fetch payroll settings: ${error.message}`, variant: "destructive" });
    }
  }, [user?.companyId, toast]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchSettings();
    }
  }, [user, authLoading, fetchSettings]);

  useEffect(() => {
    if (payrollSettings !== null) {
      fetchPayrollData(payPeriod);
    }
  }, [payPeriod, payrollSettings, fetchPayrollData]);

  const filteredAndCalculatedData = useMemo(() => {
    if (!payrollSettings) return [];

    return payrollData
      .map(emp => {
        const workingDays = emp.workingDays > 0 ? emp.workingDays : 1;
        const presentDays = emp.presentDays || 0;
        
        const dailyRate = workingDays > 0 ? (emp.baseSalary / workingDays) : 0;
        const proratedSalary = dailyRate * presentDays;
        const overtimePay = (emp.otDays || 0) * dailyRate;
        const grossEarnings = proratedSalary + overtimePay;
        
        const pfContribution = proratedSalary * ((payrollSettings.pfPercentage || 0) / 100);
        const esiContribution = grossEarnings * ((payrollSettings.esiPercentage || 0) / 100);
        
        const customNumericDeductions = (payrollSettings.customFields || []).reduce((sum, field) => {
            if (field.type === 'number') {
                return sum + (Number(emp.customFields?.[field.id]) || 0);
            }
            return sum;
        }, 0);
        
        const totalDeductions = (emp.advances || 0) + (emp.otherDeductions || 0) + pfContribution + esiContribution + customNumericDeductions;
        const netPayment = grossEarnings - totalDeductions;

        return { 
          ...emp,
          proratedSalary,
          overtimePay,
          grossEarnings,
          pfContribution,
          esiContribution,
          totalDeductions,
          netPayment,
        };
      })
      .filter(emp => {
        const nameMatch = emp.isNew || emp.name.toLowerCase().includes(searchTerm.toLowerCase());
        const statusMatch = statusFilter === 'All' || emp.status === statusFilter;
        return nameMatch && statusMatch;
      });
  }, [payrollData, payrollSettings, searchTerm, statusFilter]);

  const handleInputChange = (employeeId: string, field: keyof EmployeeWithPayroll, value: any) => {
    setPayrollData(prevData =>
      prevData.map(emp => {
        if (emp.id === employeeId) {
          if (['baseSalary', 'workingDays', 'presentDays', 'otDays', 'advances', 'otherDeductions'].includes(field as string)) {
            return { ...emp, [field]: parseFloat(value) || 0 };
          } else if (field === 'name') {
            return { ...emp, name: value };
          }
          else {
            const updatedCustomFields = { ...(emp.customFields || {}), [field]: value };
            return { ...emp, customFields: updatedCustomFields };
          }
        }
        return emp;
      })
    );
  };
  
  const handleStatusChange = (employeeId: string, newStatus: 'Pending' | 'Paid') => {
    setPayrollData(prevData =>
        prevData.map(emp => emp.id === employeeId ? { ...emp, status: newStatus } : emp)
    );
  };
  
  const handleAddRow = () => {
    const newRow: EmployeeWithPayroll = {
        id: uuidv4(),
        isNew: true,
        name: '',
        payrollId: null,
        baseSalary: 0,
        workingDays: getDaysInMonth(payPeriod),
        presentDays: getDaysInMonth(payPeriod),
        otDays: 0,
        advances: 0,
        otherDeductions: 0,
        status: 'Pending',
        customFields: {}
    };
    setPayrollData(prev => [...prev, newRow]);
  };

  const handleInsertRow = (afterEmployeeId: string) => {
    const newRow: EmployeeWithPayroll = {
      id: uuidv4(),
      isNew: true,
      name: '',
      payrollId: null,
      baseSalary: 0,
      workingDays: getDaysInMonth(payPeriod),
      presentDays: getDaysInMonth(payPeriod),
      otDays: 0,
      advances: 0,
      otherDeductions: 0,
      status: 'Pending',
      customFields: {},
    };

    setPayrollData(prev => {
      const insertAtIndex = prev.findIndex(p => p.id === afterEmployeeId);
      if (insertAtIndex === -1) {
        return [...prev, newRow];
      }
      const newData = [...prev];
      newData.splice(insertAtIndex + 1, 0, newRow);
      return newData;
    });
  };

  const handleSaveAll = async () => {
    if (!user?.companyId) return;
    setIsSaving(true);
    const periodString = format(payPeriod, 'yyyy-MM');
    
    const dataToSave = payrollData.map(p => {
        const customFieldsForSave: { [key: string]: any } = {};
        if (p.customFields) {
            for (const key in p.customFields) {
                const value = p.customFields[key];
                if (value instanceof Date) {
                    customFieldsForSave[key] = value.toISOString();
                } else {
                    customFieldsForSave[key] = value;
                }
            }
        }
        const payload: any = {
            payrollId: p.payrollId,
            baseSalary: p.baseSalary,
            workingDays: p.workingDays,
            presentDays: p.presentDays,
            otDays: p.otDays,
            advances: p.advances,
            otherDeductions: p.otherDeductions,
            status: p.status,
            customFields: customFieldsForSave,
            // Save calculated values for historical accuracy
            proratedSalary: p.proratedSalary,
            overtimePay: p.overtimePay,
            grossEarnings: p.grossEarnings,
            pfContribution: p.pfContribution,
            esiContribution: p.esiContribution,
            totalDeductions: p.totalDeductions,
            netPayment: p.netPayment,
        };

        if (p.isNew) {
            payload.isNew = true;
            payload.name = p.name;
            payload.employeeId = p.id;
        } else {
            payload.employeeId = p.id;
        }
      
        return payload;
    }).filter(p => !p.isNew || (p.isNew && p.name.trim() !== ''));

    if (dataToSave.length === 0) {
        toast({ title: "No Data to Save", description: "There are no changes or new employees to save.", variant: 'default' });
        setIsSaving(false);
        return;
    }

    const result = await savePayrollData(user.companyId, periodString, dataToSave);
    toast({
      title: result.success ? "Success" : "Error",
      description: result.message,
      variant: result.success ? "default" : "destructive"
    });
    if (result.success) {
      fetchPayrollData(payPeriod);
    }
    setIsSaving(false);
  };
  
  const promptDelete = (employee: EmployeeWithPayroll) => {
    setEmployeeToDelete(employee);
  };
  
  const handleConfirmDelete = async () => {
    if (!employeeToDelete) return;
  
    if (employeeToDelete.isNew || !employeeToDelete.payrollId) {
      setPayrollData(prev => prev.filter(emp => emp.id !== employeeToDelete.id));
      setEmployeeToDelete(null);
      toast({ title: "Row Removed", description: `${employeeToDelete.name || 'New employee'} has been removed from this payroll view.` });
      return;
    }
  
    setIsDeleting(true);
    const result = await deletePayrollRecord(employeeToDelete.payrollId);
    toast({
      title: result.success ? "Record Deleted" : "Error",
      description: result.message,
      variant: result.success ? "default" : "destructive"
    });
  
    if (result.success) {
      fetchPayrollData(payPeriod);
    }
  
    setIsDeleting(false);
    setEmployeeToDelete(null);
  };

  const totals = useMemo(() => {
    return filteredAndCalculatedData.reduce((acc, emp) => {
        acc.baseSalary += emp.baseSalary || 0;
        acc.presentDays += emp.presentDays || 0;
        acc.otDays += emp.otDays || 0;
        acc.grossEarnings += emp.grossEarnings || 0;
        acc.advances += emp.advances || 0;
        acc.otherDeductions += emp.otherDeductions || 0;
        acc.pfContribution += emp.pfContribution || 0;
        acc.esiContribution += emp.esiContribution || 0;
        acc.totalDeductions += emp.totalDeductions || 0;
        acc.netPayment += emp.netPayment || 0;

        (payrollSettings?.customFields || []).forEach(field => {
            if (field.type === 'number') {
                acc.customFields[field.id] = (acc.customFields[field.id] || 0) + (Number(emp.customFields?.[field.id]) || 0);
            }
        });
        return acc;
    }, { 
        baseSalary: 0, grossEarnings: 0, advances: 0, otherDeductions: 0, pfContribution: 0, esiContribution: 0, totalDeductions: 0, netPayment: 0,
        presentDays: 0, otDays: 0, // Count fields
        customFields: {} as { [key: string]: number } 
    });
  }, [filteredAndCalculatedData, payrollSettings]);

  const fetchCompanyDetailsAndUris = async () => {
    if (!companyDetails && user?.companyId) {
        const companyRef = doc(db, 'companyProfiles', user.companyId);
        const companySnap = await getDoc(companyRef);
        if (companySnap.exists()) {
            const companyData = companySnap.data();
            setCompanyDetails(companyData);
            const uris: { signature?: string; stamp?: string } = {};
            if (companyData.signatureUrl) uris.signature = await urlToDataUri(companyData.signatureUrl);
            if (companyData.stampUrl) uris.stamp = await urlToDataUri(companyData.stampUrl);
            setPayslipImageDataUris(uris);
            return companyData;
        }
    }
    return companyDetails;
  };
  
  const handleOpenPayslipDialog = async (employee: EmployeeWithPayroll) => {
    setEmployeeForAction(employee);
    await fetchCompanyDetailsAndUris();
    setIsPayslipDialogOpen(true);
  };

  const handleOpenEmailDialog = async (employee: EmployeeWithPayroll) => {
    setEmployeeForAction(employee);
    await fetchCompanyDetailsAndUris();
    setRecipientEmail('');
    setIsEmailDialogOpen(true);
  };

  const handlePrintSheet = () => {
    window.print();
  };

  const handlePrintPayslip = async () => {
    if (!payslipPrintRef.current) return;
    setIsPrinting(true);
    try {
      const elementToPrint = payslipPrintRef.current;
      const canvas = await html2canvas(elementToPrint, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(pdfUrl);
      if (printWindow) {
        printWindow.onload = () => { printWindow.print(); URL.revokeObjectURL(pdfUrl); };
      } else {
        toast({ title: "Print Error", description: "Could not open print window.", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Print Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownloadPayslipPdf = async () => {
    if (!payslipPrintRef.current || !employeeForAction) return;
    setIsPrinting(true);
    try {
      const elementToPrint = payslipPrintRef.current;
      const canvas = await html2canvas(elementToPrint, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
      pdf.save(`Payslip-${employeeForAction.name.replace(/\s+/g, '_')}-${format(payPeriod, 'yyyy-MM')}.pdf`);
      toast({ title: "Download Started" });
    } catch (error: any) {
      toast({ title: "Download Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSendEmail = async () => {
    if (!payslipPrintRef.current || !employeeForAction || !recipientEmail) return;

    setIsSendingEmail(true);
    toast({ title: 'Generating PDF...', description: 'Please wait while the payslip is being prepared.' });
    try {
        const elementToPrint = payslipPrintRef.current;
        const canvas = await html2canvas(elementToPrint, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/png');
        
        if (!imgData || imgData === 'data:,') {
          throw new Error("Could not generate a valid image for the PDF.");
        }

        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
        
        const pdfBase64 = pdf.output('datauristring').split(',')[1];
        
        const subject = `Your Payslip for ${format(payPeriod, 'MMMM yyyy')}`;
        const htmlBody = `
            <p>Dear ${employeeForAction.name},</p>
            <p>Please find your payslip for the month of ${format(payPeriod, 'MMMM yyyy')} attached to this email.</p>
            <p>This is an automated message. If you have any questions regarding your payslip, please contact the HR or accounts department.</p>
            <p>Best regards,<br/>${companyDetails?.name || 'Your Company'}</p>
        `;
        const filename = `Payslip-${employeeForAction.name.replace(/\s+/g, '_')}-${format(payPeriod, 'yyyy-MM')}.pdf`;
        
        const result = await sendPayslipEmail({
            to: recipientEmail,
            subject,
            htmlBody,
            attachment: {
                filename,
                content: pdfBase64
            }
        });

        toast({
            title: result.success ? "Success" : "Error",
            description: result.message,
            variant: result.success ? 'default' : 'destructive'
        });

        if (result.success) {
            setIsEmailDialogOpen(false);
        }

    } catch (error: any) {
        console.error("Error sending payslip email:", error);
        toast({ title: "Email Failed", description: `Could not send email: ${error.message}`, variant: "destructive" });
    } finally {
        setIsSendingEmail(false);
    }
  };


  if (authLoading) {
      return <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <PageTitle title="Payroll" icon={HandCoins} />
        <Card><CardHeader><CardTitle>Access Denied</CardTitle></CardHeader><CardContent><p>You must be an admin to view this page.</p></CardContent></Card>
      </div>
    );
  }

  const columnCount = 13 + (payrollSettings?.customFields.length || 0);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 print:p-0 print:space-y-0">
      <div className="hidden print:block text-center mb-4">
        <h1 className="text-xl font-bold">{user?.companyName}</h1>
        <h2 className="text-lg">Payroll for {format(payPeriod, 'MMMM yyyy')}</h2>
      </div>

      <PageTitle title="Employee Payroll" subtitle="Manage monthly salary, advances, and deductions." icon={HandCoins} className="print:hidden" />

      <Card className="print:shadow-none print:border-none">
        <CardHeader className="print:hidden">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Payroll for {format(payPeriod, 'MMMM yyyy')}</CardTitle>
              <CardDescription>Select a month to view or edit payroll data.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <Popover>
                    <PopoverTrigger asChild>
                    <Button variant={"outline"}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(payPeriod, "MMMM yyyy")}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={payPeriod}
                        onSelect={(date) => date && setPayPeriod(startOfMonth(date))}
                        initialFocus
                        defaultMonth={payPeriod}
                        captionLayout="dropdown-buttons"
                        fromYear={2020}
                        toYear={new Date().getFullYear() + 1}
                        components={{ Day: () => null }}
                    />
                    </PopoverContent>
                </Popover>
                 <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" asChild>
                        <Link href="/settings">
                          <Settings className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Manage Payroll Settings</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={handlePrintSheet}>
                            <Printer className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Print Payroll Sheet</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button onClick={handleSaveAll} disabled={isSaving || isLoading}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save All Changes
                </Button>
            </div>
          </div>
            <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 border-t mt-4">
                <div className="relative w-full sm:flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search employee by name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <div className="w-full sm:w-auto">
                    <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Filter by Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Statuses</SelectItem>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="Paid">Paid</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto relative" style={{maxHeight: 'calc(100vh - 420px)'}}>
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="w-8 p-0 print:hidden"></TableHead>
                  <TableHead className="w-[250px]">Employee</TableHead>
                  <TableHead>Base Salary</TableHead>
                  <TableHead>Working Days</TableHead>
                  <TableHead>Present Days</TableHead>
                  <TableHead>OT Days</TableHead>
                  <TableHead>Gross Earnings</TableHead>
                  <TableHead>Advances</TableHead>
                  <TableHead>Other Deductions</TableHead>
                  <TableHead>PF</TableHead>
                  <TableHead>ESI</TableHead>
                  {payrollSettings?.customFields.map(field => field.type === 'number' && <TableHead key={field.id}>{field.label}</TableHead>)}
                  <TableHead>Total Deductions</TableHead>
                  <TableHead>Net Payment</TableHead>
                  <TableHead>Status</TableHead>
                   <TableHead className="print:hidden">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="print:hidden"></TableCell>
                      <TableCell><div className="flex items-center gap-2"><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-4 w-32" /></div></TableCell>
                      {[...Array(columnCount-3)].map((_, j) => (<TableCell key={j}><Skeleton className="h-8 w-24" /></TableCell>))}
                      <TableCell className="print:hidden"><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredAndCalculatedData.length > 0 ? (
                  filteredAndCalculatedData.map(emp => (
                    <TableRow key={emp.id} className="group">
                      <TableCell className="p-0 print:hidden"><div className="flex items-center justify-center"><TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleInsertRow(emp.id)}><PlusCircle className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent side="right"><p>Insert row below</p></TooltipContent></Tooltip></TooltipProvider></div></TableCell>
                      <TableCell>{emp.isNew ? (<Input placeholder="Enter Employee Name" value={emp.name} onChange={e => handleInputChange(emp.id, 'name', e.target.value)} />) : (<div className="flex items-center gap-2"><Avatar><AvatarImage src={emp.profilePictureUrl} /><AvatarFallback>{getInitials(emp.name)}</AvatarFallback></Avatar><span className="font-medium">{emp.name}</span></div>)}</TableCell>
                      <TableCell><Input type="number" value={emp.baseSalary} onChange={e => handleInputChange(emp.id, 'baseSalary', e.target.value)} className="w-28" /></TableCell>
                      <TableCell><Input type="number" value={emp.workingDays} onChange={e => handleInputChange(emp.id, 'workingDays', e.target.value)} className="w-24" /></TableCell>
                      <TableCell><Input type="number" value={emp.presentDays} onChange={e => handleInputChange(emp.id, 'presentDays', e.target.value)} className="w-24" /></TableCell>
                      <TableCell><Input type="number" value={emp.otDays} onChange={e => handleInputChange(emp.id, 'otDays', e.target.value)} className="w-24" step="0.1" /></TableCell>
                      <TableCell className="font-semibold">{currencySymbol}{emp.grossEarnings?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell><Input type="number" value={emp.advances} onChange={e => handleInputChange(emp.id, 'advances', e.target.value)} className="w-28" /></TableCell>
                      <TableCell><Input type="number" value={emp.otherDeductions} onChange={e => handleInputChange(emp.id, 'otherDeductions', e.target.value)} className="w-28" /></TableCell>
                      <TableCell className="text-sm">{currencySymbol}{emp.pfContribution?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell className="text-sm">{currencySymbol}{emp.esiContribution?.toFixed(2) || '0.00'}</TableCell>
                       {payrollSettings?.customFields.map(field => {
                          if (field.type !== 'number') return null;
                          const value = emp.customFields?.[field.id] ?? '';
                          return (<TableCell key={field.id}><Input type="number" value={value} onChange={e => handleInputChange(emp.id, field.id, e.target.value)} className="w-28" /></TableCell>);
                       })}
                      <TableCell className="font-semibold">{currencySymbol}{emp.totalDeductions?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell className="font-bold text-lg">{currencySymbol}{emp.netPayment?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell><Button variant={emp.status === 'Paid' ? 'default' : 'secondary'} size="sm" onClick={() => handleStatusChange(emp.id, emp.status === 'Paid' ? 'Pending' : 'Paid')} className="w-20">{emp.status}</Button></TableCell>
                      <TableCell className="print:hidden"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => handleOpenPayslipDialog(emp)}><Printer className="mr-2 h-4 w-4" /> Print Payslip</DropdownMenuItem><DropdownMenuItem onClick={() => handleOpenEmailDialog(emp)}><Mail className="mr-2 h-4 w-4" /> Email Payslip</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onClick={() => promptDelete(emp)} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4" /> Delete Record</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={columnCount} className="text-center h-24">{searchTerm || statusFilter !== 'All' ? 'No employees match your filters.' : 'No employees found. Add employees on the Employees page or add a new row manually.'}</TableCell></TableRow>
                )}
              </TableBody>
              <TableFooter className="sticky bottom-0 bg-muted z-10">
                  <TableRow className="font-bold">
                      <TableCell className="print:hidden"></TableCell>
                      <TableCell>Totals</TableCell>
                      <TableCell>{currencySymbol}{totals.baseSalary.toFixed(2)}</TableCell>
                      <TableCell></TableCell>
                      <TableCell>{totals.presentDays}</TableCell>
                      <TableCell>{totals.otDays}</TableCell>
                      <TableCell>{currencySymbol}{totals.grossEarnings.toFixed(2)}</TableCell>
                      <TableCell>{currencySymbol}{totals.advances.toFixed(2)}</TableCell>
                      <TableCell>{currencySymbol}{totals.otherDeductions.toFixed(2)}</TableCell>
                      <TableCell>{currencySymbol}{totals.pfContribution.toFixed(2)}</TableCell>
                      <TableCell>{currencySymbol}{totals.esiContribution.toFixed(2)}</TableCell>
                      {payrollSettings?.customFields.map(field => field.type === 'number' && <TableCell key={`total-${field.id}`}>{currencySymbol}{(totals.customFields[field.id] || 0).toFixed(2)}</TableCell>)}
                      <TableCell>{currencySymbol}{totals.totalDeductions.toFixed(2)}</TableCell>
                      <TableCell>{currencySymbol}{totals.netPayment.toFixed(2)}</TableCell>
                      <TableCell colSpan={2} className="print:hidden"></TableCell>
                  </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="pt-4 print:hidden">
          <Button variant="outline" size="sm" onClick={handleAddRow}><PlusCircle className="mr-2 h-4 w-4" /> Add Employee Row</Button>
        </CardFooter>
      </Card>
        <AlertDialog open={!!employeeToDelete} onOpenChange={(open) => !open && setEmployeeToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>{employeeToDelete?.isNew ? (<>This will remove <strong>{employeeToDelete?.name || 'this new row'}</strong> from the current payroll view. No data will be deleted.</>) : (<>This will permanently delete the payroll record for <strong>{employeeToDelete?.name}</strong> for this month. This action cannot be undone.</>)}</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel onClick={() => setEmployeeToDelete(null)} disabled={isDeleting}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting} className={employeeToDelete?.isNew ? "" : "bg-destructive hover:bg-destructive/90"}>{isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (employeeToDelete?.isNew ? 'Remove' : 'Delete')}</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        <Dialog open={isPayslipDialogOpen} onOpenChange={setIsPayslipDialogOpen}>
          <DialogContent className="max-w-4xl w-full h-[95vh] flex flex-col p-0 bg-gray-100 dark:bg-background">
            <DialogHeader className="p-4 sm:p-6 pb-2 border-b bg-background no-print"><DialogTitle className="font-headline text-xl truncate">Payslip: {employeeForAction?.name}</DialogTitle></DialogHeader>
            <ScrollArea className="flex-grow bg-muted p-4 sm:p-8">
              <div ref={payslipPrintRef}>
                {employeeForAction && companyDetails ? (<PayslipTemplate employee={employeeForAction} payPeriod={format(payPeriod, 'yyyy-MM')} companyDetails={companyDetails} payrollSettings={payrollSettings} currencySymbol={currencySymbol} signatureDataUri={payslipImageDataUris.signature} stampDataUri={payslipImageDataUris.stamp}/>) : <Skeleton className="w-[210mm] h-[297mm] mx-auto bg-white" />}
              </div>
            </ScrollArea>
            <DialogFooter className="p-4 sm:p-6 border-t bg-background no-print justify-end flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={handleDownloadPayslipPdf} disabled={isPrinting}>{isPrinting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} Download PDF</Button>
              <Button type="button" variant="default" onClick={handlePrintPayslip} disabled={isPrinting}>{isPrinting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />} Print Payslip</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
            <DialogContent>
                <DialogHeader>
                <DialogTitle>Email Payslip to {employeeForAction?.name}</DialogTitle>
                <DialogDescription>A PDF of the payslip will be generated and sent to the recipient's email address.</DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                <Label htmlFor="recipient-email">Recipient Email</Label>
                <Input id="recipient-email" type="email" placeholder="employee@example.com" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} disabled={isSendingEmail}/>
                </div>
                <DialogFooter>
                <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)} disabled={isSendingEmail}>Cancel</Button>
                <Button onClick={handleSendEmail} disabled={isSendingEmail || !recipientEmail}>
                    {isSendingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Send Email
                </Button>
                </DialogFooter>
                 <div className="absolute -left-[9999px] top-0 opacity-0 pointer-events-none">
                    <div ref={payslipPrintRef}>
                      {employeeForAction && companyDetails && (
                          <PayslipTemplate
                              employee={employeeForAction}
                              payPeriod={format(payPeriod, 'yyyy-MM')}
                              companyDetails={companyDetails}
                              payrollSettings={payrollSettings}
                              currencySymbol={currencySymbol}
                              signatureDataUri={payslipImageDataUris.signature}
                              stampDataUri={payslipImageDataUris.stamp}
                          />
                      )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    </div>
  );
}
