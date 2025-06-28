
'use client';

import React, { useState, useEffect, FormEvent, useCallback, useRef, useMemo } from 'react';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users2, PlusCircle, MoreHorizontal, Edit, Trash2, Loader2, Save, Camera, UploadCloud, FileText, XCircle, SwitchCamera, Upload, ArrowUp, ArrowDown, ChevronsUpDown, Search, ScanLine, Printer, Fingerprint, PenSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, doc, getDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy, Timestamp, serverTimestamp } from 'firebase/firestore';
import { uploadFileToStorage, deleteFileFromStorage } from '@/lib/firebaseStorageUtils';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import * as xlsx from 'xlsx';
import { bulkAddEmployees } from './actions';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { analyzeEmployeeDocument } from '@/ai/flows/analyze-employee-document-flow';
import Link from 'next/link';
import BioDataTemplate from './BioDataTemplate';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';


interface EmployeeFirestore {
  id?: string;
  name: string;
  position: string;
  salary: number;
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
  shoesNo?: string;
  fatherName?: string;
  motherName?: string;
  presentAddressHNo?: string;
  presentAddressPS?: string;
  presentAddressPost?: string;
  presentAddressDist?: string;
  presentAddressState?: string;
  presentAddressPin?: string;
  phoneNo?: string;
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
  villagePresidentName?: string;
  leftThumbImpressionUrl?: string;
  leftThumbImpressionStoragePath?: string;
  signatureUrl?: string;
  signatureStoragePath?: string;
}

export interface EmployeeDisplay extends Omit<EmployeeFirestore, 'createdAt' | 'updatedAt' | 'companyId' | 'addedById' | 'dateOfBirth' | 'joiningDate'> {
  id: string;
  createdAt: Date;
  dateOfBirth?: Date;
  joiningDate?: Date;
}

type ParsedEmployee = Omit<EmployeeFirestore, 'id' | 'createdAt' | 'updatedAt' | 'companyId' | 'addedById' | 'addedBy' | 'profilePictureUrl' | 'profilePictureStoragePath' | 'associatedFileUrl' | 'associatedFileName' | 'associatedFileStoragePath'>;


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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<Partial<EmployeeDisplay & { salary?: string | number }>>({});
  const { toast } = useToast();
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [employeeToDeleteId, setEmployeeToDeleteId] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [showProfileWebcam, setShowProfileWebcam] = useState(false);
  
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [associatedFile, setAssociatedFile] = useState<File | null>(null);
  const [leftThumbImpressionFile, setLeftThumbImpressionFile] = useState<File | null>(null);
  const [leftThumbImpressionPreview, setLeftThumbImpressionPreview] = useState<string | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);


  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  
  const [isDraggingProfile, setIsDraggingProfile] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // State for bulk import
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editableParsedEmployees, setEditableParsedEmployees] = useState<ParsedEmployee[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  
  // State for scanning
  const [isScanDialogOpen, setIsScanDialogOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isInitializingCamera, setIsInitializingCamera] = useState(false);

  const [sortConfig, setSortConfig] = useState<{ key: keyof EmployeeDisplay; direction: 'ascending' | 'descending' }>({ key: 'createdAt', direction: 'descending' });
  const [searchTerm, setSearchTerm] = useState('');

  // Bio-Data Print State
  const bioDataPrintRef = useRef<HTMLDivElement>(null);
  const [isBioDataDialogOpen, setIsBioDataDialogOpen] = useState(false);
  const [employeeToPrint, setEmployeeToPrint] = useState<EmployeeDisplay | null>(null);
  const [companyDetails, setCompanyDetails] = useState<{name: string, address: string} | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);


  const filteredEmployees = useMemo(() => {
    if (!searchTerm) {
      return employees;
    }
    const lowercasedTerm = searchTerm.toLowerCase();
    return employees.filter(employee =>
        employee.name.toLowerCase().includes(lowercasedTerm) ||
        employee.position.toLowerCase().includes(lowercasedTerm) ||
        (employee.description && employee.description.toLowerCase().includes(lowercasedTerm))
    );
  }, [employees, searchTerm]);


  // Sorting logic
  const sortedEmployees = useMemo(() => {
    let sortableItems = [...filteredEmployees];
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
  }, [filteredEmployees, sortConfig]);

  const requestSort = (key: keyof EmployeeDisplay) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIcon = (key: keyof EmployeeDisplay) => {
    if (sortConfig.key !== key) {
        return <ChevronsUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />;
    }
    if (sortConfig.direction === 'ascending') {
        return <ArrowUp className="ml-2 h-4 w-4" />;
    }
    return <ArrowDown className="ml-2 h-4 w-4" />;
  };

  useEffect(() => {
    return () => {
      if (profilePicturePreview && profilePicturePreview.startsWith('blob:')) { URL.revokeObjectURL(profilePicturePreview); }
      if (signaturePreview && signaturePreview.startsWith('blob:')) { URL.revokeObjectURL(signaturePreview); }
      if (leftThumbImpressionPreview && leftThumbImpressionPreview.startsWith('blob:')) { URL.revokeObjectURL(leftThumbImpressionPreview); }
    };
  }, [profilePicturePreview, signaturePreview, leftThumbImpressionPreview]);
  
  useEffect(() => {
    const checkForMultipleCameras = async () => {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(device => device.kind === 'videoinput');
          setHasMultipleCameras(videoDevices.length > 1);
        } catch (error) {
          console.error("Could not enumerate devices:", error);
          setHasMultipleCameras(false);
        }
      }
    };
    checkForMultipleCameras();
  }, []);

  const cleanupWebcam = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);
  
  const startWebcam = useCallback(async (mode: 'user' | 'environment') => {
      setIsSwitchingCamera(true);
      cleanupWebcam(); // Stop previous stream before starting a new one
      try {
        const constraints = { video: { facingMode: { exact: mode } } };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error switching camera:', error);
        try {
          console.log("Fallback to default camera");
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          setHasCameraPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          setFacingMode('user'); 
          toast({ variant: 'default', title: 'Camera not available', description: 'Switched to default camera.' });
        } catch (fallbackError) {
           console.error('Error accessing any camera:', fallbackError);
           setHasCameraPermission(false);
           toast({ variant: 'destructive', title: 'Camera Access Denied', description: 'Please enable camera permissions.' });
           setShowProfileWebcam(false);
           setIsScanDialogOpen(false);
        }
      } finally {
          setIsSwitchingCamera(false);
      }
    }, [cleanupWebcam, toast]);
  
    useEffect(() => {
      if (showProfileWebcam) {
        startWebcam(facingMode);
      } else {
        if(!isScanDialogOpen) cleanupWebcam();
      }
      return () => { if (showProfileWebcam) cleanupWebcam(); };
    }, [showProfileWebcam, facingMode, startWebcam, cleanupWebcam, isScanDialogOpen]);

    useEffect(() => {
      const getCameraPermission = async () => {
        if (isScanDialogOpen) {
          setIsInitializingCamera(true);
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            setHasCameraPermission(true);
            if (videoRef.current) videoRef.current.srcObject = stream;
          } catch (error) {
            console.error('Error accessing camera:', error);
            setHasCameraPermission(false);
            toast({ variant: 'destructive', title: 'Camera Access Denied', description: 'Please enable camera permissions.' });
            setIsScanDialogOpen(false);
          } finally { setIsInitializingCamera(false); }
        } else {
          if(!showProfileWebcam) cleanupWebcam();
        }
      };
      getCameraPermission();
      return () => { if(isScanDialogOpen) cleanupWebcam()};
  }, [isScanDialogOpen, cleanupWebcam, toast, showProfileWebcam]);


  const fetchEmployees = useCallback(async () => {
    if (authIsLoading) { setIsLoadingEmployees(true); return; }
    if (!user || !user.companyId) { setIsLoadingEmployees(false); setEmployees([]); return; }
    setIsLoadingEmployees(true);
    try {
      const employeesRef = collection(db, 'employees');
      const q = query(employeesRef, where('companyId', '==', user.companyId));
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
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      toast({ title: 'Error Loading Employees', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoadingEmployees(false);
    }
  }, [user, authIsLoading, toast]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);
  
  const resetEditFormState = useCallback(() => {
    setIsEditDialogOpen(false);
    setCurrentEmployee({});
    setProfilePictureFile(null);
    setProfilePicturePreview(null);
    setAssociatedFile(null);
    setLeftThumbImpressionFile(null);
    setLeftThumbImpressionPreview(null);
    setSignatureFile(null);
    setSignaturePreview(null);
    setShowProfileWebcam(false);
    setHasCameraPermission(null);
    cleanupWebcam();
  }, [cleanupWebcam]);

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.companyId || !currentEmployee?.id) return toast({ title: "Authentication Error", variant: "destructive" });
    if (!currentEmployee.name || !currentEmployee.position || currentEmployee.salary === undefined) return toast({ title: "Missing Information", variant: "destructive" });

    const salaryNum = Number(currentEmployee.salary);
    if (isNaN(salaryNum) || salaryNum < 0) return toast({ title: "Invalid Salary", variant: "destructive"});

    setIsSaving(true);
    
    try {
        const employeeDocId = currentEmployee.id;
        const employeeRef = doc(db, 'employees', employeeDocId);

        const updatedData: Partial<EmployeeFirestore> = { ...currentEmployee };
        delete updatedData.id; 
        delete (updatedData as any).createdAt;

        const uploadIfNeeded = async (file: File | null, oldPath: string | undefined, type: string) => {
          if (!file) return { url: undefined, path: undefined };
          if (oldPath) await deleteFileFromStorage(oldPath).catch(e => console.warn(`Old ${type} deletion failed`, e));
          const newPath = `employees/${user.companyId}/${employeeDocId}/${type}.${file.name.split('.').pop()}`;
          const newUrl = await uploadFileToStorage(file, newPath);
          return { url: newUrl, path: newPath };
        };
        
        const [profilePic, assocFile, thumbFile, sigFile] = await Promise.all([
            uploadIfNeeded(profilePictureFile, currentEmployee.profilePictureStoragePath, 'profileImage'),
            uploadIfNeeded(associatedFile, currentEmployee.associatedFileStoragePath, 'associatedFile'),
            uploadIfNeeded(leftThumbImpressionFile, currentEmployee.leftThumbImpressionStoragePath, 'thumbImpression'),
            uploadIfNeeded(signatureFile, currentEmployee.signatureStoragePath, 'signature')
        ]);
        
        if (profilePic.url !== undefined) { updatedData.profilePictureUrl = profilePic.url; updatedData.profilePictureStoragePath = profilePic.path; }
        if (assocFile.url !== undefined) { updatedData.associatedFileUrl = assocFile.url; updatedData.associatedFileStoragePath = assocFile.path; updatedData.associatedFileName = associatedFile!.name; }
        if (thumbFile.url !== undefined) { updatedData.leftThumbImpressionUrl = thumbFile.url; updatedData.leftThumbImpressionStoragePath = thumbFile.path; }
        if (sigFile.url !== undefined) { updatedData.signatureUrl = sigFile.url; updatedData.signatureStoragePath = sigFile.path; }
        
        const dataToSave: any = { ...updatedData, salary: salaryNum, updatedAt: serverTimestamp() };
        if(currentEmployee.dateOfBirth) dataToSave.dateOfBirth = Timestamp.fromDate(currentEmployee.dateOfBirth);
        if(currentEmployee.joiningDate) dataToSave.joiningDate = Timestamp.fromDate(currentEmployee.joiningDate);

        await updateDoc(employeeRef, dataToSave);
        toast({ title: "Employee Updated" });
        fetchEmployees();
        resetEditFormState();
    } catch (error: any) {
        toast({ title: "Save Failed", description: error.message, variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  const handleEditEmployee = (employee: EmployeeDisplay) => {
    setCurrentEmployee({ ...employee, salary: employee.salary.toString() });
    setProfilePicturePreview(employee.profilePictureUrl || null);
    setSignaturePreview(employee.signatureUrl || null);
    setLeftThumbImpressionPreview(employee.leftThumbImpressionUrl || null);
    setProfilePictureFile(null);
    setAssociatedFile(null);
    setSignatureFile(null);
    setLeftThumbImpressionFile(null);
    setShowProfileWebcam(false);
    setIsEditDialogOpen(true);
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
      fetchEmployees();
    } catch (error: any) {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive"});
    } finally {
      setIsSaving(false);
      setEmployeeToDeleteId(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setFile: React.Dispatch<React.SetStateAction<File | null>>, setPreview?: React.Dispatch<React.SetStateAction<string | null>>) => {
      const file = e.target.files?.[0] || null;
      if (file) {
          if (file.type.startsWith('image/') && file.size > 2 * 1024 * 1024) { return toast({ title: "Image too large (< 2MB)", variant: "destructive" }); }
          if (!file.type.startsWith('image/') && file.size > 10 * 1024 * 1024) { return toast({ title: "File too large (< 10MB)", variant: "destructive" }); }
          setFile(file);
          if (setPreview) setPreview(URL.createObjectURL(file));
      } else {
          setFile(null);
          if (setPreview) setPreview(null);
      }
      e.target.value = ''; // Allow re-upload
  };

  const handleCaptureProfilePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !videoRef.current.srcObject) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `webcam.jpeg`, { type: 'image/jpeg' });
        setProfilePictureFile(file);
        setProfilePicturePreview(URL.createObjectURL(file));
      }
    }, 'image/jpeg');
    setShowProfileWebcam(false);
  };
  
  const handleCaptureAndAnalyzeDocument = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setIsScanning(true);
    cleanupWebcam();

    try {
        const result = await analyzeEmployeeDocument({ documentImage: imageDataUrl });
        if (!result.employees || result.employees.length === 0) {
          toast({ title: "No Data Found", variant: "destructive" });
          setIsScanDialogOpen(false);
          return;
        }
        setEditableParsedEmployees(result.employees);
        setIsScanDialogOpen(false);
        setIsImportDialogOpen(true);
        toast({ title: "Document Scanned", description: "Please review the extracted data." });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Scan Failed' });
    } finally { setIsScanning(false); }
  };


  const handleRemoveImage = (type: 'profile' | 'signature' | 'thumb') => {
      if(type === 'profile') {
          setProfilePictureFile(null);
          setProfilePicturePreview(null);
          setCurrentEmployee(prev => ({...prev, profilePictureUrl: undefined }));
      } else if (type === 'signature') {
          setSignatureFile(null);
          setSignaturePreview(null);
          setCurrentEmployee(prev => ({...prev, signatureUrl: undefined }));
      } else if (type === 'thumb') {
          setLeftThumbImpressionFile(null);
          setLeftThumbImpressionPreview(null);
          setCurrentEmployee(prev => ({...prev, leftThumbImpressionUrl: undefined }));
      }
  };
  
  const handleRemoveAssociatedFile = () => {
    setAssociatedFile(null);
     setCurrentEmployee(prev => ({...prev, associatedFileUrl: undefined, associatedFileName: undefined }));
  };
  
  const handleDragEvents = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); };
  const handleProfileDragEnter = (e: React.DragEvent<HTMLDivElement>) => { handleDragEvents(e); if (e.dataTransfer.items?.length > 0) setIsDraggingProfile(true); };
  const handleProfileDragLeave = (e: React.DragEvent<HTMLDivElement>) => { handleDragEvents(e); setIsDraggingProfile(false); };
  const handleProfileDrop = (e: React.DragEvent<HTMLDivElement>) => { handleDragEvents(e); setIsDraggingProfile(false); handleFileChange(e.dataTransfer, setProfilePictureFile, setProfilePicturePreview); };
  const handleFileDragEnter = (e: React.DragEvent<HTMLDivElement>) => { handleDragEvents(e); if (e.dataTransfer.items?.length > 0) setIsDraggingFile(true); };
  const handleFileDragLeave = (e: React.DragEvent<HTMLDivElement>) => { handleDragEvents(e); setIsDraggingFile(false); };
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => { handleDragEvents(e); setIsDraggingFile(false); handleFileChange(e.dataTransfer, setAssociatedFile); };

  // Bulk import handlers
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
    if (result.success) { fetchEmployees(); setIsImportDialogOpen(false); setEditableParsedEmployees([]); }
    setIsImporting(false);
  };

   const handlePrintBioData = async (employee: EmployeeDisplay) => {
    setEmployeeToPrint(employee);
    if (!user?.companyId) return;
    if (!companyDetails) {
        const companyRef = doc(db, 'companyProfiles', user.companyId);
        const companySnap = await getDoc(companyRef);
        if (companySnap.exists()) {
            const data = companySnap.data();
            const fullAddress = [data.address, data.city, data.state, data.country].filter(Boolean).join(', ');
            setCompanyDetails({ name: data.name, address: fullAddress });
        }
    }
    setIsBioDataDialogOpen(true);
  };
   const triggerPrint = () => {
    if (!bioDataPrintRef.current) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Bio-Data</title>');
      const styles = Array.from(document.styleSheets).map(s => s.href ? `<link rel="stylesheet" href="${s.href}">` : `<style>${Array.from(s.cssRules).map(r => r.cssText).join('')}</style>`).join('');
      printWindow.document.write(styles);
      printWindow.document.write('</head><body class="bg-white">');
      printWindow.document.write(bioDataPrintRef.current.innerHTML);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };


  if (authIsLoading) {
    return ( <div className="flex items-center justify-center h-[calc(100vh-200px)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /> <p className="ml-2">Loading authentication...</p></div> );
  }

  if (!user && !authIsLoading) {
     return (
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <PageTitle title="Employees" subtitle="Manage your team members." icon={Users2} />
        <Card><CardHeader><CardTitle>Access Denied</CardTitle></CardHeader><CardContent><p>Please sign in to manage employees.</p></CardContent></Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageTitle title="Employees" subtitle="Manage your team members." icon={Users2}>
        <div className="flex flex-col sm:flex-row gap-2">
            <TooltipProvider>
            <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={handleImportClick} disabled={isSaving || isLoadingEmployees}><Upload className="h-4 w-4" /><span className="sr-only">Import from Excel</span></Button></TooltipTrigger><TooltipContent><p>Import from Excel</p></TooltipContent></Tooltip>
             <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => setIsScanDialogOpen(true)} disabled={isSaving || isLoadingEmployees}><ScanLine className="h-4 w-4"/><span className="sr-only">Scan Document</span></Button></TooltipTrigger><TooltipContent><p>Scan Document</p></TooltipContent></Tooltip>
            </TooltipProvider>
            <Button asChild disabled={isSaving || isLoadingEmployees}><Link href="/employees/new"><PlusCircle className="mr-2 h-4 w-4" /> Add Employee</Link></Button>
            <input type="file" ref={fileInputRef} onChange={handleImportFileChange} className="hidden" accept=".xlsx, .xls, .csv" />
        </div>
      </PageTitle>

      <Card>
        <CardHeader><div className="flex flex-col sm:flex-row items-center justify-between gap-2"><div><CardTitle>Team Members</CardTitle><CardDescription>Manage your employees' information, salaries, and associated files.</CardDescription></div><div className="relative w-full sm:w-auto"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input type="search" placeholder="Search by name, position..." className="pl-8 sm:w-[250px] md:w-[300px]" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} disabled={isLoadingEmployees}/></div></div></CardHeader>
        <CardContent>
          <Table>
            <TableCaption>{!isLoadingEmployees && sortedEmployees.length === 0 ? (searchTerm ? "No employees match your search." : "No employees found.") : "A list of your employees."}</TableCaption>
            <TableHeader><TableRow><TableHead className="w-[60px]">Avatar</TableHead><TableHead><Button variant="ghost" onClick={() => requestSort('name')} className="-ml-4 h-auto p-1 text-xs sm:text-sm">Name {getSortIcon('name')}</Button></TableHead><TableHead><Button variant="ghost" onClick={() => requestSort('position')} className="-ml-4 h-auto p-1 text-xs sm:text-sm">Position {getSortIcon('position')}</Button></TableHead><TableHead>Description</TableHead><TableHead className="text-right"><Button variant="ghost" onClick={() => requestSort('salary')} className="h-auto p-1 text-xs sm:text-sm">Salary {getSortIcon('salary')}</Button></TableHead><TableHead>File</TableHead><TableHead className="text-right w-[100px]">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoadingEmployees && employees.length === 0 && ([...Array(3)].map((_, i) => (<TableRow key={`skel-${i}`}><TableCell><Skeleton className="h-10 w-10 rounded-full" /></TableCell><TableCell><Skeleton className="h-4 w-3/4" /></TableCell><TableCell><Skeleton className="h-4 w-1/2" /></TableCell><TableCell><Skeleton className="h-4 w-3/4" /></TableCell><TableCell className="text-right"><Skeleton className="h-4 w-1/4 ml-auto" /></TableCell><TableCell><Skeleton className="h-4 w-1/2" /></TableCell><TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell></TableRow>)))}
              {!isLoadingEmployees && sortedEmployees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell><Avatar className="h-10 w-10"><AvatarImage src={employee.profilePictureUrl || `https://placehold.co/40x40.png?text=${getInitials(employee.name)}`} alt={employee.name} data-ai-hint="person portrait" /><AvatarFallback>{getInitials(employee.name)}</AvatarFallback></Avatar></TableCell>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>{employee.position}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground" title={employee.description}>{employee.description || '-'}</TableCell>
                  <TableCell className="text-right">{currencySymbol}{employee.salary.toLocaleString()}</TableCell>
                  <TableCell>{employee.associatedFileUrl && employee.associatedFileName ? (<a href={employee.associatedFileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate max-w-[120px] inline-block" title={employee.associatedFileName}><FileText className="h-4 w-4 inline mr-1 flex-shrink-0" />{employee.associatedFileName}</a>) : ( <span className="text-sm text-muted-foreground">None</span> )}</TableCell>
                  <TableCell className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" disabled={isSaving}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => handlePrintBioData(employee)}><Printer className="mr-2 h-4 w-4"/>Print Bio-Data</DropdownMenuItem><DropdownMenuItem onClick={() => handleEditEmployee(employee)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onClick={() => promptDeleteEmployee(employee.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>


      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { if (!open) resetEditFormState(); else setIsEditDialogOpen(true); }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader><DialogTitle className="font-headline">Edit Employee</DialogTitle><DialogDescription>Update {currentEmployee.name}'s details.</DialogDescription></DialogHeader>
          <ScrollArea className="flex-grow pr-6 -mr-6">
            <form id="employeeDialogForm" onSubmit={handleUpdateSubmit} className="space-y-4 py-1 pr-1">
              {/* Basic Info */}
              <CardDescription>Basic Information</CardDescription>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div><Label>Full Name</Label><Input value={currentEmployee.name || ''} onChange={(e) => setCurrentEmployee(p => ({...p, name: e.target.value}))} required disabled={isSaving} /></div>
                  <div><Label>Position / Role</Label><Input value={currentEmployee.position || ''} onChange={(e) => setCurrentEmployee(p => ({...p, position: e.target.value}))} required disabled={isSaving} /></div>
                  <div><Label>Annual Salary ({currencySymbol})</Label><Input type="number" value={currentEmployee.salary ?? ''} onChange={(e) => setCurrentEmployee(p => ({...p, salary: e.target.value}))} required min="0" disabled={isSaving} /></div>
              </div>
              <Separator />
              {/* Bio-Data Fields */}
              <CardDescription>Bio-Data Details</CardDescription>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><Label>Shoes No.</Label><Input value={currentEmployee.shoesNo || ''} onChange={e => setCurrentEmployee(p => ({...p, shoesNo: e.target.value}))} disabled={isSaving}/></div>
                    <div><Label>Father's Name</Label><Input value={currentEmployee.fatherName || ''} onChange={e => setCurrentEmployee(p => ({...p, fatherName: e.target.value}))} disabled={isSaving}/></div>
                    <div><Label>Mother's Name</Label><Input value={currentEmployee.motherName || ''} onChange={e => setCurrentEmployee(p => ({...p, motherName: e.target.value}))} disabled={isSaving}/></div>
                </div>
              {/* ... All other bio-data fields ... */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>Date of Birth</Label><Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal" disabled={isSaving}><CalendarIcon className="mr-2 h-4 w-4" />{currentEmployee.dateOfBirth ? format(currentEmployee.dateOfBirth, 'PPP') : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={currentEmployee.dateOfBirth} onSelect={(d) => setCurrentEmployee(p=>({...p, dateOfBirth: d}))} captionLayout="dropdown-buttons" fromYear={1950} toYear={new Date().getFullYear()} initialFocus /></PopoverContent></Popover></div>
                  <div><Label>Joining Date</Label><Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal" disabled={isSaving}><CalendarIcon className="mr-2 h-4 w-4" />{currentEmployee.joiningDate ? format(currentEmployee.joiningDate, 'PPP') : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={currentEmployee.joiningDate} onSelect={(d) => setCurrentEmployee(p=>({...p, joiningDate: d}))} captionLayout="dropdown-buttons" fromYear={1980} toYear={new Date().getFullYear()} initialFocus /></PopoverContent></Popover></div>
              </div>

               {/* File Uploads */}
                <Separator/>
                <CardDescription>File Uploads</CardDescription>
                <div className="space-y-4">
                    {/* Profile Picture */}
                    <div><Label>Profile Picture</Label><div className="flex items-start gap-4"><Avatar className="h-24 w-24"><AvatarImage src={profilePicturePreview || currentEmployee.profilePictureUrl || `https://placehold.co/96x96.png?text=${getInitials(currentEmployee.name)}`} /><AvatarFallback>{getInitials(currentEmployee.name)}</AvatarFallback></Avatar><div className="flex-grow space-y-2"><Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setProfilePictureFile, setProfilePicturePreview)} disabled={isSaving} /><Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveImage('profile')} className="text-destructive w-full">Remove Image</Button></div></div></div>
                    {/* Signature */}
                    <div><Label>Signature</Label><div className="flex items-start gap-4"><div className="h-24 w-24 border rounded-md flex items-center justify-center p-1 bg-white">{signaturePreview || currentEmployee.signatureUrl ? <Image src={signaturePreview || currentEmployee.signatureUrl!} alt="Signature" width={96} height={96} className="object-contain"/> : <PenSquare className="h-8 w-8 text-muted-foreground"/>}</div><div className="flex-grow space-y-2"><Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setSignatureFile, setSignaturePreview)} disabled={isSaving} /><Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveImage('signature')} className="text-destructive w-full">Remove Signature</Button></div></div></div>
                    {/* Thumb Impression */}
                    <div><Label>Left Thumb Impression</Label><div className="flex items-start gap-4"><div className="h-24 w-24 border rounded-md flex items-center justify-center p-1 bg-white">{leftThumbImpressionPreview || currentEmployee.leftThumbImpressionUrl ? <Image src={leftThumbImpressionPreview || currentEmployee.leftThumbImpressionUrl!} alt="Thumb" width={96} height={96} className="object-contain"/> : <Fingerprint className="h-8 w-8 text-muted-foreground"/>}</div><div className="flex-grow space-y-2"><Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setLeftThumbImpressionFile, setLeftThumbImpressionPreview)} disabled={isSaving} /><Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveImage('thumb')} className="text-destructive w-full">Remove Thumb</Button></div></div></div>
                    {/* Associated File */}
                    <div><Label>Associated File</Label><div className="flex items-start gap-4"><div className="flex-grow space-y-2"><Input type="file" onChange={(e) => handleFileChange(e, setAssociatedFile)} disabled={isSaving} />{currentEmployee.associatedFileName && <div className="text-xs">Current: <a href={currentEmployee.associatedFileUrl} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">{currentEmployee.associatedFileName}</a></div>}{associatedFile && <div className="text-xs">New: <span className="font-medium">{associatedFile.name}</span></div>}<Button type="button" variant="ghost" size="sm" onClick={handleRemoveAssociatedFile} className="text-destructive w-full">Remove Associated File</Button></div></div></div>
                </div>

              <div><Label>Description / Notes</Label><Textarea value={currentEmployee.description || ''} onChange={(e) => setCurrentEmployee(p => ({...p, description: e.target.value}))} rows={2} disabled={isSaving}/></div>
            </form>
          </ScrollArea>
          <DialogFooter className="mt-auto pt-3 border-t"><DialogClose asChild><Button type="button" variant="outline" onClick={resetEditFormState} disabled={isSaving}>Cancel</Button></DialogClose><Button type="submit" form="employeeDialogForm" disabled={isSaving}>{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBioDataDialogOpen} onOpenChange={setIsBioDataDialogOpen}>
          <DialogContent className="max-w-4xl w-full h-[95vh] flex flex-col p-0 bg-gray-100 dark:bg-background">
              <DialogHeader className="p-4 sm:p-6 pb-2 border-b bg-background no-print"><DialogTitle className="font-headline text-xl">Bio-Data: {employeeToPrint?.name}</DialogTitle></DialogHeader>
              <ScrollArea className="flex-grow bg-gray-200 dark:bg-zinc-800 p-4 sm:p-8">
                  {employeeToPrint && <BioDataTemplate ref={bioDataPrintRef} employee={employeeToPrint} companyName={companyDetails?.name} companyAddress={companyDetails?.address} />}
              </ScrollArea>
              <DialogFooter className="p-4 sm:p-6 border-t bg-background no-print justify-end flex-wrap gap-2">
                 <Button type="button" variant="default" onClick={triggerPrint} disabled={isPrinting}><Printer className="mr-2 h-4 w-4" /> Print Bio-Data</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
      
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}><DialogContent className="sm:max-w-4xl"><DialogHeader><DialogTitle>Review Employee Import</DialogTitle><DialogDescription>Review and edit the employees parsed from your file or scan. Invalid or incomplete data will be skipped. Click 'Confirm Import' to add them.</DialogDescription></DialogHeader><ScrollArea className="max-h-[60vh] border rounded-md"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Position</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Salary</TableHead></TableRow></TableHeader><TableBody>{editableParsedEmployees.length > 0 ? editableParsedEmployees.map((emp, index) => (<TableRow key={index}><TableCell><Input value={emp.name} onChange={(e) => handleParsedEmployeeChange(index, 'name', e.target.value)} className="h-8" /></TableCell><TableCell><Input value={emp.position} onChange={(e) => handleParsedEmployeeChange(index, 'position', e.target.value)} className="h-8" /></TableCell><TableCell><Input value={emp.description || ''} onChange={(e) => handleParsedEmployeeChange(index, 'description', e.target.value)} className="h-8" /></TableCell><TableCell className="text-right"><Input type="number" value={emp.salary} onChange={(e) => handleParsedEmployeeChange(index, 'salary', Number(e.target.value))} className="h-8 text-right" /></TableCell></TableRow>)) : (<TableRow><TableCell colSpan={4} className="text-center h-24">No valid employees to display.</TableCell></TableRow>)}</TableBody></Table></ScrollArea><DialogFooter><Button variant="outline" onClick={() => setIsImportDialogOpen(false)} disabled={isImporting}>Cancel</Button><Button onClick={handleConfirmImport} disabled={isImporting || editableParsedEmployees.length === 0}>{isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Confirm Import ({editableParsedEmployees.length})</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={isScanDialogOpen} onOpenChange={setIsScanDialogOpen}><DialogContent><DialogHeader><DialogTitle>Scan Document</DialogTitle><DialogDescription>Position the employee list within the frame and click capture.</DialogDescription></DialogHeader><div className="relative">{isInitializingCamera && (<div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10"><Loader2 className="h-8 w-8 animate-spin" /><p className="ml-2">Starting camera...</p></div>)}{isScanning && (<div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10"><Loader2 className="h-8 w-8 animate-spin" /><p className="ml-2 mt-2">Analyzing document...</p></div>)}<video ref={videoRef} className="w-full aspect-video rounded-md bg-black" autoPlay muted playsInline /><canvas ref={canvasRef} className="hidden" /></div><DialogFooter><Button variant="outline" onClick={() => setIsScanDialogOpen(false)} disabled={isScanning}>Cancel</Button><Button onClick={handleCaptureAndAnalyzeDocument} disabled={isInitializingCamera || isScanning || !hasCameraPermission}><Camera className="mr-2 h-4 w-4" />Capture & Analyze</Button></DialogFooter></DialogContent></Dialog>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the employee and their files. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setEmployeeToDeleteId(null)} disabled={isSaving}>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteEmployee} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isSaving}>{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
