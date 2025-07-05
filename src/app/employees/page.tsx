
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
import { Users2, PlusCircle, MoreHorizontal, Edit, Trash2, Loader2, Save, Camera, UploadCloud, FileText, XCircle, SwitchCamera, Upload, ArrowUp, ArrowDown, ChevronsUpDown, ScanLine, Printer, Fingerprint, PenSquare, Download, Expand } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, doc, getDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy, Timestamp, serverTimestamp, limit, startAfter, endBefore, limitToLast, type QueryDocumentSnapshot, type DocumentData } from 'firebase/firestore';
import { uploadFileToStorage, deleteFileFromStorage } from '@/lib/firebaseStorageUtils';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn, urlToDataUri } from '@/lib/utils';
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
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

interface EmployeeFirestore {
  id?: string;
  name: string;
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

type ParsedEmployee = Omit<EmployeeFirestore, 'id' | 'createdAt' | 'updatedAt' | 'companyId' | 'addedById' | 'addedBy' | 'profilePictureUrl' | 'profilePictureStoragePath' | 'associatedFileUrl' | 'associatedFileName' | 'associatedFileStoragePath'>;

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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editableParsedEmployees, setEditableParsedEmployees] = useState<ParsedEmployee[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  
  const [isScanDialogOpen, setIsScanDialogOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isInitializingCamera, setIsInitializingCamera] = useState(false);

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
      const baseQuery = [
        where('companyId', '==', user.companyId),
        orderBy(sortConfig.key, sortConfig.direction),
      ];

      if (sortConfig.key !== 'createdAt') {
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

        const updatedData: Partial<EmployeeFirestore> = { ...currentEmployee, uan: currentEmployee.uan || '' };
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
        fetchEmployees('reset');
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
      fetchEmployees('reset');
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
  const handleProfileDrop = (e: React.DragEvent<HTMLDivElement>) => { handleDragEvents(e); setIsDraggingProfile(false); handleFileChange(e.dataTransfer as any, setProfilePictureFile, setProfilePicturePreview); };
  const handleFileDragEnter = (e: React.DragEvent<HTMLDivElement>) => { handleDragEvents(e); if (e.dataTransfer.items?.length > 0) setIsDraggingFile(true); };
  const handleFileDragLeave = (e: React.DragEvent<HTMLDivElement>) => { handleDragEvents(e); setIsDraggingFile(false); };
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => { handleDragEvents(e); setIsDraggingFile(false); handleFileChange(e.dataTransfer as any, setAssociatedFile); };

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
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" disabled><Expand className="h-4 w-4" /></Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Expand View</p></TooltipContent>
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
            <TableHeader><TableRow><TableHead className="w-[60px]">Avatar</TableHead><TableHead><Button variant="ghost" onClick={() => handleSortChange('name')} className="-ml-4 h-auto p-1 text-xs sm:text-sm">Name {getSortIcon('name')}</Button></TableHead><TableHead><Button variant="ghost" onClick={() => handleSortChange('position')} className="-ml-4 h-auto p-1 text-xs sm:text-sm">Position {getSortIcon('position')}</Button></TableHead><TableHead>Description</TableHead><TableHead className="text-right"><Button variant="ghost" onClick={() => handleSortChange('salary')} className="h-auto p-1 text-xs sm:text-sm">Salary {getSortIcon('salary')}</Button></TableHead><TableHead>File</TableHead><TableHead className="text-right w-[100px]">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoadingEmployees && employees.length === 0 && ([...Array(3)].map((_, i) => (<TableRow key={`skel-${i}`}><TableCell><Skeleton className="h-10 w-10 rounded-full" /></TableCell><TableCell><Skeleton className="h-4 w-3/4" /></TableCell><TableCell><Skeleton className="h-4 w-1/2" /></TableCell><TableCell><Skeleton className="h-4 w-3/4" /></TableCell><TableCell className="text-right"><Skeleton className="h-4 w-1/4 ml-auto" /></TableCell><TableCell><Skeleton className="h-4 w-1/2" /></TableCell><TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell></TableRow>)))}
              {!isLoadingEmployees && employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell><Avatar className="h-10 w-10"><AvatarImage src={employee.profilePictureUrl || `https://placehold.co/40x40.png?text=${getInitials(employee.name)}`} alt={employee.name} data-ai-hint="person portrait" /><AvatarFallback>{getInitials(employee.name)}</AvatarFallback></Avatar></TableCell>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>{employee.position}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground" title={employee.description}>{employee.description || '-'}</TableCell>
                  <TableCell className="text-right">{currencySymbol}{employee.salary.toLocaleString()}</TableCell>
                  <TableCell>{employee.associatedFileUrl && employee.associatedFileName ? (<a href={employee.associatedFileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate max-w-[120px] inline-block" title={employee.associatedFileName}><FileText className="h-4 w-4 inline mr-1 flex-shrink-0" />{employee.associatedFileName}</a>) : ( <span className="text-sm text-muted-foreground">None</span> )}</TableCell>
                  <TableCell className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" disabled={isSaving}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => handleOpenBioDataDialog(employee)}><Printer className="mr-2 h-4 w-4"/>Print Bio-Data</DropdownMenuItem><DropdownMenuItem onClick={() => handleEditEmployee(employee)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onClick={() => promptDeleteEmployee(employee.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
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
                  <div><Label>Salary ({currencySymbol})</Label><Input type="number" value={currentEmployee.salary ?? ''} onChange={(e) => setCurrentEmployee(p => ({...p, salary: e.target.value}))} required min="0" disabled={isSaving} /></div>
              </div>
              <div><Label>UAN</Label><Input value={currentEmployee.uan || ''} onChange={(e) => setCurrentEmployee(p => ({...p, uan: e.target.value}))} disabled={isSaving} /></div>
              <Separator />
              {/* Bio-Data Fields */}
              <CardDescription>Bio-Data Details</CardDescription>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <div><Label>Signature</Label><div className="flex items-start gap-4"><div className="h-24 w-24 border rounded-md flex items-center justify-center p-1 bg-white">{signaturePreview || currentEmployee.signatureUrl ? <img src={signaturePreview || currentEmployee.signatureUrl!} alt="Signature" className="object-contain max-h-full max-w-full" crossOrigin="anonymous"/> : <PenSquare className="h-8 w-8 text-muted-foreground"/>}</div><div className="flex-grow space-y-2"><Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setSignatureFile, setSignaturePreview)} disabled={isSaving} /><Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveImage('signature')} className="text-destructive w-full">Remove Signature</Button></div></div></div>
                    {/* Thumb Impression */}
                    <div><Label>Left Thumb Impression</Label><div className="flex items-start gap-4"><div className="h-24 w-24 border rounded-md flex items-center justify-center p-1 bg-white">{leftThumbImpressionPreview || currentEmployee.leftThumbImpressionUrl ? <img src={leftThumbImpressionPreview || currentEmployee.leftThumbImpressionUrl!} alt="Thumb" className="object-contain max-h-full max-w-full" crossOrigin="anonymous"/> : <Fingerprint className="h-8 w-8 text-muted-foreground"/>}</div><div className="flex-grow space-y-2"><Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setLeftThumbImpressionFile, setLeftThumbImpressionPreview)} disabled={isSaving} /><Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveImage('thumb')} className="text-destructive w-full">Remove Thumb</Button></div></div></div>
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
      
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}><DialogContent className="sm:max-w-4xl"><DialogHeader><DialogTitle>Review Employee Import</DialogTitle><DialogDescription>Review and edit the employees parsed from your file or scan. Invalid or incomplete data will be skipped. Click 'Confirm Import' to add them.</DialogDescription></DialogHeader><ScrollArea className="max-h-[60vh] border rounded-md"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Position</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Salary</TableHead></TableRow></TableHeader><TableBody>{editableParsedEmployees.length > 0 ? editableParsedEmployees.map((emp, index) => (<TableRow key={index}><TableCell><Input value={emp.name} onChange={(e) => handleParsedEmployeeChange(index, 'name', e.target.value)} className="h-8" /></TableCell><TableCell><Input value={emp.position} onChange={(e) => handleParsedEmployeeChange(index, 'position', e.target.value)} className="h-8" /></TableCell><TableCell><Input value={emp.description || ''} onChange={(e) => handleParsedEmployeeChange(index, 'description', e.target.value)} className="h-8" /></TableCell><TableCell className="text-right"><Input type="number" value={emp.salary} onChange={(e) => handleParsedEmployeeChange(index, 'salary', Number(e.target.value))} className="h-8 text-right" /></TableCell></TableRow>)) : (<TableRow><TableCell colSpan={4} className="text-center h-24">No valid employees to display.</TableCell></TableRow>)}</TableBody></Table></ScrollArea><DialogFooter><Button variant="outline" onClick={() => setIsImportDialogOpen(false)} disabled={isImporting}>Cancel</Button><Button onClick={handleConfirmImport} disabled={isImporting || editableParsedEmployees.length === 0}>{isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Confirm Import ({editableParsedEmployees.length})</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={isScanDialogOpen} onOpenChange={setIsScanDialogOpen}><DialogContent><DialogHeader><DialogTitle>Scan Document</DialogTitle><DialogDescription>Position the employee list within the frame and click capture.</DialogDescription></DialogHeader><div className="relative">{isInitializingCamera && (<div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10"><Loader2 className="h-8 w-8 animate-spin" /><p className="ml-2">Starting camera...</p></div>)}{isScanning && (<div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10"><Loader2 className="h-8 w-8 animate-spin" /><p className="ml-2 mt-2">Analyzing document...</p></div>)}<video ref={videoRef} className="w-full aspect-video rounded-md bg-black" autoPlay muted playsInline /><canvas ref={canvasRef} className="hidden" /></div><DialogFooter><Button variant="outline" onClick={() => setIsScanDialogOpen(false)} disabled={isScanning}>Cancel</Button><Button onClick={handleCaptureAndAnalyzeDocument} disabled={isInitializingCamera || isScanning || !hasCameraPermission}><Camera className="mr-2 h-4 w-4" />Capture & Analyze</Button></DialogFooter></DialogContent></Dialog>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the employee and their files. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setEmployeeToDeleteId(null)} disabled={isSaving}>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteEmployee} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isSaving}>{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
