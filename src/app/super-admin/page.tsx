
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, query, getDocs, orderBy, Timestamp, limit, startAfter, endBefore, limitToLast, type QueryDocumentSnapshot, type DocumentData } from 'firebase/firestore';
import PageTitle from '@/components/PageTitle';
import DataCard from '@/components/DataCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Crown, Building, Users, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

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

const RECORDS_PER_PAGE = 20;

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
  const [totalCompanies, setTotalCompanies] = useState(0);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [companiesPage, setCompaniesPage] = useState(1);
  const [companiesFirstVisible, setCompaniesFirstVisible] = useState<QueryDocumentSnapshot | null>(null);
  const [companiesLastVisible, setCompaniesLastVisible] = useState<QueryDocumentSnapshot | null>(null);

  const [employeesPage, setEmployeesPage] = useState(1);
  const [employeesFirstVisible, setEmployeesFirstVisible] = useState<QueryDocumentSnapshot | null>(null);
  const [employeesLastVisible, setEmployeesLastVisible] = useState<QueryDocumentSnapshot | null>(null);


  const fetchPaginatedData = useCallback(async (
    collectionName: string,
    orderByField: string,
    page: number,
    direction: 'next' | 'prev' | 'reset',
    firstVisible: QueryDocumentSnapshot | null,
    lastVisible: QueryDocumentSnapshot | null,
    setData: React.Dispatch<React.SetStateAction<any[]>>,
    setFirst: React.Dispatch<React.SetStateAction<QueryDocumentSnapshot | null>>,
    setLast: React.Dispatch<React.SetStateAction<QueryDocumentSnapshot | null>>
  ) => {
    let q;
    const baseQuery = [orderBy(orderByField, 'desc')];
    const collectionRef = collection(db, collectionName);

    if (direction === 'next' && lastVisible) {
      q = query(collectionRef, ...baseQuery, startAfter(lastVisible), limit(RECORDS_PER_PAGE));
    } else if (direction === 'prev' && firstVisible) {
      q = query(collectionRef, ...baseQuery, endBefore(firstVisible), limitToLast(RECORDS_PER_PAGE));
    } else {
      q = query(collectionRef, ...baseQuery, limit(RECORDS_PER_PAGE));
    }

    const snapshot = await getDocs(q);
    const fetchedData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: (doc.data().createdAt as Timestamp).toDate(),
    }));
    
    if (fetchedData.length > 0) {
      setData(fetchedData);
      setFirst(snapshot.docs[0]);
      setLast(snapshot.docs[snapshot.docs.length - 1]);
    }

    return fetchedData;
  }, []);

  const handleCompaniesPageChange = async (direction: 'next' | 'prev') => {
    await fetchPaginatedData('companyProfiles', 'createdAt', companiesPage, direction, companiesFirstVisible, companiesLastVisible, setCompanies, setCompaniesFirstVisible, setCompaniesLastVisible);
    setCompaniesPage(p => direction === 'next' ? p + 1 : p - 1);
  };
  
  const handleEmployeesPageChange = async (direction: 'next' | 'prev') => {
    const fetchedEmployees = await fetchPaginatedData('employees', 'createdAt', employeesPage, direction, employeesFirstVisible, employeesLastVisible, setEmployees, setEmployeesFirstVisible, setEmployeesLastVisible);
    setEmployeesPage(p => direction === 'next' ? p + 1 : p - 1);
    
    // Enrich employees with company names
    const companyIds = [...new Set(fetchedEmployees.map(e => e.companyId))];
    if (companyIds.length > 0) {
      const companiesQuery = query(collection(db, 'companyProfiles'), where('__name__', 'in', companyIds));
      const companiesSnapshot = await getDocs(companiesQuery);
      const companyMap = new Map(companiesSnapshot.docs.map(doc => [doc.id, doc.data().name]));
      setEmployees(prev => prev.map(e => ({...e, companyName: companyMap.get(e.companyId) || 'Unknown'})));
    }
  };


  useEffect(() => {
    if (!user?.isSuperAdmin) {
      setIsLoadingData(false);
      return;
    }

    const fetchData = async () => {
      setIsLoadingData(true);
      try {
        const companiesCol = collection(db, 'companyProfiles');
        const employeesCol = collection(db, 'employees');

        const [companiesSnapshot, employeesSnapshot, allCompanies, allEmployees] = await Promise.all([
            getDocs(query(companiesCol, orderBy('createdAt', 'desc'), limit(RECORDS_PER_PAGE))),
            getDocs(query(employeesCol, orderBy('createdAt', 'desc'), limit(RECORDS_PER_PAGE))),
            getDocs(query(companiesCol)), // For total count
            getDocs(query(employeesCol)) // For total count
        ]);

        setTotalCompanies(allCompanies.size);
        setTotalEmployees(allEmployees.size);

        if (companiesSnapshot.docs.length > 0) {
            setCompaniesFirstVisible(companiesSnapshot.docs[0]);
            setCompaniesLastVisible(companiesSnapshot.docs[companiesSnapshot.docs.length - 1]);
        }
        const fetchedCompanies = companiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: (doc.data().createdAt as Timestamp).toDate() } as Company));
        setCompanies(fetchedCompanies);

        const companyMap = new Map(fetchedCompanies.map(c => [c.id, c.name]));

        if (employeesSnapshot.docs.length > 0) {
            setEmployeesFirstVisible(employeesSnapshot.docs[0]);
            setEmployeesLastVisible(employeesSnapshot.docs[employeesSnapshot.docs.length - 1]);
        }
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
            <DataCard title="Total Companies" value={totalCompanies.toLocaleString()} icon={Building} />
            <DataCard title="Total Employees" value={totalEmployees.toLocaleString()} icon={Users} />
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
            <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-muted-foreground">
                    Page {companiesPage}
                </div>
                <Pagination>
                    <PaginationContent>
                        <PaginationItem><PaginationPrevious href="#" onClick={(e) => {e.preventDefault(); handleCompaniesPageChange('prev')}} className={companiesPage === 1 ? 'pointer-events-none opacity-50' : ''}/></PaginationItem>
                        <PaginationItem><PaginationNext href="#" onClick={(e) => {e.preventDefault(); handleCompaniesPageChange('next')}} className={companies.length < RECORDS_PER_PAGE ? 'pointer-events-none opacity-50' : ''}/></PaginationItem>
                    </PaginationContent>
                </Pagination>
            </div>
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
            <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-muted-foreground">
                    Page {employeesPage}
                </div>
                <Pagination>
                    <PaginationContent>
                        <PaginationItem><PaginationPrevious href="#" onClick={(e) => {e.preventDefault(); handleEmployeesPageChange('prev')}} className={employeesPage === 1 ? 'pointer-events-none opacity-50' : ''}/></PaginationItem>
                        <PaginationItem><PaginationNext href="#" onClick={(e) => {e.preventDefault(); handleEmployeesPageChange('next')}} className={employees.length < RECORDS_PER_PAGE ? 'pointer-events-none opacity-50' : ''}/></PaginationItem>
                    </PaginationContent>
                </Pagination>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
