
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { HandCoins, Loader2, Save, Calendar as CalendarIcon, Settings } from 'lucide-react';
import { format, startOfMonth } from 'date-fns';
import { getPayrollDataForPeriod, savePayrollData } from './actions';
import { getPayrollSettings, type PayrollSettings } from '../settings/actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import Link from 'next/link';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface EmployeeWithPayroll {
  id: string; // employeeId
  name: string;
  profilePictureUrl?: string;
  payrollId: string | null;
  grossSalary: number;
  advances: number;
  otherDeductions: number;
  netPayment: number;
  status: 'Pending' | 'Paid';
  customFields: { [key: string]: number };
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

  const handleInputChange = (employeeId: string, field: 'grossSalary' | 'advances' | 'otherDeductions' | string, value: string) => {
    const numericValue = parseFloat(value) || 0;
    setPayrollData(prevData =>
      prevData.map(emp => {
        if (emp.id === employeeId) {
          if (['grossSalary', 'advances', 'otherDeductions'].includes(field)) {
            return { ...emp, [field]: numericValue };
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

  const handleSaveAll = async () => {
    if (!user?.companyId) return;
    setIsSaving(true);
    const periodString = format(payPeriod, 'yyyy-MM');
    const dataToSave = payrollData.map(p => {
      const totalCustomDeductions = payrollSettings?.customFields.reduce((sum, field) => sum + (p.customFields?.[field.id] || 0), 0) || 0;
      const netPayment = (p.grossSalary || 0) - (p.advances || 0) - (p.otherDeductions || 0) - totalCustomDeductions;
      return {
        employeeId: p.id,
        payrollId: p.payrollId,
        payPeriod: periodString,
        grossSalary: p.grossSalary,
        advances: p.advances,
        otherDeductions: p.otherDeductions,
        netPayment: netPayment,
        status: p.status,
        customFields: p.customFields || {}
      };
    });

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
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageTitle title="Employee Payroll" subtitle="Manage monthly salary, advances, and deductions." icon={HandCoins} />

      <Card>
        <CardHeader>
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
                </TooltipProvider>
                <Button onClick={handleSaveAll} disabled={isSaving || isLoading}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save All Changes
                </Button>
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
                    </TableRow>
                  ))
                ) : payrollData.length > 0 ? (
                  payrollData.map(emp => {
                    const totalCustomDeductions = payrollSettings?.customFields.reduce((sum, field) => sum + (emp.customFields?.[field.id] || 0), 0) || 0;
                    const netPayment = (emp.grossSalary || 0) - (emp.advances || 0) - (emp.otherDeductions || 0) - totalCustomDeductions;
                    
                    return (
                        <TableRow key={emp.id}>
                          <TableCell className="sticky left-0 bg-background z-10">
                            <div className="flex items-center gap-2">
                              <Avatar>
                                <AvatarImage src={emp.profilePictureUrl} />
                                <AvatarFallback>{getInitials(emp.name)}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{emp.name}</span>
                            </div>
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
                        </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6 + (payrollSettings?.customFields.length || 0)} className="text-center h-24">
                      No employees found. Add employees on the Employees page.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
