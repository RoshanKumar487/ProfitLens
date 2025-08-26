
'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users2, MoreHorizontal, PlusCircle, Edit, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { deleteEmployee } from './actions';

export interface EmployeeDisplay {
  id: string;
  name: string;
  position: string;
  salary: number;
  description?: string;
  profilePictureUrl?: string;
}

const MOCK_EMPLOYEES: EmployeeDisplay[] = [
    { id: '1', name: 'Alice Johnson', position: 'Software Engineer', salary: 95000, description: 'Frontend specialist' },
    { id: '2', name: 'Bob Williams', position: 'Project Manager', salary: 110000, description: 'Leads the core product team' },
    { id: '3', name: 'Charlie Brown', position: 'UX/UI Designer', salary: 85000, description: 'Focuses on mobile application design' },
];


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
  const { toast } = useToast();
  const [employees, setEmployees] = useState<EmployeeDisplay[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);

  useEffect(() => {
    setIsLoadingEmployees(true);
    // Simulate fetching data
    setTimeout(() => {
        setEmployees(MOCK_EMPLOYEES);
        setIsLoadingEmployees(false);
    }, 1000);
  }, []);

  const handleDelete = async (employeeId: string, employeeName: string) => {
    const originalEmployees = [...employees];
    setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
    toast({ title: 'Employee Deleted', description: `${employeeName} has been removed (mock).` });
  }

  if (authIsLoading) {
    return ( <div className="flex items-center justify-center h-[calc(100vh-200px)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div> );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageTitle title="Employees" subtitle="Manage your team members, documents, and bio-data." icon={Users2}>
        <Button asChild>
          <Link href="/employees/new/edit"><PlusCircle className="mr-2 h-4 w-4" /> Add Employee</Link>
        </Button>
      </PageTitle>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>A list of all employees in your company.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>{!isLoadingEmployees && employees.length === 0 ? "No employees found." : `A list of your employees.`}</TableCaption>
            <TableHeader><TableRow><TableHead className="w-[60px]">Avatar</TableHead><TableHead>Name</TableHead><TableHead>Position</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Salary</TableHead><TableHead className="text-right w-[100px]">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoadingEmployees && ([...Array(3)].map((_, i) => (<TableRow key={`skel-${i}`}><TableCell><Skeleton className="h-10 w-10 rounded-full" /></TableCell><TableCell><Skeleton className="h-4 w-3/4" /></TableCell><TableCell><Skeleton className="h-4 w-1/2" /></TableCell><TableCell><Skeleton className="h-4 w-3/4" /></TableCell><TableCell className="text-right"><Skeleton className="h-4 w-1/4 ml-auto" /></TableCell><TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell></TableRow>)))}
              {!isLoadingEmployees && employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell><Avatar className="h-10 w-10"><AvatarImage src={employee.profilePictureUrl || `https://placehold.co/40x40.png?text=${getInitials(employee.name)}`} alt={employee.name} data-ai-hint="person portrait" /><AvatarFallback>{getInitials(employee.name)}</AvatarFallback></Avatar></TableCell>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>{employee.position}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground" title={employee.description}>{employee.description || '-'}</TableCell>
                  <TableCell className="text-right">{currencySymbol}{employee.salary.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                       <DropdownMenuContent align="end">
                         <DropdownMenuItem asChild><Link href={`/employees/${employee.id}`}><Users2 className="mr-2 h-4 w-4" />View Bio-Data</Link></DropdownMenuItem>
                         <DropdownMenuSeparator />
                         <DropdownMenuItem asChild><Link href={`/employees/${employee.id}/edit`}><Edit className="mr-2 h-4 w-4" />Edit Details</Link></DropdownMenuItem>
                         <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(employee.id, employee.name)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                       </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
