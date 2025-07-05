
'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import PageTitle from '@/components/PageTitle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NAV_ITEMS } from '@/lib/constants';
import Link from 'next/link';
import { LayoutGrid, Download, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
  const CardContentWrapper = isEnabled ? Link : 'div';
  return (
    <Card
      className={cn(
        'group relative flex h-full transform flex-col justify-between overflow-hidden transition-all duration-300 ease-out hover:shadow-2xl',
        isEnabled ? 'hover:-translate-y-2 hover:shadow-primary/20' : 'bg-muted/50 text-muted-foreground'
      )}
    >
      <CardContentWrapper
        href={isEnabled ? item.href : '#'}
        className={cn(!isEnabled && 'cursor-not-allowed')}
      >
        <CardHeader>
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <item.icon className="h-6 w-6" />
          </div>
          <CardTitle className="font-headline text-xl">{item.label}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{item.description}</p>
        </CardContent>
      </CardContentWrapper>
      {!isEnabled && (
        <div className="absolute inset-0 bg-background/60" />
      )}
    </Card>
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
            // 1. Fetch all data
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
            
            // 2. Prepare props for each payslip
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
            // The useEffect will trigger the PDF generation now.

        } catch (error: any) {
            console.error("Error preparing payslips:", error);
            toast({ title: 'Error', description: `Failed to prepare payslips: ${error.message}`, variant: 'destructive' });
            setIsDownloading(false);
        }
    };
    
    // This effect runs after the payslips are rendered off-screen
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
                        scale: 2, // Higher scale for better quality
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

                // Cleanup
                setPayslipPropsList([]);
                setIsDownloading(false);
            };

            // Timeout to ensure DOM has updated
            setTimeout(generatePdf, 100);
        }
    }, [payslipPropsList, selectedMonth, toast]);

    return (
        <>
            <Card className="flex flex-col justify-between">
                <CardHeader>
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Download className="h-6 w-6" />
                    </div>
                    <CardTitle className="font-headline text-xl">Download Payslips</CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">Download all paid employee payslips for a selected month in a single PDF file.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
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
                    <Button onClick={handlePrepareAndDownload} disabled={isDownloading || authLoading}>
                        {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        {isDownloading ? 'Generating PDF...' : 'Download Payslips'}
                    </Button>
                </CardContent>
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

  // Explicitly define which tools appear on this page.
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
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {accessibleTools.map(item => (
          <ToolCard key={item.href} item={item} isEnabled={true} />
        ))}
         {user?.role === 'admin' && <PayslipDownloaderCard />}
      </div>
    </div>
  );
}
