
'use server';

import { db } from '@/lib/firebaseConfig';
import { doc, writeBatch, updateDoc } from 'firebase/firestore';

export async function approveUserRequest(requestId: string, userId: string): Promise<{ success: boolean; message: string }> {
  try {
    const batch = writeBatch(db);

    const requestRef = doc(db, 'accessRequests', requestId);
    batch.update(requestRef, { status: 'approved' });

    const userRef = doc(db, 'users', userId);
    batch.update(userRef, { role: 'member' });

    await batch.commit();
    return { success: true, message: 'User approved successfully.' };
  } catch (error: any) {
    console.error("Error approving user:", error);
    return { success: false, message: `Failed to approve user: ${error.message}` };
  }
}

export async function rejectUserRequest(requestId: string, userId: string): Promise<{ success: boolean; message: string }> {
  try {
    const batch = writeBatch(db);

    const requestRef = doc(db, 'accessRequests', requestId);
    batch.update(requestRef, { status: 'rejected' });

    const userRef = doc(db, 'users', userId);
    batch.update(userRef, { role: 'rejected' });

    await batch.commit();

    return { success: true, message: 'User request rejected.' };
  } catch (error: any) {
    console.error("Error rejecting user:", error);
    return { success: false, message: `Failed to reject user: ${error.message}` };
  }
}

export async function updateUserRole(userId: string, newRole: 'admin' | 'member'): Promise<{ success: boolean; message: string }> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { role: newRole });
    return { success: true, message: 'User role updated successfully.' };
  } catch (error: any) {
    console.error("Error updating user role:", error);
    return { success: false, message: `Failed to update role: ${error.message}` };
  }
}
