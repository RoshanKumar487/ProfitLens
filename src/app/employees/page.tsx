
'use client';

import React, { useState, useEffect, FormEvent, useCallback, useRef, useMemo } from 'react';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users2, PlusCircle, MoreHorizontal, Edit, Trash2, Loader2, Upload, ArrowUp, ArrowDown, ChevronsUpDown, Printer, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, doc, getDoc, getDocs, query, where, orderBy, Timestamp, serverTimestamp, limit, startAfter, endBefore, limitToLast, type QueryDocumentSnapshot, type DocumentData, deleteDoc } from 'firebase/firestore';
import { deleteFileFromStorage } from '@/lib/firebaseStorageUtils';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { urlToDataUri } from '@/lib/utils';
import * as xlsx from 'xlsx';
import { bulkAddEmployees } from './actions';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { analyzeEmployeeDocument } from '@/ai/flows/analyze-employee-document-flow';
import Link from 'next/link';
import BioDataTemplate from './BioDataTemplate';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface EmployeeFirestore {
  id?: string;
  name: string;
  name_lowercase: string;
  position: string;
  salary: number;
  uan?: string;
  description?: string;
  profilePictureUrl?: string;
  profilePictureStoragePath?: string;
  associatedFileUrl?: string;
  associatedFileName?: string;
  associatedFileStoragePath?: string;
  addedById: string;
  addedBy: string;
  companyId: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  fatherName?: string;
  motherName?: string;
  permanentAddressHNo?: string;
  permanentAddressPS?: string;
  permanentAddressPost?: string;
  permanentAddressDist?: string;
  permanentAddressState?: string;
  permanentAddressPin?: string;
  qualification?: string;
  selfPhoneNo?: string;
  dateOfBirth?: Timestamp;
  height?: string;
  weight?: string;
  identificationMarks?: string;
  joiningDate?: Timestamp;
  guarantorName?: string;
  guarantorPhone?: string;
  experience?: string;
  leftThumbImpressionUrl?: string;
  leftThumbImpressionStoragePath?: string;
  signatureUrl?: string;
  signatureStoragePath?: string;
}

export interface EmployeeDisplay extends Omit<EmployeeFirestore, 'updatedAt' | 'companyId' | 'addedById' | 'dateOfBirth' | 'joiningDate'> {
  id: string;
  createdAt: Date;
  dateOfBirth?: Date;
  joiningDate?: Date;
}

type ParsedEmployee = Omit<EmployeeFirestore, 'id' | 'createdAt' | 'updatedAt' | 'companyId' | 'addedById' | 'addedBy' | 'profilePictureUrl' | 'profilePictureStoragePath' | 'associatedFileUrl' | 'associatedFileName' | 'associatedFileStoragePath' | 'name_lowercase'>;

const RECORDS_PER_PAGE = 20;

const getInitials = (name: string = "") => {
  const names = name.split(' ');
  let initials = names[0] ? names[0][0] : '';
  if (names.length > 1 && names[names.length - 1]) {
    initials += names[names.length - 1][0];
  }
  return initials.toUpperCase();
};


export default function EmployeesPage() {
  const { user, isLoading: authIsLoading, currencySymbol } = useAuth();
  const [employees, setEmployees] = useState<EmployeeDisplay[]>([]);
  const { toast } = useToast();
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [employeeToDeleteId, setEmployeeToDeleteId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editableParsedEmployees, setEditableParsedEmployees] = useState<ParsedEmployee[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  
  const [sortConfig, setSortConfig] = useState<{ key: keyof EmployeeDisplay; direction: 'desc' | 'asc' }>({ key: 'createdAt', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [firstVisible, setFirstVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  const bioDataPrintRef = useRef<HTMLDivElement>(null);
  const [isBioDataDialogOpen, setIsBioDataDialogOpen] = useState(false);
  const [employeeToPrint, setEmployeeToPrint] = useState<EmployeeDisplay | null>(null);
  const [bioDataImageUris, setBioDataImageUris] = useState<Record<string, string | undefined>>({});
  const [companyDetails, setCompanyDetails] = useState<any | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [useLetterhead, setUseLetterhead] = useState(true);

  const fetchEmployees = useCallback(async (direction: 'next' | 'prev' | 'reset' = 'reset') => {
    if (authIsLoading || !user || !user.companyId) {
      setIsLoadingEmployees(false);
      setEmployees([]);
      return;
    }
    setIsLoadingEmployees(true);
    try {
      const employeesRef = collection(db, 'employees');
      
      let q;
      const sortKey = sortConfig.key === 'name' ? 'name_lowercase' : sortConfig.key;
      const baseQuery = [
        where('companyId', '==', user.companyId),
        orderBy(sortKey, sortConfig.direction),
      ];

      if (sortKey !== 'createdAt') {
        baseQuery.push(orderBy('createdAt', sortConfig.direction));
      }

      if (direction === 'next' && lastVisible) {
        q = query(employeesRef, ...baseQuery, startAfter(lastVisible), limit(RECORDS_PER_PAGE));
      } else if (direction === 'prev' && firstVisible) {
        q = query(employeesRef, ...baseQuery, endBefore(firstVisible), limitToLast(RECORDS_PER_PAGE));
      } else { // reset
        q = query(employeesRef, ...baseQuery, limit(RECORDS_PER_PAGE));
      }

      const querySnapshot = await getDocs(q);
      
      const fetchedEmployees = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data() as Omit<EmployeeFirestore, 'id'>;
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          dateOfBirth: data.dateOfBirth?.toDate(),
          joiningDate: data.joiningDate?.toDate(),
        } as EmployeeDisplay;
      });
      setEmployees(fetchedEmployees);
      
      if (querySnapshot.docs.length > 0) {
        setFirstVisible(querySnapshot.docs[0]);
        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
      }

    } catch (error: any) {
      console.error('Error fetching employees:', error);
      toast({ title: 'Error Loading Employees', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoadingEmployees(false);
    }
  }, [user, authIsLoading, toast, sortConfig, lastVisible, firstVisible]);

  useEffect(() => {
    if (!authIsLoading) {
      handleSortChange('createdAt');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authIsLoading]);

  useEffect(() => {
    if (!authIsLoading && user) {
        fetchEmployees('reset');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortConfig]);
  
  const handlePageChange = (direction: 'next' | 'prev') => {
    let newPage = currentPage;
    if (direction === 'next') newPage++;
    if (direction === 'prev' && currentPage > 1) newPage--;
    setCurrentPage(newPage);
    fetchEmployees(direction);
  };
  
  const handleSortChange = (key: keyof EmployeeDisplay) => {
    let direction: 'desc' | 'asc' = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setCurrentPage(1);
    setFirstVisible(null);
    setLastVisible(null);
    setSortConfig({ key, direction });
  };
  
  const getSortIcon = (key: keyof EmployeeDisplay) => {
    if (sortConfig.key !== key) {
        return <ChevronsUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />;
    }
    if (sortConfig.direction === 'asc') {
        return <ArrowUp className="ml-2 h-4 w-4" />;
    }
    return <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const promptDeleteEmployee = (id: string) => {
    setEmployeeToDeleteId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteEmployee = async () => {
    if (!employeeToDeleteId || !user || !user.companyId) return;
    setIsSaving(true);
    try {
      const employeeToDelete = employees.find(emp => emp.id === employeeToDeleteId);
      if (employeeToDelete) {
        const pathsToDelete = [
          employeeToDelete.profilePictureStoragePath,
          employeeToDelete.associatedFileStoragePath,
          employeeToDelete.signatureStoragePath,
          employeeToDelete.leftThumbImpressionStoragePath,
        ].filter(Boolean) as string[];

        await Promise.all(pathsToDelete.map(path => deleteFileFromStorage(path)))
            .catch(e => console.warn("Failed to delete all files from storage", e));
      }
      await deleteDoc(doc(db, 'employees', employeeToDeleteId));
      toast({ title: "Employee Deleted", variant: "destructive"});
      fetchEmployees('reset');
    } catch (error: any) {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive"});
    } finally {
      setIsSaving(false);
      setEmployeeToDeleteId(null);
      setIsDeleteDialogOpen(false);
    }
  };
  
  const handleImportClick = () => { fileInputRef.current?.click(); };
  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = xlsx.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = xlsx.utils.sheet_to_json(worksheet);

        const requiredHeaders = ['name', 'position', 'salary'];
        if (!requiredHeaders.every(h => Object.keys(json[0] || {}).includes(h))) {
          return toast({ title: 'Invalid File Format', variant: 'destructive' });
        }
        const employeesToParse: ParsedEmployee[] = json.map(row => ({ name: String(row.name || ''), position: String(row.position || ''), salary: Number(row.salary || 0), description: String(row.description || '') })).filter(emp => emp.name && emp.position && !isNaN(emp.salary));
        
        if (employeesToParse.length === 0) return toast({ title: 'No Valid Data', variant: 'destructive' });
        setEditableParsedEmployees(employeesToParse);
        setIsImportDialogOpen(true);
      } catch (error) { toast({ title: 'File Read Error', variant: 'destructive' }); } 
      finally { if (e.target) e.target.value = ''; }
    };
    reader.readAsBinaryString(file);
  };

  const handleParsedEmployeeChange = (index: number, field: keyof ParsedEmployee, value: string | number) => {
    setEditableParsedEmployees(prev => { const newEmployees = [...prev]; (newEmployees[index] as any)[field] = value; return newEmployees; });
  };
  const handleConfirmImport = async () => {
    if (!user || !user.companyId) return toast({ title: 'Authentication Error', variant: 'destructive' });
    if (editableParsedEmployees.length === 0) return toast({ title: 'No Data', variant: 'destructive' });
    setIsImporting(true);
    const result = await bulkAddEmployees(editableParsedEmployees, user.companyId, user.uid, user.displayName || user.email || 'System');
    toast({ title: result.success ? 'Import Successful' : 'Import Failed', description: result.message, variant: result.success ? 'default' : 'destructive'});
    if (result.success) { fetchEmployees('reset'); setIsImportDialogOpen(false); setEditableParsedEmployees([]); }
    setIsImporting(false);
  };

   const handleOpenBioDataDialog = async (employee: EmployeeDisplay) => {
    setEmployeeToPrint(employee);
    if (!companyDetails && user?.companyId) {
        const companyRef = doc(db, 'companyProfiles', user.companyId);
        const companySnap = await getDoc(companyRef);
        if (companySnap.exists()) {
            setCompanyDetails(companySnap.data());
        }
    }
    
    setIsPrinting(true); 
    setIsBioDataDialogOpen(true);
    const uris: Record<string, string | undefined> = {};
    const urlMap = {
        profile: employee.profilePictureUrl,
        thumb: employee.leftThumbImpressionUrl,
        signature: employee.signatureUrl,
    };

    for (const [key, url] of Object.entries(urlMap)) {
        if (url) {
            uris[key] = await urlToDataUri(url);
        }
    }
    setBioDataImageUris(uris);
    setIsPrinting(false);
  };

  const handlePrint = async () => {
    if (!bioDataPrintRef.current) return;
    setIsPrinting(true);

    try {
        const elementToPrint = bioDataPrintRef.current;
        const canvas = await html2canvas(elementToPrint, {
            scale: 3,
            useCORS: true,
            backgroundColor: '#ffffff',
        });
        const imgData = canvas.toDataURL('image/png');
        if (!imgData || imgData === 'data:,') {
            toast({
                title: "Print Failed",
                description: "Could not generate a printable image of the document. This can be caused by a temporary network issue with images. Please try again.",
                variant: "destructive",
            });
            setIsPrinting(false);
            return;
        }
        
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

        const pdfBlob = pdf.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        const printWindow = window.open(pdfUrl);
        
        if (printWindow) {
            printWindow.onload = () => {
                printWindow.print();
                URL.revokeObjectURL(pdfUrl);
            };
        } else {
             toast({ title: "Print Error", description: "Could not open print window. Please check your pop-up blocker.", variant: "destructive"});
        }
    } catch (error: any) {
        toast({ title: "Print Failed", description: `Could not generate document for printing: ${error.message}`, variant: "destructive" });
    } finally {
        setIsPrinting(false);
    }
  };

    const handleDownloadBioDataPdf = async () => {
    if (!bioDataPrintRef.current || !employeeToPrint) return;
    setIsPrinting(true);

    try {
        const elementToPrint = bioDataPrintRef.current;
        const canvas = await html2canvas(elementToPrint, {
            scale: 3,
            useCORS: true,
            backgroundColor: '#ffffff',
        });
        const imgData = canvas.toDataURL('image/png');
        if (!imgData || imgData === 'data:,') {
            toast({
                title: "Download Failed",
                description: "Could not generate an image of the document. This may be due to a network issue. Please try again.",
                variant: "destructive",
            });
            setIsPrinting(false);
            return;
        }
        
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

        pdf.save(`BioData-${employeeToPrint.name.replace(/\s+/g, '_')}.pdf`);
        toast({ title: "Download Started", description: "Bio-data PDF is being downloaded." });

    } catch (error: any) {
        toast({ title: "Download Failed", description: `Could not generate PDF: ${error.message}`, variant: "destructive" });
    } finally {
        setIsPrinting(false);
    }
  };


  if (authIsLoading) {
    return ( <div className="flex items-center justify-center h-[calc(100vh-200px)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /> <p className="ml-2">Loading authentication...</p></div> );
  }

  if (!user && !authIsLoading) {
     return (
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <PageTitle title="Employees" subtitle="Manage your team members." />
        <Card><CardHeader><CardTitle>Access Denied</CardTitle></CardHeader><CardContent><p>Please sign in to manage employees.</p></CardContent></Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageTitle title="Employees" subtitle="Manage your team members." />

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>Manage your employees' information, salaries, and associated files.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" onClick={handleImportClick} disabled={isSaving || isLoadingEmployees}><Upload className="h-4 w-4" /></Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Import from Excel</p></TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <Button asChild disabled={isSaving || isLoadingEmployees}><Link href="/employees/new"><PlusCircle className="mr-2 h-4 w-4" /> Add Employee</Link></Button>
                <input type="file" ref={fileInputRef} onChange={handleImportFileChange} className="hidden" accept=".xlsx, .xls, .csv" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>{!isLoadingEmployees && employees.length === 0 ? "No employees found." : `Page ${currentPage} of employees.`}</TableCaption>
            <TableHeader><TableRow><TableHead className="w-[60px]">Avatar</TableHead><TableHead><Button variant="ghost" onClick={() => handleSortChange('name')} className="-ml-4 h-auto p-1 text-xs sm:text-sm">Name {getSortIcon('name')}</Button></TableHead><TableHead><Button variant="ghost" onClick={() => handleSortChange('position')} className="-ml-4 h-auto p-1 text-xs sm:text-sm">Position {getSortIcon('position')}</Button></TableHead><TableHead>Description</TableHead><TableHead className="text-right"><Button variant="ghost" onClick={() => handleSortChange('salary')} className="h-auto p-1 text-xs sm:text-sm">Salary {getSortIcon('salary')}</Button></TableHead><TableHead className="text-right w-[100px]">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoadingEmployees && employees.length === 0 && ([...Array(3)].map((_, i) => (<TableRow key={`skel-${i}`}><TableCell><Skeleton className="h-10 w-10 rounded-full" /></TableCell><TableCell><Skeleton className="h-4 w-3/4" /></TableCell><TableCell><Skeleton className="h-4 w-1/2" /></TableCell><TableCell><Skeleton className="h-4 w-3/4" /></TableCell><TableCell className="text-right"><Skeleton className="h-4 w-1/4 ml-auto" /></TableCell><TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell></TableRow>)))}
              {!isLoadingEmployees && employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell><Avatar className="h-10 w-10"><AvatarImage src={employee.profilePictureUrl || `https://placehold.co/40x40.png?text=${getInitials(employee.name)}`} alt={employee.name} data-ai-hint="person portrait" /><AvatarFallback>{getInitials(employee.name)}</AvatarFallback></Avatar></TableCell>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>{employee.position}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground" title={employee.description}>{employee.description || '-'}</TableCell>
                  <TableCell className="text-right">{currencySymbol}{employee.salary.toLocaleString()}</TableCell>
                  <TableCell className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" disabled={isSaving}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem asChild><Link href={`/employees/${employee.id}`}><Printer className="mr-2 h-4 w-4"/>Print Bio-Data</Link></DropdownMenuItem><DropdownMenuItem asChild><Link href={`/employees/${employee.id}/edit`}><Edit className="mr-2 h-4 w-4" /> Edit</Link></DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onClick={() => promptDeleteEmployee(employee.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
            <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-muted-foreground">
                    Page {currentPage}
                </div>
                <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious
                                href="#"
                                onClick={(e) => { e.preventDefault(); handlePageChange('prev'); }}
                                className={currentPage === 1 ? 'pointer-events-none opacity-50' : undefined}
                            />
                        </PaginationItem>
                        <PaginationItem>
                            <PaginationNext
                                href="#"
                                onClick={(e) => { e.preventDefault(); handlePageChange('next'); }}
                                className={employees.length < RECORDS_PER_PAGE ? 'pointer-events-none opacity-50' : undefined}
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            </div>
        </CardContent>
      </Card>

      <Dialog open={isBioDataDialogOpen} onOpenChange={setIsBioDataDialogOpen}>
          <DialogContent className="max-w-4xl w-full h-[95vh] flex flex-col p-0 bg-gray-100 dark:bg-background">
              <DialogHeader className="p-4 sm:p-6 pb-2 border-b bg-background no-print">
                 <div className="flex justify-between items-center gap-4">
                    <DialogTitle className="font-headline text-xl truncate">Bio-Data: {employeeToPrint?.name}</DialogTitle>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center space-x-2">
                            <Switch id="use-letterhead-bio" checked={useLetterhead} onCheckedChange={setUseLetterhead} disabled={isPrinting} />
                            <Label htmlFor="use-letterhead-bio">Use Letterhead</Label>
                        </div>
                    </div>
                </div>
              </DialogHeader>
              <ScrollArea className="flex-grow bg-muted p-4 sm:p-8">
                  {employeeToPrint && <div className="bg-white shadow-lg mx-auto"><BioDataTemplate 
                    ref={bioDataPrintRef} 
                    employee={employeeToPrint} 
                    companyDetails={companyDetails}
                    profilePictureDataUri={bioDataImageUris.profile}
                    leftThumbImpressionDataUri={bioDataImageUris.thumb}
                    signatureDataUri={bioDataImageUris.signature}
                    letterheadTemplate={useLetterhead ? 'simple' : 'none'}
                   /></div>}
              </ScrollArea>
              <DialogFooter className="p-4 sm:p-6 border-t bg-background no-print justify-end flex-wrap gap-2">
                <div className="flex gap-2">
                     <Button type="button" variant="secondary" onClick={handleDownloadBioDataPdf} disabled={isPrinting}>
                        {isPrinting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} 
                        Download PDF
                     </Button>
                     <Button type="button" variant="default" onClick={handlePrint} disabled={isPrinting}>
                        {isPrinting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />} 
                        {isPrinting ? 'Preparing...' : 'Print Bio-Data'}
                     </Button>
                </div>
              </DialogFooter>
          </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the employee and their files. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setEmployeeToDeleteId(null)} disabled={isSaving}>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteEmployee} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isSaving}>{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}

