
'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import PageTitle from '@/components/PageTitle';
import { NAV_ITEMS } from '@/lib/constants';
import Link from 'next/link';
import { LayoutGrid, Download, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfMonth } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { getPayrollDataForPeriod } from '@/app/payroll/actions';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import PayslipTemplate from '@/app/payroll/PayslipTemplate';
import { getPayrollSettings, type PayrollSettings } from '@/app/settings/actions';
import { urlToDataUri } from '@/lib/utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const ToolCard = ({ item, isEnabled }: { item: (typeof NAV_ITEMS)[0]; isEnabled: boolean }) => {
  const CardWrapper = isEnabled ? Link : 'div';
  return (
    <CardWrapper href={isEnabled ? item.href : '#'} className={cn(!isEnabled && 'pointer-events-none opacity-60')}>
      <div className="h-full rounded-lg border bg-card p-5 text-card-foreground shadow-sm transition-all duration-200 hover:border-primary/50 hover:shadow-lg">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-red-500">
          <item.icon className="h-6 w-6 text-white" />
        </div>
        <h3 className="text-base font-semibold text-foreground">{item.label}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
      </div>
    </CardWrapper>
  );
};


function PayslipDownloaderCard() {
    const { user, currencySymbol, isLoading: authLoading } = useAuth();
    const { toast } = useToast();
    const [selectedMonth, setSelectedMonth] = useState<Date>(startOfMonth(new Date()));
    const [isDownloading, setIsDownloading] = useState(false);
    const [payslipPropsList, setPayslipPropsList] = useState<any[]>([]);
    const payslipContainerRef = useRef<HTMLDivElement>(null);

    const handlePrepareAndDownload = async () => {
        if (!user?.companyId) {
            toast({ title: 'Error', description: 'Could not identify your company.', variant: 'destructive' });
            return;
        }
        setIsDownloading(true);
        toast({ title: 'Starting Download...', description: 'Preparing payslips. This may take a moment.' });

        try {
            const periodString = format(selectedMonth, 'yyyy-MM');
            const companyDocRef = doc(db, 'companyProfiles', user.companyId);
            
            const [payrollData, companySnap, payrollSettings] = await Promise.all([
                getPayrollDataForPeriod(user.companyId, periodString),
                getDoc(companyDocRef),
                getPayrollSettings(user.companyId)
            ]);

            if (!companySnap.exists()) throw new Error("Company profile not found.");
            const companyDetails = companySnap.data();

            const employeesWithPayroll = payrollData.filter(p => p.status === 'Paid');
            if (employeesWithPayroll.length === 0) {
                toast({ title: 'No Data', description: 'No "Paid" payslips found for the selected month.' });
                setIsDownloading(false);
                return;
            }

            const uris: { signature?: string; stamp?: string } = {};
            if (companyDetails.signatureUrl) uris.signature = await urlToDataUri(companyDetails.signatureUrl);
            if (companyDetails.stampUrl) uris.stamp = await urlToDataUri(companyDetails.stampUrl);
            
            const propsList = employeesWithPayroll.map(employee => ({
                employee: {
                  ...employee,
                  joiningDate: employee.joiningDate ? new Date(employee.joiningDate) : undefined,
                },
                payPeriod: periodString,
                companyDetails,
                payrollSettings,
                currencySymbol,
                signatureDataUri: uris.signature,
                stampDataUri: uris.stamp
            }));

            setPayslipPropsList(propsList);

        } catch (error: any) {
            console.error("Error preparing payslips:", error);
            toast({ title: 'Error', description: `Failed to prepare payslips: ${error.message}`, variant: 'destructive' });
            setIsDownloading(false);
        }
    };
    
    useEffect(() => {
        if (payslipPropsList.length > 0 && payslipContainerRef.current) {
            const generatePdf = async () => {
                const payslipElements = payslipContainerRef.current?.children;
                if (!payslipElements || payslipElements.length === 0) {
                    setIsDownloading(false);
                    setPayslipPropsList([]);
                    return;
                }

                const pdf = new jsPDF('p', 'mm', 'a4');
                
                for (let i = 0; i < payslipElements.length; i++) {
                    const canvas = await html2canvas(payslipElements[i] as HTMLElement, {
                        scale: 2,
                        useCORS: true,
                        backgroundColor: '#ffffff',
                    });
                    const imgData = canvas.toDataURL('image/png');
                    if (i > 0) {
                        pdf.addPage();
                    }
                    pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), undefined, 'FAST');
                }

                pdf.save(`Payslips_${format(selectedMonth, 'yyyy-MM')}.pdf`);
                toast({ title: 'Download Complete', description: `${payslipElements.length} payslips have been downloaded.` });

                setPayslipPropsList([]);
                setIsDownloading(false);
            };

            setTimeout(generatePdf, 100);
        }
    }, [payslipPropsList, selectedMonth, toast]);

    return (
        <>
            <Card className="h-full p-5 flex flex-col hover:border-primary/50 hover:shadow-lg transition-all duration-200">
                <div className="flex-grow">
                     <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-red-500">
                        <Download className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground">Download Payslips</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Download all paid employee payslips for a selected month in a single PDF file.</p>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                     <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start font-normal" disabled={isDownloading}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {format(selectedMonth, 'MMMM yyyy')}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={selectedMonth}
                                onSelect={(date) => date && setSelectedMonth(startOfMonth(date))}
                                captionLayout="dropdown-buttons"
                                fromYear={2020}
                                toYear={new Date().getFullYear() + 1}
                                components={{ Day: () => null }}
                            />
                        </PopoverContent>
                    </Popover>
                    <Button onClick={handlePrepareAndDownload} disabled={isDownloading || authLoading} size="sm">
                        {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isDownloading ? 'Generating...' : 'Download'}
                    </Button>
                </div>
            </Card>

            <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -100, background: 'white' }}>
              <div ref={payslipContainerRef}>
                {payslipPropsList.map((props) => <PayslipTemplate key={props.employee.id} {...props} />)}
              </div>
            </div>
        </>
    );
}

export default function MyToolsPage() {
  const { user } = useAuth();

  const toolHrefs = ['/reports', '/settings', '/admin', '/bank-accounts', '/payroll'];
  const accessibleTools = NAV_ITEMS.filter(item => {
    if (item.href === '/admin' || item.href === '/payroll') {
      return user?.role === 'admin' && toolHrefs.includes(item.href);
    }
    return toolHrefs.includes(item.href);
  });

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageTitle
        title="My Tools"
        subtitle="Your central hub for managing all aspects of your business."
        icon={LayoutGrid}
      />
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Build</h2>
          <p className="text-sm text-muted-foreground">Accelerate app development</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accessibleTools.map(item => (
            <ToolCard key={item.href} item={item} isEnabled={true} />
          ))}
          {user?.role === 'admin' && <PayslipDownloaderCard />}
        </div>
      </div>
    </div>
  );
}
