
'use server';

import { config } from 'dotenv';
config({ path: '.env' });

import { cookies } from 'next/headers';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { SESSION_COOKIE_NAME } from '@/lib/constants';

// Initialize Firebase Admin SDK
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : null;

if (!getApps().length) {
  if (!serviceAccount) {
    throw new Error('Firebase service account key is not set in environment variables.');
  }
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const auth = getAuth();
const db = getFirestore();

interface SignUpData {
  email: string;
  password?: string;
  displayName: string;
  companyName: string;
}

export async function signUpWithEmail(data: SignUpData) {
  try {
    const { email, password, displayName, companyName } = data;

    if (!password) {
        throw new Error('Password is required');
    }
    
    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName,
    });

    // Create company in Firestore
    const companyRef = await db.collection('companies').add({
      name: companyName,
      ownerId: userRecord.uid,
      createdAt: new Date(),
    });
    
    const companyId = companyRef.id;
    
    // Update user with custom claims
    await auth.setCustomUserClaims(userRecord.uid, {
        companyId: companyId,
        role: 'admin',
    });

    // Create session cookie
    const sessionCookie = await auth.createSessionCookie(await auth.createCustomToken(userRecord.uid), { expiresIn: 60 * 60 * 24 * 5 * 1000 });
    cookies().set(SESSION_COOKIE_NAME, sessionCookie, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

    return { success: true, userId: userRecord.uid };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function signInWithIdToken(idToken: string) {
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    const expiresIn = 60 * 60 * 24 * 5 * 1000;
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });
    cookies().set(SESSION_COOKIE_NAME, sessionCookie, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    return { success: true, uid: decodedToken.uid };
  } catch (error: any) {
    return { success: false, error: 'Failed to create session.' };
  }
}

export async function signOutAction() {
  cookies().delete(SESSION_COOKIE_NAME);
}

export async function getSession() {
  try {
    const sessionCookie = cookies().get(SESSION_COOKIE_NAME)?.value;
    if (!sessionCookie) return null;
    return await auth.verifySessionCookie(sessionCookie, true);
  } catch (error) {
    return null;
  }
}
