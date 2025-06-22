'use client';

import React, { useState, useEffect, useCallback } from 'react';
import PageTitle from '@/components/PageTitle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { Shield, Check, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { approveUserRequest, rejectUserRequest } from './actions';
import { format } from 'date-fns';

interface AccessRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  companyName: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
}

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null); // To track which request is being processed
  const { toast } = useToast();

  const fetchRequests = useCallback(async () => {
    if (!user || user.role !== 'admin' || !user.companyId) {
      setRequests([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const requestsRef = collection(db, 'accessRequests');
      const q = query(
        requestsRef,
        where('companyId', '==', user.companyId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const fetchedRequests = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          userName: data.userName,
          userEmail: data.userEmail,
          companyName: data.companyName,
          status: data.status,
          createdAt: (data.createdAt as Timestamp).toDate(),
        };
      });
      setRequests(fetchedRequests);
    } catch (error) {
      console.error("Error fetching access requests:", error);
      toast({ title: 'Error', description: 'Could not fetch access requests.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading) {
      fetchRequests();
    }
  }, [authLoading, fetchRequests]);

  const handleApprove = async (requestId: string, userId: string) => {
    setIsProcessing(requestId);
    const result = await approveUserRequest(requestId, userId);
    toast({ title: result.success ? 'Success' : 'Error', description: result.message, variant: result.success ? 'default' : 'destructive' });
    if (result.success) {
      fetchRequests();
    }
    setIsProcessing(null);
  };

  const handleReject = async (requestId: string, userId: string) => {
    setIsProcessing(requestId);
    const result = await rejectUserRequest(requestId, userId);
    toast({ title: result.success ? 'Success' : 'Error', description: result.message, variant: result.success ? 'default' : 'destructive' });
    if (result.success) {
      fetchRequests();
    }
    setIsProcessing(null);
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center h-64 p-4 sm:p-6 lg:p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <PageTitle title="Administration" icon={Shield} />
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You do not have permission to view this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadgeVariant = (status: AccessRequest['status']) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };


  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageTitle title="Administration" subtitle="Manage user access requests for your company." icon={Shield} />
      <Card>
        <CardHeader>
          <CardTitle>Access Requests</CardTitle>
          <CardDescription>Review and manage requests from users wanting to join your company profile.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>{requests.length === 0 ? "No access requests found." : "A list of user access requests."}</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Requested On</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map(req => (
                <TableRow key={req.id}>
                  <TableCell className="font-medium">{req.userName}</TableCell>
                  <TableCell>{req.userEmail}</TableCell>
                  <TableCell>{format(req.createdAt, 'PPP p')}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(req.status)} className="capitalize">{req.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {req.status === 'pending' ? (
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApprove(req.id, req.userId)}
                          disabled={isProcessing === req.id}
                        >
                           {isProcessing === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-green-600" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(req.id, req.userId)}
                          disabled={isProcessing === req.id}
                        >
                           {isProcessing === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 text-red-600" />}
                        </Button>
                      </div>
                    ) : (
                        <span className="text-sm text-muted-foreground">Processed</span>
                    )}
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
