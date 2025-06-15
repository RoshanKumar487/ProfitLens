
'use client';

import React, { useState, useEffect, FormEvent, useCallback } from 'react';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users2, PlusCircle, MoreHorizontal, Edit, Trash2, Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, Timestamp, serverTimestamp } from 'firebase/firestore';

interface EmployeeFirestore {
  id?: string; // Firestore document ID
  name: string;
  position: string;
  salary: number;
  description?: string;
  profilePictureUrl?: string; // For future use
  companyId: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

interface EmployeeDisplay extends Omit<EmployeeFirestore, 'createdAt' | 'updatedAt' | 'companyId' | 'profilePictureUrl'> {
  id: string;
  profilePictureUrl?: string; // For future use
  createdAt: Date; // For display
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

  const fetchEmployees = useCallback(async () => {
    if (authIsLoading) {
      setIsLoadingEmployees(true);
      return;
    }
    if (!user || !user.companyId) {
      setIsLoadingEmployees(false);
      setEmployees([]);
      console.log("Employees: User or companyId not found.");
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
          createdAt: data.createdAt.toDate(),
        };
      });
      setEmployees(fetchedEmployees);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      toast({
        title: 'Error Loading Employees',
        description: error.message || 'Could not load employees.',
        variant: 'destructive',
      });
      setEmployees([]);
    } finally {
      setIsLoadingEmployees(false);
    }
  }, [user, user?.companyId, authIsLoading, toast]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

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
    const employeeDataToSave = {
      name: currentEmployee.name,
      position: currentEmployee.position,
      salary: salaryNum,
      description: currentEmployee.description || '',
      profilePictureUrl: currentEmployee.profilePictureUrl || '', // Placeholder for now
      companyId: user.companyId,
    };

    try {
      if (isEditing && currentEmployee.id) {
        const employeeRef = doc(db, 'employees', currentEmployee.id);
        await updateDoc(employeeRef, { ...employeeDataToSave, updatedAt: serverTimestamp() });
        toast({ title: "Employee Updated", description: `"${employeeDataToSave.name}" has been updated.` });
      } else {
        await addDoc(collection(db, 'employees'), { ...employeeDataToSave, createdAt: serverTimestamp() });
        toast({ title: "Employee Added", description: `"${employeeDataToSave.name}" has been added.` });
      }
      fetchEmployees();
      setIsFormOpen(false);
      setCurrentEmployee({});
      setIsEditing(false);
    } catch (error: any)      {
      console.error("Error saving employee:", error);
      toast({ title: "Save Failed", description: `Could not save employee. ${error.message}`, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateNew = () => {
    setCurrentEmployee({ salary: '' }); // Initialize salary as empty string for input
    setIsEditing(false);
    setIsFormOpen(true);
  };

  const handleEditEmployee = (employee: EmployeeDisplay) => {
    setCurrentEmployee({ ...employee, salary: employee.salary.toString() }); // Convert salary to string for input
    setIsEditing(true);
    setIsFormOpen(true);
  };
  
  const promptDeleteEmployee = (id: string) => {
    setEmployeeToDeleteId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteEmployee = async () => {
    if (employeeToDeleteId) {
        setIsSaving(true); // Use general saving indicator for delete operations too
        try {
            const employeeRef = doc(db, 'employees', employeeToDeleteId);
            await deleteDoc(employeeRef);
            toast({ title: "Employee Deleted", description: "The employee record has been removed.", variant: "destructive"});
            fetchEmployees();
            setEmployeeToDeleteId(null);
        } catch (error: any) {
            console.error("Error deleting employee:", error);
            toast({ title: "Delete Failed", description: `Could not delete employee. ${error.message}`, variant: "destructive"});
        } finally {
            setIsSaving(false);
        }
    }
    setIsDeleteDialogOpen(false);
  };


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurrentEmployee(prev => ({ ...prev, [name]: value }));
  };


  if (isLoadingEmployees && employees.length === 0 && !authIsLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
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
            <TableHead className="w-[80px]">Avatar</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Position</TableHead>
            <TableHead className="text-right">Salary</TableHead>
            <TableHead className="text-right">Actions</TableHead>
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
                <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
              </TableRow>
            ))
          )}
          {!isLoadingEmployees && employees.map((employee) => (
            <TableRow key={employee.id}>
              <TableCell>
                <Avatar className="h-10 w-10">
                  {/* In future, replace AvatarImage src with employee.profilePictureUrl */}
                  <AvatarImage src={employee.profilePictureUrl || `https://placehold.co/40x40.png?text=${getInitials(employee.name)}`} alt={employee.name} data-ai-hint="person portrait" />
                  <AvatarFallback>{getInitials(employee.name)}</AvatarFallback>
                </Avatar>
              </TableCell>
              <TableCell className="font-medium">{employee.name}</TableCell>
              <TableCell>{employee.position}</TableCell>
              <TableCell className="text-right">${employee.salary.toLocaleString()}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isSaving}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEditEmployee(employee)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => promptDeleteEmployee(employee.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) { setCurrentEmployee({}); setIsEditing(false); }}}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-headline">{isEditing ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Update the details for this employee.' : 'Fill in the details for the new employee.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-4 py-2">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                value={currentEmployee.name || ''}
                onChange={handleInputChange}
                placeholder="e.g., Jane Doe"
                required
                disabled={isSaving}
              />
            </div>
            <div>
              <Label htmlFor="position">Position / Role</Label>
              <Input
                id="position"
                name="position"
                value={currentEmployee.position || ''}
                onChange={handleInputChange}
                placeholder="e.g., Software Engineer"
                required
                disabled={isSaving}
              />
            </div>
            <div>
              <Label htmlFor="salary">Annual Salary ($)</Label>
              <Input
                id="salary"
                name="salary"
                type="number"
                value={currentEmployee.salary === undefined ? '' : String(currentEmployee.salary)}
                onChange={handleInputChange}
                placeholder="e.g., 75000"
                required
                min="0"
                disabled={isSaving}
              />
            </div>
            <div>
              <Label htmlFor="description">Description / Notes (Optional)</Label>
              <Textarea
                id="description"
                name="description"
                value={currentEmployee.description || ''}
                onChange={handleInputChange}
                placeholder="e.g., Key responsibilities, team, etc."
                rows={3}
                disabled={isSaving}
              />
            </div>
            {/* Placeholder for future file uploads */}
            {/* 
            <div className="space-y-2">
                <Label>Profile Picture (Future Feature)</Label>
                <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" disabled>Capture via Webcam</Button>
                    <Input type="file" className="text-sm" disabled/>
                </div>
            </div>
             <div className="space-y-2">
                <Label>Associated File (e.g., Resume - Future Feature)</Label>
                <Input type="file" className="text-sm" disabled/>
            </div>
            */}
            <DialogFooter>
              <DialogClose asChild>
                 <Button type="button" variant="outline" onClick={() => { setIsFormOpen(false); setCurrentEmployee({}); setIsEditing(false); }} disabled={isSaving}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isSaving ? 'Saving...' : (isEditing ? 'Save Changes' : 'Add Employee')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the employee record.
            </AlertDialogDescription>
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
