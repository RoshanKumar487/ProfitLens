
'use client';

import React, { useState, useEffect, FormEvent, useCallback, useRef, useMemo } from 'react';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users2, PlusCircle, MoreHorizontal, Edit, Trash2, Loader2, Save, Camera, UploadCloud, FileText, XCircle, SwitchCamera, Upload, ArrowUp, ArrowDown, ChevronsUpDown, Search, ScanLine } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, Timestamp, serverTimestamp, setDoc } from 'firebase/firestore';
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
}

interface EmployeeDisplay extends Omit<EmployeeFirestore, 'createdAt' | 'updatedAt' | 'companyId' | 'addedById'> {
  id: string;
  createdAt: Date;
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
    // This is to clean up the object URL to avoid memory leaks
    return () => {
      if (profilePicturePreview && profilePicturePreview.startsWith('blob:')) {
        URL.revokeObjectURL(profilePicturePreview);
      }
    };
  }, [profilePicturePreview]);
  
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
          toast({
            variant: 'default',
            title: 'Camera not available',
            description: 'Switched to default camera.',
          });
        } catch (fallbackError) {
           console.error('Error accessing any camera:', fallbackError);
           setHasCameraPermission(false);
           toast({
              variant: 'destructive',
              title: 'Camera Access Denied',
              description: 'Please enable camera permissions in your browser settings.',
           });
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
      return () => {
          if (showProfileWebcam) cleanupWebcam();
      };
    }, [showProfileWebcam, facingMode, startWebcam, cleanupWebcam, isScanDialogOpen]);

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
          if(!showProfileWebcam) cleanupWebcam();
        }
      };
      getCameraPermission();

      return () => { if(isScanDialogOpen) cleanupWebcam()};
  }, [isScanDialogOpen, cleanupWebcam, toast, showProfileWebcam]);


  const fetchEmployees = useCallback(async () => {
    if (authIsLoading) {
      setIsLoadingEmployees(true);
      return;
    }
    if (!user || !user.companyId) {
      setIsLoadingEmployees(false);
      setEmployees([]);
      return;
    }

    setIsLoadingEmployees(true);
    try {
      const employeesRef = collection(db, 'employees');
      const q = query(employeesRef, where('companyId', '==', user.companyId), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const fetchedEmployees = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data() as Omit<EmployeeFirestore, 'id'>;
        return {
          id: docSnap.id,
          name: data.name,
          position: data.position,
          salary: data.salary,
          description: data.description,
          profilePictureUrl: data.profilePictureUrl,
          profilePictureStoragePath: data.profilePictureStoragePath,
          associatedFileUrl: data.associatedFileUrl,
          associatedFileName: data.associatedFileName,
          associatedFileStoragePath: data.associatedFileStoragePath,
          addedBy: data.addedBy || 'N/A',
          createdAt: data.createdAt.toDate(),
        };
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
    setShowProfileWebcam(false);
    setHasCameraPermission(null);
    cleanupWebcam();
  }, [cleanupWebcam]);

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.companyId || !currentEmployee.id) {
        toast({ title: "Authentication Error", description: "User or employee data missing.", variant: "destructive" });
        return;
    }
    if (!currentEmployee.name || !currentEmployee.position || currentEmployee.salary === undefined) {
        toast({ title: "Missing Information", description: "Name, position, and salary are required.", variant: "destructive" });
        return;
    }

    const salaryNum = Number(currentEmployee.salary);
    if (isNaN(salaryNum) || salaryNum < 0) {
        toast({ title: "Invalid Salary", description: "Salary must be a non-negative number.", variant: "destructive"});
        return;
    }

    setIsSaving(true);
    
    try {
        const employeeDocId = currentEmployee.id;
        const employeeRef = doc(db, 'employees', employeeDocId);

        // Clone current employee to avoid mutating state directly
        const updatedEmployeeData: any = { ...currentEmployee };

        // Handle Profile Picture
        if (profilePictureFile) { 
            const oldPath = currentEmployee.profilePictureStoragePath;
            if (oldPath) {
                await deleteFileFromStorage(oldPath).catch(e => console.warn("Old profile pic deletion failed, continuing...", e));
            }
            const fileExtension = profilePictureFile.name.split('.').pop() || 'jpeg';
            const newPath = `employees/${user.companyId}/${employeeDocId}/profileImage.${fileExtension}`;
            const newUrl = await uploadFileToStorage(profilePictureFile, newPath);
            updatedEmployeeData.profilePictureUrl = newUrl;
            updatedEmployeeData.profilePictureStoragePath = newPath;
        } else if (updatedEmployeeData.profilePictureUrl === undefined) { 
            const oldPath = currentEmployee.profilePictureStoragePath;
            if (oldPath) {
                await deleteFileFromStorage(oldPath).catch(e => console.warn("Profile pic deletion failed, continuing...", e));
            }
            updatedEmployeeData.profilePictureUrl = '';
            updatedEmployeeData.profilePictureStoragePath = '';
        }

        // Handle Associated File
        if (associatedFile) {
            const oldPath = currentEmployee.associatedFileStoragePath;
            if (oldPath) {
                await deleteFileFromStorage(oldPath).catch(e => console.warn("Old assoc. file deletion failed, continuing...", e));
            }
            const newPath = `employees/${user.companyId}/${employeeDocId}/associatedFiles/${associatedFile.name}`;
            const newUrl = await uploadFileToStorage(associatedFile, newPath);
            updatedEmployeeData.associatedFileUrl = newUrl;
            updatedEmployeeData.associatedFileStoragePath = newPath;
            updatedEmployeeData.associatedFileName = associatedFile.name;
        } else if (updatedEmployeeData.associatedFileUrl === undefined) {
            const oldPath = currentEmployee.associatedFileStoragePath;
            if (oldPath) {
                await deleteFileFromStorage(oldPath).catch(e => console.warn("Assoc. file deletion failed, continuing...", e));
            }
            updatedEmployeeData.associatedFileUrl = '';
            updatedEmployeeData.associatedFileStoragePath = '';
            updatedEmployeeData.associatedFileName = '';
        }

        const dataToSave = {
            name: updatedEmployeeData.name!,
            position: updatedEmployeeData.position!,
            salary: salaryNum,
            description: updatedEmployeeData.description || '',
            profilePictureUrl: updatedEmployeeData.profilePictureUrl,
            profilePictureStoragePath: updatedEmployeeData.profilePictureStoragePath,
            associatedFileUrl: updatedEmployeeData.associatedFileUrl,
            associatedFileName: updatedEmployeeData.associatedFileName,
            associatedFileStoragePath: updatedEmployeeData.associatedFileStoragePath,
            updatedAt: serverTimestamp(),
        };

        await updateDoc(employeeRef, dataToSave);
        toast({ title: "Employee Updated" });
        
        fetchEmployees();
        resetEditFormState();

    } catch (error: any) {
        console.error("Error saving employee:", error);
        toast({ title: "Save Failed", description: `An unexpected error occurred: ${error.message}`, variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  const handleEditEmployee = (employee: EmployeeDisplay) => {
    setCurrentEmployee({ ...employee, salary: employee.salary.toString() });
    setProfilePicturePreview(employee.profilePictureUrl || null);
    setProfilePictureFile(null);
    setAssociatedFile(null);
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
        const deletionPromises: Promise<void>[] = [];
        if (employeeToDelete.profilePictureStoragePath) {
          deletionPromises.push(deleteFileFromStorage(employeeToDelete.profilePictureStoragePath));
        }
        if (employeeToDelete.associatedFileStoragePath) {
          deletionPromises.push(deleteFileFromStorage(employeeToDelete.associatedFileStoragePath));
        }
        await Promise.all(deletionPromises).catch(e => console.warn("Failed to delete all files from storage", e));
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurrentEmployee(prev => ({ ...prev, [name]: value }));
  };

  const resizeImage = (file: File, maxWidth: number = 800, targetSizeKB: number = 80): Promise<File> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = (event) => {
              const img = new Image();
              img.src = event.target?.result as string;
              img.onload = () => {
                  let { width, height } = img;
                  if (width > height) {
                      if (width > maxWidth) {
                          height = Math.round((height * maxWidth) / width);
                          width = maxWidth;
                      }
                  } else {
                      if (height > maxWidth) {
                          width = Math.round((width * maxWidth) / height);
                          height = maxWidth;
                      }
                  }
                  const canvas = document.createElement('canvas');
                  canvas.width = width;
                  canvas.height = height;
                  const ctx = canvas.getContext('2d');
                  if (!ctx) {
                      return reject(new Error('Could not get canvas context.'));
                  }
                  ctx.drawImage(img, 0, 0, width, height);

                  // IIFE to handle async logic for quality adjustment
                  (async () => {
                      let quality = 0.9; // Start with higher quality
                      let blob: Blob | null = null;
                      
                      const getBlob = (q: number): Promise<Blob | null> => {
                          return new Promise(resolveBlob => {
                              canvas.toBlob(blob => resolveBlob(blob), 'image/jpeg', q);
                          });
                      };

                      blob = await getBlob(quality);

                      // Reduce quality if file is too large
                      while (blob && blob.size / 1024 > targetSizeKB && quality > 0.1) {
                          quality = Math.max(0.1, quality - 0.15); // Reduce more aggressively
                          blob = await getBlob(quality);
                      }

                      if (blob) {
                          const newFileName = (file.name.split('.').slice(0, -1).join('.') || file.name) + ".jpeg";
                          resolve(new File([blob], newFileName, {
                              type: 'image/jpeg',
                              lastModified: Date.now()
                          }));
                      } else {
                          reject(new Error('Canvas to Blob failed.'));
                      }
                  })();
              };
              img.onerror = (err) => reject(err);
          };
          reader.onerror = (err) => reject(err);
      });
  };
  
  const handleFileSelect = async (file: File | null, type: 'profile' | 'associated') => {
    if (!file) return;

    if (type === 'profile') {
      if (!file.type.startsWith('image/')) {
        toast({ title: "Invalid File Type", description: "Please select an image file.", variant: "destructive"});
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ title: "File Too Large", description: "Profile picture must be less than 5MB.", variant: "destructive"});
        return;
      }
      
      const objectUrl = URL.createObjectURL(file);
      setProfilePicturePreview(objectUrl);

      try {
        const resizedFile = await resizeImage(file);
        setProfilePictureFile(resizedFile);
      } catch (error) {
        console.error("Image resize error:", error);
        toast({ title: "Image Processing Failed", description: "Could not process image. Using original file.", variant: "destructive"});
        setProfilePictureFile(file); // Fallback
      }

      if(showProfileWebcam) setShowProfileWebcam(false); 

    } else { // associated file
       if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({ title: "File Too Large", description: "Associated file must be less than 10MB.", variant: "destructive"});
        return;
      }
      setAssociatedFile(file);
    }
  };

  const handleProfilePictureFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file, 'profile');
    e.target.value = "";
  };
  
  const handleAssociatedFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file, 'associated');
    e.target.value = "";
  };


  const handleCaptureProfilePhoto = () => {
    if (videoRef.current && canvasRef.current && videoRef.current.readyState >= videoRef.current.HAVE_METADATA) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      const MAX_WIDTH = 800;
      let { videoWidth: width, videoHeight: height } = video;

      if (width > height) {
          if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
          }
      } else {
          if (height > MAX_WIDTH) {
              width = Math.round((width * MAX_WIDTH) / height);
              height = MAX_WIDTH;
          }
      }
      
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, width, height);
      
      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            const file = new File([blob], `webcam_capture_${Date.now()}.jpeg`, { type: 'image/jpeg' });
            const resizedFile = await resizeImage(file);
            
            const previewDataUrl = URL.createObjectURL(resizedFile);
            setProfilePicturePreview(previewDataUrl);
            setProfilePictureFile(resizedFile);

          } catch (error) {
            console.error("Error resizing captured photo:", error);
            toast({ title: "Capture Failed", description: "Could not process captured image.", variant: "destructive"});
          }
        }
      }, 'image/jpeg', 0.9);

      setShowProfileWebcam(false);
    } else {
      toast({title: "Webcam Error", description: "Webcam not ready or stream not available.", variant: "destructive"});
    }
  };
  
  const handleCaptureAndAnalyzeDocument = async () => {
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
        const result = await analyzeEmployeeDocument({ documentImage: imageDataUrl });

        if (!result.employees || result.employees.length === 0) {
          toast({ title: "No Data Found", description: "The AI could not find any employee data in the image.", variant: "destructive" });
          setIsScanDialogOpen(false);
          return;
        }

        setEditableParsedEmployees(result.employees);
        setIsScanDialogOpen(false);
        setIsImportDialogOpen(true);

        toast({
            title: "Document Scanned",
            description: "Please review and edit the extracted employee data below.",
        });

    } catch (error: any) {
        console.error("Error analyzing employee document:", error);
        toast({
            variant: 'destructive',
            title: 'Scan Failed',
            description: 'Could not extract data from the document. Please try again or use the Excel import.',
        });
    } finally {
        setIsScanning(false);
    }
  };


  const handleRemoveProfilePic = () => {
    setProfilePictureFile(null);
    setProfilePicturePreview(null);
    setCurrentEmployee(prev => ({...prev, profilePictureUrl: undefined, profilePictureStoragePath: prev.profilePictureStoragePath ? prev.profilePictureStoragePath : undefined }));
  };

  const handleRemoveAssociatedFile = () => {
    setAssociatedFile(null);
     setCurrentEmployee(prev => ({...prev, associatedFileUrl: undefined, associatedFileName: undefined, associatedFileStoragePath: prev.associatedFileStoragePath ? prev.associatedFileStoragePath : undefined }));
  };
  
  const handleDragEvents = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Profile Drop Zone handlers
  const handleProfileDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
      handleDragEvents(e);
      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
          setIsDraggingProfile(true);
      }
  };
  const handleProfileDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
      handleDragEvents(e);
      setIsDraggingProfile(false);
  };
  const handleProfileDrop = (e: React.DragEvent<HTMLDivElement>) => {
      handleDragEvents(e);
      setIsDraggingProfile(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFileSelect(file, 'profile');
      e.dataTransfer.clearData();
  };

  // Associated File Drop Zone handlers
  const handleFileDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
      handleDragEvents(e);
      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
          setIsDraggingFile(true);
      }
  };
  const handleFileDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
      handleDragEvents(e);
      setIsDraggingFile(false);
  };
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
      handleDragEvents(e);
      setIsDraggingFile(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFileSelect(file, 'associated');
      e.dataTransfer.clearData();
  };

  // Bulk import handlers
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
        const workbook = xlsx.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = xlsx.utils.sheet_to_json(worksheet);

        const requiredHeaders = ['name', 'position', 'salary'];
        const fileHeaders = Object.keys(json[0] || {});
        const hasAllHeaders = requiredHeaders.every(h => fileHeaders.includes(h));

        if (!hasAllHeaders) {
          toast({ title: 'Invalid File Format', description: `Excel file must contain 'name', 'position', and 'salary' columns.`, variant: 'destructive' });
          return;
        }

        const employeesToParse: ParsedEmployee[] = json.map(row => ({
          name: String(row.name || ''),
          position: String(row.position || ''),
          salary: Number(row.salary || 0),
          description: String(row.description || '')
        })).filter(emp => emp.name && emp.position && !isNaN(emp.salary));

        if (employeesToParse.length === 0) {
           toast({ title: 'No Valid Data', description: 'No valid employee data could be parsed from the file.', variant: 'destructive' });
           return;
        }
        
        setEditableParsedEmployees(employeesToParse);
        setIsImportDialogOpen(true);
      } catch (error) {
        console.error("Error parsing Excel file:", error);
        toast({ title: 'File Read Error', description: 'Could not read or parse the selected file.', variant: 'destructive' });
      } finally {
        // Reset file input to allow re-uploading the same file
        if (e.target) e.target.value = '';
      }
    };
    reader.onerror = () => {
        toast({ title: 'File Read Error', description: 'Failed to read the file.', variant: 'destructive' });
    };
    reader.readAsBinaryString(file);
  };

  const handleParsedEmployeeChange = (index: number, field: keyof ParsedEmployee, value: string | number) => {
    setEditableParsedEmployees(prev => {
        const newEmployees = [...prev];
        (newEmployees[index] as any)[field] = value;
        return newEmployees;
    });
  };

  const handleConfirmImport = async () => {
    if (!user || !user.companyId) {
        toast({ title: 'Authentication Error', variant: 'destructive' });
        return;
    }
    if (editableParsedEmployees.length === 0) {
        toast({ title: 'No Data', description: 'There are no employees to import.', variant: 'destructive' });
        return;
    }
    setIsImporting(true);
    const result = await bulkAddEmployees(editableParsedEmployees, user.companyId, user.uid, user.displayName || user.email || 'System');
    
    toast({ title: result.success ? 'Import Successful' : 'Import Failed', description: result.message, variant: result.success ? 'default' : 'destructive'});

    if (result.success) {
        fetchEmployees();
        setIsImportDialogOpen(false);
        setEditableParsedEmployees([]);
    }
    setIsImporting(false);
  };


  if (authIsLoading) {
    return ( <div className="flex items-center justify-center h-[calc(100vh-200px)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /> <p className="ml-2">Loading authentication...</p></div> );
  }

  if (!user && !authIsLoading) {
     return (
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <PageTitle title="Employees" subtitle="Manage your team members." icon={Users2} />
        <Card>
          <CardHeader><CardTitle>Access Denied</CardTitle></CardHeader>
          <CardContent><p>Please sign in to manage employees.</p></CardContent>
        </Card>
      </div>
    )
  }


  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageTitle title="Employees" subtitle="Manage your team members." icon={Users2}>
        <div className="flex flex-col sm:flex-row gap-2">
            <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={handleImportClick} disabled={isSaving || isLoadingEmployees}>
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
                 <Button variant="outline" size="icon" onClick={() => setIsScanDialogOpen(true)} disabled={isSaving || isLoadingEmployees}>
                    <ScanLine className="h-4 w-4"/>
                    <span className="sr-only">Scan Document</span>
                 </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Scan Document</p>
              </TooltipContent>
            </Tooltip>
            </TooltipProvider>
            <Button asChild disabled={isSaving || isLoadingEmployees}>
              <Link href="/employees/new">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Employee
              </Link>
            </Button>
            <input type="file" ref={fileInputRef} onChange={handleImportFileChange} className="hidden" accept=".xlsx, .xls, .csv" />
        </div>
      </PageTitle>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                Manage your employees' information, salaries, and associated files.
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by name, position..."
                className="pl-8 sm:w-[250px] md:w-[300px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={isLoadingEmployees}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>{!isLoadingEmployees && sortedEmployees.length === 0 ? (searchTerm ? "No employees match your search." : "No employees found.") : "A list of your employees."}</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">Avatar</TableHead>
                <TableHead>
                   <Button variant="ghost" onClick={() => requestSort('name')} className="-ml-4 h-auto p-1 text-xs sm:text-sm">Name {getSortIcon('name')}</Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => requestSort('position')} className="-ml-4 h-auto p-1 text-xs sm:text-sm">Position {getSortIcon('position')}</Button>
                </TableHead>
                <TableHead>Description</TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => requestSort('addedBy')} className="-ml-4 h-auto p-1 text-xs sm:text-sm">Added By {getSortIcon('addedBy')}</Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" onClick={() => requestSort('salary')} className="h-auto p-1 text-xs sm:text-sm">Salary {getSortIcon('salary')}</Button>
                </TableHead>
                <TableHead>File</TableHead>
                <TableHead className="text-right w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingEmployees && employees.length === 0 && (
                [...Array(3)].map((_, i) => (
                  <TableRow key={`skel-${i}`}>
                    <TableCell><Skeleton className="h-10 w-10 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-3/4" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-1/2" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-3/4" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-1/2" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-1/4 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-1/2" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              )}

              {user?.email === 'roshankumar70975@gmail.com' && (
                  <TableRow key="super-admin-row" className="bg-primary/5 hover:bg-primary/10">
                      <TableCell>
                          <Avatar className="h-10 w-10 border-2 border-primary">
                              <AvatarFallback className="bg-primary/20">SA</AvatarFallback>
                          </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">Roshan Kumar</TableCell>
                      <TableCell>Super Admin</TableCell>
                      <TableCell>N/A</TableCell>
                      <TableCell>System</TableCell>
                      <TableCell className="text-right">N/A</TableCell>
                      <TableCell>
                          <span className="text-sm text-muted-foreground">System</span>
                      </TableCell>
                      <TableCell className="text-right">
                          <Badge variant="secondary">System User</Badge>
                      </TableCell>
                  </TableRow>
              )}

              {!isLoadingEmployees && sortedEmployees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={employee.profilePictureUrl || `https://placehold.co/40x40.png?text=${getInitials(employee.name)}`} alt={employee.name} data-ai-hint="person portrait" />
                      <AvatarFallback>{getInitials(employee.name)}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>{employee.position}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground" title={employee.description}>
                    {employee.description || '-'}
                  </TableCell>
                  <TableCell>{employee.addedBy}</TableCell>
                  <TableCell className="text-right">{currencySymbol}{employee.salary.toLocaleString()}</TableCell>
                  <TableCell>
                    {employee.associatedFileUrl && employee.associatedFileName ? (
                      <a href={employee.associatedFileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate max-w-[120px] inline-block" title={employee.associatedFileName}>
                        <FileText className="h-4 w-4 inline mr-1 flex-shrink-0" />{employee.associatedFileName}
                      </a>
                    ) : ( <span className="text-sm text-muted-foreground">None</span> )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isSaving}><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditEmployee(employee)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => promptDeleteEmployee(employee.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>


      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { if (!open) resetEditFormState(); else setIsEditDialogOpen(true); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-headline">Edit Employee</DialogTitle>
            <DialogDescription>Update employee details.</DialogDescription>
          </DialogHeader>
          
          <form id="employeeDialogForm" onSubmit={handleUpdateSubmit} className="space-y-3 py-1 overflow-y-auto flex-grow pr-3 pl-1">
            <div>
              <Label htmlFor="nameEmp">Full Name</Label>
              <Input id="nameEmp" name="name" value={currentEmployee.name || ''} onChange={handleInputChange} required disabled={isSaving} />
            </div>
            <div>
              <Label htmlFor="positionEmp">Position / Role</Label>
              <Input id="positionEmp" name="position" value={currentEmployee.position || ''} onChange={handleInputChange} required disabled={isSaving} />
            </div>
            <div>
              <Label htmlFor="salaryEmp">Annual Salary ({currencySymbol})</Label>
              <Input id="salaryEmp" name="salary" type="number" value={currentEmployee.salary === undefined ? '' : String(currentEmployee.salary)} onChange={handleInputChange} required min="0" disabled={isSaving} />
            </div>
            
            <div className="space-y-2 pt-2 border-t">
                <Label>Profile Picture</Label>
                <div className="flex items-start gap-3">
                    <Avatar className="h-20 w-20 flex-shrink-0">
                    <AvatarImage src={profilePicturePreview || currentEmployee.profilePictureUrl || `https://placehold.co/80x80.png?text=${getInitials(currentEmployee.name)}`} alt="Profile Preview" data-ai-hint="person portrait" />
                    <AvatarFallback>{getInitials(currentEmployee.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-grow space-y-1.5">
                    <div 
                        onDrop={handleProfileDrop}
                        onDragOver={handleDragEvents}
                        onDragEnter={handleProfileDragEnter}
                        onDragLeave={handleProfileDragLeave}
                        className={cn(
                            "relative flex flex-col items-center justify-center w-full p-2 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
                            isDraggingProfile && "border-primary bg-primary/10"
                        )}
                    >
                        <UploadCloud className="h-6 w-6 text-muted-foreground"/>
                        <p className="mt-1 text-xs text-muted-foreground">
                            <span className="font-semibold text-primary">Click or drop image</span>
                        </p>
                        <Input id="profilePictureFile" type="file" accept="image/*" onChange={handleProfilePictureFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={isSaving || showProfileWebcam}/>
                    </div>
                    <div className="flex gap-1.5">
                        <Button type="button" variant="outline" size="sm" onClick={() => setShowProfileWebcam(prev => !prev)} disabled={isSaving} className="flex-1 text-xs">
                        <Camera className="mr-1.5 h-3.5 w-3.5" /> {showProfileWebcam ? 'Close Cam' : 'Webcam'}
                        </Button>
                        {(profilePicturePreview || currentEmployee.profilePictureUrl) && (
                        <Button type="button" variant="ghost" size="sm" onClick={handleRemoveProfilePic} className="text-destructive hover:text-destructive-foreground hover:bg-destructive/90 flex-1 text-xs">
                            <XCircle className="mr-1.5 h-3.5 w-3.5" /> Remove
                        </Button>
                        )}
                    </div>
                    </div>
                </div>
                {showProfileWebcam && (
                    <div className="mt-1.5 space-y-1.5 p-2 border rounded-md bg-muted/30">
                    <video ref={videoRef} className="w-full aspect-[4/3] rounded-md bg-black" autoPlay muted playsInline />
                    {hasCameraPermission === false && (
                        <Alert variant="destructive" className="p-2 text-xs"><Camera className="h-3.5 w-3.5"/><AlertTitle className="text-xs">Cam Access Denied</AlertTitle><DialogDescription className="text-xs">Enable in browser.</DialogDescription></Alert>
                    )}
                    {hasCameraPermission === true && (
                        <div className="flex gap-2">
                        {hasMultipleCameras && (
                            <Button type="button" onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')} className="flex-1 h-9 text-xs" disabled={isSaving || isSwitchingCamera}>
                            {isSwitchingCamera ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <SwitchCamera className="mr-1.5 h-3.5 w-3.5" />}
                            {isSwitchingCamera ? 'Switching...' : 'Switch Cam'}
                            </Button>
                        )}
                        <Button type="button" onClick={handleCaptureProfilePhoto} className="flex-1 h-9 text-xs" disabled={isSaving || isSwitchingCamera}>
                            <Camera className="mr-1.5 h-3.5 w-3.5" /> Capture
                        </Button>
                        </div>
                    )}
                    </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="space-y-1.5 pt-2 border-t">
                <Label htmlFor="associatedFile">Associated File (e.g., Resume)</Label>
                <div
                    onDrop={handleFileDrop}
                    onDragOver={handleDragEvents}
                    onDragEnter={handleFileDragEnter}
                    onDragLeave={handleFileDragLeave}
                    className={cn(
                        "relative flex flex-col items-center justify-center w-full p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
                        isDraggingFile && "border-primary bg-primary/10"
                    )}
                >
                    <UploadCloud className="h-8 w-8 text-muted-foreground"/>
                    <p className="mt-2 text-sm text-muted-foreground">
                        <span className="font-semibold text-primary">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">PDF, DOCX, etc. (Max 10MB)</p>
                    <Input id="associatedFile" type="file" onChange={handleAssociatedFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={isSaving}/>
                </div>

                {associatedFile && (
                <div className="text-xs text-muted-foreground flex items-center justify-between p-2 bg-muted rounded-md">
                    <span>Selected: <span className="font-medium">{associatedFile.name}</span></span>
                    <Button type="button" variant="ghost" size="icon" onClick={handleRemoveAssociatedFile} className="text-destructive h-6 w-6"> <XCircle className="h-4 w-4" /> </Button>
                </div>
                )}
                {!associatedFile && currentEmployee.associatedFileName && currentEmployee.associatedFileUrl && (
                    <div className="text-xs text-muted-foreground flex items-center justify-between p-2 bg-muted rounded-md">
                        <a href={currentEmployee.associatedFileUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate" title={currentEmployee.associatedFileName}>Current: {currentEmployee.associatedFileName}</a>
                        <Button type="button" variant="ghost" size="icon" onClick={handleRemoveAssociatedFile} className="text-destructive h-6 w-6"> <XCircle className="h-4 w-4" /> </Button>
                    </div>
                )}
            </div>

            <div>
              <Label htmlFor="descriptionEmp">Description / Notes (Optional)</Label>
              <Textarea id="descriptionEmp" name="description" value={currentEmployee.description || ''} onChange={handleInputChange} rows={2} disabled={isSaving} className="text-sm min-h-[60px]" />
            </div>
          </form>

          <DialogFooter className="mt-auto pt-3 border-t">
              <DialogClose asChild>
                 <Button type="button" variant="outline" onClick={resetEditFormState} disabled={isSaving}>Cancel</Button>
              </DialogClose>
              <Button type="submit" form="employeeDialogForm" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
                <DialogTitle>Review Employee Import</DialogTitle>
                <DialogDescription>
                    Review and edit the employees parsed from your file or scan. Invalid or incomplete data will be skipped. Click 'Confirm Import' to add them.
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Position</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Salary</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                    {editableParsedEmployees.length > 0 ? editableParsedEmployees.map((emp, index) => (
                        <TableRow key={index}>
                            <TableCell>
                                <Input value={emp.name} onChange={(e) => handleParsedEmployeeChange(index, 'name', e.target.value)} className="h-8" />
                            </TableCell>
                            <TableCell>
                                <Input value={emp.position} onChange={(e) => handleParsedEmployeeChange(index, 'position', e.target.value)} className="h-8" />
                            </TableCell>
                            <TableCell>
                                <Input value={emp.description || ''} onChange={(e) => handleParsedEmployeeChange(index, 'description', e.target.value)} className="h-8" />
                            </TableCell>
                            <TableCell className="text-right">
                                <Input type="number" value={emp.salary} onChange={(e) => handleParsedEmployeeChange(index, 'salary', Number(e.target.value))} className="h-8 text-right" />
                            </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center h-24">No valid employees to display.</TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
            </ScrollArea>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsImportDialogOpen(false)} disabled={isImporting}>Cancel</Button>
                <Button onClick={handleConfirmImport} disabled={isImporting || editableParsedEmployees.length === 0}>
                    {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Confirm Import ({editableParsedEmployees.length})
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isScanDialogOpen} onOpenChange={setIsScanDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Scan Document</DialogTitle>
                <DialogDescription>Position the employee list within the frame and click capture.</DialogDescription>
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
                        <p className="ml-2 mt-2">Analyzing document...</p>
                    </div>
                )}
                <video ref={videoRef} className="w-full aspect-video rounded-md bg-black" autoPlay muted playsInline />
                <canvas ref={canvasRef} className="hidden" />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsScanDialogOpen(false)} disabled={isScanning}>Cancel</Button>
                <Button onClick={handleCaptureAndAnalyzeDocument} disabled={isInitializingCamera || isScanning || !hasCameraPermission}>
                    <Camera className="mr-2 h-4 w-4" />
                    Capture & Analyze
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the employee and their files. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEmployeeToDeleteId(null)} disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteEmployee} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    