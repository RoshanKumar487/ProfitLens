
'use client';

import React, { useState, useEffect, FormEvent, useCallback, useRef } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users2, PlusCircle, MoreHorizontal, Edit, Trash2, Loader2, Save, Camera, UploadCloud, FileText, XCircle, SwitchCamera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, Timestamp, serverTimestamp, setDoc } from 'firebase/firestore';
import { uploadFileToStorage, deleteFileFromStorage } from '@/lib/firebaseStorageUtils';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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

const getInitials = (name: string = "") => {
  const names = name.split(' ');
  let initials = names[0] ? names[0][0] : '';
  if (names.length > 1 && names[names.length -1]) {
    initials += names[names.length - 1][0];
  }
  return initials.toUpperCase();
};


export default function EmployeesPage() {
  const { user, isLoading: authIsLoading } = useAuth();
  const currency = user?.currencySymbol || '$';
  const [employees, setEmployees] = useState<EmployeeDisplay[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<Partial<EmployeeDisplay & { salary?: string | number }>>({});
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [employeeToDeleteId, setEmployeeToDeleteId] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [showWebcam, setShowWebcam] = useState(false);
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [associatedFile, setAssociatedFile] = useState<File | null>(null);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  
  const [isDraggingProfile, setIsDraggingProfile] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

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
           setShowWebcam(false);
        }
      } finally {
          setIsSwitchingCamera(false);
      }
    }, [cleanupWebcam, toast]);
  
    useEffect(() => {
      if (showWebcam) {
        startWebcam(facingMode);
      } else {
        cleanupWebcam();
      }
      return () => {
          if (showWebcam) cleanupWebcam();
      };
    }, [showWebcam, facingMode, startWebcam, cleanupWebcam]);


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
  
  const resetFormState = useCallback(() => {
    setIsFormOpen(false);
    setCurrentEmployee({});
    setIsEditing(false);
    setProfilePictureFile(null);
    setProfilePicturePreview(null);
    setAssociatedFile(null);
    setShowWebcam(false);
    setHasCameraPermission(null);
    cleanupWebcam();
  }, [cleanupWebcam]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.companyId) {
        toast({ title: "Authentication Error", description: "User not authenticated.", variant: "destructive" });
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
        const employeeDocId = currentEmployee.id || doc(collection(db, 'employees')).id;

        // Clone current employee to avoid mutating state directly
        const updatedEmployeeData: any = { ...currentEmployee };

        // Handle Profile Picture
        if (profilePictureFile) { 
            const oldPath = isEditing ? currentEmployee.profilePictureStoragePath : undefined;
            if (oldPath) {
                await deleteFileFromStorage(oldPath).catch(e => console.warn("Old profile pic deletion failed, continuing...", e));
            }
            const fileExtension = profilePictureFile.name.split('.').pop() || 'jpeg';
            const newPath = `employees/${user.companyId}/${employeeDocId}/profileImage.${fileExtension}`;
            const newUrl = await uploadFileToStorage(profilePictureFile, newPath);
            updatedEmployeeData.profilePictureUrl = newUrl;
            updatedEmployeeData.profilePictureStoragePath = newPath;
        } else if (isEditing && currentEmployee.profilePictureUrl === undefined) { 
            const oldPath = currentEmployee.profilePictureStoragePath;
            if (oldPath) {
                await deleteFileFromStorage(oldPath).catch(e => console.warn("Profile pic deletion failed, continuing...", e));
            }
            updatedEmployeeData.profilePictureUrl = '';
            updatedEmployeeData.profilePictureStoragePath = '';
        }

        // Handle Associated File
        if (associatedFile) {
            const oldPath = isEditing ? currentEmployee.associatedFileStoragePath : undefined;
            if (oldPath) {
                await deleteFileFromStorage(oldPath).catch(e => console.warn("Old assoc. file deletion failed, continuing...", e));
            }
            const newPath = `employees/${user.companyId}/${employeeDocId}/associatedFiles/${associatedFile.name}`;
            const newUrl = await uploadFileToStorage(associatedFile, newPath);
            updatedEmployeeData.associatedFileUrl = newUrl;
            updatedEmployeeData.associatedFileStoragePath = newPath;
            updatedEmployeeData.associatedFileName = associatedFile.name;
        } else if (isEditing && currentEmployee.associatedFileUrl === undefined) {
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
            companyId: user.companyId,
            profilePictureUrl: updatedEmployeeData.profilePictureUrl || '',
            profilePictureStoragePath: updatedEmployeeData.profilePictureStoragePath || '',
            associatedFileUrl: updatedEmployeeData.associatedFileUrl || '',
            associatedFileName: updatedEmployeeData.associatedFileName || '',
            associatedFileStoragePath: updatedEmployeeData.associatedFileStoragePath || '',
        };

        if (isEditing && currentEmployee.id) {
            const employeeRef = doc(db, 'employees', currentEmployee.id);
            await updateDoc(employeeRef, { ...dataToSave, updatedAt: serverTimestamp() });
            toast({ title: "Employee Updated" });
        } else {
            const newEmployeeRef = doc(db, 'employees', employeeDocId);
            await setDoc(newEmployeeRef, { 
                ...dataToSave, 
                createdAt: serverTimestamp(),
                addedById: user.uid,
                addedBy: user.displayName || user.email || 'System'
            });
            toast({ title: "Employee Added" });
        }
    
        fetchEmployees();
        resetFormState();

    } catch (error: any) {
        console.error("Error saving employee:", error);
        toast({ title: "Save Failed", description: `An unexpected error occurred: ${error.message}`, variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  const handleCreateNew = () => {
    setCurrentEmployee({ salary: '' });
    setProfilePictureFile(null);
    setProfilePicturePreview(null);
    setAssociatedFile(null);
    setShowWebcam(false);
    setIsEditing(false);
    setIsFormOpen(true);
  };

  const handleEditEmployee = (employee: EmployeeDisplay) => {
    setCurrentEmployee({ ...employee, salary: employee.salary.toString() });
    setProfilePicturePreview(employee.profilePictureUrl || null);
    setProfilePictureFile(null);
    setAssociatedFile(null);
    setShowWebcam(false);
    setIsEditing(true);
    setIsFormOpen(true);
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

      if(showWebcam) setShowWebcam(false); 

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


  const handleCapturePhoto = () => {
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

      setShowWebcam(false);
    } else {
      toast({title: "Webcam Error", description: "Webcam not ready or stream not available.", variant: "destructive"});
    }
  };

  const handleRemoveProfilePic = () => {
    setProfilePictureFile(null);
    setProfilePicturePreview(null);
    if (isEditing) {
        setCurrentEmployee(prev => ({...prev, profilePictureUrl: undefined, profilePictureStoragePath: prev.profilePictureStoragePath ? prev.profilePictureStoragePath : undefined }));
    }
  };

  const handleRemoveAssociatedFile = () => {
    setAssociatedFile(null);
     if (isEditing) {
        setCurrentEmployee(prev => ({...prev, associatedFileUrl: undefined, associatedFileName: undefined, associatedFileStoragePath: prev.associatedFileStoragePath ? prev.associatedFileStoragePath : undefined }));
    }
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


  if (authIsLoading) {
    return ( <div className="flex items-center justify-center h-[calc(100vh-200px)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /> <p className="ml-2">Loading authentication...</p></div> );
  }

  if (!user && !authIsLoading) {
     return (
      <div className="space-y-6">
        <PageTitle title="Employees" subtitle="Manage your team members." icon={Users2} />
        <Card className="shadow-lg">
          <CardHeader><CardTitle>Access Denied</CardTitle></CardHeader>
          <CardContent><p>Please sign in to manage employees.</p></CardContent>
        </Card>
      </div>
    )
  }


  return (
    <div className="space-y-6">
      <PageTitle title="Employees" subtitle="Manage your team members." icon={Users2}>
        <Button onClick={handleCreateNew} disabled={isSaving || isLoadingEmployees}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Employee
        </Button>
      </PageTitle>

      <Table>
        <TableCaption>{employees.length === 0 && !isLoadingEmployees ? "No employees found." : "A list of your employees."}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">Avatar</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Position</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Added By</TableHead>
            <TableHead className="text-right">Salary</TableHead>
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

          {!isLoadingEmployees && employees.map((employee) => (
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
              <TableCell className="text-right">{currency}{employee.salary.toLocaleString()}</TableCell>
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

      <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) resetFormState(); else setIsFormOpen(true); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-headline">{isEditing ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
            <DialogDescription>{isEditing ? 'Update employee details.' : 'Fill in new employee details.'}</DialogDescription>
          </DialogHeader>
          
          <form id="employeeDialogForm" onSubmit={handleFormSubmit} className="space-y-3 py-1 overflow-y-auto flex-grow pr-3 pl-1">
            <div>
              <Label htmlFor="nameEmp">Full Name</Label>
              <Input id="nameEmp" name="name" value={currentEmployee.name || ''} onChange={handleInputChange} required disabled={isSaving} />
            </div>
            <div>
              <Label htmlFor="positionEmp">Position / Role</Label>
              <Input id="positionEmp" name="position" value={currentEmployee.position || ''} onChange={handleInputChange} required disabled={isSaving} />
            </div>
            <div>
              <Label htmlFor="salaryEmp">Annual Salary ({currency})</Label>
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
                        <Input id="profilePictureFile" type="file" accept="image/*" onChange={handleProfilePictureFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={isSaving || showWebcam}/>
                    </div>
                    <div className="flex gap-1.5">
                        <Button type="button" variant="outline" size="sm" onClick={() => setShowWebcam(prev => !prev)} disabled={isSaving} className="flex-1 text-xs">
                        <Camera className="mr-1.5 h-3.5 w-3.5" /> {showWebcam ? 'Close Cam' : 'Webcam'}
                        </Button>
                        {(profilePicturePreview || (isEditing && currentEmployee.profilePictureUrl)) && (
                        <Button type="button" variant="ghost" size="sm" onClick={handleRemoveProfilePic} className="text-destructive hover:text-destructive-foreground hover:bg-destructive/90 flex-1 text-xs">
                            <XCircle className="mr-1.5 h-3.5 w-3.5" /> Remove
                        </Button>
                        )}
                    </div>
                    </div>
                </div>
                {showWebcam && (
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
                        <Button type="button" onClick={handleCapturePhoto} className="flex-1 h-9 text-xs" disabled={isSaving || isSwitchingCamera}>
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
                 <Button type="button" variant="outline" onClick={resetFormState} disabled={isSaving}>Cancel</Button>
              </DialogClose>
              <Button type="submit" form="employeeDialogForm" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isSaving ? 'Saving...' : (isEditing ? 'Save Changes' : 'Add Employee')}
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
