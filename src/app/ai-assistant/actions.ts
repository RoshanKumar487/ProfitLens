
'use server';

import { askAssistantFlow } from '@/ai/flows/ask-assistant-flow';
import { auth } from '@/lib/firebaseConfig';
import { Message } from './page';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { headers } from 'next/headers';
import { getAuth } from 'firebase-admin/auth';
import { app as adminApp } from '@/lib/firebaseAdminConfig';


async function getCompanyIdForCurrentUser(): Promise<string | null> {
  const headersList = headers();
  const idToken = headersList.get('x-firebase-id-token');

  if (!idToken) {
    console.error("Action Error: No ID token provided.");
    return null;
  }
  
  try {
    const decodedToken = await getAuth(adminApp).verifyIdToken(idToken);
    const uid = decodedToken.uid;
    
    if (!uid) return null;

    const userDocRef = doc(db, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      return userDocSnap.data().companyId || null;
    }
    return null;
  } catch (error) {
    console.error("Action Error: Could not verify ID token or get user data.", error);
    return null;
  }
}


export async function askAssistantAction(
  history: Message[],
  currencySymbol: string
): Promise<string> {
  const companyId = await getCompanyIdForCurrentUser();

  if (!companyId) {
    return "I'm sorry, I couldn't verify your company information. Please make sure you are logged in correctly.";
  }

  const response = await askAssistantFlow({
    history: history,
    companyId: companyId,
    currencySymbol: currencySymbol,
  });

  return response;
}
