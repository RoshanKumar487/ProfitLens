
'use server';

import { db } from '@/lib/firebaseConfig';
import { collection, query, where, getDocs, doc, writeBatch } from 'firebase/firestore';

interface InviteResult {
  success: boolean;
  message: string;
}

export async function inviteUserToCompany(email: string, companyId: string, companyName: string): Promise<InviteResult> {
  // A super-admin action with security implications.
  // A full implementation would need to handle:
  // 1. What to do if the user doesn't exist (send email invite vs. create user).
  // 2. What to do if the user is already a member of another company.
  // 3. Sending notifications.

  console.log(`Super admin inviting ${email} to ${companyName} (${companyId})`);

  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', email), limit(1));

  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    return { success: false, message: `User with email ${email} not found. A full implementation would send an invitation to sign up.` };
  }

  const userDoc = querySnapshot.docs[0];
  const userData = userDoc.data();

  if (userData.companyId && userData.companyId !== companyId) {
     return { success: false, message: `User is already a member of another company. A full implementation would require user confirmation to switch.` };
  }
  
  if (userData.companyId === companyId) {
      return { success: false, message: `User is already a member of this company.` };
  }
  
  // User exists and is not in a company. Let's add them.
  try {
    const batch = writeBatch(db);
    const userRef = doc(db, 'users', userDoc.id);
    batch.update(userRef, {
      companyId: companyId,
      role: 'member' // Assign 'member' role by default.
    });

    // Also, if there was a pending request for this user to this company, approve it.
    const requestsRef = collection(db, 'accessRequests');
    const reqQuery = query(requestsRef, where('userId', '==', userDoc.id), where('companyId', '==', companyId), where('status', '==', 'pending'));
    const reqSnapshot = await getDocs(reqQuery);
    reqSnapshot.forEach(doc => {
      batch.update(doc.ref, { status: 'approved' });
    });

    await batch.commit();
    return { success: true, message: `Successfully added ${email} to ${companyName}.` };

  } catch(error: any) {
    return { success: false, message: `An error occurred: ${error.message}` };
  }
}
