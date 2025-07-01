
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, query, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import PageTitle from '@/components/PageTitle';
import DataCard from '@/components/DataCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Crown, Building, Users, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Company {
  id: string;
  name: string;
  email: string;
  adminUserId: string;
  createdAt: Date;
}

interface Employee {
  id: string;
  name: string;
  position: string;
  companyId: string;
  profilePictureUrl?: string;
  companyName?: string;
  createdAt: Date;
}

const getInitials = (name: string = "") => {
  const names = name.split(' ');
  let initials = names[0] ? names[0][0] : '';
  if (names.length > 1 && names[names.length - 1]) {
    initials += names[names.length - 1][0];
  }
  return initials.toUpperCase();
};

export default function SuperAdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (!user?.isSuperAdmin) {
      setIsLoadingData(false);
      return;
    }

    const fetchData = async () => {
      setIsLoadingData(true);
      try {
        const companiesQuery = query(collection(db, 'companyProfiles'), orderBy('createdAt', 'desc'));
        const employeesQuery = query(collection(db, 'employees'), orderBy('createdAt', 'desc'));

        const [companiesSnapshot, employeesSnapshot] = await Promise.all([
          getDocs(companiesQuery),
          getDocs(employeesQuery)
        ]);

        const fetchedCompanies = companiesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: (doc.data().createdAt as Timestamp).toDate(),
        } as Company));
        setCompanies(fetchedCompanies);

        const companyMap = new Map(fetchedCompanies.map(c => [c.id, c.name]));

        const fetchedEmployees = employeesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            companyName: companyMap.get(data.companyId) || 'Unknown Company',
            createdAt: (data.createdAt as Timestamp).toDate(),
          } as Employee;
        });
        setEmployees(fetchedEmployees);

      } catch (error) {
        console.error("Error fetching super admin data:", error);
      } finally {
        setIsLoadingData(false);
      }
    };

    if(user?.isSuperAdmin) {
        fetchData();
    }
  }, [user]);

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="flex justify-center items-center h-64 p-4 sm:p-6 lg:p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user?.isSuperAdmin) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <PageTitle title="Access Denied" icon={Crown} />
        <Card>
          <CardHeader>
            <CardTitle>Permission Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You do not have permission to view this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageTitle title="Super Admin Dashboard" subtitle="Platform-wide overview of all companies and users." icon={Crown} />

      {isLoadingData ? (
         <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-[100px]" />
            <Skeleton className="h-[100px]" />
         </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
            <DataCard title="Total Companies" value={companies.length.toLocaleString()} icon={Building} />
            <DataCard title="Total Employees" value={employees.length.toLocaleString()} icon={Users} />
        </div>
      )}
      

      <Card>
        <CardHeader>
          <CardTitle>Registered Companies</CardTitle>
          <CardDescription>List of all companies on the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company Name</TableHead>
                <TableHead>Admin Email</TableHead>
                <TableHead>Registered On</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingData ? (
                [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    </TableRow>
                ))
              ) : companies.length > 0 ? companies.map(company => (
                <TableRow key={company.id}>
                  <TableCell className="font-medium">{company.name}</TableCell>
                  <TableCell>{company.email}</TableCell>
                  <TableCell>{format(company.createdAt, 'PPp')}</TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={3} className="text-center">No companies found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Employees</CardTitle>
          <CardDescription>List of all employees across all companies.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Added On</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingData ? (
                 [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    </TableRow>
                ))
              ) : employees.length > 0 ? employees.map(employee => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={employee.profilePictureUrl} />
                        <AvatarFallback>{getInitials(employee.name)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{employee.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{employee.position}</TableCell>
                  <TableCell>{employee.companyName}</TableCell>
                  <TableCell>{format(employee.createdAt, 'PP')}</TableCell>
                </TableRow>
              )) : (
                 <TableRow><TableCell colSpan={4} className="text-center">No employees found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
