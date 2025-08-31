
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

if (serviceAccount && !getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

function getAdminAuth() {
    if (!getApps().length) {
        if (!serviceAccount) {
            console.error("FIREBASE_SERVICE_ACCOUNT_KEY is not set. Firebase Admin SDK cannot be initialized.");
            // Return a mock or throw an error, depending on desired behavior in a non-initialized state
            return {
                createUser: () => Promise.reject(new Error("Firebase not initialized")),
                setCustomUserClaims: () => Promise.reject(new Error("Firebase not initialized")),
                createCustomToken: () => Promise.reject(new Error("Firebase not initialized")),
                verifyIdToken: () => Promise.reject(new Error("Firebase not initialized")),
                createSessionCookie: () => Promise.reject(new Error("Firebase not initialized")),
                verifySessionCookie: () => Promise.reject(new Error("Firebase not initialized")),
            };
        }
        initializeApp({
          credential: cert(serviceAccount),
        });
    }
    return getAuth();
}

function getAdminFirestore() {
    if (!getApps().length) {
        if (!serviceAccount) {
            console.error("FIREBASE_SERVICE_ACCOUNT_KEY is not set. Firebase Admin SDK cannot be initialized.");
            // Return a mock or throw an error
            return {
                collection: () => ({
                    add: () => Promise.reject(new Error("Firebase not initialized")),
                }),
            };
        }
        initializeApp({
            credential: cert(serviceAccount),
        });
    }
    return getFirestore();
}


interface SignUpData {
  email: string;
  password?: string;
  displayName: string;
  companyName: string;
}

export async function signUpWithEmail(data: SignUpData) {
  const auth = getAdminAuth();
  const db = getAdminFirestore();
  if (!serviceAccount) {
    return { success: false, error: 'Firebase Admin SDK not initialized on the server.' };
  }
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
    const token = await auth.createCustomToken(userRecord.uid);
    const expiresIn = 60 * 60 * 24 * 5 * 1000;
    const sessionCookie = await auth.createSessionCookie(token, { expiresIn });
    cookies().set(SESSION_COOKIE_NAME, sessionCookie, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

    return { success: true, userId: userRecord.uid };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function signInWithIdToken(idToken: string) {
   const auth = getAdminAuth();
   if (!serviceAccount) {
    return { success: false, error: 'Firebase Admin SDK not initialized on the server.' };
  }
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
   const auth = getAdminAuth();
   if (!serviceAccount) {
    return null;
  }
  try {
    const sessionCookie = cookies().get(SESSION_COOKIE_NAME)?.value;
    if (!sessionCookie) return null;
    return await auth.verifySessionCookie(sessionCookie, true);
  } catch (error) {
    return null;
  }
}
