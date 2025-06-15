
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users2, PlusCircle, MoreHorizontal, Edit, Trash2, Loader2, Save, Camera, UploadCloud, FileText, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, Timestamp, serverTimestamp, writeBatch } from 'firebase/firestore';
import { uploadFileToStorage, deleteFileFromStorage } from '@/lib/firebaseStorageUtils';
import { Skeleton } from '@/components/ui/skeleton';

interface EmployeeFirestore {
  id?: string;
  name: string;
  position: string;
  salary: number;
  description?: string;
  profilePictureUrl?: string;
  profilePictureStoragePath?: string; // To store the actual path for easier deletion
  associatedFileUrl?: string;
  associatedFileName?: string;
  associatedFileStoragePath?: string; // To store the actual path
  companyId: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

interface EmployeeDisplay extends Omit<EmployeeFirestore, 'createdAt' | 'updatedAt' | 'companyId'> {
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

  const cleanupWebcam = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    // Don't hide webcam here, let the button do it
  }, []);

  useEffect(() => {
    if (showWebcam) {
      const getCameraPermission = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
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
          setShowWebcam(false); 
        }
      };
      getCameraPermission();
    } else {
      cleanupWebcam();
    }
    // Only cleanup on unmount if webcam was shown
    return () => { if (showWebcam) cleanupWebcam();};
  }, [showWebcam, toast, cleanupWebcam]);


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
  }, [user, user?.companyId, authIsLoading, toast]);

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
    e.preventDefault(); // Important if button is type="submit"
    if (!user || !user.companyId) {
      toast({ title: "Authentication Error", variant: "destructive" });
      return;
    }
    if (!currentEmployee.name || !currentEmployee.position || currentEmployee.salary === undefined) {
      toast({ title: "Missing Information", description: "Name, position, and salary are required.", variant: "destructive" });
      return;
    }

    const salaryNum = Number(currentEmployee.salary);
    if (isNaN(salaryNum) || salaryNum < 0) {
        toast({ title: "Invalid Salary", variant: "destructive"});
        return;
    }

    setIsSaving(true);
    let newProfilePicUrl = currentEmployee.profilePictureUrl || '';
    let newProfilePicStoragePath = currentEmployee.profilePictureStoragePath || '';
    let newAssociatedFileUrl = currentEmployee.associatedFileUrl || '';
    let newAssociatedFileName = currentEmployee.associatedFileName || '';
    let newAssociatedFileStoragePath = currentEmployee.associatedFileStoragePath || '';

    // Use existing ID if editing, otherwise generate a new one for path construction
    const employeeDocId = currentEmployee.id || doc(collection(db, 'employees')).id;

    try {
      if (profilePictureFile) {
        // Delete old file if it exists and a new one is being uploaded
        if (isEditing && currentEmployee.profilePictureStoragePath) {
          await deleteFileFromStorage(currentEmployee.profilePictureStoragePath).catch(err => console.warn("Old profile pic deletion failed (might not exist):", err));
        }
        const fileExtension = profilePictureFile.name.split('.').pop() || 'png';
        newProfilePicStoragePath = `employees/${user.companyId}/${employeeDocId}/profileImage.${fileExtension}`;
        newProfilePicUrl = await uploadFileToStorage(profilePictureFile, newProfilePicStoragePath);
      } else if (isEditing && currentEmployee.profilePictureUrl === undefined && currentEmployee.profilePictureStoragePath) {
        // This means "Remove" was clicked and there was an existing image
        await deleteFileFromStorage(currentEmployee.profilePictureStoragePath).catch(err => console.warn("Profile pic deletion failed (might not exist):", err));
        newProfilePicUrl = '';
        newProfilePicStoragePath = '';
      }


      if (associatedFile) {
        if (isEditing && currentEmployee.associatedFileStoragePath) {
          await deleteFileFromStorage(currentEmployee.associatedFileStoragePath).catch(err => console.warn("Old associated file deletion failed:", err));
        }
        newAssociatedFileStoragePath = `employees/${user.companyId}/${employeeDocId}/associatedFiles/${associatedFile.name}`;
        newAssociatedFileUrl = await uploadFileToStorage(associatedFile, newAssociatedFileStoragePath);
        newAssociatedFileName = associatedFile.name;
      } else if (isEditing && currentEmployee.associatedFileUrl === undefined && currentEmployee.associatedFileStoragePath) {
        await deleteFileFromStorage(currentEmployee.associatedFileStoragePath).catch(err => console.warn("Associated file deletion failed:", err));
        newAssociatedFileUrl = '';
        newAssociatedFileName = '';
        newAssociatedFileStoragePath = '';
      }

      const employeeDataToSave: Omit<EmployeeFirestore, 'id' | 'createdAt' | 'updatedAt'> = {
        name: currentEmployee.name!,
        position: currentEmployee.position!,
        salary: salaryNum,
        description: currentEmployee.description || '',
        profilePictureUrl: newProfilePicUrl,
        profilePictureStoragePath: newProfilePicStoragePath,
        associatedFileUrl: newAssociatedFileUrl,
        associatedFileName: newAssociatedFileName,
        associatedFileStoragePath: newAssociatedFileStoragePath,
        companyId: user.companyId,
      };

      if (isEditing && currentEmployee.id) {
        const employeeRef = doc(db, 'employees', currentEmployee.id);
        await updateDoc(employeeRef, { ...employeeDataToSave, updatedAt: serverTimestamp() });
        toast({ title: "Employee Updated" });
      } else {
        // For new employee, use the pre-generated employeeDocId
        const newEmployeeRef = doc(db, 'employees', employeeDocId);
        // Use setDoc with the new ref, or addDoc and then update if ID is needed before file paths.
        // Simpler: use addDoc and let Firestore generate ID, then update with storage paths if needed,
        // but paths depend on ID. So pre-generating ID or two-step save is better.
        // For now, assume employeeDocId is what we'll use.
        // If addDoc is preferred, upload logic needs to handle docRef.id after initial save.
        // Let's stick to addDoc for simplicity and potentially update storage paths later if needed (more complex).
        // For now, using employeeDocId might lead to empty docs if file upload fails.
        // A safer way: save basic data, get ID, upload files, then update doc with URLs.
        // Simplified: save all at once.
        await addDoc(collection(db, 'employees'), { ...employeeDataToSave, createdAt: serverTimestamp() });
        toast({ title: "Employee Added" });
      }
      
      fetchEmployees();
      resetFormState();
    } catch (error: any) {
      console.error("Error saving employee:", error);
      toast({ title: "Save Failed", description: error.message, variant: "destructive" });
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
    if (!employeeToDeleteId) return;
    setIsSaving(true);
    try {
      const employeeToDelete = employees.find(emp => emp.id === employeeToDeleteId);
      if (employeeToDelete) {
        if (employeeToDelete.profilePictureStoragePath) {
          await deleteFileFromStorage(employeeToDelete.profilePictureStoragePath).catch(e => console.warn("Failed to delete profile pic from storage", e));
        }
        if (employeeToDelete.associatedFileStoragePath) {
          await deleteFileFromStorage(employeeToDelete.associatedFileStoragePath).catch(e => console.warn("Failed to delete associated file from storage", e));
        }
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

  const handleProfilePictureFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ title: "File Too Large", description: "Profile picture must be less than 5MB.", variant: "destructive"});
        e.target.value = ""; // Reset file input
        return;
      }
      setProfilePictureFile(file);
      const reader = new FileReader();
      reader.onloadend = () => { setProfilePicturePreview(reader.result as string); };
      reader.readAsDataURL(file);
      if(showWebcam) setShowWebcam(false); 
    }
  };
  
  const handleAssociatedFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
       if (file.size > 10 * 1024 * 1024) { // 10MB limit for associated files
        toast({ title: "File Too Large", description: "Associated file must be less than 10MB.", variant: "destructive"});
        e.target.value = ""; // Reset file input
        return;
      }
      setAssociatedFile(file);
    }
  };

  const handleCapturePhoto = () => {
    if (videoRef.current && canvasRef.current && videoRef.current.readyState >= videoRef.current.HAVE_METADATA) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        if (blob) {
          const capturedFile = new File([blob], `webcam_capture_${Date.now()}.png`, { type: 'image/png' });
          setProfilePictureFile(capturedFile);
          setProfilePicturePreview(canvas.toDataURL('image/png'));
        }
      }, 'image/png');
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
    toast({ title: "Profile picture selection cleared."});
  };

  const handleRemoveAssociatedFile = () => {
    setAssociatedFile(null);
     if (isEditing) {
        setCurrentEmployee(prev => ({...prev, associatedFileUrl: undefined, associatedFileName: undefined, associatedFileStoragePath: prev.associatedFileStoragePath ? prev.associatedFileStoragePath : undefined }));
    }
    toast({ title: "Associated file selection cleared."});
  };

  if (isLoadingEmployees && employees.length === 0 && authIsLoading) {
    return ( <div className="flex items-center justify-center h-[calc(100vh-200px)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div> );
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
                <TableCell className="text-right"><Skeleton className="h-4 w-1/4 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-4 w-1/2" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
              </TableRow>
            ))
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
              <TableCell className="text-right">${employee.salary.toLocaleString()}</TableCell>
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
              <Label htmlFor="salaryEmp">Annual Salary ($)</Label>
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
                  <Input id="profilePictureFile" type="file" accept="image/*" onChange={handleProfilePictureFileChange} className="text-xs h-9" disabled={isSaving || showWebcam}/>
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
                    <Alert variant="destructive" className="p-2 text-xs"><Camera className="h-3.5 w-3.5"/><AlertTitle className="text-xs">Cam Access Denied</AlertTitle><AlertDescription className="text-xs">Enable in browser.</AlertDescription></Alert>
                  )}
                  {hasCameraPermission === true && (
                    <Button type="button" onClick={handleCapturePhoto} className="w-full h-9 text-xs" disabled={isSaving}><Camera className="mr-1.5 h-3.5 w-3.5" /> Capture</Button>
                  )}
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

             <div className="space-y-1.5 pt-2 border-t">
                <Label htmlFor="associatedFile">Associated File (e.g., Resume)</Label>
                <Input id="associatedFile" type="file" onChange={handleAssociatedFileChange} className="text-xs h-9" disabled={isSaving}/>
                {associatedFile && <p className="text-xs text-muted-foreground">Selected: {associatedFile.name}</p> }
                {!associatedFile && currentEmployee.associatedFileName && currentEmployee.associatedFileUrl && (
                    <div className="text-xs text-muted-foreground flex items-center justify-between">
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
