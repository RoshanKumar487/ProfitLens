
'use client';

import React, { useState, useEffect, FormEvent, useCallback, useMemo, useRef } from 'react';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarIcon, TrendingDown, Save, Loader2, MoreHorizontal, Edit, Trash2, Search, Upload, PlusCircle, ScanLine, Camera, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, addDoc, getDocs, query, where, orderBy, Timestamp, serverTimestamp } from 'firebase/firestore';
import * as xlsx from 'xlsx';
import { updateExpenseEntry, deleteExpenseEntry, type ExpenseUpdateData, bulkAddExpenses, type ExpenseImportData } from './actions';
import { analyzeReceipt } from '@/ai/flows/analyze-receipt-flow';
import { Skeleton } from '@/components/ui/skeleton';

const EXPENSE_CATEGORIES = [
  'Software & Subscriptions',
  'Marketing & Advertising',
  'Office Supplies',
  'Utilities',
  'Rent & Lease',
  'Salaries & Wages',
  'Travel',
  'Meals & Entertainment',
  'Professional Services',
  'Other',
];

interface ExpenseEntryFirestore {
  id?: string; 
  date: Timestamp;
  amount: number;
  category: string;
  description?: string;
  vendor?: string;
  addedById: string;
  addedBy: string;
  companyId: string;
  createdAt: Timestamp;
}

interface ExpenseEntryDisplay {
  id: string;
  date: Date; 
  amount: number;
  category: string;
  description?: string;
  vendor?: string;
  addedBy: string;
}

export default function RecordExpensesPage() {
  const { user, isLoading: authIsLoading } = useAuth();
  const currency = user?.currencySymbol || '$';
  
  // State for new entry form
  const [newEntryDate, setNewEntryDate] = useState<Date | undefined>(new Date());
  const [newEntryAmount, setNewEntryAmount] = useState<string>('');
  const [newEntryCategory, setNewEntryCategory] = useState<string>('');
  const [newEntryDescription, setNewEntryDescription] = useState<string>('');
  const [newEntryVendor, setNewEntryVendor] = useState<string>('');
  
  const [recentEntries, setRecentEntries] = useState<ExpenseEntryDisplay[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof ExpenseEntryDisplay; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });


  // State for dialogs
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentExpense, setCurrentExpense] = useState<ExpenseEntryDisplay | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [expenseToDeleteId, setExpenseToDeleteId] = useState<string | null>(null);

  // State for bulk import
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [parsedExpenses, setParsedExpenses] = useState<ExpenseImportData[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // State for scanning
  const [isScanDialogOpen, setIsScanDialogOpen] = useState(false);
  const [isInitializingCamera, setIsInitializingCamera] = useState(false);
  const [isScanning, setIsScanning] = useState(false); // For AI analysis loading
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);


  const fetchExpenseEntries = useCallback(async () => {
    if (authIsLoading) return;
    if (!user || !user.companyId) {
      setIsLoadingEntries(false);
      setRecentEntries([]);
      return;
    }

    setIsLoadingEntries(true);
    try {
      const entriesRef = collection(db, 'expenses');
      const q = query(entriesRef, where('companyId', '==', user.companyId), orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const fetchedEntries = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data() as Omit<ExpenseEntryFirestore, 'id'>;
        return {
          id: docSnap.id,
          date: data.date.toDate(),
          amount: data.amount,
          category: data.category,
          description: data.description || '',
          vendor: data.vendor || '',
          addedBy: data.addedBy || 'N/A',
        };
      });
      setRecentEntries(fetchedEntries);
    } catch (error: any) {
      console.error('Error fetching expense entries:', error);
      toast({ title: 'Error Loading Entries', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoadingEntries(false);
    }
  }, [user, authIsLoading, toast]);

  useEffect(() => {
    fetchExpenseEntries();
  }, [fetchExpenseEntries]);

  const filteredEntries = useMemo(() => {
    if (!searchTerm) {
      return recentEntries;
    }
    const lowercasedTerm = searchTerm.toLowerCase();
    return recentEntries.filter(entry => 
      entry.category.toLowerCase().includes(lowercasedTerm) ||
      (entry.vendor && entry.vendor.toLowerCase().includes(lowercasedTerm)) ||
      (entry.description && entry.description.toLowerCase().includes(lowercasedTerm))
    );
  }, [recentEntries, searchTerm]);

  const sortedEntries = useMemo(() => {
    let sortableItems = [...filteredEntries];
    if (sortConfig !== null) {
        sortableItems.sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];
            if (aValue === null || aValue === undefined) return 1;
            if (bValue === null || bValue === undefined) return -1;
            if (aValue < bValue) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
    }
    return sortableItems;
  }, [filteredEntries, sortConfig]);

  const requestSort = (key: keyof ExpenseEntryDisplay) => {
      let direction: 'ascending' | 'descending' = 'ascending';
      if (sortConfig.key === key && sortConfig.direction === 'ascending') {
          direction = 'descending';
      }
      setSortConfig({ key, direction });
  };
  
  const getSortIcon = (key: keyof ExpenseEntryDisplay) => {
      if (sortConfig.key !== key) {
          return <ChevronsUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />;
      }
      if (sortConfig.direction === 'ascending') {
          return <ArrowUp className="ml-2 h-4 w-4" />;
      }
      return <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const resetNewEntryForm = () => {
    setNewEntryDate(new Date());
    setNewEntryAmount('');
    setNewEntryCategory('');
    setNewEntryDescription('');
    setNewEntryVendor('');
  };

  const handleNewEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.companyId) {
      toast({ title: 'Authentication Error', description: 'User not authenticated.', variant: 'destructive' });
      return;
    }
    if (!newEntryDate || !newEntryAmount || !newEntryCategory) {
      toast({ title: 'Missing Information', description: 'Please fill in date, amount, and category.', variant: 'destructive' });
      return;
    }
    
    const amountNum = parseFloat(newEntryAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({ title: 'Invalid Amount', description: 'Amount must be a positive number.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    const newEntryPayload = {
      date: Timestamp.fromDate(newEntryDate),
      amount: amountNum,
      category: newEntryCategory,
      description: newEntryDescription || '',
      vendor: newEntryVendor || '',
      companyId: user.companyId,
      createdAt: serverTimestamp(),
      addedById: user.uid,
      addedBy: user.displayName || user.email || 'System'
    };

    try {
      await addDoc(collection(db, 'expenses'), newEntryPayload);
      fetchExpenseEntries();
      toast({ title: 'Expense Recorded', description: `Successfully recorded ${currency}${amountNum.toFixed(2)} for ${newEntryCategory}.` });
      resetNewEntryForm();
      setIsAddDialogOpen(false);
    } catch (error: any) {
      toast({ title: 'Save Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleEditClick = (expense: ExpenseEntryDisplay) => {
    setCurrentExpense(expense);
    setIsEditDialogOpen(true);
  };
  
  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentExpense) return;

    const amountNum = parseFloat(String(currentExpense.amount));
     if (isNaN(amountNum) || amountNum <= 0) {
      toast({ title: 'Invalid Amount', description: 'Amount must be a positive number.', variant: 'destructive' });
      return;
    }
    if (!currentExpense.date || !currentExpense.category) {
       toast({ title: 'Missing Information', description: 'Date and category are required.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    const updatePayload: ExpenseUpdateData = {
        date: currentExpense.date,
        amount: amountNum,
        category: currentExpense.category,
        description: currentExpense.description || '',
        vendor: currentExpense.vendor || '',
    };
    
    const result = await updateExpenseEntry(currentExpense.id, updatePayload);
    toast({ title: result.success ? 'Success' : 'Error', description: result.message, variant: result.success ? 'default' : 'destructive' });
    
    if (result.success) {
        setIsEditDialogOpen(false);
        fetchExpenseEntries();
    }
    setIsSaving(false);
  };

  const handleDeleteClick = (id: string) => {
    setExpenseToDeleteId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!expenseToDeleteId) return;
    setIsSaving(true);
    const result = await deleteExpenseEntry(expenseToDeleteId);
    toast({ title: result.success ? 'Success' : 'Error', description: result.message, variant: result.success ? 'default' : 'destructive' });
    
    if (result.success) {
      fetchExpenseEntries();
    }
    setExpenseToDeleteId(null);
    setIsDeleteDialogOpen(false);
    setIsSaving(false);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = xlsx.read(data, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = xlsx.utils.sheet_to_json(worksheet);
        
        const requiredHeaders = ['date', 'amount', 'category'];
        const fileHeaders = Object.keys(json[0] || {});
        const hasAllHeaders = requiredHeaders.every(h => fileHeaders.includes(h));

        if (!hasAllHeaders) {
          toast({ title: 'Invalid File Format', description: `Excel file must contain 'date', 'amount', and 'category' columns.`, variant: 'destructive' });
          return;
        }

        const expensesToParse: ExpenseImportData[] = json.map(row => ({
          date: new Date(row.date),
          amount: Number(row.amount || 0),
          category: String(row.category || ''),
          description: String(row.description || ''),
          vendor: String(row.vendor || '')
        })).filter(exp => exp.date instanceof Date && !isNaN(exp.date.valueOf()) && exp.category && !isNaN(exp.amount) && exp.amount > 0);

        if (expensesToParse.length === 0) {
           toast({ title: 'No Valid Data', description: 'No valid expense data could be parsed from the file.', variant: 'destructive' });
           return;
        }
        
        setParsedExpenses(expensesToParse);
        setIsImportDialogOpen(true);
      } catch (error) {
        console.error("Error parsing Excel file:", error);
        toast({ title: 'File Read Error', description: 'Could not read or parse the selected file.', variant: 'destructive' });
      } finally {
        if (e.target) e.target.value = '';
      }
    };
    reader.onerror = () => {
        toast({ title: 'File Read Error', description: 'Failed to read the file.', variant: 'destructive' });
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmImport = async () => {
    if (!user || !user.companyId) {
        toast({ title: 'Authentication Error', variant: 'destructive' });
        return;
    }
    if (parsedExpenses.length === 0) {
        toast({ title: 'No Data', description: 'There are no expenses to import.', variant: 'destructive' });
        return;
    }
    setIsImporting(true);
    const result = await bulkAddExpenses(parsedExpenses, user.companyId, user.uid, user.displayName || user.email || 'System');
    
    toast({ title: result.success ? 'Import Successful' : 'Import Failed', description: result.message, variant: result.success ? 'default' : 'destructive'});

    if (result.success) {
        fetchExpenseEntries();
        setIsImportDialogOpen(false);
        setParsedExpenses([]);
    }
    setIsImporting(false);
  };

  const cleanupWebcam = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
      const getCameraPermission = async () => {
        if (isScanDialogOpen) {
          setIsInitializingCamera(true);
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            setHasCameraPermission(true);
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
          } catch (error) {
            console.error('Error accessing camera:', error);
            setHasCameraPermission(false);
            toast({
              variant: 'destructive',
              title: 'Camera Access Denied',
              description: 'Please enable camera permissions in your browser settings.',
            });
            setIsScanDialogOpen(false);
          } finally {
              setIsInitializingCamera(false);
          }
        } else {
          cleanupWebcam();
        }
      };
      getCameraPermission();

      return () => cleanupWebcam();
  }, [isScanDialogOpen, cleanupWebcam, toast]);


  const handleCaptureAndAnalyze = async () => {
      if (!videoRef.current || !canvasRef.current) return;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      
      setIsScanning(true);
      cleanupWebcam();

      try {
          const result = await analyzeReceipt({ receiptImage: imageDataUrl });

          setNewEntryAmount(result.amount?.toString() || '');
          setNewEntryVendor(result.vendor || '');
          setNewEntryDescription(result.description || '');
          setNewEntryCategory(result.category || '');
          if (result.date) {
              const parsedDate = new Date(result.date + 'T00:00:00');
              if (!isNaN(parsedDate.getTime())) {
                  setNewEntryDate(parsedDate);
              } else {
                  setNewEntryDate(new Date());
              }
          } else {
              setNewEntryDate(new Date());
          }

          toast({
              title: "Receipt Scanned",
              description: "Please review the extracted information below.",
          });

          setIsScanDialogOpen(false);
          setIsAddDialogOpen(true);

      } catch (error: any) {
          console.error("Error analyzing receipt:", error);
          toast({
              variant: 'destructive',
              title: 'Scan Failed',
              description: 'Could not extract data from the receipt. Please enter it manually.',
          });
      } finally {
          setIsScanning(false);
      }
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
        <PageTitle title="Record Expenses" subtitle="Log your business expenditures." icon={TrendingDown} />
        <Card className="shadow-lg">
          <CardHeader><CardTitle>Access Denied</CardTitle></CardHeader>
          <CardContent><p>Please sign in to record expenses.</p></CardContent>
        </Card>
      </div>
    )
  }


  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageTitle title="Record Expenses" subtitle="Log and manage your business expenditures." icon={TrendingDown}>
        <div className="flex flex-col sm:flex-row gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={handleImportClick} disabled={isSaving || isLoadingEntries}>
                    <Upload className="h-4 w-4" />
                    <span className="sr-only">Import from Excel</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Import from Excel</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={() => setIsScanDialogOpen(true)} variant="outline" size="icon" disabled={isSaving || isLoadingEntries}>
                  <ScanLine className="h-4 w-4" />
                  <span className="sr-only">Scan Receipt</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                 <p>Scan Receipt</p>
              </TooltipContent>
            </Tooltip>
            <Button onClick={() => { resetNewEntryForm(); setIsAddDialogOpen(true); }} disabled={isSaving || isLoadingEntries}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Record Expense
            </Button>
            <input type="file" ref={fileInputRef} onChange={handleImportFileChange} className="hidden" accept=".xlsx, .xls, .csv" />
        </div>
      </PageTitle>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-center gap-2 justify-between">
              <div className="flex-1">
                  <CardTitle className="font-headline">Expense History</CardTitle>
                  <CardDescription>A list of your recorded expense entries.</CardDescription>
              </div>
              <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                  type="search"
                  placeholder="Filter by category, vendor..."
                  className="pl-8 sm:w-[200px] md:w-[250px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={isLoadingEntries && recentEntries.length === 0}
                  />
              </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>{!isLoadingEntries && sortedEntries.length === 0 && (searchTerm ? "No expenses match your search." : 'No expenses recorded yet. Click "Record Expense" to start.')}</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('date')} className="-ml-4 h-auto p-1 text-xs sm:text-sm">Date {getSortIcon('date')}</Button>
                </TableHead>
                <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('category')} className="-ml-4 h-auto p-1 text-xs sm:text-sm">Category/Vendor {getSortIcon('category')}</Button>
                </TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Added By</TableHead>
                <TableHead className="text-right">
                    <Button variant="ghost" onClick={() => requestSort('amount')} className="h-auto p-1 text-xs sm:text-sm">Amount {getSortIcon('amount')}</Button>
                </TableHead>
                <TableHead className="w-[50px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingEntries ? (
                 [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-[60px] ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : sortedEntries.map(entry => (
                  <TableRow key={entry.id}>
                    <TableCell>{format(entry.date, 'PP')}</TableCell>
                    <TableCell>
                      <div className="font-medium">{entry.category}</div>
                      {entry.vendor && <div className="text-xs text-muted-foreground">{entry.vendor}</div>}
                    </TableCell>
                    <TableCell className="max-w-xs truncate" title={entry.description}>{entry.description || '-'}</TableCell>
                    <TableCell>{entry.addedBy}</TableCell>
                    <TableCell className="text-right font-semibold">{currency}{entry.amount.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditClick(entry)}><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteClick(entry.id)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
       {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Expense Entry</DialogTitle>
            <DialogDescription>Enter the details of the expense incurred.</DialogDescription>
          </DialogHeader>
          <form id="new-expense-form" onSubmit={handleNewEntrySubmit} className="space-y-4 py-2">
            <div>
              <Label htmlFor="new-date">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal" disabled={isSaving}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newEntryDate ? format(newEntryDate, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={newEntryDate} onSelect={setNewEntryDate} initialFocus disabled={isSaving}/></PopoverContent>
              </Popover>
            </div>
            <div>
              <Label htmlFor="new-amount">Amount ({currency})</Label>
              <Input id="new-amount" type="number" value={newEntryAmount} onChange={(e) => setNewEntryAmount(e.target.value)} placeholder="e.g., 75.50" required min="0.01" step="0.01" disabled={isSaving} />
            </div>
            <div>
              <Label htmlFor="new-category">Category</Label>
              <Select value={newEntryCategory} onValueChange={setNewEntryCategory} disabled={isSaving}>
                <SelectTrigger id="new-category" required><SelectValue placeholder="Select a category" /></SelectTrigger>
                <SelectContent>{EXPENSE_CATEGORIES.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="new-vendor">Vendor (Optional)</Label>
              <Input id="new-vendor" value={newEntryVendor} onChange={(e) => setNewEntryVendor(e.target.value)} placeholder="e.g., AWS, Staples" disabled={isSaving}/>
            </div>
            <div>
              <Label htmlFor="new-description">Description (Optional)</Label>
              <Textarea id="new-description" value={newEntryDescription} onChange={(e) => setNewEntryDescription(e.target.value)} placeholder="e.g., Monthly server costs, Printer paper" disabled={isSaving}/>
            </div>
          </form>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" onClick={resetNewEntryForm} disabled={isSaving}>Cancel</Button></DialogClose>
            <Button type="submit" form="new-expense-form" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isSaving ? 'Saving...' : 'Record Expense'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

       {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            <DialogDescription>Update the details for this expense entry.</DialogDescription>
          </DialogHeader>
          {currentExpense && (
          <form id="edit-expense-form" onSubmit={handleUpdateSubmit} className="space-y-4">
              <div>
                <Label htmlFor="edit-date">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal" disabled={isSaving}>
                      <CalendarIcon className="mr-2 h-4 w-4" />{currentExpense.date ? format(currentExpense.date, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={currentExpense.date} onSelect={(date) => setCurrentExpense(prev => prev ? {...prev, date: date!} : null)} initialFocus disabled={isSaving}/></PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="edit-amount">Amount ({currency})</Label>
                <Input id="edit-amount" type="number" value={currentExpense.amount} onChange={(e) => setCurrentExpense(prev => prev ? {...prev, amount: parseFloat(e.target.value) || 0} : null)} required min="0.01" step="0.01" disabled={isSaving} />
              </div>
              <div>
                <Label htmlFor="edit-category">Category</Label>
                <Select value={currentExpense.category} onValueChange={(value) => setCurrentExpense(prev => prev ? {...prev, category: value} : null)} disabled={isSaving}>
                  <SelectTrigger required><SelectValue /></SelectTrigger>
                  <SelectContent>{EXPENSE_CATEGORIES.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-vendor">Vendor (Optional)</Label>
                <Input id="edit-vendor" value={currentExpense.vendor} onChange={(e) => setCurrentExpense(prev => prev ? {...prev, vendor: e.target.value} : null)} disabled={isSaving}/>
              </div>
              <div>
                <Label htmlFor="edit-description">Description (Optional)</Label>
                <Textarea id="edit-description" value={currentExpense.description} onChange={(e) => setCurrentExpense(prev => prev ? {...prev, description: e.target.value} : null)} disabled={isSaving}/>
              </div>
          </form>
          )}
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" disabled={isSaving}>Cancel</Button></DialogClose>
            <Button type="submit" form="edit-expense-form" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the expense entry. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setExpenseToDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Review Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
                <DialogTitle>Review Expense Import</DialogTitle>
                <DialogDescription>
                    Review the expenses parsed from your file. Required columns are 'date', 'amount', and 'category'.
                    Rows with invalid data will be skipped. Click 'Confirm Import' to add the valid expenses.
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Vendor</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                    {parsedExpenses.length > 0 ? parsedExpenses.map((exp, index) => (
                        <TableRow key={index}>
                            <TableCell>{format(exp.date, 'PP')}</TableCell>
                            <TableCell>{exp.category}</TableCell>
                            <TableCell>{exp.vendor}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{exp.description}</TableCell>
                            <TableCell className="text-right font-medium">{currency}{exp.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center h-24">No valid expenses to display.</TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
            </ScrollArea>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsImportDialogOpen(false)} disabled={isImporting}>Cancel</Button>
                <Button onClick={handleConfirmImport} disabled={isImporting || parsedExpenses.length === 0}>
                    {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Confirm Import ({parsedExpenses.length})
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Scan Receipt Dialog */}
      <Dialog open={isScanDialogOpen} onOpenChange={setIsScanDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Scan Receipt</DialogTitle>
                <DialogDescription>Position your receipt within the frame and click capture.</DialogDescription>
            </DialogHeader>
            <div className="relative">
                {isInitializingCamera && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <p className="ml-2">Starting camera...</p>
                    </div>
                )}
                {isScanning && (
                     <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <p className="ml-2 mt-2">Analyzing receipt...</p>
                    </div>
                )}
                <video ref={videoRef} className="w-full aspect-video rounded-md bg-black" autoPlay muted playsInline />
                <canvas ref={canvasRef} className="hidden" />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsScanDialogOpen(false)} disabled={isScanning}>Cancel</Button>
                <Button onClick={handleCaptureAndAnalyze} disabled={isInitializingCamera || isScanning || !hasCameraPermission}>
                    <Camera className="mr-2 h-4 w-4" />
                    Capture & Analyze
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
