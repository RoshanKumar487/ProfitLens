
'use client';

import React, { useState } from 'react';
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
import { Users2, MoreHorizontal } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface EmployeeDisplay {
  id: string;
  name: string;
  position: string;
  salary: number;
  description?: string;
  profilePictureUrl?: string;
}

const MOCK_EMPLOYEES: EmployeeDisplay[] = [
    { id: '1', name: 'Alice Johnson', position: 'Software Engineer', salary: 95000, description: 'Frontend specialist with 5 years of experience.' },
    { id: '2', name: 'Bob Williams', position: 'Project Manager', salary: 105000, description: 'Manages the core product development team.' },
    { id: '3', name: 'Charlie Brown', position: 'UX/UI Designer', salary: 85000, description: 'Focuses on user experience and interface design.' },
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
  const [employees] = useState<EmployeeDisplay[]>(MOCK_EMPLOYEES);
  const isLoadingEmployees = false;

  if (authIsLoading) {
    return ( <div className="flex items-center justify-center h-[calc(100vh-200px)]"><Skeleton className="h-12 w-12" /></div> );
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
      <PageTitle title="Employees" subtitle="Manage your team members." icon={Users2} />

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>This is a read-only view of your employees' information.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>{!isLoadingEmployees && employees.length === 0 ? "No employees found." : `A list of your employees.`}</TableCaption>
            <TableHeader><TableRow><TableHead className="w-[60px]">Avatar</TableHead><TableHead>Name</TableHead><TableHead>Position</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Salary</TableHead><TableHead className="text-right w-[100px]">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoadingEmployees && employees.length === 0 && ([...Array(3)].map((_, i) => (<TableRow key={`skel-${i}`}><TableCell><Skeleton className="h-10 w-10 rounded-full" /></TableCell><TableCell><Skeleton className="h-4 w-3/4" /></TableCell><TableCell><Skeleton className="h-4 w-1/2" /></TableCell><TableCell><Skeleton className="h-4 w-3/4" /></TableCell><TableCell className="text-right"><Skeleton className="h-4 w-1/4 ml-auto" /></TableCell><TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell></TableRow>)))}
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
                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                       <DropdownMenuContent align="end">
                         <DropdownMenuItem disabled>Edit</DropdownMenuItem>
                         <DropdownMenuItem disabled className="text-destructive">Delete</DropdownMenuItem>
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
