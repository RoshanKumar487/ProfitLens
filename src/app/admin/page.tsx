
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PageTitle from '@/components/PageTitle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, query, where, getDocs, orderBy, Timestamp, doc, type DocumentData, limit, startAfter, endBefore, limitToLast, type QueryDocumentSnapshot } from 'firebase/firestore';
import { Shield, Check, X, Loader2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { approveUserRequest, rejectUserRequest, updateUserRole } from './actions';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext } from '@/components/ui/pagination';

interface AccessRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  companyName: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
}

interface CompanyUser extends DocumentData {
  id: string;
  displayName: string;
  email: string;
  role: 'admin' | 'member' | 'pending' | 'rejected';
}

const RECORDS_PER_PAGE = 20;

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const { toast } = useToast();

  const [requestsPage, setRequestsPage] = useState(1);
  const [requestsFirstVisible, setRequestsFirstVisible] = useState<QueryDocumentSnapshot | null>(null);
  const [requestsLastVisible, setRequestsLastVisible] = useState<QueryDocumentSnapshot | null>(null);

  const [usersPage, setUsersPage] = useState(1);
  const [usersFirstVisible, setUsersFirstVisible] = useState<QueryDocumentSnapshot | null>(null);
  const [usersLastVisible, setUsersLastVisible] = useState<QueryDocumentSnapshot | null>(null);

  const fetchAdminData = useCallback(async () => {
    if (!user || user.role !== 'admin' || !user.companyId) {
      setRequests([]);
      setUsers([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const companyId = user.companyId;

      const requestsRef = collection(db, 'accessRequests');
      const reqQuery = query(requestsRef, where('companyId', '==', companyId), orderBy('createdAt', 'desc'), limit(RECORDS_PER_PAGE));
      const reqSnapshot = await getDocs(reqQuery);
      const fetchedRequests = reqSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id, userId: data.userId, userName: data.userName, userEmail: data.userEmail,
          companyName: data.companyName, status: data.status, createdAt: (data.createdAt as Timestamp).toDate(),
        };
      });
      setRequests(fetchedRequests);
      if (reqSnapshot.docs.length > 0) {
        setRequestsFirstVisible(reqSnapshot.docs[0]);
        setRequestsLastVisible(reqSnapshot.docs[reqSnapshot.docs.length - 1]);
      }
      
      const usersRef = collection(db, 'users');
      const usersQuery = query(usersRef, where('companyId', '==', companyId), orderBy('displayName'), limit(RECORDS_PER_PAGE));
      const usersSnapshot = await getDocs(usersQuery);
      const fetchedUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CompanyUser));
      setUsers(fetchedUsers);
      if (usersSnapshot.docs.length > 0) {
        setUsersFirstVisible(usersSnapshot.docs[0]);
        setUsersLastVisible(usersSnapshot.docs[usersSnapshot.docs.length - 1]);
      }

    } catch (error) {
      console.error("Error fetching admin data:", error);
      toast({ title: 'Error', description: 'Could not fetch administration data.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading) {
      fetchAdminData();
    }
  }, [authLoading, fetchAdminData]);

  const handleRequestsPageChange = async (direction: 'next' | 'prev') => {
      if (!user?.companyId) return;
      let q;
      const baseQuery = [where('companyId', '==', user.companyId), orderBy('createdAt', 'desc')];
      if (direction === 'next' && requestsLastVisible) {
          q = query(collection(db, 'accessRequests'), ...baseQuery, startAfter(requestsLastVisible), limit(RECORDS_PER_PAGE));
          setRequestsPage(p => p + 1);
      } else if (direction === 'prev' && requestsFirstVisible) {
          q = query(collection(db, 'accessRequests'), ...baseQuery, endBefore(requestsFirstVisible), limitToLast(RECORDS_PER_PAGE));
          setRequestsPage(p => p - 1);
      } else return;
      
      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AccessRequest));
      if (fetched.length > 0) {
        setRequests(fetched);
        setRequestsFirstVisible(snapshot.docs[0]);
        setRequestsLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      }
  };

  const handleUsersPageChange = async (direction: 'next' | 'prev') => {
      if (!user?.companyId) return;
      let q;
      const baseQuery = [where('companyId', '==', user.companyId), orderBy('displayName')];
      if (direction === 'next' && usersLastVisible) {
          q = query(collection(db, 'users'), ...baseQuery, startAfter(usersLastVisible), limit(RECORDS_PER_PAGE));
          setUsersPage(p => p + 1);
      } else if (direction === 'prev' && usersFirstVisible) {
          q = query(collection(db, 'users'), ...baseQuery, endBefore(usersFirstVisible), limitToLast(RECORDS_PER_PAGE));
          setUsersPage(p => p - 1);
      } else return;

      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CompanyUser));
      if(fetched.length > 0) {
          setUsers(fetched);
          setUsersFirstVisible(snapshot.docs[0]);
          setUsersLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      }
  };

  const handleApprove = async (requestId: string, userId: string) => {
    setIsProcessing(requestId);
    const result = await approveUserRequest(requestId, userId);
    toast({ title: result.success ? 'Success' : 'Error', description: result.message, variant: result.success ? 'default' : 'destructive' });
    if (result.success) fetchAdminData();
    setIsProcessing(null);
  };

  const handleReject = async (requestId: string, userId: string) => {
    setIsProcessing(requestId);
    const result = await rejectUserRequest(requestId, userId);
    toast({ title: result.success ? 'Success' : 'Error', description: result.message, variant: result.success ? 'default' : 'destructive' });
    if (result.success) fetchAdminData();
    setIsProcessing(null);
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'member') => {
    if(userId === user?.uid) {
        toast({ title: 'Action Not Allowed', description: 'You cannot change your own role.', variant: 'destructive'});
        return;
    }
    setIsProcessing(userId);
    const result = await updateUserRole(userId, newRole);
    toast({ title: result.success ? 'Success' : 'Error', description: result.message, variant: result.success ? 'default' : 'destructive' });
    if (result.success) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    }
    setIsProcessing(null);
  };

  const getStatusBadgeVariant = (status: AccessRequest['status']) => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  if (authLoading || isLoading) {
    return <div className="flex justify-center items-center h-64 p-4 sm:p-6 lg:p-8"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

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
            <TabsTrigger value="requests">Access Requests <Badge className="ml-2">{requests.filter(r => r.status === 'pending').length}</Badge></TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
        </TabsList>
        <TabsContent value="requests">
            <Card>
                <CardHeader><CardTitle>Access Requests</CardTitle><CardDescription>Review and manage requests from users wanting to join your company profile.</CardDescription></CardHeader>
                <CardContent>
                    <Table>
                        <TableCaption>{requests.length === 0 ? "No access requests found." : `Page ${requestsPage} of access requests.`}</TableCaption>
                        <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Email</TableHead><TableHead>Requested On</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                        {requests.map(req => (
                            <TableRow key={req.id}>
                            <TableCell className="font-medium">{req.userName}</TableCell>
                            <TableCell>{req.userEmail}</TableCell>
                            <TableCell>{format(req.createdAt, 'PPP p')}</TableCell>
                            <TableCell><Badge variant={getStatusBadgeVariant(req.status)} className="capitalize">{req.status}</Badge></TableCell>
                            <TableCell className="text-right">
                                {req.status === 'pending' ? (
                                <div className="flex gap-2 justify-end">
                                    <Button size="sm" variant="outline" onClick={() => handleApprove(req.id, req.userId)} disabled={isProcessing === req.id}>{isProcessing === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-green-600" />}</Button>
                                    <Button size="sm" variant="outline" onClick={() => handleReject(req.id, req.userId)} disabled={isProcessing === req.id}>{isProcessing === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 text-red-600" />}</Button>
                                </div>
                                ) : (<span className="text-sm text-muted-foreground">Processed</span>)}
                            </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                      <div className="flex items-center justify-between pt-4">
                          <div className="text-sm text-muted-foreground">
                              Page {requestsPage}
                          </div>
                          <Pagination>
                              <PaginationContent>
                                  <PaginationItem><PaginationPrevious href="#" onClick={(e) => {e.preventDefault(); handleRequestsPageChange('prev')}} className={requestsPage === 1 ? 'pointer-events-none opacity-50' : ''}/></PaginationItem>
                                  <PaginationItem><PaginationNext href="#" onClick={(e) => {e.preventDefault(); handleRequestsPageChange('next')}} className={requests.length < RECORDS_PER_PAGE ? 'pointer-events-none opacity-50' : ''}/></PaginationItem>
                              </PaginationContent>
                          </Pagination>
                      </div>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="users">
            <Card>
                <CardHeader><CardTitle>User Management</CardTitle><CardDescription>Assign roles to users within your company.</CardDescription></CardHeader>
                <CardContent>
                    <Table>
                        <TableCaption>{users.length === 0 ? "No users found." : `Page ${usersPage} of users.`}</TableCaption>
                        <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Email</TableHead><TableHead className="w-[150px]">Role</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {users.map(u => (
                                <TableRow key={u.id}>
                                    <TableCell className="font-medium">{u.displayName}</TableCell>
                                    <TableCell>{u.email}</TableCell>
                                    <TableCell>
                                        <Select
                                            value={u.role}
                                            onValueChange={(newRole: 'admin' | 'member') => handleRoleChange(u.id, newRole)}
                                            disabled={isProcessing === u.id || u.id === user?.uid}
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
                      <div className="flex items-center justify-between pt-4">
                          <div className="text-sm text-muted-foreground">
                              Page {usersPage}
                          </div>
                          <Pagination>
                              <PaginationContent>
                                  <PaginationItem><PaginationPrevious href="#" onClick={(e) => {e.preventDefault(); handleUsersPageChange('prev')}} className={usersPage === 1 ? 'pointer-events-none opacity-50' : ''}/></PaginationItem>
                                  <PaginationItem><PaginationNext href="#" onClick={(e) => {e.preventDefault(); handleUsersPageChange('next')}} className={users.length < RECORDS_PER_PAGE ? 'pointer-events-none opacity-50' : ''}/></PaginationItem>
                              </PaginationContent>
                          </Pagination>
                      </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
