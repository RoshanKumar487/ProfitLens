
'use client';

import React from 'react';
import PageTitle from '@/components/PageTitle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Check, X, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';


const MOCK_REQUESTS = [
    { id: 'req1', userId: 'user1', userName: 'Alice Johnson', userEmail: 'alice@example.com', createdAt: new Date(), status: 'pending' as const },
    { id: 'req2', userId: 'user2', userName: 'Bob Williams', userEmail: 'bob@example.com', createdAt: new Date(Date.now() - 86400000), status: 'approved' as const },
];

const MOCK_USERS = [
    { id: 'user1', displayName: 'Alice Johnson', email: 'alice@example.com', role: 'pending' as const },
    { id: 'user2', displayName: 'Bob Williams', email: 'bob@example.com', role: 'member' as const },
    { id: 'user3', displayName: 'Demo User', email: 'user@example.com', role: 'admin' as const },
];


export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const handleAction = () => {
    toast({ title: 'Action Disabled', description: 'Cannot perform this action without a backend connection.', variant: 'destructive' });
  };
  
  const getStatusBadgeVariant = (status: 'pending' | 'approved' | 'rejected') => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <PageTitle title="Administration" icon={Shield} />
        <Card><CardHeader><CardTitle>Access Denied</CardTitle></CardHeader><CardContent><p>You do not have permission to view this page.</p></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageTitle title="Administration" subtitle="Manage user access and roles for your company." icon={Shield} />
      <Tabs defaultValue="requests">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="requests">Access Requests <Badge className="ml-2">{MOCK_REQUESTS.filter(r => r.status === 'pending').length}</Badge></TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
        </TabsList>
        <TabsContent value="requests">
            <Card>
                <CardHeader><CardTitle>Access Requests</CardTitle><CardDescription>Review and manage requests from users wanting to join your company profile.</CardDescription></CardHeader>
                <CardContent>
                    <Table>
                        <TableCaption>A list of recent access requests.</TableCaption>
                        <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Email</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                        {MOCK_REQUESTS.map(req => (
                            <TableRow key={req.id}>
                            <TableCell className="font-medium">{req.userName}</TableCell>
                            <TableCell>{req.userEmail}</TableCell>
                            <TableCell><Badge variant={getStatusBadgeVariant(req.status)} className="capitalize">{req.status}</Badge></TableCell>
                            <TableCell className="text-right">
                                {req.status === 'pending' ? (
                                <div className="flex gap-2 justify-end">
                                    <Button size="sm" variant="outline" onClick={handleAction}><Check className="h-4 w-4 text-green-600" /></Button>
                                    <Button size="sm" variant="outline" onClick={handleAction}><X className="h-4 w-4 text-red-600" /></Button>
                                </div>
                                ) : (<span className="text-sm text-muted-foreground">Processed</span>)}
                            </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="users">
            <Card>
                <CardHeader><CardTitle>User Management</CardTitle><CardDescription>Assign roles to users within your company.</CardDescription></CardHeader>
                <CardContent>
                    <Table>
                        <TableCaption>A list of users in your company.</TableCaption>
                        <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Email</TableHead><TableHead className="w-[150px]">Role</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {MOCK_USERS.map(u => (
                                <TableRow key={u.id}>
                                    <TableCell className="font-medium">{u.displayName}</TableCell>
                                    <TableCell>{u.email}</TableCell>
                                    <TableCell>
                                        <Select
                                            value={u.role}
                                            onValueChange={handleAction}
                                            disabled={u.id === user?.uid}
                                        >
                                            <SelectTrigger className="capitalize"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="admin">Admin</SelectItem>
                                                <SelectItem value="member">Member</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
