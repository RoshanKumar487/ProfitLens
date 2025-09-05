
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Edit, Download, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Skeleton } from '@/components/ui/skeleton';
import { urlToDataUri } from '@/lib/utils';
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import BioDataTemplate from '../BioDataTemplate';
import { getEmployeeById, type EmployeeDisplay } from '../actions';
import PageTitle from '@/components/PageTitle';

interface CompanyDetails {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  signatureUrl?: string;
  stampUrl?: string;
}

export default function ViewEmployeeBioDataPage() {
    const { user, isLoading: authIsLoading } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const params = useParams();
    const employeeId = params.id as string;

    const [employee, setEmployee] = useState<EmployeeDisplay | null>(null);
    const [companyDetails, setCompanyDetails] = useState<CompanyDetails | null>(null);
    const [bioDataImageUris, setBioDataImageUris] = useState<Record<string, string | undefined>>({});
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [useLetterhead, setUseLetterhead] = useState(true);
    const printRef = useRef<HTMLDivElement>(null);
    
    const fetchAllData = useCallback(async () => {
        if (!user || !employeeId) {
            setIsLoadingData(false);
            return;
        }
        setIsLoadingData(true);
        try {
            const employeeData = await getEmployeeById(employeeId);
            if (!employeeData) {
                toast({ title: "Error", description: "Employee not found.", variant: "destructive" });
                router.push('/employees');
                return;
            }
            setEmployee(employeeData);

            // In a real app, company details would be fetched from a DB
            const mockCompanyDetails = {
                name: user.companyName || "Your Company",
                address: "123 Business Rd", city: "Businesstown", state: "CA", country: "USA",
            };
            setCompanyDetails(mockCompanyDetails);

            // Fetch images and convert to data URIs
            const [profile, signature, thumb] = await Promise.all([
                employeeData.profilePictureUrl ? urlToDataUri(employeeData.profilePictureUrl) : Promise.resolve(undefined),
                employeeData.signatureUrl ? urlToDataUri(employeeData.signatureUrl) : Promise.resolve(undefined),
                employeeData.leftThumbImpressionUrl ? urlToDataUri(employeeData.leftThumbImpressionUrl) : Promise.resolve(undefined),
            ]);
            setBioDataImageUris({ profile, signature, thumb });

        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to load employee data.", variant: "destructive" });
            router.push('/employees');
        } finally {
            setIsLoadingData(false);
        }
    }, [employeeId, user, toast, router]);

    useEffect(() => {
        if (!authIsLoading) {
            fetchAllData();
        }
    }, [authIsLoading, fetchAllData]);
    
    const processDocument = async (action: 'download' | 'print') => {
        if (!printRef.current || !employee) return;
        setIsProcessing(true);
        try {
            const elementToPrint = printRef.current;
            const canvas = await html2canvas(elementToPrint, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
            const imgData = canvas.toDataURL('image/png');
            if (!imgData || imgData === 'data:,') {
                throw new Error("Could not generate an image of the document.");
            }
            const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
            pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
            
            if (action === 'download') {
                pdf.save(`BioData-${employee.name.replace(/\s+/g, '_')}.pdf`);
                toast({ title: "Download Started" });
            } else if (action === 'print') {
                const pdfBlob = pdf.output('blob');
                const pdfUrl = URL.createObjectURL(pdfBlob);
                const printWindow = window.open(pdfUrl);
                if (printWindow) {
                    printWindow.onload = () => { printWindow.print(); URL.revokeObjectURL(pdfUrl); };
                } else {
                    throw new Error("Could not open print window. Please disable pop-up blockers.");
                }
            }
        } catch (error: any) {
            toast({ title: `${action === 'download' ? 'Download' : 'Print'} Failed`, description: error.message, variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };
  
  if (authIsLoading || isLoadingData) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-muted min-h-screen">
                 <div className="w-[210mm] min-h-[297mm] mx-auto p-4 border shadow-lg bg-white">
                    <Skeleton className="h-24 w-full mb-4" />
                    <Skeleton className="h-[800px] w-full mt-4" />
                </div>
            </div>
        )
    }

    if (!employee || !companyDetails) {
        return (
            <div className="p-8">
                <PageTitle title="Error" subtitle="Could not load employee data."/>
                 <Button variant="outline" asChild className="mt-4"><Link href="/employees"><ArrowLeft className="mr-2 h-4 w-4" />Back to Employees</Link></Button>
            </div>
        )
    }
    
    return (
        <div className="w-full">
            <header className="w-full bg-background/80 border-b shadow-sm sticky top-14 sm:top-16 z-10 p-2 print:hidden backdrop-blur-sm">
                <div className="max-w-7xl mx-auto flex justify-between items-center flex-wrap gap-2 px-4">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" asChild><Link href="/employees"><ArrowLeft className="h-4 w-4"/></Link></Button>
                        <h1 className="text-lg font-bold truncate">Bio-Data: {employee.name}</h1>
                    </div>
                     <div className="flex items-center gap-2 flex-wrap justify-end">
                        <div className="flex items-center gap-2 border-l pl-2">
                            <Switch id="use-letterhead-bio" checked={useLetterhead} onCheckedChange={setUseLetterhead} disabled={isProcessing} />
                            <Label htmlFor="use-letterhead-bio" className="text-xs cursor-pointer">Letterhead</Label>
                        </div>
                        <Button variant="secondary" asChild size="sm"><Link href={`/employees/${employeeId}/edit`}><Edit className="mr-2 h-4 w-4" /> Edit</Link></Button>
                        <Button size="sm" onClick={() => processDocument('download')} disabled={isProcessing}>{isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} PDF</Button>
                        <Button size="sm" onClick={() => processDocument('print')} disabled={isProcessing}>{isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />} Print</Button>
                    </div>
                </div>
            </header>
             <main className="w-full bg-muted py-8">
                <div className="bg-white shadow-lg mx-auto">
                    <BioDataTemplate 
                        ref={printRef} 
                        employee={employee} 
                        companyDetails={companyDetails}
                        profilePictureDataUri={bioDataImageUris.profile}
                        leftThumbImpressionDataUri={bioDataImageUris.thumb}
                        signatureDataUri={bioDataImageUris.signature}
                        letterheadTemplate={useLetterhead ? 'simple' : 'none'}
                    />
                </div>
            </main>
        </div>
    )
}

    