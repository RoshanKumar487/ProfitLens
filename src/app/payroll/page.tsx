
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { HandCoins, Loader2, Save, Calendar as CalendarIcon, Settings, Printer, PlusCircle, Trash2, Search } from 'lucide-react';
import { format, startOfMonth } from 'date-fns';
import { getPayrollDataForPeriod, savePayrollData, deletePayrollRecord } from './actions';
import { getPayrollSettings, type PayrollSettings } from '../settings/actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import Link from 'next/link';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { v4 as uuidv4 } from 'uuid';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


interface EmployeeWithPayroll {
  id: string; // employeeId for existing, tempId for new
  name: string;
  profilePictureUrl?: string;
  payrollId: string | null;
  grossSalary: number;
  advances: number;
  otherDeductions: number;
  netPayment: number;
  status: 'Pending' | 'Paid';
  customFields: { [key: string]: number };
  isNew?: boolean;
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


  const fetchPayrollData = useCallback(async (period: Date) => {
    if (!user?.companyId) return;
    setIsLoading(true);
    try {
      const periodString = format(period, 'yyyy-MM');
      const [data, settings] = await Promise.all([
        getPayrollDataForPeriod(user.companyId, periodString),
        getPayrollSettings(user.companyId),
      ]);
      setPayrollData(data);
      setPayrollSettings(settings);
    } catch (error: any) {
      toast({ title: "Error", description: `Could not fetch payroll data: ${error.message}`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user?.companyId, toast]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchPayrollData(payPeriod);
    }
  }, [payPeriod, user, authLoading, fetchPayrollData]);

  const handleInputChange = (employeeId: string, field: keyof Omit<EmployeeWithPayroll, 'id' | 'isNew' | 'payrollId' | 'customFields' | 'netPayment'> | string, value: string) => {
    const numericValue = parseFloat(value) || 0;
    setPayrollData(prevData =>
      prevData.map(emp => {
        if (emp.id === employeeId) {
          if (['grossSalary', 'advances', 'otherDeductions', 'name'].includes(field)) {
            return { ...emp, [field]: field === 'name' ? value : numericValue };
          } else {
            // This is a custom field
            const updatedCustomFields = { ...(emp.customFields || {}), [field]: numericValue };
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
        grossSalary: 0,
        advances: 0,
        otherDeductions: 0,
        netPayment: 0,
        status: 'Pending',
        customFields: {}
    };
    setPayrollData(prev => [...prev, newRow]);
  };

  const handleSaveAll = async () => {
    if (!user?.companyId) return;
    setIsSaving(true);
    const periodString = format(payPeriod, 'yyyy-MM');
    
    const dataToSave = payrollData.map(p => {
      const totalCustomDeductions = payrollSettings?.customFields.reduce((sum, field) => sum + (p.customFields?.[field.id] || 0), 0) || 0;
      const netPayment = (p.grossSalary || 0) - (p.advances || 0) - (p.otherDeductions || 0) - totalCustomDeductions;
      
      const payload: any = {
        payrollId: p.payrollId,
        grossSalary: p.grossSalary,
        advances: p.advances,
        otherDeductions: p.otherDeductions,
        netPayment: netPayment,
        status: p.status,
        customFields: p.customFields || {}
      };

      if (p.isNew) {
        payload.isNew = true;
        payload.name = p.name;
        payload.employeeId = p.id;
      } else {
        payload.employeeId = p.id;
      }
      
      return payload;
    }).filter(p => !p.isNew || (p.isNew && p.name.trim() !== '')); // Filter out empty new rows

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

  const handlePrint = () => {
    window.print();
  };

  const promptDelete = (employee: EmployeeWithPayroll) => {
    setEmployeeToDelete(employee);
  };
  
  const handleConfirmDelete = async () => {
    if (!employeeToDelete) return;
  
    // If it's a new row not yet saved, just remove from state
    if (employeeToDelete.isNew || !employeeToDelete.payrollId) {
      setPayrollData(prev => prev.filter(emp => emp.id !== employeeToDelete.id));
      setEmployeeToDelete(null);
      toast({ title: "Row Removed", description: `${employeeToDelete.name || 'New employee'} has been removed from this payroll view.` });
      return;
    }
  
    // If it has a payrollId, delete from Firestore
    setIsDeleting(true);
    const result = await deletePayrollRecord(employeeToDelete.payrollId);
    toast({
      title: result.success ? "Record Deleted" : "Error",
      description: result.message,
      variant: result.success ? "default" : "destructive"
    });
  
    if (result.success) {
      // Refetch data to ensure consistency
      fetchPayrollData(payPeriod);
    }
  
    setIsDeleting(false);
    setEmployeeToDelete(null);
  };

  const filteredData = useMemo(() => {
    return payrollData.filter(emp => {
      const nameMatch = emp.isNew || emp.name.toLowerCase().includes(searchTerm.toLowerCase());
      const statusMatch = statusFilter === 'All' || emp.status === statusFilter;
      return nameMatch && statusMatch;
    });
  }, [payrollData, searchTerm, statusFilter]);

  const totals = useMemo(() => {
    const initialTotals = {
        grossSalary: 0,
        advances: 0,
        otherDeductions: 0,
        netPayment: 0,
        customFields: {} as { [key: string]: number },
    };

    (payrollSettings?.customFields || []).forEach(field => {
        initialTotals.customFields[field.id] = 0;
    });

    return filteredData.reduce((acc, emp) => {
        const totalCustomDeductions = (payrollSettings?.customFields || []).reduce((sum, field) => sum + (emp.customFields?.[field.id] || 0), 0);
        const netPayment = (emp.grossSalary || 0) - (emp.advances || 0) - (emp.otherDeductions || 0) - totalCustomDeductions;
        
        acc.grossSalary += emp.grossSalary || 0;
        acc.advances += emp.advances || 0;
        acc.otherDeductions += emp.otherDeductions || 0;
        acc.netPayment += netPayment;

        (payrollSettings?.customFields || []).forEach(field => {
            acc.customFields[field.id] += (emp.customFields?.[field.id] || 0);
        });

        return acc;
    }, initialTotals);
  }, [filteredData, payrollSettings]);
  
  
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

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 print:p-0 print:space-y-0">
      <div className="hidden print:block text-center mb-4">
        <h1 className="text-xl font-bold">{user?.companyName}</h1>
        <h2 className="text-lg">Payroll for {format(payPeriod, 'MMMM yyyy')}</h2>
      </div>

      <PageTitle title="Employee Payroll" subtitle="Manage monthly salary, advances, and deductions." icon={HandCoins} />

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
                      <p>Manage Custom Payroll Fields</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={handlePrint}>
                            <Printer className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Print Payroll</p></TooltipContent>
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px] sticky left-0 bg-background z-10">Employee</TableHead>
                  <TableHead>Gross Salary</TableHead>
                  <TableHead>Advances</TableHead>
                  <TableHead>Other Deductions</TableHead>
                  {payrollSettings?.customFields.map(field => (
                    <TableHead key={field.id}>{field.label}</TableHead>
                  ))}
                  <TableHead>Net Payment</TableHead>
                  <TableHead>Status</TableHead>
                   <TableHead className="print:hidden">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="sticky left-0 bg-background z-10"><div className="flex items-center gap-2"><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-4 w-32" /></div></TableCell>
                      {[...Array(3 + (payrollSettings?.customFields.length || 0))].map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-8 w-24" /></TableCell>
                      ))}
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                      <TableCell className="print:hidden"><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredData.length > 0 ? (
                  filteredData.map(emp => {
                    const totalCustomDeductions = payrollSettings?.customFields.reduce((sum, field) => sum + (emp.customFields?.[field.id] || 0), 0) || 0;
                    const netPayment = (emp.grossSalary || 0) - (emp.advances || 0) - (emp.otherDeductions || 0) - totalCustomDeductions;
                    
                    return (
                        <TableRow key={emp.id}>
                          <TableCell className="sticky left-0 bg-background z-10">
                            {emp.isNew ? (
                                <Input 
                                    placeholder="Enter Employee Name" 
                                    value={emp.name} 
                                    onChange={e => handleInputChange(emp.id, 'name', e.target.value)} 
                                />
                            ) : (
                                <div className="flex items-center gap-2">
                                <Avatar>
                                    <AvatarImage src={emp.profilePictureUrl} />
                                    <AvatarFallback>{getInitials(emp.name)}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{emp.name}</span>
                                </div>
                            )}
                          </TableCell>
                          <TableCell><Input type="number" value={emp.grossSalary} onChange={e => handleInputChange(emp.id, 'grossSalary', e.target.value)} className="w-28" /></TableCell>
                          <TableCell><Input type="number" value={emp.advances} onChange={e => handleInputChange(emp.id, 'advances', e.target.value)} className="w-28" /></TableCell>
                          <TableCell><Input type="number" value={emp.otherDeductions} onChange={e => handleInputChange(emp.id, 'otherDeductions', e.target.value)} className="w-28" /></TableCell>
                           {payrollSettings?.customFields.map(field => (
                            <TableCell key={field.id}>
                                <Input 
                                    type="number"
                                    value={emp.customFields?.[field.id] || ''}
                                    onChange={e => handleInputChange(emp.id, field.id, e.target.value)}
                                    className="w-28"
                                />
                            </TableCell>
                          ))}
                          <TableCell className="font-semibold">{currencySymbol}{netPayment.toFixed(2)}</TableCell>
                          <TableCell>
                            <Button
                              variant={emp.status === 'Paid' ? 'default' : 'secondary'}
                              size="sm"
                              onClick={() => handleStatusChange(emp.id, emp.status === 'Paid' ? 'Pending' : 'Paid')}
                              className="w-20"
                            >
                              {emp.status}
                            </Button>
                          </TableCell>
                          <TableCell className="print:hidden">
                            <TooltipProvider>
                                <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => promptDelete(emp)} disabled={isDeleting}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{emp.payrollId ? "Delete this payroll record" : (emp.isNew ? "Remove this new row" : "No payroll record to delete")}</p>
                                </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7 + (payrollSettings?.customFields.length || 0)} className="text-center h-24">
                      {searchTerm || statusFilter !== 'All' ? 'No employees match your filters.' : 'No employees found. Add employees on the Employees page or add a new row manually.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              {filteredData.length > 0 && (
                <TableFooter>
                    <TableRow className="font-bold bg-muted/50">
                        <TableCell className="sticky left-0 bg-muted/50 z-10">Totals</TableCell>
                        <TableCell>{currencySymbol}{totals.grossSalary.toFixed(2)}</TableCell>
                        <TableCell>{currencySymbol}{totals.advances.toFixed(2)}</TableCell>
                        <TableCell>{currencySymbol}{totals.otherDeductions.toFixed(2)}</TableCell>
                        {payrollSettings?.customFields.map(field => (
                            <TableCell key={`total-${field.id}`}>{currencySymbol}{(totals.customFields[field.id] || 0).toFixed(2)}</TableCell>
                        ))}
                        <TableCell>{currencySymbol}{totals.netPayment.toFixed(2)}</TableCell>
                        <TableCell colSpan={2} className="print:hidden"></TableCell>
                    </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
           <div className="pt-4 print:hidden">
            <Button variant="outline" size="sm" onClick={handleAddRow}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Employee Row
            </Button>
          </div>
        </CardContent>
      </Card>
        <AlertDialog open={!!employeeToDelete} onOpenChange={(open) => !open && setEmployeeToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        {employeeToDelete?.isNew ? (
                          <>This will remove <strong>{employeeToDelete?.name || 'this new row'}</strong> from the current payroll view. No data will be deleted.</>
                        ) : (
                          <>This will permanently delete the payroll record for <strong>{employeeToDelete?.name}</strong> for this month. This action cannot be undone.</>
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setEmployeeToDelete(null)} disabled={isDeleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting} className={employeeToDelete?.isNew ? "" : "bg-destructive hover:bg-destructive/90"}>
                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (employeeToDelete?.isNew ? 'Remove' : 'Delete')}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
