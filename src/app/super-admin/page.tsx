
'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import PageTitle from '@/components/PageTitle';
import DataCard from '@/components/DataCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Crown, Building, Users } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MOCK_COMPANIES, MOCK_SUPER_ADMIN_EMPLOYEES } from '@/lib/mock-data';


const getInitials = (name: string = "") => {
  const names = name.split(' ');
  let initials = names[0] ? names[0][0] : '';
  if (names.length > 1 && names[names.length - 1]) {
    initials += names[names.length - 1][0];
  }
  return initials.toUpperCase();
};

export default function SuperAdminPage() {
  const { user } = useAuth();

  if (!user?.isSuperAdmin) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <PageTitle title="Access Denied" icon={Crown} /><Card><CardHeader><CardTitle>Permission Required</CardTitle></CardHeader><CardContent><p>You do not have permission to view this page.</p></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageTitle title="Super Admin Dashboard" subtitle="Platform-wide overview of all companies and users." icon={Crown} />

      <div className="grid gap-6 md:grid-cols-2">
          <DataCard title="Total Companies" value={MOCK_COMPANIES.length.toLocaleString()} icon={Building} />
          <DataCard title="Total Employees" value={MOCK_SUPER_ADMIN_EMPLOYEES.length.toLocaleString()} icon={Users} />
      </div>
      
      <Card>
          <CardHeader><CardTitle>Registered Companies</CardTitle></CardHeader>
          <CardContent>
              <Table>
                  <TableHeader><TableRow><TableHead>Company Name</TableHead><TableHead>Admin Email</TableHead></TableRow></TableHeader>
                  <TableBody>
                      {MOCK_COMPANIES.map(company => (
                          <TableRow key={company.id}>
                              <TableCell className="font-medium">{company.name}</TableCell>
                              <TableCell>{company.email}</TableCell>
                          </TableRow>
                      ))}
                  </TableBody>
              </Table>
          </CardContent>
      </Card>
      
       <Card>
          <CardHeader><CardTitle>All Employees</CardTitle></CardHeader>
          <CardContent>
              <Table>
                  <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Position</TableHead><TableHead>Company</TableHead></TableRow></TableHeader>
                  <TableBody>
                      {MOCK_SUPER_ADMIN_EMPLOYEES.map(employee => (
                          <TableRow key={employee.id}>
                              <TableCell><div className="flex items-center gap-2"><Avatar className="h-8 w-8"><AvatarFallback>{getInitials(employee.name)}</AvatarFallback></Avatar><span className="font-medium">{employee.name}</span></div></TableCell>
                              <TableCell>{employee.position}</TableCell>
                              <TableCell>{employee.companyName}</TableCell>
                          </TableRow>
                      ))}
                  </TableBody>
              </Table>
          </CardContent>
      </Card>
    </div>
  );
}
