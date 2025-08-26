
'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { app } from '@/lib/firebaseConfig';
import { SigninSchema, SignupSchema, CompanyDetailsSchema, type SignupInput, type SigninInput, type CompanyDetailsInput } from '@/lib/schemas';
import { SESSION_COOKIE_NAME } from '@/lib/constants';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getCurrencySymbol } from '@/lib/countries';
import admin from 'firebase-admin';

// Helper function to initialize Firebase Admin SDK
function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    throw new Error('The FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. Please add it to your .env file.');
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountKey);
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: "https://profitlenz-68b39-default-rtdb.firebaseio.com"
    });
  } catch (error: any) {
    console.error('Firebase admin initialization error: Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY.', error);
    throw new Error('Failed to initialize Firebase Admin SDK. Please check the FIREBASE_SERVICE_ACCOUNT_KEY in your environment variables.');
  }
}


export async function getCurrentUser() {
  const sessionCookie = cookies().get(SESSION_COOKIE_NAME);
  if (!sessionCookie) return null;

  try {
    const adminAuth = initializeFirebaseAdmin().auth();
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie.value, true);
    const { db } = await connectToDatabase();
    
    const userDoc = await db.collection('users').findOne({ _id: new ObjectId(decodedToken.uid) });
    if (!userDoc) {
      return null;
    }

    const companyDoc = await db.collection('companies').findOne({ _id: userDoc.companyId });
    if (!companyDoc) {
      return null;
    }

    return {
      uid: userDoc._id.toString(),
      email: userDoc.email,
      displayName: userDoc.name,
      companyId: companyDoc._id.toString(),
      companyName: companyDoc.name,
      publicCompanyId: companyDoc.publicId,
      currencySymbol: getCurrencySymbol(companyDoc.country),
      role: userDoc.role,
      isSuperAdmin: userDoc.isSuperAdmin || false,
    };
  } catch (error) {
    console.error('Error verifying session cookie:', error);
    // Clear the invalid cookie
    cookies().delete(SESSION_COOKIE_NAME);
    return null;
  }
}


export async function signInWithEmail(data: SigninInput) {
  const result = SigninSchema.safeParse(data);
  if (!result.success) {
    return { success: false, error: 'Invalid email or password format.' };
  }

  const { email, password } = result.data;
  const auth = getAuth(app);

  try {
    const adminAuth = initializeFirebaseAdmin().auth();
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await userCredential.user.getIdToken();

    // Create session cookie
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
    cookies().set(SESSION_COOKIE_NAME, sessionCookie, { maxAge: expiresIn, httpOnly: true, secure: process.env.NODE_ENV === 'production' });

    return { success: true };
  } catch (error: any) {
    console.error('Sign-in failed:', error.code);
    return { success: false, error: 'Invalid email or password.' };
  }
}

export async function signUpWithEmail(data: SignupInput) {
    const result = SignupSchema.safeParse(data);
    if (!result.success) {
        return { success: false, error: "Invalid form data.", fieldErrors: result.error.flatten().fieldErrors };
    }
    const { email, password } = result.data;
    const auth = getAuth(app);
    
    try {
        const adminAuth = initializeFirebaseAdmin().auth();
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const { db } = await connectToDatabase();
        
        // Create a new company for the user
        const newCompany = await db.collection('companies').insertOne({
            name: 'My New Company', // Temporary name
            ownerId: new ObjectId(user.uid),
            createdAt: new Date(),
            publicId: `CMP-${Date.now().toString().slice(-6)}`,
        });

        // Create the user document in the database
        await db.collection('users').insertOne({
            _id: new ObjectId(user.uid),
            email: user.email,
            companyId: newCompany.insertedId,
            role: 'admin', // First user is always an admin
            createdAt: new Date(),
        });
        
        const idToken = await user.getIdToken();
        const expiresIn = 60 * 60 * 24 * 5 * 1000;
        const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
        cookies().set(SESSION_COOKIE_NAME, sessionCookie, { maxAge: expiresIn, httpOnly: true, secure: process.env.NODE_ENV === 'production' });

        return { success: true, redirect: '/auth/signup-details' };

    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
            return { success: false, error: "An account with this email already exists." };
        }
        console.error('Sign-up error:', error);
        return { success: false, error: "Could not create account. Please try again." };
    }
}

export async function completeSignUp(data: CompanyDetailsInput) {
    const result = CompanyDetailsSchema.safeParse(data);
    if (!result.success) {
        return { success: false, error: "Invalid form data." };
    }
    
    const user = await getCurrentUser();
    if (!user) {
        return { success: false, error: "User not found. Please sign in again." };
    }

    try {
        const { db } = await connectToDatabase();
        
        // Update user's name
        await db.collection('users').updateOne(
            { _id: new ObjectId(user.uid) },
            { $set: { name: result.data.userName } }
        );

        // Update company details
        await db.collection('companies').updateOne(
            { _id: new ObjectId(user.companyId) },
            { $set: { name: result.data.companyName, country: result.data.country } }
        );

        revalidatePath('/', 'layout');
        return { success: true };
    } catch (error) {
        console.error("Error completing sign up:", error);
        return { success: false, error: "Could not save details. Please try again." };
    }
}


export async function signOut() {
  cookies().delete(SESSION_COOKIE_NAME);
  revalidatePath('/', 'layout');
  redirect('/auth/signin');
}
